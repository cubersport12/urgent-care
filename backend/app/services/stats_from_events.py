"""Project legacy stats DTOs from learning_events (single source of truth)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4, uuid5

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.learning_event import LearningEvent
from app.schemas.stats import (
    ArticleStatsOut,
    RescueStatsOut,
    TestResultOut,
    TestStatsOut,
)
from app.services.learning_events import record_learning_event

# Stable synthetic ids so PATCH /tests-stats/{id} keeps working.
_NS = UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def stable_stats_id(user_id: UUID, entity_type: str, entity_id: str) -> UUID:
    return uuid5(_NS, f"{user_id}:{entity_type}:{entity_id}")


def _payload(ev: LearningEvent) -> dict[str, Any]:
    return ev.payload if isinstance(ev.payload, dict) else {}


async def list_events(
    session: AsyncSession,
    user_id: UUID,
    *,
    entity_type: str | None = None,
    entity_id: str | None = None,
    event: str | None = None,
) -> list[LearningEvent]:
    stmt = select(LearningEvent).where(LearningEvent.user_id == user_id)
    if entity_type:
        stmt = stmt.where(LearningEvent.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(LearningEvent.entity_id == entity_id)
    if event:
        stmt = stmt.where(LearningEvent.event == event)
    stmt = stmt.order_by(LearningEvent.created_at.asc())
    return list((await session.execute(stmt)).scalars().all())


async def project_article_stats(
    session: AsyncSession, user_id: UUID, article_id: str | None = None
) -> list[ArticleStatsOut]:
    events = await list_events(
        session, user_id, entity_type="article", entity_id=article_id, event="completed"
    )
    by_id: dict[str, LearningEvent] = {}
    for ev in events:
        by_id[ev.entity_id] = ev  # last completed wins
    cid = str(user_id)
    return [
        ArticleStatsOut(
            id=stable_stats_id(user_id, "article", eid),
            client_id=cid,
            article_id=eid,
            readed=True,
            created_at=ev.created_at,
        )
        for eid, ev in by_id.items()
    ]


async def upsert_article_completed(
    session: AsyncSession, user_id: UUID, article_id: str, *, readed: bool | None
) -> ArticleStatsOut:
    now = datetime.now(timezone.utc)
    if readed:
        await record_learning_event(
            session,
            user_id=user_id,
            entity_type="article",
            entity_id=article_id,
            event="completed",
        )
    rows = await project_article_stats(session, user_id, article_id)
    if rows:
        return rows[0]
    return ArticleStatsOut(
        id=stable_stats_id(user_id, "article", article_id),
        client_id=str(user_id),
        article_id=article_id,
        readed=bool(readed),
        created_at=now,
    )


def _project_attempt(
    user_id: UUID,
    entity_type: str,
    entity_id: str,
    events: list[LearningEvent],
) -> tuple[datetime, datetime | None, bool | None, Any | None, UUID]:
    started_at: datetime | None = None
    completed_at: datetime | None = None
    passed: bool | None = None
    data: Any | None = None
    last_id = stable_stats_id(user_id, entity_type, entity_id)
    for ev in events:
        if ev.event == "started" and started_at is None:
            started_at = ev.created_at
            last_id = ev.id
        if ev.event == "finished":
            completed_at = ev.created_at
            p = _payload(ev)
            if "passed" in p:
                passed = bool(p["passed"])
            data = p.get("data", data)
            last_id = ev.id
    if started_at is None:
        started_at = completed_at or datetime.now(timezone.utc)
    return started_at, completed_at, passed, data, last_id


async def project_test_stats(
    session: AsyncSession, user_id: UUID, test_id: str | None = None
) -> list[TestStatsOut]:
    events = await list_events(session, user_id, entity_type="test", entity_id=test_id)
    by_id: dict[str, list[LearningEvent]] = {}
    for ev in events:
        if ev.event not in ("started", "finished"):
            continue
        by_id.setdefault(ev.entity_id, []).append(ev)
    cid = str(user_id)
    out: list[TestStatsOut] = []
    for eid, evs in by_id.items():
        started_at, completed_at, passed, data, sid = _project_attempt(
            user_id, "test", eid, evs
        )
        out.append(
            TestStatsOut(
                id=sid,
                client_id=cid,
                test_id=eid,
                started_at=started_at,
                completed_at=completed_at,
                passed=passed,
                data=data,
            )
        )
    return out


async def upsert_test_stats(
    session: AsyncSession,
    user_id: UUID,
    *,
    test_id: str,
    started_at: datetime,
    completed_at: datetime | None,
    passed: bool | None,
    data: Any | None,
) -> TestStatsOut:
    if completed_at is None:
        await record_learning_event(
            session,
            user_id=user_id,
            entity_type="test",
            entity_id=test_id,
            event="started",
            payload={"data": data} if data is not None else None,
        )
    else:
        await record_learning_event(
            session,
            user_id=user_id,
            entity_type="test",
            entity_id=test_id,
            event="finished",
            payload={"passed": bool(passed), "data": data},
        )
    rows = await project_test_stats(session, user_id, test_id)
    return rows[0]


async def project_rescue_stats(
    session: AsyncSession, user_id: UUID, rescue_id: str | None = None
) -> list[RescueStatsOut]:
    events = await list_events(session, user_id, entity_type="rescue", entity_id=rescue_id)
    by_id: dict[str, list[LearningEvent]] = {}
    for ev in events:
        if ev.event not in ("started", "finished"):
            continue
        by_id.setdefault(ev.entity_id, []).append(ev)
    cid = str(user_id)
    out: list[RescueStatsOut] = []
    for eid, evs in by_id.items():
        started_at, completed_at, passed, data, sid = _project_attempt(
            user_id, "rescue", eid, evs
        )
        out.append(
            RescueStatsOut(
                id=sid,
                client_id=cid,
                rescue_id=eid,
                started_at=started_at,
                completed_at=completed_at,
                passed=passed,
                data=data,
            )
        )
    return out


async def upsert_rescue_stats(
    session: AsyncSession,
    user_id: UUID,
    *,
    rescue_id: str,
    started_at: datetime,
    completed_at: datetime | None,
    passed: bool | None,
    data: Any | None,
) -> RescueStatsOut:
    if completed_at is None:
        await record_learning_event(
            session,
            user_id=user_id,
            entity_type="rescue",
            entity_id=rescue_id,
            event="started",
            payload={"data": data} if data is not None else None,
        )
    else:
        await record_learning_event(
            session,
            user_id=user_id,
            entity_type="rescue",
            entity_id=rescue_id,
            event="finished",
            payload={"passed": bool(passed), "data": data},
        )
    rows = await project_rescue_stats(session, user_id, rescue_id)
    return rows[0]


async def project_test_results(
    session: AsyncSession, user_id: UUID, test_id: str | None = None
) -> list[TestResultOut]:
    events = await list_events(
        session, user_id, entity_type="test", entity_id=test_id, event="finished"
    )
    cid = str(user_id)
    out: list[TestResultOut] = []
    for ev in events:
        p = _payload(ev)
        # Only rows that look like full results (have score) — skip bare finished from stats upsert
        if "score" not in p and "total_score" not in p and "answers" not in p:
            # still include if passed key only? include all finished for listing attempts
            pass
        score = p.get("score", p.get("total_score", 0))
        errors = p.get("errors", p.get("total_errors", 0))
        out.append(
            TestResultOut(
                id=ev.id,
                client_id=cid,
                test_id=ev.entity_id,
                total_score=int(score or 0),
                total_errors=int(errors or 0),
                is_passed=bool(p.get("passed", p.get("is_passed", False))),
                completion_type=p.get("completion_type", p.get("completionType")),
                answers=p.get("answers"),
                completed_at=ev.created_at,
            )
        )
    return out


async def create_test_result(
    session: AsyncSession,
    user_id: UUID,
    *,
    test_id: str,
    total_score: int,
    total_errors: int,
    is_passed: bool,
    answers: Any | None,
    completion_type: str | None = None,
) -> TestResultOut:
    row = await record_learning_event(
        session,
        user_id=user_id,
        entity_type="test",
        entity_id=test_id,
        event="finished",
        payload={
            "score": total_score,
            "errors": total_errors,
            "passed": bool(is_passed),
            "completion_type": completion_type,
            "answers": answers,
        },
    )
    assert row is not None
    return TestResultOut(
        id=row.id,
        client_id=str(user_id),
        test_id=test_id,
        total_score=total_score,
        total_errors=total_errors,
        is_passed=is_passed,
        completion_type=completion_type,
        answers=answers,
        completed_at=row.created_at,
    )


async def reset_user_stats(session: AsyncSession, user_id: UUID) -> None:
    await session.execute(delete(LearningEvent).where(LearningEvent.user_id == user_id))


async def resolve_test_entity_id(session: AsyncSession, user_id: UUID, stats_id: UUID) -> str | None:
    """Map synthetic/event id back to test_id for PATCH."""
    # Direct event id
    ev = await session.get(LearningEvent, stats_id)
    if ev and ev.user_id == user_id and ev.entity_type == "test":
        return ev.entity_id
    # Stable uuid5
    rows = await project_test_stats(session, user_id)
    for r in rows:
        if r.id == stats_id:
            return r.test_id
    return None


async def count_distinct_completed(session: AsyncSession, user_id: UUID, entity_type: str, event: str, *, passed_only: bool = False) -> int:
    events = await list_events(session, user_id, entity_type=entity_type, event=event)
    seen: set[str] = set()
    for ev in events:
        if passed_only:
            p = _payload(ev)
            if p.get("passed") is not True:
                continue
        seen.add(ev.entity_id)
    return len(seen)
