"""Провайдерная биллинг-логика: выбор по каналу, confirm/reconcile/cancel RuStore.

Запуск: .venv/Scripts/python -m pytest tests/test_payment_providers.py -q
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.billing import provider_for_channel
from app.models.billing import Payment, Tariff, UserSubscription
from app.models.user import User
from app.services.billing import BillingService


def _service() -> BillingService:
    return BillingService(AsyncMock())


def _tariff(**overrides) -> MagicMock:
    t = MagicMock(spec=Tariff)
    t.id = uuid.uuid4()
    t.code = "pro"
    t.title = "Pro"
    t.price_rub = 990
    t.period_days = 30
    t.rank = 5
    t.is_default = False
    t.is_active = True
    t.rustore_product_id = None
    for k, v in overrides.items():
        setattr(t, k, v)
    return t


def _sub(user_id: uuid.UUID, tariff_id: uuid.UUID) -> MagicMock:
    s = MagicMock(spec=UserSubscription)
    s.id = uuid.uuid4()
    s.user_id = user_id
    s.tariff_id = tariff_id
    s.status = "active"
    s.cancel_at_period_end = False
    s.rustore_purchase_id = None
    s.yookassa_payment_method_id = None
    now = datetime.now(timezone.utc)
    s.current_period_start = now
    s.current_period_end = now + timedelta(days=30)
    return s


def test_provider_for_channel():
    # Метка сборки → провайдер; нет метки / web / неизвестное → YooKassa
    assert provider_for_channel(None) == "yookassa"
    assert provider_for_channel("web") == "yookassa"
    assert provider_for_channel("rustore") == "rustore"
    assert provider_for_channel("что-то-иное") == "yookassa"


def _unconfigured_provider(name: str) -> MagicMock:
    p = MagicMock()
    p.name = name
    p.configured = False
    return p


@pytest.mark.asyncio
async def test_subscribe_channel_selects_provider(monkeypatch):
    """channel='rustore' → платёж provider='rustore' и rustoreProductId в ответе;
    без канала → yookassa."""
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "a@b.ru"
    target = _tariff(rustore_product_id="sub_monthly")
    current = _tariff(price_rub=0, rank=0, is_default=True)

    for channel, expected_provider in (("rustore", "rustore"), (None, "yookassa")):
        service = _service()
        # Фейки без configured, чтобы не зависеть от ключей в локальном .env
        service.providers = {
            "yookassa": _unconfigured_provider("yookassa"),
            "rustore": _unconfigured_provider("rustore"),
        }
        service.repo.get_tariff = AsyncMock(side_effect=[target, current])
        service.repo.ensure_free_subscription = AsyncMock(
            return_value=_sub(user.id, current.id)
        )
        service.repo.get_scheduled_change = AsyncMock(return_value=None)
        service.repo.create_payment = AsyncMock(side_effect=lambda **kw: _payment(kw))
        service.repo.save_payment = AsyncMock()
        service.repo.save_subscription = AsyncMock()
        service.repo.get_user_active_promo = AsyncMock(return_value=None)

        out = await service.subscribe(user, target.id, None, channel=channel)

        kwargs = service.repo.create_payment.call_args.kwargs
        assert kwargs["provider"] == expected_provider
        # Провайдер не сконфигурирован в dev → mock-активация
        assert out.mock is True
        assert out.provider == expected_provider


def _payment(kwargs: dict) -> MagicMock:
    p = MagicMock(spec=Payment)
    p.id = uuid.uuid4()
    for k, v in kwargs.items():
        setattr(p, k, v)
    p.status = kwargs.get("status", "pending")
    p.provider = kwargs.get("provider", "yookassa")
    p.external_id = kwargs.get("external_id")
    p.user_id = kwargs["user_id"]
    p.tariff_id = kwargs.get("tariff_id", uuid.uuid4())
    p.amount_rub = kwargs.get("amount_rub", 0.0)
    now = datetime.now(timezone.utc)
    p.created_at = now
    p.updated_at = now
    return p


@pytest.mark.asyncio
async def test_confirm_rustore_happy_path():
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    payment = _payment({"user_id": user.id, "provider": "rustore"})
    tariff = _tariff(rustore_product_id="sub_monthly")
    sub = _sub(user.id, tariff.id)
    sub.current_period_end = datetime.now(timezone.utc) + timedelta(days=5)
    purchase_id = str(uuid.uuid4())
    expiry = datetime.now(timezone.utc) + timedelta(days=30)

    service = _service()
    service.repo.get_payment = AsyncMock(return_value=payment)
    service.repo.get_tariff = AsyncMock(return_value=tariff)
    service.repo.get_subscription = AsyncMock(return_value=sub)
    service.repo.save_payment = AsyncMock()
    service.repo.save_subscription = AsyncMock()
    rs = MagicMock()
    rs.configured = True
    rs.get_subscription = AsyncMock(
        return_value={
            "developerPayload": str(payment.id),
            "paymentState": 1,
            "expiryTimeMillis": str(int(expiry.timestamp() * 1000)),
            "priceAmountMicros": "990000000",
            "autoRenewing": True,
        }
    )
    service.providers["rustore"] = rs

    out = await service.confirm_rustore(user, payment.id, purchase_id)

    assert out.status == "succeeded"
    assert payment.status == "succeeded"
    assert payment.external_id == purchase_id
    assert payment.amount_rub == 990.0
    assert sub.rustore_purchase_id == purchase_id
    # Период выровнен по RuStore (expiry дальше локального периода).
    # Допуск в секунды: expiry и период считаются из двух разных now(),
    # под нагрузкой прогона между ними проходит десятки мс.
    assert abs((sub.current_period_end - expiry).total_seconds()) < 1
    assert sub.status == "active"


@pytest.mark.asyncio
async def test_confirm_rustore_rejects_foreign_purchase():
    """developerPayload не совпадает с платежом → 400, статус не меняется."""
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    payment = _payment({"user_id": user.id, "provider": "rustore"})
    tariff = _tariff(rustore_product_id="sub_monthly")

    service = _service()
    service.repo.get_payment = AsyncMock(return_value=payment)
    service.repo.get_tariff = AsyncMock(return_value=tariff)
    service.repo.save_payment = AsyncMock()
    rs = MagicMock()
    rs.configured = True
    rs.get_subscription = AsyncMock(
        return_value={"developerPayload": str(uuid.uuid4()), "paymentState": 1}
    )
    service.providers["rustore"] = rs

    with pytest.raises(HTTPException) as exc:
        await service.confirm_rustore(user, payment.id, str(uuid.uuid4()))
    assert exc.value.status_code == 400
    assert payment.status == "pending"
    service.repo.save_payment.assert_not_awaited()


@pytest.mark.asyncio
async def test_confirm_rustore_rejects_non_rustore_payment():
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    payment = _payment({"user_id": user.id, "provider": "yookassa"})
    service = _service()
    service.repo.get_payment = AsyncMock(return_value=payment)

    with pytest.raises(HTTPException) as exc:
        await service.confirm_rustore(user, payment.id, str(uuid.uuid4()))
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_confirm_rustore_idempotent_on_settled_payment():
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    payment = _payment({"user_id": user.id, "provider": "rustore"})
    payment.status = "succeeded"
    service = _service()
    service.repo.get_payment = AsyncMock(return_value=payment)

    out = await service.confirm_rustore(user, payment.id, str(uuid.uuid4()))
    assert out.status == "succeeded"


@pytest.mark.asyncio
async def test_reconcile_rustore_renewal_and_cancel():
    """autoRenewing=false → cancel_at_period_end; новое expiry → renewal-платёж."""
    sub = _sub(uuid.uuid4(), uuid.uuid4())
    sub.rustore_purchase_id = str(uuid.uuid4())
    sub.current_period_end = datetime.now(timezone.utc) + timedelta(days=3)
    tariff = _tariff(rustore_product_id="sub_monthly", price_rub=990)
    new_expiry = datetime.now(timezone.utc) + timedelta(days=33)

    service = _service()
    service.repo.get_tariff = AsyncMock(return_value=tariff)
    service.repo.create_payment = AsyncMock(side_effect=lambda **kw: _payment(kw))
    service.repo.save_subscription = AsyncMock()
    service._emit_subscription_granted = AsyncMock()
    rs = MagicMock()
    rs.configured = True
    rs.get_subscription = AsyncMock(
        return_value={
            "autoRenewing": False,
            "paymentState": 1,
            "expiryTimeMillis": str(int(new_expiry.timestamp() * 1000)),
            "priceAmountMicros": "990000000",
        }
    )
    service.providers["rustore"] = rs

    changed = await service.reconcile_rustore(sub)

    assert changed is True
    assert sub.cancel_at_period_end is True
    assert abs((sub.current_period_end - new_expiry).total_seconds()) < 0.001
    kwargs = service.repo.create_payment.call_args.kwargs
    assert kwargs["provider"] == "rustore"
    assert kwargs["status"] == "succeeded"
    assert kwargs["amount_rub"] == 990.0
    service._emit_subscription_granted.assert_awaited_once()

    # Повторная ревалидация идемпотентна: период уже продлён
    changed_again = await service.reconcile_rustore(sub)
    assert changed_again is False


@pytest.mark.asyncio
async def test_cancel_calls_rustore_and_flags_period_end():
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    sub = _sub(user.id, uuid.uuid4())
    sub.rustore_purchase_id = "pur-1"
    tariff = _tariff()

    service = _service()
    service.repo.get_scheduled_change = AsyncMock(return_value=None)
    service.repo.ensure_free_subscription = AsyncMock(return_value=sub)
    service.repo.get_tariff = AsyncMock(return_value=tariff)
    service.repo.save_subscription = AsyncMock()
    service.get_me = AsyncMock(return_value=MagicMock())
    rs = MagicMock()
    rs.configured = True
    rs.cancel_subscription = AsyncMock()
    service.providers["rustore"] = rs

    await service.cancel(user)

    rs.cancel_subscription.assert_awaited_once_with("pur-1")
    assert sub.cancel_at_period_end is True
    service.repo.save_subscription.assert_awaited()


@pytest.mark.asyncio
async def test_cancel_propagates_rustore_error():
    """RuStore API упал → 502, локально ничего не помечаем."""
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    sub = _sub(user.id, uuid.uuid4())
    sub.rustore_purchase_id = "pur-1"
    tariff = _tariff()

    service = _service()
    service.repo.get_scheduled_change = AsyncMock(return_value=None)
    service.repo.ensure_free_subscription = AsyncMock(return_value=sub)
    service.repo.get_tariff = AsyncMock(return_value=tariff)
    rs = MagicMock()
    rs.configured = True
    rs.cancel_subscription = AsyncMock(side_effect=RuntimeError("boom"))
    service.providers["rustore"] = rs

    with pytest.raises(HTTPException) as exc:
        await service.cancel(user)
    assert exc.value.status_code == 502
    assert sub.cancel_at_period_end is False


# --- RuStore Public API auth (keyId + RSA-подпись → JWE-токен) ---

def _rustore_provider():
    from app.billing import rustore as r
    from cryptography.hazmat.primitives.asymmetric import rsa

    provider = r.RuStoreProvider.__new__(r.RuStoreProvider)
    provider.api_key_id = "kid-1"
    provider.api_private_key_b64 = ""
    provider._private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    provider.app_id = "1"
    provider.package_name = "ru.test.app"
    provider.sandbox = False
    return provider


def test_rustore_signature_verifies():
    """Подпись = RSA-SHA512(keyId + timestamp), проверяется публичным ключом."""
    import base64
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import padding

    provider = _rustore_provider()
    ts = "2026-10-11T10:00:00.000Z"
    sig = base64.b64decode(provider._sign(ts))
    # verify() бросит исключение при несовпадении
    provider._private_key.public_key().verify(
        sig, ("kid-1" + ts).encode(), padding.PKCS1v15(), hashes.SHA512()
    )


@pytest.mark.asyncio
async def test_rustore_token_cached_and_sent(monkeypatch):
    """JWE-токен получается один раз, кешируется и уходит в Public-Token."""
    import httpx
    from unittest.mock import MagicMock
    import app.billing.rustore as r

    r._token_cache.clear()
    provider = _rustore_provider()
    calls = {"auth": 0, "req": 0}

    auth_resp = MagicMock()
    auth_resp.is_error = False
    auth_resp.json.return_value = {"code": "OK", "body": {"jwe": "TOK-1"}}

    def make_get_resp():
        resp = MagicMock()
        resp.is_error = False
        resp.json.return_value = {"code": "OK", "body": {"paymentState": 1}}
        return resp

    async def fake_post(self, url, **kwargs):
        calls["auth"] += 1
        assert url.endswith("/public/auth/")
        return auth_resp

    async def fake_request(self, method, url, **kwargs):
        calls["req"] += 1
        assert kwargs["headers"]["Public-Token"] == "TOK-1"
        return make_get_resp()

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    monkeypatch.setattr(httpx.AsyncClient, "request", fake_request)

    body = await provider.get_subscription("prod-1", "pur-1")
    assert body == {"paymentState": 1}
    await provider.get_subscription("prod-1", "pur-1")
    assert calls == {"auth": 1, "req": 2}
    r._token_cache.clear()


@pytest.mark.asyncio
async def test_rustore_expired_token_reauths_once(monkeypatch):
    """Ответ 'Jwe token is expired' → токен сбрасывается и запрос повторяется."""
    import httpx
    from unittest.mock import MagicMock
    import app.billing.rustore as r

    r._token_cache.clear()
    provider = _rustore_provider()
    calls = {"auth": 0, "req": 0}

    auth_resp = MagicMock()
    auth_resp.is_error = False
    auth_resp.json.return_value = {"code": "OK", "body": {"jwe": "TOK-1"}}

    ok_resp = MagicMock()
    ok_resp.is_error = False
    ok_resp.json.return_value = {"code": "OK", "body": {"paymentState": 1}}
    expired_resp = MagicMock()
    expired_resp.is_error = False
    expired_resp.json.return_value = {"code": "ERROR", "message": "Jwe token is expired"}

    async def fake_post(self, url, **kwargs):
        calls["auth"] += 1
        return auth_resp

    async def fake_request(self, method, url, **kwargs):
        calls["req"] += 1
        return expired_resp if calls["req"] == 1 else ok_resp

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    monkeypatch.setattr(httpx.AsyncClient, "request", fake_request)

    body = await provider.get_subscription("prod-1", "pur-1")
    assert body == {"paymentState": 1}
    assert calls == {"auth": 2, "req": 2}
    r._token_cache.clear()
