"""Реестр платёжных провайдеров и выбор провайдера по каналу сборки."""
from __future__ import annotations

from app.billing.base import PaymentProvider
from app.billing.rustore import RuStoreProvider
from app.billing.yookassa import YooKassaProvider

PROVIDER_NAMES = ("yookassa",)

CHANNEL_TO_PROVIDER: dict[str, str] = {
    "web": "yookassa",
}


def provider_for_channel(channel: str | None) -> str:
    return CHANNEL_TO_PROVIDER.get(channel or "", "yookassa")


def get_providers() -> dict[str, PaymentProvider]:
    """Fresh provider instances, including RuStore only for legacy subscriptions."""
    return {
        "yookassa": YooKassaProvider(),
        "rustore": RuStoreProvider(),
    }
