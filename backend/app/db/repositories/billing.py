"""Billing persistence helpers."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Sequence
from uuid import UUID, uuid4

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import (
    Payment,
    PaymentMethod,
    SubscriptionChange,
    Tariff,
    UserSubscription,
)


class BillingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_tariff(self, tariff_id: UUID) -> Tariff | None:
        return await self.db.get(Tariff, tariff_id)

    async def get_tariff_by_code(self, code: str) -> Tariff | None:
        result = await self.db.execute(select(Tariff).where(Tariff.code == code))
        return result.scalar_one_or_none()

    async def get_default_tariff(self) -> Tariff | None:
        result = await self.db.execute(
            select(Tariff).where(Tariff.is_default.is_(True)).limit(1)
        )
        return result.scalar_one_or_none()

    async def list_tariffs(self, *, active_only: bool = False) -> Sequence[Tariff]:
        stmt = select(Tariff).order_by(Tariff.sort_order, Tariff.rank, Tariff.title)
        if active_only:
            stmt = stmt.where(Tariff.is_active.is_(True))
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def clear_default_flags(self) -> None:
        await self.db.execute(update(Tariff).values(is_default=False))

    async def create_tariff(self, **fields) -> Tariff:
        tariff = Tariff(id=uuid4(), **fields)
        self.db.add(tariff)
        await self.db.commit()
        await self.db.refresh(tariff)
        return tariff

    async def update_tariff(self, tariff: Tariff, **fields) -> Tariff:
        for key, value in fields.items():
            setattr(tariff, key, value)
        await self.db.commit()
        await self.db.refresh(tariff)
        return tariff

    async def delete_tariff(self, tariff: Tariff) -> None:
        await self.db.delete(tariff)
        await self.db.commit()

    async def get_subscription(self, user_id: UUID) -> UserSubscription | None:
        result = await self.db.execute(
            select(UserSubscription).where(UserSubscription.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def ensure_free_subscription(self, user_id: UUID) -> UserSubscription:
        existing = await self.get_subscription(user_id)
        if existing:
            return existing
        free = await self.get_default_tariff()
        if not free:
            free = await self.get_tariff_by_code("free")
        if not free:
            raise RuntimeError("Default/free tariff is not configured")
        now = datetime.now(timezone.utc)
        sub = UserSubscription(
            id=uuid4(),
            user_id=user_id,
            tariff_id=free.id,
            status="active",
            current_period_start=now,
            current_period_end=now + timedelta(days=free.period_days),
            cancel_at_period_end=False,
        )
        self.db.add(sub)
        await self.db.commit()
        await self.db.refresh(sub)
        return sub

    async def save_subscription(self, sub: UserSubscription) -> UserSubscription:
        await self.db.commit()
        await self.db.refresh(sub)
        return sub

    async def create_payment(self, **fields) -> Payment:
        payment = Payment(id=uuid4(), **fields)
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def get_payment(self, payment_id: UUID) -> Payment | None:
        return await self.db.get(Payment, payment_id)

    async def get_payment_by_yookassa_id(self, yookassa_id: str) -> Payment | None:
        result = await self.db.execute(
            select(Payment).where(Payment.yookassa_payment_id == yookassa_id)
        )
        return result.scalar_one_or_none()

    async def list_payments(self, user_id: UUID) -> Sequence[Payment]:
        result = await self.db.execute(
            select(Payment)
            .where(Payment.user_id == user_id)
            .order_by(Payment.created_at.desc())
        )
        return result.scalars().all()

    async def save_payment(self, payment: Payment) -> Payment:
        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def upsert_payment_method(
        self,
        *,
        user_id: UUID,
        yookassa_payment_method_id: str,
        card_last4: str | None,
        type_: str | None,
    ) -> PaymentMethod:
        result = await self.db.execute(
            select(PaymentMethod).where(
                PaymentMethod.yookassa_payment_method_id == yookassa_payment_method_id
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.card_last4 = card_last4
            existing.type = type_
            existing.is_default = True
            await self.db.commit()
            await self.db.refresh(existing)
            return existing
        method = PaymentMethod(
            id=uuid4(),
            user_id=user_id,
            yookassa_payment_method_id=yookassa_payment_method_id,
            card_last4=card_last4,
            type=type_,
            is_default=True,
        )
        self.db.add(method)
        await self.db.commit()
        await self.db.refresh(method)
        return method

    async def get_scheduled_change(self, user_id: UUID) -> SubscriptionChange | None:
        result = await self.db.execute(
            select(SubscriptionChange).where(
                SubscriptionChange.user_id == user_id,
                SubscriptionChange.status == "scheduled",
            )
        )
        return result.scalar_one_or_none()

    async def create_scheduled_change(self, **fields) -> SubscriptionChange:
        change = SubscriptionChange(id=uuid4(), **fields)
        self.db.add(change)
        await self.db.commit()
        await self.db.refresh(change)
        return change

    async def save_change(self, change: SubscriptionChange) -> SubscriptionChange:
        await self.db.commit()
        await self.db.refresh(change)
        return change

    async def list_due_subscriptions(self, now: datetime) -> Sequence[UserSubscription]:
        result = await self.db.execute(
            select(UserSubscription).where(
                UserSubscription.status.in_(("active", "past_due")),
                UserSubscription.current_period_end <= now,
                UserSubscription.cancel_at_period_end.is_(False),
                UserSubscription.yookassa_payment_method_id.is_not(None),
            )
        )
        return result.scalars().all()

    async def list_due_scheduled_changes(self, now: datetime) -> Sequence[SubscriptionChange]:
        result = await self.db.execute(
            select(SubscriptionChange).where(
                SubscriptionChange.status == "scheduled",
                SubscriptionChange.effective_at <= now,
            )
        )
        return result.scalars().all()

    async def list_grace_downgrades(
        self, cutoff: datetime
    ) -> Sequence[UserSubscription]:
        result = await self.db.execute(
            select(UserSubscription).where(
                UserSubscription.current_period_end <= cutoff,
                (
                    (UserSubscription.cancel_at_period_end.is_(True))
                    | (UserSubscription.status.in_(("past_due", "canceled")))
                ),
            )
        )
        return result.scalars().all()
