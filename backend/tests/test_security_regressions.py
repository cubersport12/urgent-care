from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api import deps
from app.api.v1 import auth, media
from app.schemas.certificates import CertificateVerifyOut
from app.services.billing import BillingService


def test_public_certificate_verification_contains_status_only():
    assert CertificateVerifyOut(number=123).model_dump(by_alias=True, exclude_none=True) == {
        "number": 123,
        "valid": True,
    }


def test_invalid_login_code_attempt_is_committed(monkeypatch):
    user = SimpleNamespace(id=uuid4(), is_active=True)
    monkeypatch.setattr(auth.UserRepository, "get_by_email", AsyncMock(return_value=user))
    monkeypatch.setattr(auth.LoginCodeRepository, "consume", AsyncMock(return_value=False))
    db = SimpleNamespace(commit=AsyncMock(), rollback=AsyncMock())

    async def override_db():
        yield db
        await db.commit()

    app = FastAPI()
    app.include_router(auth.router)
    app.dependency_overrides[deps.get_db] = override_db

    with TestClient(app) as client:
        response = client.post(
            "/auth/login/code/verify",
            json={"email": "user@example.com", "code": "000000"},
        )

    assert response.status_code == 400
    db.commit.assert_awaited_once()
    db.rollback.assert_not_awaited()


def test_yookassa_payment_matches_our_pending_payment():
    payment = SimpleNamespace(external_id="provider-1", amount_rub=199.5)

    assert BillingService._matches_payment(
        payment,
        {
            "id": "provider-1",
            "amount": {"value": "199.50", "currency": "RUB"},
        },
    )


@pytest.mark.parametrize(
    "provider_object",
    [
        {"id": "other", "amount": {"value": "199.50", "currency": "RUB"}},
        {"id": "provider-1", "amount": {"value": "1.00", "currency": "RUB"}},
        {"id": "provider-1", "amount": {"value": "199.50", "currency": "USD"}},
        {"id": "provider-1", "amount": {"value": "invalid", "currency": "RUB"}},
    ],
)
def test_yookassa_payment_rejects_mismatched_provider_fields(provider_object):
    payment = SimpleNamespace(external_id="provider-1", amount_rub=199.5)

    assert not BillingService._matches_payment(payment, provider_object)


@pytest.mark.asyncio
async def test_yookassa_webhook_does_not_trust_metadata_payment_id():
    service = BillingService.__new__(BillingService)
    service.yk = SimpleNamespace(configured=True, get_payment=AsyncMock())
    provider_id = uuid4()
    internal_payment_id = uuid4()
    service.repo = SimpleNamespace(
        get_payment_by_external_id=AsyncMock(return_value=None),
        get_payment=AsyncMock(return_value=None),
    )

    result = await service.handle_webhook(
        {
            "event": "payment.succeeded",
            "object": {
                "id": str(provider_id),
                "metadata": {"payment_id": str(internal_payment_id)},
            },
        }
    )

    assert result == {"status": "ok"}
    service.repo.get_payment.assert_awaited_once_with(internal_payment_id)
    service.yk.get_payment.assert_not_awaited()


@pytest.mark.asyncio
async def test_certificate_image_is_hidden_from_other_users():
    owner_id = uuid4()
    db = SimpleNamespace(
        scalar=AsyncMock(
            return_value=SimpleNamespace(
                user_id=owner_id,
                file_path="public/certificates/000123.png",
            )
        )
    )
    other_user = SimpleNamespace(id=uuid4(), role="user")

    with pytest.raises(HTTPException) as error:
        await media.download_media("public/certificates/000123.png", db, other_user)

    assert error.value.status_code == 404
