"""Billing DTOs."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        ser_json_by_alias=True,
    )


class TariffOut(CamelModel):
    id: UUID
    code: str
    title: str
    description: str | None = None
    price_rub: int = Field(alias="priceRub")
    period_days: int = Field(alias="periodDays")
    rank: int
    is_default: bool = Field(alias="isDefault")
    is_active: bool = Field(alias="isActive")
    sort_order: int = Field(alias="sortOrder")
    rustore_product_id: str | None = Field(None, alias="rustoreProductId")


class TariffCreate(CamelModel):
    code: str
    title: str
    description: str | None = None
    price_rub: int = Field(0, alias="priceRub")
    period_days: int = Field(30, alias="periodDays")
    rank: int = 0
    is_default: bool = Field(False, alias="isDefault")
    is_active: bool = Field(True, alias="isActive")
    sort_order: int = Field(0, alias="sortOrder")
    rustore_product_id: str | None = Field(None, alias="rustoreProductId", max_length=128)


class TariffUpdate(CamelModel):
    code: str | None = None
    title: str | None = None
    description: str | None = None
    price_rub: int | None = Field(None, alias="priceRub")
    period_days: int | None = Field(None, alias="periodDays")
    rank: int | None = None
    is_default: bool | None = Field(None, alias="isDefault")
    is_active: bool | None = Field(None, alias="isActive")
    sort_order: int | None = Field(None, alias="sortOrder")
    rustore_product_id: str | None = Field(None, alias="rustoreProductId", max_length=128)


class ActivePromoOut(CamelModel):
    code: str
    discount_percent: int = Field(alias="discountPercent")
    tariff_id: UUID | None = Field(None, alias="tariffId")
    tariff_title: str | None = Field(None, alias="tariffTitle")
    valid_until: datetime | None = Field(None, alias="validUntil")


class BillingMeOut(CamelModel):
    tariff_id: UUID = Field(alias="tariffId")
    tariff_code: str = Field(alias="tariffCode")
    tariff_title: str = Field(alias="tariffTitle")
    status: str
    current_period_start: datetime = Field(alias="currentPeriodStart")
    current_period_end: datetime = Field(alias="currentPeriodEnd")
    cancel_at_period_end: bool = Field(alias="cancelAtPeriodEnd")
    price_rub: int = Field(alias="priceRub")
    rank: int
    enforcement: bool
    scheduled_tariff_id: UUID | None = Field(None, alias="scheduledTariffId")
    scheduled_tariff_code: str | None = Field(None, alias="scheduledTariffCode")
    scheduled_tariff_title: str | None = Field(None, alias="scheduledTariffTitle")
    scheduled_effective_at: datetime | None = Field(None, alias="scheduledEffectiveAt")
    scheduled_change_status: str | None = Field(None, alias="scheduledChangeStatus")
    promo: ActivePromoOut | None = None


class SubscribeRequest(CamelModel):
    tariff_id: UUID = Field(alias="tariffId")
    return_url: str | None = Field(None, alias="returnUrl", max_length=512)
    # Метка сборки клиента (НЕ выбор платёжной системы): rustore-APK → "rustore",
    # веб и остальные сборки — "web"/нет поля. Провайдера резолвит бекенд.
    channel: str | None = Field(None, max_length=32)


class SubscribeOut(CamelModel):
    provider: str | None = Field(None, alias="provider")
    confirmation_url: str | None = Field(None, alias="confirmationUrl")
    # productId подписки в RuStore: получен → покупка через мобильный SDK
    rustore_product_id: str | None = Field(None, alias="rustoreProductId")
    payment_id: UUID | None = Field(None, alias="paymentId")
    mock: bool = False
    message: str | None = None
    scheduled: bool = False
    scheduled_effective_at: datetime | None = Field(None, alias="scheduledEffectiveAt")
    scheduled_tariff_id: UUID | None = Field(None, alias="scheduledTariffId")


class ConfirmRustoreRequest(CamelModel):
    purchase_id: str = Field(alias="purchaseId", min_length=1, max_length=128)


class PaymentOut(CamelModel):
    id: UUID
    tariff_id: UUID = Field(alias="tariffId")
    amount_rub: float = Field(alias="amountRub")
    status: str
    provider: str = "yookassa"
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    external_id: str | None = Field(None, alias="externalId")


class PromoCodeCreate(CamelModel):
    code: str = Field(min_length=1, max_length=64)
    title: str | None = Field(None, max_length=200)
    type: str = "discount"
    discount_percent: int = Field(1, alias="discountPercent", ge=1, le=99)
    tariff_id: UUID | None = Field(None, alias="tariffId")
    max_activations: int | None = Field(None, alias="maxActivations", ge=1)
    valid_from: datetime | None = Field(None, alias="validFrom")
    valid_until: datetime | None = Field(None, alias="validUntil")
    is_active: bool = Field(True, alias="isActive")


class PromoCodeUpdate(CamelModel):
    title: str | None = Field(None, max_length=200)
    discount_percent: int | None = Field(None, alias="discountPercent", ge=1, le=99)
    tariff_id: UUID | None = Field(None, alias="tariffId")
    max_activations: int | None = Field(None, alias="maxActivations", ge=1)
    valid_from: datetime | None = Field(None, alias="validFrom")
    valid_until: datetime | None = Field(None, alias="validUntil")
    is_active: bool | None = Field(None, alias="isActive")


class PromoCodeOut(CamelModel):
    id: UUID
    code: str
    title: str | None = None
    type: str
    discount_percent: int = Field(alias="discountPercent")
    tariff_id: UUID | None = Field(None, alias="tariffId")
    max_activations: int | None = Field(None, alias="maxActivations")
    valid_from: datetime | None = Field(None, alias="validFrom")
    valid_until: datetime | None = Field(None, alias="validUntil")
    is_active: bool = Field(alias="isActive")
    created_at: datetime = Field(alias="createdAt")
    activations_count: int = Field(0, alias="activationsCount")


class PromoActivateRequest(CamelModel):
    code: str = Field(min_length=1, max_length=64)


class PromoActivateOut(ActivePromoOut):
    message: str


class RefundRequest(CamelModel):
    cancel_subscription: bool = Field(True, alias="cancelSubscription")


class RefundOut(CamelModel):
    status: str
    refunded_amount: float = Field(alias="refundedAmount")
    payment_id: UUID = Field(alias="paymentId")
    message: str


class RefundJournalItem(CamelModel):
    id: UUID
    user_id: UUID = Field(alias="userId")
    user_name: str = Field(alias="userName")
    user_email: str = Field(alias="userEmail")
    amount_rub: float = Field(alias="amountRub")
    refunded_at: datetime = Field(alias="refundedAt")


class RefundJournalOut(CamelModel):
    items: list[RefundJournalItem]
    gateway_configured: bool = Field(alias="gatewayConfigured")
