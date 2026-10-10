"""Единый интерфейс платёжных провайдеров.

Провайдер умеет: начать оформление (start_checkout), вернуть деньги (refund),
сообщить, сконфигурирован ли он. Получение состояния платежа/подписки —
конкретные методы провайдера (форматы ответов у всех разные).
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.models.billing import Payment, Tariff


class PaymentProvider:
    name: str = ""

    @property
    def configured(self) -> bool:
        return False

    async def start_checkout(
        self,
        *,
        payment: Payment,
        tariff: Tariff,
        amount_rub: float,
        description: str,
        return_url: str,
        user_email: str,
    ) -> dict[str, Any]:
        """Начать оформление. YooKassa создаёт платёж и возвращает объект
        с confirmation_url; RuStore ничего не вызывает и возвращает данные
        для покупки через мобильный SDK."""
        raise NotImplementedError

    async def refund(self, payment: Payment, amount_rub: float) -> dict[str, Any] | None:
        """Вернуть платёж через API провайдера; None — возврат вручную (консоль)."""
        raise NotImplementedError
