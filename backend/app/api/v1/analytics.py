"""Admin analytics: summary metrics and recent activity feed."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.models.article import Article
from app.models.billing import Payment, Tariff, UserSubscription
from app.models.learning_event import LearningEvent
from app.models.rescue import Rescue
from app.models.test import Test
from app.models.user import User
from app.schemas.analytics import ActivityEventOut, AnalyticsDayOut, AnalyticsSummaryOut, AnalyticsTariffOut

router = APIRouter(prefix="/analytics", tags=["analytics"])

_PERIODS = {
    "week": timedelta(days=7),
    "month": timedelta(days=30),
    "year": timedelta(days=365),
}


@router.get("/summary", response_model=AnalyticsSummaryOut)
async def analytics_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
    period: str = Query("month"),
) -> AnalyticsSummaryOut:
    delta = _PERIODS.get(period)
    if delta is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="period must be week|month|year")
    now = datetime.now(timezone.utc)
    since = now - delta
    week_ago = now - timedelta(days=7)

    users_total = await db.scalar(select(func.count(User.id))) or 0
    users_new = await db.scalar(
        select(func.count(User.id)).where(User.created_at >= since)
    ) or 0
    active_subscriptions = await db.scalar(
        select(func.count(UserSubscription.id)).where(
            UserSubscription.status == "active",
            UserSubscription.current_period_end > now,
        )
    ) or 0
    revenue = await db.scalar(
        select(func.coalesce(func.sum(Payment.amount_rub), 0.0)).where(
            Payment.status == "succeeded",
            Payment.created_at >= since,
        )
    ) or 0.0

    event_rows = (await db.execute(
        select(LearningEvent.entity_type, LearningEvent.event, func.count(LearningEvent.id))
        .where(LearningEvent.created_at >= since)
        .group_by(LearningEvent.entity_type, LearningEvent.event)
    )).all()
    counts = {(et, ev): n for et, ev, n in event_rows}

    series_rows = (await db.execute(
        select(
            func.date(LearningEvent.created_at),
            LearningEvent.entity_type,
            func.count(LearningEvent.id),
        )
        .where(
            LearningEvent.event == "finished",
            LearningEvent.created_at >= week_ago,
            LearningEvent.entity_type.in_(("test", "rescue")),
        )
        .group_by(func.date(LearningEvent.created_at), LearningEvent.entity_type)
    )).all()
    by_day: dict[date, AnalyticsDayOut] = {}
    for d, et, n in series_rows:
        day = by_day.setdefault(
            d, AnalyticsDayOut(date=d, tests=0, rescues=0)
        )
        if et == "test":
            day.tests = n
        else:
            day.rescues = n
    series = [by_day.get((week_ago + timedelta(days=i)).date(), AnalyticsDayOut(date=(week_ago + timedelta(days=i)).date()))
              for i in range(1, 8)]

    tariff_rows = (await db.execute(
        select(Tariff.id, Tariff.title, Tariff.price_rub, func.count(UserSubscription.id))
        .join(UserSubscription, UserSubscription.tariff_id == Tariff.id)
        .where(UserSubscription.status == "active", UserSubscription.current_period_end > now)
        .group_by(Tariff.id, Tariff.title, Tariff.price_rub)
        .order_by(func.count(UserSubscription.id).desc())
        .limit(5)
    )).all()

    return AnalyticsSummaryOut(
        period=period,
        users_total=users_total,
        users_new=users_new,
        active_subscriptions=active_subscriptions,
        revenue_rub=float(revenue),
        tests_finished=counts.get(("test", "finished"), 0),
        rescues_finished=counts.get(("rescue", "finished"), 0),
        articles_completed=counts.get(("article", "completed"), 0),
        conversion_percent=round(active_subscriptions / users_total * 100, 1) if users_total else 0,
        series=series,
        tariffs=[AnalyticsTariffOut(tariff_id=str(t_id), title=title, price_rub=price, count=n)
                 for t_id, title, price, n in tariff_rows],
    )


@router.get("/recent-events", response_model=list[ActivityEventOut])
async def analytics_recent_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
) -> list[ActivityEventOut]:
    events: list[ActivityEventOut] = []

    learning = (await db.execute(
        select(LearningEvent, User.full_name)
        .join(User, LearningEvent.user_id == User.id)
        .order_by(LearningEvent.created_at.desc())
        .limit(limit)
    )).all()

    # Resolve entity names in batch (events store only ids)
    ids_by_type: dict[str, set[str]] = {}
    for ev, _ in learning:
        ids_by_type.setdefault(ev.entity_type, set()).add(ev.entity_id)
    names: dict[str, str] = {}
    model_by_type = {"test": Test, "article": Article, "rescue": Rescue}
    for et, model in model_by_type.items():
        ids = {i for i in ids_by_type.get(et, ()) if i}
        if not ids:
            continue
        rows = (await db.execute(
            select(model.id, model.name).where(model.id.in_(ids))
        )).all()
        names.update({f"{et}:{r[0]}": r[1] for r in rows})

    for ev, user_name in learning:
        title = names.get(f"{ev.entity_type}:{ev.entity_id}", "")
        payload = ev.payload or {}
        events.append(ActivityEventOut(
            id=str(ev.id),
            kind=ev.entity_type,  # type: ignore[arg-type]
            event=ev.event,
            title=title,
            user_name=user_name or "",
            score=payload.get("score"),
            created_at=ev.created_at,
        ))

    payments = (await db.execute(
        select(Payment, User.full_name, Tariff.title)
        .join(User, Payment.user_id == User.id)
        .join(Tariff, Payment.tariff_id == Tariff.id)
        .where(Payment.status == "succeeded")
        .order_by(Payment.created_at.desc())
        .limit(limit)
    )).all()
    for p, user_name, tariff_title in payments:
        events.append(ActivityEventOut(
            id=str(p.id),
            kind="payment",
            event="succeeded",
            title=tariff_title,
            user_name=user_name or "",
            score=p.amount_rub,
            created_at=p.created_at,
        ))

    registrations = (await db.execute(
        select(User).order_by(User.created_at.desc()).limit(limit)
    )).scalars().all()
    for u in registrations:
        events.append(ActivityEventOut(
            id=str(u.id),
            kind="registration",
            event="registered",
            title=u.email,
            user_name=u.full_name or "",
            created_at=u.created_at,
        ))

    events.sort(key=lambda e: e.created_at, reverse=True)
    return events[:limit]
