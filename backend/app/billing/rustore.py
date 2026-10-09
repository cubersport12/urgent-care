"""RuStore payment provider (public API for Pay SDK subscriptions).

Подписки покупаются в приложении через RuStore Pay SDK; сервер валидирует
покупку и следит за продлениями через Public API (вебхуков у RuStore нет).

Документация: https://www.rustore.ru/help/work-with-rustore-api
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from app.billing.base import PaymentProvider
from app.core.config import settings

BASE = "https://public-api.rustore.ru/public"


class RuStoreApiError(Exception):
    def __init__(self, code: str, message: str | None = None) -> None:
        super().__init__(message or code)
        self.code = code


class RuStoreProvider(PaymentProvider):
    name = "rustore"

    def __init__(self) -> None:
        self.public_token = settings.rustore_public_token
        self.app_id = settings.rustore_app_id
        self.package_name = settings.rustore_package_name
        self.sandbox = settings.rustore_sandbox

    @property
    def configured(self) -> bool:
        return bool(self.public_token and self.package_name)

    def _url(self, path: str) -> str:
        prefix = "/sandbox" if self.sandbox else ""
        return f"{BASE}{prefix}{path}"

    @staticmethod
    def _parse_body(response: httpx.Response) -> dict[str, Any]:
        payload = response.json()
        code = payload.get("code")
        if code not in (None, "OK"):
            raise RuStoreApiError(code, payload.get("message"))
        return payload.get("body") or {}

    async def get_subscription(self, product_id: str, purchase_id: str) -> dict[str, Any]:
        """V4: данные подписки по purchaseId (expiryTimeMillis, autoRenewing, paymentState...)."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                self._url(
                    f"/v4/subscription/{self.package_name}/{product_id}/{purchase_id}"
                ),
                headers={"Public-Token": self.public_token},
            )
            if response.is_error:
                raise RuStoreApiError(
                    f"HTTP {response.status_code}", response.text[:200]
                )
            return self._parse_body(response)

    async def cancel_subscription(self, purchase_id: str) -> None:
        """Отменить автопродление; подписка действует до конца оплаченного периода."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.patch(
                self._url(
                    f"/v1/applications/{self.app_id}/subscriptions/{purchase_id}:cancel"
                ),
                headers={"Public-Token": self.public_token},
            )
            if response.is_error:
                raise RuStoreApiError(
                    f"HTTP {response.status_code}", response.text[:200]
                )
            self._parse_body(response)

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
