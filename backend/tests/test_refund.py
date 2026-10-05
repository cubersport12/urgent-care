"""Tests for YooKassa refund logic and schemas."""
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.schemas.billing import RefundOut
from app.billing.yookassa_client import YooKassaClient
from app.services.billing import BillingService
from app.models.billing import Payment, UserSubscription, Tariff
from app.models.user import User


def test_refund_out_schema():
    payment_id = uuid.uuid4()
    out = RefundOut(
        status="ok",
        refundedAmount=490.0,
        paymentId=payment_id,
        message="Возврат средств успешно выполнен",
    )
    assert out.status == "ok"
    assert out.refunded_amount == 490.0
    assert out.payment_id == payment_id
    dumped = out.model_dump(by_alias=True)
    assert dumped["refundedAmount"] == 490.0
    assert dumped["paymentId"] == payment_id


@pytest.mark.asyncio
async def test_yookassa_client_create_refund():
    client = YooKassaClient()
    client.shop_id = "test_shop"
    client.secret_key = "test_key"

    mock_resp = MagicMock()
    mock_resp.is_error = False
    mock_resp.json.return_value = {"id": "ref_123", "status": "succeeded"}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await client.create_refund(
            payment_id="pay_999",
            amount_rub=350.0,
            idempotency_key="key_1",
        )
        assert res["id"] == "ref_123"
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert args[0] == "https://api.yookassa.ru/v3/refunds"
        assert kwargs["json"]["payment_id"] == "pay_999"
        assert kwargs["json"]["amount"] == {"value": "350.00", "currency": "RUB"}
        assert kwargs["headers"]["Idempotence-Key"] == "key_1"


def test_refund_request_schema():
    from app.schemas.billing import RefundRequest
    req = RefundRequest()
    assert req.cancel_subscription is True
    req2 = RefundRequest(cancelSubscription=False)
    assert req2.cancel_subscription is False


@pytest.mark.asyncio
async def test_billing_service_refund_without_cancellation():
    user_id = uuid.uuid4()
    mock_db = AsyncMock()
    mock_user = MagicMock(spec=User)
    mock_user.id = user_id
    mock_db.get.return_value = mock_user

    service = BillingService(mock_db)
    mock_sub = MagicMock(spec=UserSubscription)
    mock_sub.tariff_id = uuid.uuid4()
    service.repo.get_subscription = AsyncMock(return_value=mock_sub)
    service.repo.save_subscription = AsyncMock()

    mock_payment = MagicMock(spec=Payment)
    mock_payment.status = "succeeded"
    mock_payment.yookassa_payment_id = "yk_123"
    mock_payment.amount_rub = 500.0
    mock_payment.created_at = 1
    mock_payment.id = uuid.uuid4()

    service.repo.list_payments = AsyncMock(return_value=[mock_payment])
    service.repo.save_payment = AsyncMock()
    service.yk.shop_id = ""
    service.yk.secret_key = ""

    res = await service.refund_subscription(user_id, cancel_subscription=False)
    assert res.status == "ok"
    assert res.refunded_amount == 500.0
    assert mock_payment.status == "refunded"
    # save_subscription should NOT be called when cancel_subscription is False
    service.repo.save_subscription.assert_not_called()


@pytest.mark.asyncio
async def test_list_refund_journal():
    from datetime import datetime, timezone
    from app.schemas.billing import RefundJournalOut

    mock_db = AsyncMock()
    service = BillingService(mock_db)

    payment = MagicMock(spec=Payment)
    payment.id = uuid.uuid4()
    payment.amount_rub = 990.0
    payment.updated_at = datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc)
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.full_name = "Иван Иванов"
    user.email = "ivan@example.com"
    rows = MagicMock()
    rows.all.return_value = [(payment, user)]
    mock_db.execute = AsyncMock(return_value=rows)

    res = await service.list_refund_journal()
    assert isinstance(res, RefundJournalOut)
    assert len(res.items) == 1
    item = res.items[0]
    assert item.user_name == "Иван Иванов"
    assert item.user_email == "ivan@example.com"
    assert item.amount_rub == 990.0
    assert item.refunded_at == payment.updated_at
    dumped = item.model_dump(by_alias=True)
    assert dumped["userName"] == "Иван Иванов"
    assert dumped["refundedAt"] is not None
    # query filters refunded payments and joins users
    query = mock_db.execute.call_args[0][0]
    compiled = query.compile()
    assert "refunded" in str(list(compiled.params.values()))
    assert "users" in str(compiled)

