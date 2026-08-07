"""Record learning analytics events (append-only)."""
from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

ENTITY_TYPES = frozenset({"article", "test", "rescue", "folder"})
EVENTS = frozenset(
    {
        "opened",
        "progress",
        "completed",
        "started",
        "finished",
    }
)
# Allowed (entity_type, event) pairs
ALLOWED = frozenset(
    {
        ("article", "opened"),
        ("article", "progress"),
        ("article", "completed"),
        ("test", "started"),
        ("test", "finished"),
        ("rescue", "started"),
        ("rescue", "finished"),
    }
)


async def record_learning_event(
    session: AsyncSession,
    *,
    user_id: UUID,
    entity_type: str,
    entity_id: str,
    event: str,
    payload: dict[str, Any] | None = None,
):
    from app.models.learning_event import LearningEvent

    et = (entity_type or "").strip().lower()
    ev = (event or "").strip().lower()
    eid = (entity_id or "").strip()
    if not eid or (et, ev) not in ALLOWED:
        return None
    row = LearningEvent(
        id=uuid4(),
        user_id=user_id,
        entity_type=et,
        entity_id=eid,
        event=ev,
        payload=payload,
    )
    session.add(row)
    await session.flush()
    # Unlock + WS push only on terminal events (opened/progress never unlock).
    if ev in ("completed", "finished"):
        from app.services.achievement_notify import sync_and_notify

        await sync_and_notify(session, user_id)
    return row
