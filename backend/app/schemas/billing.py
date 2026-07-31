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


class SubscribeRequest(CamelModel):
    tariff_id: UUID = Field(alias="tariffId")
    return_url: str | None = Field(None, alias="returnUrl", max_length=512)


class SubscribeOut(CamelModel):
    confirmation_url: str | None = Field(None, alias="confirmationUrl")
    payment_id: UUID | None = Field(None, alias="paymentId")
    mock: bool = False
    message: str | None = None
    scheduled: bool = False
    scheduled_effective_at: datetime | None = Field(None, alias="scheduledEffectiveAt")
    scheduled_tariff_id: UUID | None = Field(None, alias="scheduledTariffId")


class PaymentOut(CamelModel):
    id: UUID
    tariff_id: UUID = Field(alias="tariffId")
    amount_rub: float = Field(alias="amountRub")
    status: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    yookassa_payment_id: str | None = Field(None, alias="yookassaPaymentId")
