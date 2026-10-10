"""Billing HTTP API."""
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.models.user import User
from app.schemas.billing import (
    BillingMeOut,
    ConfirmRustoreRequest,
    PaymentOut,
    PromoActivateOut,
    PromoActivateRequest,
    PromoCodeCreate,
    PromoCodeOut,
    PromoCodeUpdate,
    RefundOut,
    RefundRequest,
    RefundJournalOut,
    SubscribeOut,
    SubscribeRequest,
    TariffCreate,
    TariffOut,
    TariffUpdate,
)
from app.services.billing import BillingService

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/tariffs", response_model=list[TariffOut])
async def list_tariffs(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[TariffOut]:
    return await BillingService(db).list_tariffs_public()


@router.get("/tariffs/all", response_model=list[TariffOut])
async def list_tariffs_admin(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> list[TariffOut]:
    return await BillingService(db).list_tariffs_admin()


@router.post("/tariffs", response_model=TariffOut, status_code=201)
async def create_tariff(
    payload: TariffCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> TariffOut:
    return await BillingService(db).create_tariff(payload)


@router.patch("/tariffs/{tariff_id}", response_model=TariffOut)
async def update_tariff(
    tariff_id: UUID,
    payload: TariffUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> TariffOut:
    return await BillingService(db).update_tariff(tariff_id, payload)


@router.delete("/tariffs/{tariff_id}", status_code=204)
async def delete_tariff(
    tariff_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> None:
    await BillingService(db).delete_tariff(tariff_id)


@router.get("/promo-codes", response_model=list[PromoCodeOut])
async def list_promo_codes(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> list[PromoCodeOut]:
    return await BillingService(db).list_promo_codes_admin()


@router.post("/promo-codes", response_model=PromoCodeOut, status_code=201)
async def create_promo_code(
    payload: PromoCodeCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> PromoCodeOut:
    return await BillingService(db).create_promo_code(payload)


@router.patch("/promo-codes/{promo_id}", response_model=PromoCodeOut)
async def update_promo_code(
    promo_id: UUID,
    payload: PromoCodeUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> PromoCodeOut:
    return await BillingService(db).update_promo_code(promo_id, payload)


@router.delete("/promo-codes/{promo_id}", status_code=204)
async def delete_promo_code(
    promo_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> None:
    await BillingService(db).delete_promo_code(promo_id)


@router.post("/promo-codes/activate", response_model=PromoActivateOut)
async def activate_promo_code(
    payload: PromoActivateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> PromoActivateOut:
    return await BillingService(db).activate_promo(user, payload.code)


@router.get("/me", response_model=BillingMeOut)
async def billing_me(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> BillingMeOut:
    return await BillingService(db).get_me(user)


@router.post("/subscribe", response_model=SubscribeOut)
async def subscribe(
    payload: SubscribeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> SubscribeOut:
    return await BillingService(db).subscribe(
        user, payload.tariff_id, payload.return_url, channel=payload.channel
    )


@router.post("/subscription/cancel", response_model=BillingMeOut)
async def cancel_subscription(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> BillingMeOut:
    return await BillingService(db).cancel(user)


@router.get("/payments", response_model=list[PaymentOut])
async def list_payments(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[PaymentOut]:
    return await BillingService(db).list_payments(user)


@router.post("/payments/{payment_id}/sync", response_model=PaymentOut)
async def sync_payment(
    payment_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> PaymentOut:
    return await BillingService(db).sync_payment(user, payment_id)


@router.post("/payments/{payment_id}/confirm", response_model=PaymentOut)
async def confirm_payment(
    payment_id: UUID,
    payload: ConfirmRustoreRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> PaymentOut:
    """Подтверждение покупки через RuStore Pay SDK."""
    return await BillingService(db).confirm_rustore(user, payment_id, payload.purchase_id)


@router.post("/users/{user_id}/refund", response_model=RefundOut)
async def refund_user_subscription(
    user_id: UUID,
    payload: RefundRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> RefundOut:
    return await BillingService(db).refund_subscription(
        user_id,
        cancel_subscription=payload.cancel_subscription,
    )


@router.get("/refunds", response_model=RefundJournalOut)
async def list_refund_journal(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> RefundJournalOut:
    return await BillingService(db).list_refund_journal()


@router.post("/webhooks/yookassa", include_in_schema=False)
async def yookassa_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    payload = await request.json()
    return await BillingService(db).handle_webhook(payload)
