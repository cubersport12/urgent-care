"""Persist and deliver administrative notification campaigns."""
from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from uuid import UUID

import httpx
from croniter import croniter
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import AsyncSessionLocal, engine
from app.models.notification import Notification
from app.models.notification_campaign import NotificationDispatch, NotificationSchedule
from app.models.push_token import PushToken
from app.models.user import User
from app.realtime.notifications_hub import notification_hub
from app.schemas.notifications import NotificationOut
from app.services.expo_push import EXPO_PUSH_URL

log = logging.getLogger(__name__)


async def create_dispatch(
    db: AsyncSession, *, title: str, body: str, icon_path: str | None,
    audience: str, user_ids: list[UUID], source: str,
    template_id: UUID | None = None, schedule_id: UUID | None = None,
    scheduled_at: datetime | None = None, idempotency_key: str | None = None,
    original_id: UUID | None = None, personalize: bool = True,
) -> NotificationDispatch:
    if original_id is not None:
        original = (await db.execute(
            select(User, Notification).join(Notification, Notification.user_id == User.id)
            .where(Notification.dispatch_id == original_id, User.is_active.is_(True))
        )).all()
        recipients = [(user, row.body) for user, row in original]
    else:
        stmt = select(User).where(User.is_active.is_(True))
        if audience == "selected":
            stmt = stmt.where(User.id.in_(user_ids))
        users = (await db.scalars(stmt)).all()
        recipients = [(user, body.replace("{{name}}", user.full_name.strip() or "коллега") if personalize else body) for user in users]

    dispatch = NotificationDispatch(
        title=title, body=body, icon_path=icon_path, audience=audience, source=source,
        template_id=template_id, schedule_id=schedule_id, scheduled_at=scheduled_at,
        idempotency_key=idempotency_key, recipient_count=len(recipients),
        status="pending" if recipients else "empty",
    )
    db.add(dispatch)
    await db.flush()
    db.add_all([
        Notification(user_id=user.id, dispatch_id=dispatch.id, title=title, body=rendered, icon_path=icon_path)
        for user, rendered in recipients
    ])
    await db.flush()
    return dispatch


async def _deliver(dispatch_id: UUID) -> None:
    async with AsyncSessionLocal() as db:
        rows = (await db.scalars(select(Notification).where(Notification.dispatch_id == dispatch_id))).all()
        tokens = (await db.execute(
            select(PushToken.user_id, PushToken.token).where(PushToken.user_id.in_([row.user_id for row in rows]))
        )).all()
        by_user: dict[UUID, list[str]] = {}
        for user_id, token in tokens:
            by_user.setdefault(user_id, []).append(token)
        messages = []
        for row in rows:
            payload = NotificationOut(
                id=row.id, title=row.title, body=row.body, created_at=row.created_at,
                read_at=row.read_at, is_read=row.read_at is not None, icon_path=row.icon_path,
            ).model_dump(mode="json", by_alias=True)
            await notification_hub.send_user(row.user_id, {"type": "notification", "data": payload})
            for token in by_user.get(row.user_id, []):
                messages.append({"to": token, "sound": "default", "title": row.title,
                                 "body": (row.body or row.title)[:300], "data": {}, "channelId": "default"})

        accepted = failed = 0
        uncertain = False
        async with httpx.AsyncClient(timeout=15) as client:
            for offset in range(0, len(messages), 100):
                chunk = messages[offset:offset + 100]
                try:
                    response = await client.post(EXPO_PUSH_URL, json=chunk)
                    if response.status_code >= 500:
                        uncertain = True
                        continue
                    if response.status_code >= 400:
                        failed += len(chunk)
                        continue
                    tickets = response.json().get("data", [])
                    if not isinstance(tickets, list) or len(tickets) != len(chunk):
                        uncertain = True
                        continue
                    accepted += sum(ticket.get("status") == "ok" for ticket in tickets)
                    failed += sum(ticket.get("status") != "ok" for ticket in tickets)
                except (httpx.HTTPError, ValueError, TypeError, AttributeError):
                    log.exception("Notification push result is unknown")
                    uncertain = True
        await db.execute(update(NotificationDispatch).where(NotificationDispatch.id == dispatch_id).values(
            status="interrupted" if uncertain else "partial" if failed else "completed",
            push_accepted=accepted, push_failed=failed,
        ))
        await db.commit()


async def _delivery_loop() -> None:
    while True:
        try:
            async with AsyncSessionLocal() as db:
                dispatch = await db.scalar(select(NotificationDispatch).where(
                    NotificationDispatch.status == "pending"
                ).order_by(NotificationDispatch.created_at).with_for_update(skip_locked=True).limit(1))
                if dispatch:
                    dispatch.status = "processing"
                    dispatch_id = dispatch.id
                    await db.commit()
                else:
                    dispatch_id = None
            if dispatch_id:
                try:
                    await _deliver(dispatch_id)
                except Exception:
                    log.exception("Notification delivery interrupted")
                    async with AsyncSessionLocal() as db:
                        await db.execute(update(NotificationDispatch).where(NotificationDispatch.id == dispatch_id).values(status="interrupted"))
                        await db.commit()
            else:
                await asyncio.sleep(2)
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("Notification delivery loop failed")
            await asyncio.sleep(5)


async def _schedule_loop() -> None:
    started = datetime.now(UTC)
    while True:
        try:
            now = datetime.now(UTC)
            async with AsyncSessionLocal() as db:
                rows = (await db.scalars(select(NotificationSchedule).where(
                    NotificationSchedule.active.is_(True), NotificationSchedule.next_run_at <= now,
                ).with_for_update(skip_locked=True))).all()
                for schedule in rows:
                    scheduled_at = schedule.next_run_at
                    schedule.next_run_at = croniter(schedule.cron, now).get_next(datetime)
                    # Slots before startup or missed while the loop was unavailable are skipped.
                    if scheduled_at < started or (now - scheduled_at).total_seconds() > 10:
                        continue
                    item = schedule.snapshot
                    await create_dispatch(
                        db, title=item["title"], body=item["body"], icon_path=item.get("icon_path"),
                        audience=item["audience"], user_ids=[UUID(x) for x in item["user_ids"]],
                        source="schedule", template_id=schedule.template_id,
                        schedule_id=schedule.id, scheduled_at=scheduled_at,
                    )
                await db.commit()
            await asyncio.sleep(1)
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("Notification scheduler failed")
            await asyncio.sleep(5)
            started = datetime.now(UTC)


async def run_campaign_worker() -> None:
    """Keep one scheduler and delivery worker active across API processes."""
    while True:
        try:
            async with engine.connect() as connection:
                acquired = await connection.scalar(text("SELECT pg_try_advisory_lock(37912, 18904)"))
                if not acquired:
                    await asyncio.sleep(5)
                    continue
                async with AsyncSessionLocal() as db:
                    await db.execute(update(NotificationDispatch).where(NotificationDispatch.status == "processing").values(status="interrupted"))
                    await db.commit()
                tasks = [asyncio.create_task(_schedule_loop()), asyncio.create_task(_delivery_loop())]
                try:
                    while True:
                        await asyncio.sleep(5)
                        await connection.execute(text("SELECT 1"))
                finally:
                    for task in tasks:
                        task.cancel()
                    await asyncio.gather(*tasks, return_exceptions=True)
                    await connection.execute(text("SELECT pg_advisory_unlock(37912, 18904)"))
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("Notification worker disconnected")
            await asyncio.sleep(5)
