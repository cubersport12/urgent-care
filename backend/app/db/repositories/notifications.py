"""Notification persistence."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID, uuid4

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_user(
        self, user_id: UUID, *, unread_only: bool = False, limit: int = 100
    ) -> Sequence[Notification]:
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        if unread_only:
            stmt = stmt.where(Notification.read_at.is_(None))
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def unread_count(self, user_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        )
        return int(result.scalar_one())

    async def get_for_user(self, notification_id: UUID, user_id: UUID) -> Notification | None:
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def mark_read(self, notification: Notification) -> Notification:
        if notification.read_at is None:
            notification.read_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(notification)
        return notification

    async def mark_all_read(self, user_id: UUID) -> int:
        result = await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
            .values(read_at=datetime.now(timezone.utc))
        )
        await self.db.commit()
        return int(result.rowcount or 0)

    async def create(self, *, user_id: UUID, title: str, body: str = "") -> Notification:
        row = Notification(id=uuid4(), user_id=user_id, title=title, body=body)
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def create_for_users(
        self, *, user_ids: Sequence[UUID], title: str, body: str = ""
    ) -> list[Notification]:
        rows = [
            Notification(id=uuid4(), user_id=uid, title=title, body=body)
            for uid in user_ids
        ]
        if not rows:
            return []
        self.db.add_all(rows)
        await self.db.commit()
        for row in rows:
            await self.db.refresh(row)
        return list(rows)
