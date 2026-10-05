"""Support chat repository."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import desc, func, or_, select, update

from app.db.repositories.base import BaseRepository
from app.models.support import SupportMessage, SupportThread
from app.models.user import User


class SupportRepository(BaseRepository[SupportThread]):
    model = SupportThread

    async def get_or_create_thread(self, user_id: UUID) -> SupportThread:
        stmt = select(SupportThread).where(SupportThread.user_id == user_id)
        row = (await self.session.execute(stmt)).scalar_one_or_none()
        if row:
            return row
        return await self.create(id=uuid4(), user_id=user_id)

    async def list_messages(self, thread_id: UUID) -> list[SupportMessage]:
        stmt = (
            select(SupportMessage)
            .where(SupportMessage.thread_id == thread_id)
            .order_by(SupportMessage.created_at.asc())
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def add_message(
        self,
        *,
        thread_id: UUID,
        sender_role: str,
        sender_id: UUID | None,
        body: str,
    ) -> SupportMessage:
        now = datetime.now(timezone.utc)
        msg = SupportMessage(
            id=uuid4(),
            thread_id=thread_id,
            sender_role=sender_role,
            sender_id=sender_id,
            body=body.strip(),
        )
        self.session.add(msg)
        await self.session.execute(
            update(SupportThread)
            .where(SupportThread.id == thread_id)
            .values(last_message_at=now, updated_at=now)
        )
        await self.session.flush()
        await self.session.refresh(msg)
        return msg

    async def list_threads(self) -> list[tuple[SupportThread, User, str | None]]:
        # ponytail: N+1 last-body preview; join/subquery if inbox grows large
        stmt = (
            select(SupportThread, User)
            .join(User, User.id == SupportThread.user_id)
            .order_by(SupportThread.last_message_at.desc().nullslast())
        )
        rows = (await self.session.execute(stmt)).all()
        result: list[tuple[SupportThread, User, str | None]] = []
        for thread, user in rows:
            last = (
                await self.session.execute(
                    select(SupportMessage.body)
                    .where(SupportMessage.thread_id == thread.id)
                    .order_by(desc(SupportMessage.created_at))
                    .limit(1)
                )
            ).scalar_one_or_none()
            result.append((thread, user, last))
        return result

    async def unread_counts(self) -> dict[UUID, int]:
        """Непрочитанные сообщения пользователей по тредам (одним запросом)."""
        stmt = (
            select(SupportMessage.thread_id, func.count(SupportMessage.id))
            .join(SupportThread, SupportThread.id == SupportMessage.thread_id)
            .where(
                SupportMessage.sender_role == "user",
                or_(
                    SupportThread.admin_read_at.is_(None),
                    SupportMessage.created_at > SupportThread.admin_read_at,
                ),
            )
            .group_by(SupportMessage.thread_id)
        )
        rows = (await self.session.execute(stmt)).all()
        return {thread_id: int(n) for thread_id, n in rows}

    async def mark_admin_read(self, thread_id: UUID) -> None:
        await self.session.execute(
            update(SupportThread)
            .where(SupportThread.id == thread_id)
            .values(admin_read_at=datetime.now(timezone.utc))
        )
        await self.session.flush()
