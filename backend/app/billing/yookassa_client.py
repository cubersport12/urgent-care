"""Minimal YooKassa HTTP client."""
from __future__ import annotations

from typing import Any
from uuid import uuid4

import httpx

from app.core.config import settings

BASE = "https://api.yookassa.ru/v3"


class YooKassaClient:
    def __init__(self) -> None:
        self.shop_id = settings.yookassa_shop_id
        self.secret_key = settings.yookassa_secret_key

    @property
    def configured(self) -> bool:
        return bool(self.shop_id and self.secret_key)

    def _auth(self) -> httpx.BasicAuth:
        return httpx.BasicAuth(self.shop_id, self.secret_key)

    async def create_payment(
        self,
        *,
        amount_rub: float,
        description: str,
        return_url: str,
        metadata: dict[str, str],
        customer_email: str,
        save_payment_method: bool = True,
        payment_method_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "amount": {"value": f"{amount_rub:.2f}", "currency": "RUB"},
            "capture": True,
            "description": description[:128],
            "metadata": metadata,
            "receipt": {
                "customer": {"email": customer_email},
                "items": [
                    {
                        "description": description[:128],
                        "quantity": "1.0",
                        "amount": {"value": f"{amount_rub:.2f}", "currency": "RUB"},
                        "vat_code": 1,
                        "payment_mode": "full_payment",
                        "payment_subject": "service",
                    }
                ],
            },
        }
        if payment_method_id:
            body["payment_method_id"] = payment_method_id
        else:
            body["confirmation"] = {"type": "redirect", "return_url": return_url}
            body["save_payment_method"] = save_payment_method

        headers = {"Idempotence-Key": idempotency_key or str(uuid4())}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BASE}/payments",
                json=body,
                headers=headers,
                auth=self._auth(),
            )
            if response.is_error:
                detail = response.text
                try:
                    payload = response.json()
                    detail = payload.get("description") or payload.get("detail") or detail
                except Exception:
                    pass
                raise httpx.HTTPStatusError(
                    f"YooKassa create payment failed: {detail}",
                    request=response.request,
                    response=response,
                )
            return response.json()

    async def get_payment(self, payment_id: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{BASE}/payments/{payment_id}",
                auth=self._auth(),
            )
            response.raise_for_status()
            return response.json()
