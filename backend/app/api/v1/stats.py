"""User stats and test results — backed by learning_events."""
from datetime import datetime, timezone
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.api.v1._content_helpers import not_found
from app.models.user import User
from app.schemas.stats import (
    ArticleStatsOut,
    ArticleStatsUpsert,
    RescueStatsOut,
    RescueStatsUpsert,
    TestResultCreate,
    TestResultOut,
    TestStatsCreate,
    TestStatsOut,
    TestStatsUpdate,
)
from app.services import stats_from_events as sx

router = APIRouter(tags=["stats"])


# ── Articles stats ──────────────────────────────────────────────────


@router.get("/articles-stats", response_model=list[ArticleStatsOut])
async def list_article_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    article_id: str | None = Query(None, alias="articleId"),
) -> list[ArticleStatsOut]:
    return await sx.project_article_stats(db, user.id, article_id)


@router.put("/articles-stats", response_model=ArticleStatsOut)
async def upsert_article_stats(
    payload: ArticleStatsUpsert,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> ArticleStatsOut:
    return await sx.upsert_article_completed(
        db, user.id, payload.article_id, readed=payload.readed
    )


# ── Tests stats ─────────────────────────────────────────────────────


@router.get("/tests-stats", response_model=list[TestStatsOut])
async def list_test_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    test_id: str | None = Query(None, alias="testId"),
) -> list[TestStatsOut]:
    return await sx.project_test_stats(db, user.id, test_id)


@router.post("/tests-stats", response_model=TestStatsOut, status_code=status.HTTP_201_CREATED)
async def create_test_stats(
    payload: TestStatsCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> TestStatsOut:
    return await sx.upsert_test_stats(
        db,
        user.id,
        test_id=payload.test_id,
        started_at=payload.started_at,
        completed_at=payload.completed_at,
        passed=payload.passed,
        data=payload.data,
    )


@router.patch("/tests-stats/{stats_id}", response_model=TestStatsOut)
async def update_test_stats(
    stats_id: UUID,
    payload: TestStatsUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> TestStatsOut:
    test_id = await sx.resolve_test_entity_id(db, user.id, stats_id)
    if not test_id:
        raise not_found("TestStats")
    existing = await sx.project_test_stats(db, user.id, test_id)
    cur = existing[0] if existing else None
    fields = payload.model_dump(by_alias=False, exclude_unset=True)
    started = fields.get("started_at") or (cur.started_at if cur else datetime.now(timezone.utc))
    return await sx.upsert_test_stats(
        db,
        user.id,
        test_id=test_id,
        started_at=started,
        completed_at=fields.get("completed_at", cur.completed_at if cur else None),
        passed=fields.get("passed", cur.passed if cur else None),
        data=fields.get("data", cur.data if cur else None),
    )


@router.put("/tests-stats", response_model=TestStatsOut)
async def upsert_test_stats(
    payload: TestStatsCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> TestStatsOut:
    return await sx.upsert_test_stats(
        db,
        user.id,
        test_id=payload.test_id,
        started_at=payload.started_at,
        completed_at=payload.completed_at,
        passed=payload.passed,
        data=payload.data,
    )


# ── Rescue stats ────────────────────────────────────────────────────


@router.get("/rescue-stats", response_model=list[RescueStatsOut])
async def list_rescue_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    rescue_id: str | None = Query(None, alias="rescueId"),
) -> list[RescueStatsOut]:
    return await sx.project_rescue_stats(db, user.id, rescue_id)


@router.put("/rescue-stats", response_model=RescueStatsOut)
async def upsert_rescue_stats(
    payload: RescueStatsUpsert,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> RescueStatsOut:
    return await sx.upsert_rescue_stats(
        db,
        user.id,
        rescue_id=payload.rescue_id,
        started_at=payload.started_at,
        completed_at=payload.completed_at,
        passed=payload.passed,
        data=payload.data,
    )


# ── Test results ────────────────────────────────────────────────────


@router.get("/test-results", response_model=list[TestResultOut])
async def list_test_results(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    test_id: str | None = Query(None, alias="testId"),
) -> list[TestResultOut]:
    return await sx.project_test_results(db, user.id, test_id)


@router.post("/test-results", response_model=TestResultOut, status_code=status.HTTP_201_CREATED)
async def create_test_result(
    payload: TestResultCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> TestResultOut:
    answers: Any = payload.answers
    return await sx.create_test_result(
        db,
        user.id,
        test_id=payload.test_id,
        total_score=payload.total_score,
        total_errors=payload.total_errors,
        is_passed=payload.is_passed,
        completion_type=payload.completion_type,
        answers=answers,
    )


# ── Reset all stats for current user ────────────────────────────────


@router.delete("/stats", status_code=status.HTTP_204_NO_CONTENT)
async def reset_all_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    await sx.reset_user_stats(db, user.id)
