"""Provider selection and YooKassa checkout routing."""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.billing import provider_for_channel
from app.models.billing import Payment, Tariff, UserSubscription
from app.models.user import User
from app.services.billing import BillingService


def _service() -> BillingService:
    return BillingService(AsyncMock())


def _tariff(**overrides) -> MagicMock:
    tariff = MagicMock(spec=Tariff)
    tariff.id = uuid.uuid4()
    tariff.code = "pro"
    tariff.title = "Pro"
    tariff.price_rub = 990
    tariff.period_days = 30
    tariff.rank = 5
    tariff.effect_color = None
    tariff.glow_effect = "none"
    tariff.is_default = False
    tariff.is_active = True
    for key, value in overrides.items():
        setattr(tariff, key, value)
    return tariff


def _sub(user_id: uuid.UUID, tariff_id: uuid.UUID) -> MagicMock:
    subscription = MagicMock(spec=UserSubscription)
    subscription.id = uuid.uuid4()
    subscription.user_id = user_id
    subscription.tariff_id = tariff_id
    subscription.status = "active"
    subscription.cancel_at_period_end = False
    subscription.yookassa_payment_method_id = None
    now = datetime.now(timezone.utc)
    subscription.current_period_start = now
    subscription.current_period_end = now + timedelta(days=30)
    return subscription


def _payment(kwargs: dict) -> MagicMock:
    payment = MagicMock(spec=Payment)
    payment.id = uuid.uuid4()
    for key, value in kwargs.items():
        setattr(payment, key, value)
    payment.status = kwargs.get("status", "pending")
    payment.provider = kwargs.get("provider", "yookassa")
    payment.external_id = kwargs.get("external_id")
    payment.user_id = kwargs["user_id"]
    payment.tariff_id = kwargs.get("tariff_id", uuid.uuid4())
    payment.amount_rub = kwargs.get("amount_rub", 0.0)
    now = datetime.now(timezone.utc)
    payment.created_at = now
    payment.updated_at = now
    return payment


def _unconfigured_provider(name: str) -> MagicMock:
    provider = MagicMock()
    provider.name = name
    provider.configured = False
    return provider


def test_provider_for_channel():
    assert provider_for_channel(None) == "yookassa"
    assert provider_for_channel("web") == "yookassa"
    assert provider_for_channel("unsupported") == "yookassa"


@pytest.mark.asyncio
async def test_subscribe_routes_through_selected_provider():
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "a@b.ru"
    target = _tariff()
    current = _tariff(price_rub=0, rank=0, is_default=True)

    service = _service()
    service.providers = {"yookassa": _unconfigured_provider("yookassa")}
    service.repo.get_tariff = AsyncMock(side_effect=[target, current])
    service.repo.ensure_free_subscription = AsyncMock(
        return_value=_sub(user.id, current.id)
    )
    service.repo.get_scheduled_change = AsyncMock(return_value=None)
    service.repo.create_payment = AsyncMock(side_effect=lambda **kwargs: _payment(kwargs))
    service.repo.save_payment = AsyncMock()
    service.repo.save_subscription = AsyncMock()
    service.repo.get_user_active_promo = AsyncMock(return_value=None)

    result = await service.subscribe(user, target.id, None, channel="web")

    assert service.repo.create_payment.call_args.kwargs["provider"] == "yookassa"
    assert result.provider == "yookassa"
    assert result.mock is True
