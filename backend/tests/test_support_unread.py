"""Tests for admin support unread tracking (watermark on SupportThread)."""
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.v1.support import mark_thread_read, post_admin_message, support_unread_count
from app.db.repositories.support import SupportRepository
from app.models.support import SupportMessage, SupportThread
from app.schemas.support import SupportMessageCreate, SupportThreadOut, UnreadCountOut


def _db() -> AsyncMock:
    return AsyncMock()


def _admin() -> MagicMock:
    admin = MagicMock()
    admin.id = uuid.uuid4()
    return admin


def _rows(rows):
    result = MagicMock()
    result.all.return_value = rows
    return result


def test_support_thread_out_unread_alias():
    out = SupportThreadOut(
        id=uuid.uuid4(),
        userId=uuid.uuid4(),
        userEmail="u@example.com",
        updatedAt=datetime.now(timezone.utc),
        unreadCount=3,
    )
    assert out.model_dump(by_alias=True)["unreadCount"] == 3


def test_unread_count_schema():
    assert UnreadCountOut(count=7).model_dump(by_alias=True) == {"count": 7}


@pytest.mark.asyncio
async def test_unread_counts_filters_user_messages_by_watermark():
    db = _db()
    db.execute = AsyncMock(return_value=_rows([(uuid.uuid4(), 2)]))
    repo = SupportRepository(db)
    res = await repo.unread_counts()
    assert len(res) == 1 and next(iter(res.values())) == 2

    compiled = db.execute.call_args[0][0].compile()
    assert "user" in str(list(compiled.params.values()))
    assert "admin_read_at" in str(compiled)


@pytest.mark.asyncio
async def test_unread_count_endpoint_sums_threads():
    db = _db()
    db.execute = AsyncMock(return_value=_rows([(uuid.uuid4(), 2), (uuid.uuid4(), 5)]))
    res = await support_unread_count(db, _admin())
    assert res.count == 7


@pytest.mark.asyncio
async def test_mark_thread_read_404_on_missing_thread():
    with patch.object(SupportRepository, "get", new=AsyncMock(return_value=None)):
        with pytest.raises(HTTPException) as exc:
            await mark_thread_read(uuid.uuid4(), _db(), _admin())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_mark_thread_read_returns_fresh_total():
    thread = MagicMock(spec=SupportThread)
    db = _db()
    db.execute = AsyncMock(return_value=_rows([(uuid.uuid4(), 1)]))
    with (
        patch.object(SupportRepository, "get", new=AsyncMock(return_value=thread)),
        patch.object(SupportRepository, "mark_admin_read", new=AsyncMock()) as mark,
    ):
        res = await mark_thread_read(uuid.uuid4(), db, _admin())
    assert res.count == 1
    mark.assert_awaited_once()


@pytest.mark.asyncio
async def test_admin_reply_marks_thread_read():
    db = _db()
    admin = _admin()
    thread = MagicMock(spec=SupportThread)
    thread.id = uuid.uuid4()
    thread.user_id = uuid.uuid4()

    msg = SupportMessage(
        id=uuid.uuid4(),
        thread_id=thread.id,
        sender_role="admin",
        sender_id=admin.id,
        body="Ответ",
        created_at=datetime.now(timezone.utc),
    )

    with (
        patch.object(SupportRepository, "get", new=AsyncMock(return_value=thread)),
        patch.object(SupportRepository, "add_message", new=AsyncMock(return_value=msg)),
        patch.object(SupportRepository, "mark_admin_read", new=AsyncMock()) as mark,
        patch("app.api.v1.support.UserRepository") as user_repo,
        patch("app.api.v1.support.send_email"),
    ):
        user_repo.return_value.get = AsyncMock(return_value=None)
        res = await post_admin_message(
            thread.id,
            SupportMessageCreate(body="Ответ"),
            MagicMock(),
            db,
            admin,
        )
    mark.assert_awaited_once_with(thread.id)
    assert res.sender_role == "admin"
