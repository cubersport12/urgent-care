"""RuStore payment provider (public API for Pay SDK subscriptions).

Подписки покупаются в приложении через RuStore Pay SDK; сервер валидирует
покупку и следит за продлениями через Public API (вебхуков у RuStore нет).

Авторизация: в RuStore Консоли создаётся API-ключ (keyId + приватный RSA-ключ
в Base64 PKCS8). Ими подписывается запрос POST /public/auth/ → в ответе
одноразовый-на-15-минут JWE-токен (body.jwe, ttl 900), он передаётся в
заголовке Public-Token. Токен кешируется и обновляется по истечении.

Документация: https://www.rustore.ru/help/work-with-rustore-api
"""
from __future__ import annotations

import base64
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from app.billing.base import PaymentProvider
from app.core.config import settings

BASE = "https://public-api.rustore.ru/public"
AUTH_URL = "https://public-api.rustore.ru/public/auth/"
# Токен живёт 900 c — обновляем с запасом
TOKEN_TTL_SECONDS = 720.0

# ponytail: кеш токена в памяти процесса — потолок 1 воркер (при нескольких
# воркерах каждый просто получает свой токен, лишнего вреда нет)
_token_cache: dict[str, tuple[str, float]] = {}


class RuStoreApiError(Exception):
    def __init__(self, code: str, message: str | None = None) -> None:
        super().__init__(message or code)
        self.code = code
        self.message = message or ""


class RuStoreProvider(PaymentProvider):
    name = "rustore"

    def __init__(self) -> None:
        self.api_key_id = settings.rustore_api_key_id
        self.api_private_key_b64 = settings.rustore_api_private_key
        self.app_id = settings.rustore_app_id
        self.package_name = settings.rustore_package_name
        self.sandbox = settings.rustore_sandbox
        self._private_key: rsa.RSAPrivateKey | None = None

    @property
    def configured(self) -> bool:
        return bool(
            self.api_key_id and self.api_private_key_b64 and self.package_name
        )

    def _load_private_key(self) -> rsa.RSAPrivateKey:
        if self._private_key is None:
            der = base64.b64decode(self.api_private_key_b64)
            self._private_key = serialization.load_der_private_key(der, password=None)
        return self._private_key

    def _sign(self, timestamp: str) -> str:
        """SHA512withRSA от строки keyId+timestamp, Base64."""
        data = (self.api_key_id + timestamp).encode("utf-8")
        signature = self._load_private_key().sign(
            data, padding.PKCS1v15(), hashes.SHA512()
        )
        return base64.b64encode(signature).decode("ascii")

    async def _get_token(self) -> str:
        cached = _token_cache.get(self.api_key_id)
        if cached and time.monotonic() - cached[1] < TOKEN_TTL_SECONDS:
            return cached[0]
        timestamp = (
            datetime.now(timezone.utc).isoformat(timespec="milliseconds")
        ).replace("+00:00", "Z")
        body = {
            "keyId": self.api_key_id,
            "timestamp": timestamp,
            "signature": self._sign(timestamp),
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(AUTH_URL, json=body)
            if response.is_error:
                raise RuStoreApiError(
                    f"auth HTTP {response.status_code}", response.text[:200]
                )
            payload = response.json()
        if payload.get("code") not in (None, "OK"):
            raise RuStoreApiError(
                payload.get("code", "AUTH_ERROR"), payload.get("message")
            )
        jwe = (payload.get("body") or {}).get("jwe")
        if not jwe:
            raise RuStoreApiError("NO_TOKEN", "RuStore auth returned no jwe token")
        _token_cache[self.api_key_id] = (jwe, time.monotonic())
        return jwe

    async def _request(self, method: str, path: str) -> dict[str, Any]:
        """Запрос к Public API с Public-Token; при истёкшем токене — один ретрай."""
        for attempt in (1, 2):
            token = await self._get_token()
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.request(
                    method,
                    self._url(path),
                    headers={"Public-Token": token},
                )
            if response.is_error:
                raise RuStoreApiError(
                    f"HTTP {response.status_code}", response.text[:200]
                )
            payload = response.json()
            code = payload.get("code")
            if code not in (None, "OK"):
                # Документированный случай: "Jwe token is expired" — обновляем токен
                if attempt == 1 and "expired" in (payload.get("message") or "").lower():
                    _token_cache.pop(self.api_key_id, None)
                    continue
                raise RuStoreApiError(code, payload.get("message"))
            return payload.get("body") or {}
        return {}

    def _url(self, path: str) -> str:
        prefix = "/sandbox" if self.sandbox else ""
        return f"{BASE}{prefix}{path}"

    async def get_subscription(self, product_id: str, purchase_id: str) -> dict[str, Any]:
        """V4: данные подписки по purchaseId (expiryTimeMillis, autoRenewing, paymentState...)."""
        return await self._request(
            "GET", f"/v4/subscription/{self.package_name}/{product_id}/{purchase_id}"
        )

    async def cancel_subscription(self, purchase_id: str) -> None:
        """Отменить автопродление; подписка действует до конца оплаченного периода."""
        await self._request(
            "PATCH", f"/v1/applications/{self.app_id}/subscriptions/{purchase_id}:cancel"
        )

    async def start_checkout(
        self,
        *,
        payment,
        tariff,
        amount_rub: float,
        description: str,
        return_url: str,
        user_email: str,
    ) -> dict[str, Any]:
        # Сервер не вызывает RuStore: покупка проходит через SDK в приложении.
        # developerPayload=payment.id клиент передаёт при покупке — по нему
        # confirm_rustore связывает покупку с платежом.
        if not tariff.rustore_product_id:
            raise ValueError("Tariff has no RuStore product")
        return {"product_id": tariff.rustore_product_id, "order_id": str(payment.id)}

    async def refund(self, payment, amount_rub: float) -> dict[str, Any] | None:
        # Возвраты RuStore-подписок выполняются вручную в консоли RuStore.
        return None


def parse_millis(value: Any) -> datetime | None:
    """expiryTimeMillis / userCancellationTimeMillis: строка мс с эпохи."""
    try:
        return datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc)
    except (TypeError, ValueError):
        return None


def amount_from_micros(value: Any) -> float | None:
    """priceAmountMicros: строка микрос-единиц (1 000 000 = 1 ₽)."""
    try:
        return int(value) / 1_000_000
    except (TypeError, ValueError):
        return None
