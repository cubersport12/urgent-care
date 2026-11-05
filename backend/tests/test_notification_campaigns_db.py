"""Campaign persistence checks against a disposable PostgreSQL database.

Set TEST_NOTIFICATION_DATABASE_URL to a database whose name starts with codex_notification_.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.api.v1.admin_notifications import (
    create_schedule,
    delete_template,
    repeat,
    send_campaign,
    stop_schedule,
)
from app.db.base import Base
from app.models.notification import Notification
from app.models.notification_campaign import NotificationTemplate
from app.models.user import User
from app.schemas.notification_campaigns import DispatchInput
from app.services.notification_campaigns import create_dispatch


@pytest.mark.asyncio
async def test_campaign_snapshot_and_repeat():
    url = os.environ.get("TEST_NOTIFICATION_DATABASE_URL")
    if not url:
        pytest.skip("TEST_NOTIFICATION_DATABASE_URL is not set")
    if not (make_url(url).database or "").startswith("codex_notification_"):
        pytest.fail("Refusing to use a database without the codex_notification_ prefix")
    engine = create_async_engine(url)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await conn.run_sync(Base.metadata.create_all)
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as db:
            suffix = uuid4().hex
            first = User(email=f"{suffix}-a@example.com", full_name="Анна", role="user", is_active=True)
            second = User(email=f"{suffix}-b@example.com", full_name="", role="user", is_active=True)
            blocked = User(email=f"{suffix}-c@example.com", full_name="Blocked", role="user", is_active=False)
            db.add_all([first, second, blocked])
            await db.flush()
            dispatch = await create_dispatch(
                db, title="Привет", body="Здравствуйте, {{name}}", icon_path=None,
                audience="selected", user_ids=[first.id, second.id, blocked.id, first.id], source="manual",
            )
            await db.commit()
            assert dispatch.recipient_count == 2
            rows = (await db.scalars(select(Notification).where(Notification.dispatch_id == dispatch.id))).all()
            assert {row.body for row in rows} == {"Здравствуйте, Анна", "Здравствуйте, коллега"}
            first.full_name = "Новое имя"
            second.is_active = False
            await db.flush()
            repeated = await create_dispatch(
                db, title=dispatch.title, body=dispatch.body, icon_path=None,
                audience=dispatch.audience, user_ids=[], source="repeat", original_id=dispatch.id,
            )
            await db.flush()
            rows = (await db.scalars(select(Notification).where(Notification.dispatch_id == repeated.id))).all()
            assert repeated.recipient_count == 1
            assert rows[0].body == "Здравствуйте, Анна"

            admin = User(email=f"{suffix}-admin@example.com", full_name="Admin", role="admin", is_active=True)
            db.add(admin)
            await db.flush()
            payload = DispatchInput(name="Тест", title="Сообщение", body="Текст", audience="selected", user_ids=[first.id])
            request_id = uuid4()
            sent = await send_campaign(payload, db, admin, request_id)
            duplicate = await send_campaign(payload, db, admin, request_id)
            assert sent.id == duplicate.id
            repeated_api = await repeat(sent.id, db, admin, uuid4())
            assert repeated_api.recipient_count == 1
            scheduled = await create_schedule(payload.model_copy(update={"cron": "0 9 * * *"}), db, admin)
            assert scheduled.snapshot["title"] == "Сообщение"
            template = NotificationTemplate(**payload.model_dump(mode="json", exclude={"template_id"}))
            db.add(template)
            await db.flush()
            scheduled.template_id = template.id
            sent.template_id = template.id
            await db.flush()
            await delete_template(template.id, db, admin)
            await db.flush()
            await db.refresh(scheduled)
            await db.refresh(sent)
            assert scheduled.active is True
            assert scheduled.template_id is None
            assert sent.template_id is None
            await stop_schedule(scheduled.id, db, admin)
            assert scheduled.active is False
    finally:
        await engine.dispose()
