"""Provider selection and YooKassa checkout routing."""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.billing import provider_for_channel
from app.billing.rustore import RuStoreProvider
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
    tariff.rustore_product_id = None
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
    subscription.rustore_purchase_id = None
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


def _rustore_provider() -> RuStoreProvider:
    provider = RuStoreProvider.__new__(RuStoreProvider)
    provider.api_key_id = "key-1"
    provider.api_private_key_b64 = "private-key"
    provider.app_id = "app-1"
    provider.package_name = "ru.test.app"
    provider.sandbox = False
    provider._private_key = None
    provider.cancel_subscription = AsyncMock()
    provider.get_subscription = AsyncMock()
    return provider


def test_provider_for_channel():
    assert provider_for_channel(None) == "yookassa"
    assert provider_for_channel("web") == "yookassa"
    assert provider_for_channel("rustore") == "yookassa"
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


@pytest.mark.asyncio
async def test_cancel_legacy_rustore_subscription_disables_auto_renewal():
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    sub = _sub(user.id, uuid.uuid4())
    sub.rustore_purchase_id = "purchase-1"
    tariff = _tariff(rustore_product_id="product-1")
    service = _service()
    service.repo.get_scheduled_change = AsyncMock(return_value=None)
    service.repo.ensure_free_subscription = AsyncMock(return_value=sub)
    service.repo.get_tariff = AsyncMock(return_value=tariff)
    service.repo.save_subscription = AsyncMock()
    service.get_me = AsyncMock(return_value=MagicMock())
    rustore = _rustore_provider()
    service.providers["rustore"] = rustore

    await service.cancel(user)

    rustore.cancel_subscription.assert_awaited_once_with("purchase-1")
    assert sub.cancel_at_period_end is True
    service.repo.save_subscription.assert_awaited_once_with(sub)


@pytest.mark.asyncio
async def test_cancel_does_not_mark_rustore_canceled_when_provider_fails():
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    sub = _sub(user.id, uuid.uuid4())
    sub.rustore_purchase_id = "purchase-1"
    service = _service()
    service.repo.get_scheduled_change = AsyncMock(return_value=None)
    service.repo.ensure_free_subscription = AsyncMock(return_value=sub)
    service.repo.get_tariff = AsyncMock(return_value=_tariff())
    service.repo.save_subscription = AsyncMock()
    rustore = _rustore_provider()
    rustore.cancel_subscription.side_effect = RuntimeError("provider unavailable")
    service.providers["rustore"] = rustore

    with pytest.raises(HTTPException) as error:
        await service.cancel(user)

    assert error.value.status_code == 502
    assert sub.cancel_at_period_end is False
    service.repo.save_subscription.assert_not_awaited()


@pytest.mark.asyncio
async def test_reconcile_legacy_rustore_renewal():
    sub = _sub(uuid.uuid4(), uuid.uuid4())
    sub.rustore_purchase_id = "purchase-1"
    tariff = _tariff(rustore_product_id="product-1")
    old_end = sub.current_period_end
    new_end = old_end + timedelta(days=30)
    rustore = _rustore_provider()
    rustore.get_subscription.return_value = {
        "autoRenewing": False,
        "expiryTimeMillis": str(int(new_end.timestamp() * 1000)),
        "priceAmountMicros": "990000000",
    }
    service = _service()
    service.providers["rustore"] = rustore
    service.repo.get_tariff = AsyncMock(return_value=tariff)
    service.repo.create_payment = AsyncMock()
    service.repo.save_subscription = AsyncMock()
    service._emit_subscription_granted = AsyncMock()

    changed = await service.reconcile_rustore(sub)

    assert changed is True
    assert sub.cancel_at_period_end is True
    assert abs((sub.current_period_end - new_end).total_seconds()) < 0.001
    assert service.repo.create_payment.call_args.kwargs["provider"] == "rustore"
    assert service.repo.create_payment.call_args.kwargs["commit"] is False
    assert service.repo.create_payment.call_args.kwargs["amount_rub"] == 990.0
    service.repo.save_subscription.assert_awaited_once_with(sub)
    service._emit_subscription_granted.assert_awaited_once_with(
        sub.user_id, tariff, sub, "renewal"
    )


@pytest.mark.asyncio
async def test_renew_due_runs_legacy_rustore_reconciliation():
    service = _service()
    service.repo.list_rustore_subscriptions = AsyncMock(return_value=[_sub(uuid.uuid4(), uuid.uuid4())])
    service.reconcile_rustore = AsyncMock(return_value=True)
    service.repo.list_due_scheduled_changes = AsyncMock(return_value=[])
    service.repo.list_due_subscriptions = AsyncMock(return_value=[])
    service.repo.get_default_tariff = AsyncMock(return_value=None)

    result = await service.renew_due()

    assert result["rustore_reconciled"] == 1
    service.reconcile_rustore.assert_awaited_once()
