"""Subscription lifecycle and YooKassa integration."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.billing.yookassa_client import YooKassaClient
from app.core.config import settings
from app.db.repositories.billing import BillingRepository
from app.models.article import Article
from app.models.billing import Payment, SubscriptionChange, Tariff, UserSubscription
from app.models.folder import Folder
from app.models.rescue import Rescue
from app.models.test import Test
from app.models.user import User
from app.schemas.billing import (
    BillingMeOut,
    PaymentOut,
    SubscribeOut,
    TariffCreate,
    TariffOut,
    TariffUpdate,
)


class BillingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = BillingRepository(db)
        self.yk = YooKassaClient()

    async def list_tariffs_public(self) -> list[TariffOut]:
        items = await self.repo.list_tariffs(active_only=True)
        return [TariffOut.model_validate(t) for t in items]

    async def list_tariffs_admin(self) -> list[TariffOut]:
        items = await self.repo.list_tariffs(active_only=False)
        return [TariffOut.model_validate(t) for t in items]

    async def create_tariff(self, payload: TariffCreate) -> TariffOut:
        data = payload.model_dump(by_alias=False)
        if await self.repo.get_tariff_by_code(data["code"]):
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Tariff code already exists")
        if data.get("is_default"):
            await self.repo.clear_default_flags()
        tariff = await self.repo.create_tariff(**data)
        return TariffOut.model_validate(tariff)

    async def update_tariff(self, tariff_id: UUID, payload: TariffUpdate) -> TariffOut:
        tariff = await self.repo.get_tariff(tariff_id)
        if not tariff:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Tariff not found")
        data = payload.model_dump(by_alias=False, exclude_unset=True)
        if "code" in data and data["code"] != tariff.code:
            other = await self.repo.get_tariff_by_code(data["code"])
            if other:
                raise HTTPException(status.HTTP_409_CONFLICT, detail="Tariff code already exists")
        if data.get("is_default"):
            await self.repo.clear_default_flags()
        if tariff.is_default and data.get("is_default") is False:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Cannot unset default tariff; mark another tariff as default first",
            )
        tariff = await self.repo.update_tariff(tariff, **data)
        return TariffOut.model_validate(tariff)

    async def delete_tariff(self, tariff_id: UUID) -> None:
        tariff = await self.repo.get_tariff(tariff_id)
        if not tariff:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Tariff not found")
        if tariff.is_default:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot delete default tariff")
        content_count = 0
        for model in (Folder, Article, Test, Rescue):
            content_count += int(
                await self.db.scalar(
                    select(func.count()).select_from(model).where(model.required_tariff_id == tariff_id)
                )
                or 0
            )
        sub_count = int(
            await self.db.scalar(
                select(func.count())
                .select_from(UserSubscription)
                .where(UserSubscription.tariff_id == tariff_id)
            )
            or 0
        )
        if content_count or sub_count:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Tariff is in use by content or subscriptions; reassign first",
            )
        await self.repo.delete_tariff(tariff)

    async def ensure_subscription(self, user: User) -> UserSubscription:
        return await self.repo.ensure_free_subscription(user.id)

    async def get_me(self, user: User) -> BillingMeOut:
        sub = await self.ensure_subscription(user)
        tariff = await self.repo.get_tariff(sub.tariff_id)
        if not tariff:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Tariff missing")
        change = await self.repo.get_scheduled_change(user.id)
        scheduled_tariff: Tariff | None = None
        if change:
            scheduled_tariff = await self.repo.get_tariff(change.to_tariff_id)
        return BillingMeOut(
            tariff_id=tariff.id,
            tariff_code=tariff.code,
            tariff_title=tariff.title,
            status=sub.status,
            current_period_start=sub.current_period_start,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=sub.cancel_at_period_end,
            price_rub=tariff.price_rub,
            rank=tariff.rank,
            enforcement=settings.billing_enforcement,
            scheduled_tariff_id=scheduled_tariff.id if scheduled_tariff else None,
            scheduled_tariff_code=scheduled_tariff.code if scheduled_tariff else None,
            scheduled_tariff_title=scheduled_tariff.title if scheduled_tariff else None,
            scheduled_effective_at=change.effective_at if change else None,
            scheduled_change_status=change.status if change else None,
        )

    async def user_rank(self, user: User) -> int:
        if user.role == "admin" or not settings.billing_enforcement:
            return 10_000
        sub = await self.ensure_subscription(user)
        tariff = await self.repo.get_tariff(sub.tariff_id)
        return tariff.rank if tariff else 0

    async def subscribe(self, user: User, tariff_id: UUID, return_url: str | None) -> SubscribeOut:
        target = await self.repo.get_tariff(tariff_id)
        if not target or not target.is_active:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Tariff not found")
        if target.price_rub <= 0 or target.is_default:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot subscribe to free tariff")

        sub = await self.ensure_subscription(user)
        current = await self.repo.get_tariff(sub.tariff_id)
        if not current:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Current tariff missing")
        if current.id == target.id and sub.status == "active":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Already on this tariff")

        existing_change = await self.repo.get_scheduled_change(user.id)
        if existing_change:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="A plan change is already scheduled; cancel it first",
            )

        # Paid → paid: schedule at period end
        if current.price_rub > 0 and target.price_rub > 0:
            change = await self.repo.create_scheduled_change(
                user_id=user.id,
                from_tariff_id=current.id,
                to_tariff_id=target.id,
                status="scheduled",
                effective_at=sub.current_period_end,
                payment_id=None,
            )
            sub.cancel_at_period_end = False
            await self.repo.save_subscription(sub)
            return SubscribeOut(
                scheduled=True,
                scheduled_effective_at=change.effective_at,
                scheduled_tariff_id=target.id,
                message="Смена тарифа запланирована на конец текущего периода",
            )

        return_url = return_url or settings.yookassa_return_url
        idem = str(uuid4())
        payment = await self.repo.create_payment(
            user_id=user.id,
            subscription_id=sub.id,
            tariff_id=target.id,
            amount_rub=float(target.price_rub),
            status="pending",
            yookassa_payment_id=None,
            idempotency_key=idem,
            raw_json=None,
        )

        if not self.yk.configured and not settings.is_prod:
            await self._activate_plan(user, sub, target, payment_method_id=None)
            payment.status = "succeeded"
            payment.raw_json = {"mock": True}
            await self.repo.save_payment(payment)
            return SubscribeOut(
                payment_id=payment.id,
                mock=True,
                message="Mock activation (YooKassa not configured)",
            )

        if not self.yk.configured:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Payments unavailable")

        try:
            yk_obj = await self.yk.create_payment(
                amount_rub=float(target.price_rub),
                description=f"Подписка {target.title}",
                return_url=return_url,
                metadata={
                    "user_id": str(user.id),
                    "tariff_id": str(target.id),
                    "payment_id": str(payment.id),
                },
                customer_email=user.email,
                save_payment_method=True,
                idempotency_key=idem,
            )
        except Exception as exc:
            payment.status = "failed"
            payment.raw_json = {"error": str(exc)}
            await self.repo.save_payment(payment)
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                detail=f"YooKassa error: {exc}",
            ) from exc
        payment.yookassa_payment_id = yk_obj.get("id")
        payment.raw_json = yk_obj
        await self.repo.save_payment(payment)
        confirmation = (yk_obj.get("confirmation") or {}).get("confirmation_url")
        if not confirmation:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                detail="YooKassa did not return confirmation_url",
            )
        return SubscribeOut(
            confirmation_url=confirmation,
            payment_id=payment.id,
            mock=False,
        )

    async def cancel(self, user: User) -> BillingMeOut:
        change = await self.repo.get_scheduled_change(user.id)
        if change:
            change.status = "canceled"
            await self.repo.save_change(change)
            return await self.get_me(user)

        sub = await self.ensure_subscription(user)
        tariff = await self.repo.get_tariff(sub.tariff_id)
        if tariff and tariff.price_rub > 0 and not tariff.is_default:
            sub.cancel_at_period_end = True
            await self.repo.save_subscription(sub)
        return await self.get_me(user)

    async def sync_payment(self, user: User, payment_id: UUID) -> PaymentOut:
        payment = await self.repo.get_payment(payment_id)
        if not payment or payment.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Payment not found")
        if payment.yookassa_payment_id and self.yk.configured:
            yk_obj = await self.yk.get_payment(payment.yookassa_payment_id)
            await self._apply_yookassa_object(payment, yk_obj)
        return PaymentOut.model_validate(payment)

    async def list_payments(self, user: User) -> list[PaymentOut]:
        items = await self.repo.list_payments(user.id)
        return [PaymentOut.model_validate(p) for p in items]

    async def handle_webhook(self, payload: dict[str, Any]) -> dict[str, str]:
        event = payload.get("event")
        if event not in ("payment.succeeded", "payment.canceled"):
            return {"status": "ignored"}
        obj = payload.get("object") or {}
        yk_id = obj.get("id")
        payment: Payment | None = None
        if yk_id:
            payment = await self.repo.get_payment_by_yookassa_id(yk_id)
        if not payment:
            meta = obj.get("metadata") or {}
            pid = meta.get("payment_id")
            if pid:
                try:
                    payment = await self.repo.get_payment(UUID(str(pid)))
                except ValueError:
                    payment = None
        if not payment:
            return {"status": "ok"}
        if payment.yookassa_payment_id and self.yk.configured:
            yk_obj = await self.yk.get_payment(payment.yookassa_payment_id)
        else:
            yk_obj = obj
        await self._apply_yookassa_object(payment, yk_obj)
        return {"status": "ok"}

    async def _apply_yookassa_object(self, payment: Payment, yk_obj: dict[str, Any]) -> None:
        payment.raw_json = yk_obj
        status_str = yk_obj.get("status")
        if status_str in ("canceled", "expired"):
            payment.status = status_str if status_str != "expired" else "expired"
            await self.repo.save_payment(payment)
            return
        if status_str != "succeeded":
            await self.repo.save_payment(payment)
            return

        payment.status = "succeeded"
        pm = yk_obj.get("payment_method") or {}
        pm_id = pm.get("id")
        if pm_id and pm.get("saved"):
            card = (pm.get("card") or {})
            await self.repo.upsert_payment_method(
                user_id=payment.user_id,
                yookassa_payment_method_id=pm_id,
                card_last4=card.get("last4"),
                type_=pm.get("type"),
            )
        user = await self.db.get(User, payment.user_id)
        sub = await self.repo.get_subscription(payment.user_id)
        tariff = await self.repo.get_tariff(payment.tariff_id)
        if user and sub and tariff:
            await self._activate_plan(user, sub, tariff, payment_method_id=pm_id)
        await self.repo.save_payment(payment)

    async def _activate_plan(
        self,
        user: User,
        sub: UserSubscription,
        tariff: Tariff,
        payment_method_id: str | None,
    ) -> None:
        now = datetime.now(timezone.utc)
        sub.tariff_id = tariff.id
        sub.status = "active"
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=tariff.period_days)
        sub.cancel_at_period_end = False
        if payment_method_id:
            sub.yookassa_payment_method_id = payment_method_id
        await self.repo.save_subscription(sub)

    async def renew_due(self) -> dict[str, int]:
        now = datetime.now(timezone.utc)
        activated = 0
        renewed = 0
        downgraded = 0

        for change in await self.repo.list_due_scheduled_changes(now):
            ok = await self._charge_scheduled_change(change)
            if ok:
                activated += 1

        for sub in await self.repo.list_due_subscriptions(now):
            tariff = await self.repo.get_tariff(sub.tariff_id)
            if not tariff or tariff.price_rub <= 0 or tariff.is_default:
                continue
            if not sub.yookassa_payment_method_id or not self.yk.configured:
                sub.status = "past_due"
                await self.repo.save_subscription(sub)
                continue
            user = await self.db.get(User, sub.user_id)
            if not user:
                continue
            try:
                yk_obj = await self.yk.create_payment(
                    amount_rub=float(tariff.price_rub),
                    description=f"Продление {tariff.title}",
                    return_url=settings.yookassa_return_url,
                    metadata={
                        "user_id": str(user.id),
                        "tariff_id": str(tariff.id),
                        "renewal": "1",
                    },
                    customer_email=user.email,
                    save_payment_method=False,
                    payment_method_id=sub.yookassa_payment_method_id,
                )
            except Exception:
                sub.status = "past_due"
                await self.repo.save_subscription(sub)
                continue
            payment = await self.repo.create_payment(
                user_id=user.id,
                subscription_id=sub.id,
                tariff_id=tariff.id,
                amount_rub=float(tariff.price_rub),
                status="pending",
                yookassa_payment_id=yk_obj.get("id"),
                idempotency_key=str(uuid4()),
                raw_json=yk_obj,
            )
            if yk_obj.get("status") == "succeeded":
                await self._apply_yookassa_object(payment, yk_obj)
                renewed += 1
            else:
                sub.status = "past_due"
                await self.repo.save_subscription(sub)

        grace_cutoff = now - timedelta(days=3)
        free = await self.repo.get_default_tariff()
        if free:
            for sub in await self.repo.list_grace_downgrades(grace_cutoff):
                cur = await self.repo.get_tariff(sub.tariff_id)
                if cur and cur.is_default:
                    continue
                sub.tariff_id = free.id
                sub.status = "active"
                sub.cancel_at_period_end = False
                sub.yookassa_payment_method_id = None
                sub.current_period_start = now
                sub.current_period_end = now + timedelta(days=free.period_days)
                await self.repo.save_subscription(sub)
                downgraded += 1

        return {"activated_changes": activated, "renewed": renewed, "downgraded": downgraded}

    async def _charge_scheduled_change(self, change: SubscriptionChange) -> bool:
        sub = await self.repo.get_subscription(change.user_id)
        target = await self.repo.get_tariff(change.to_tariff_id)
        user = await self.db.get(User, change.user_id)
        if not sub or not target or not user:
            change.status = "failed"
            await self.repo.save_change(change)
            return False
        if not sub.yookassa_payment_method_id or not self.yk.configured:
            if not self.yk.configured and not settings.is_prod:
                await self._activate_plan(user, sub, target, None)
                change.status = "activated"
                await self.repo.save_change(change)
                return True
            change.status = "failed"
            await self.repo.save_change(change)
            return False
        try:
            yk_obj = await self.yk.create_payment(
                amount_rub=float(target.price_rub),
                description=f"Смена тарифа на {target.title}",
                return_url=settings.yookassa_return_url,
                metadata={
                    "user_id": str(user.id),
                    "tariff_id": str(target.id),
                    "scheduled_change_id": str(change.id),
                },
                customer_email=user.email,
                save_payment_method=False,
                payment_method_id=sub.yookassa_payment_method_id,
            )
        except Exception:
            change.status = "failed"
            await self.repo.save_change(change)
            return False
        payment = await self.repo.create_payment(
            user_id=user.id,
            subscription_id=sub.id,
            tariff_id=target.id,
            amount_rub=float(target.price_rub),
            status="pending",
            yookassa_payment_id=yk_obj.get("id"),
            idempotency_key=str(uuid4()),
            raw_json=yk_obj,
        )
        change.payment_id = payment.id
        if yk_obj.get("status") == "succeeded":
            await self._apply_yookassa_object(payment, yk_obj)
            change.status = "activated"
            await self.repo.save_change(change)
            return True
        change.status = "failed"
        await self.repo.save_change(change)
        return False
