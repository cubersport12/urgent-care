"""Реестр платёжных провайдеров и выбор провайдера по каналу сборки.

CHANNEL_TO_PROVIDER — единственное место, где решается, какая платёжная
система обслужит покупку: клиент лишь сообщает метку сборки (channel),
сам провайдер клиентом не выбирается. Нет метки / web → YooKassa.
"""
from __future__ import annotations

from app.billing.base import PaymentProvider
from app.billing.rustore import RuStoreProvider
from app.billing.yookassa import YooKassaProvider

PROVIDER_NAMES = ("yookassa", "rustore")

CHANNEL_TO_PROVIDER: dict[str, str] = {
    "rustore": "rustore",
}


def provider_for_channel(channel: str | None) -> str:
    return CHANNEL_TO_PROVIDER.get(channel or "", "yookassa")


def get_providers() -> dict[str, PaymentProvider]:
    """Свежие инстансы на вызов (клиенты без состояния, тесты мутируют атрибуты)."""
    return {
        "yookassa": YooKassaProvider(),
        "rustore": RuStoreProvider(),
    }
