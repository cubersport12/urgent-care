"""User stats and test results."""
from datetime import datetime, timezone
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.api.v1._content_helpers import not_found
from app.db.repositories.stats import (
    ArticleStatsRepository,
    RescueStatsRepository,
    TestResultRepository,
    TestStatsRepository,
)
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

router = APIRouter(tags=["stats"])


def _client_id(user: User) -> str:
    return str(user.id)


# ── Articles stats ──────────────────────────────────────────────────


@router.get("/articles-stats", response_model=list[ArticleStatsOut])
async def list_article_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    article_id: str | None = Query(None, alias="articleId"),
) -> list:
    repo = ArticleStatsRepository(db)
    if article_id:
        row = await repo.get_for_client_article(_client_id(user), article_id)
        return [row] if row else []
    return await repo.list_for_client(_client_id(user))


@router.put("/articles-stats", response_model=ArticleStatsOut)
async def upsert_article_stats(
    payload: ArticleStatsUpsert,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    return await ArticleStatsRepository(db).upsert(
        client_id=_client_id(user),
        article_id=payload.article_id,
        readed=payload.readed,
        created_at=payload.created_at or datetime.now(timezone.utc),
    )


# ── Tests stats ─────────────────────────────────────────────────────


@router.get("/tests-stats", response_model=list[TestStatsOut])
async def list_test_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    test_id: str | None = Query(None, alias="testId"),
) -> list:
    repo = TestStatsRepository(db)
    if test_id:
        row = await repo.get_for_client_test(_client_id(user), test_id)
        return [row] if row else []
    return await repo.list_for_client(_client_id(user))


@router.post("/tests-stats", response_model=TestStatsOut, status_code=status.HTTP_201_CREATED)
async def create_test_stats(
    payload: TestStatsCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    repo = TestStatsRepository(db)
    existing = await repo.get_for_client_test(_client_id(user), payload.test_id)
    if existing:
        updated = await repo.update(
            existing.id,
            started_at=payload.started_at,
            completed_at=payload.completed_at,
            passed=payload.passed,
            data=payload.data,
        )
        return updated
    return await repo.create(
        client_id=_client_id(user),
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
):
    repo = TestStatsRepository(db)
    existing = await repo.get(stats_id)
    if not existing or existing.client_id != _client_id(user):
        raise not_found("TestStats")
    fields = payload.model_dump(by_alias=False, exclude_unset=True)
    updated = await repo.update(stats_id, **fields)
    return updated


@router.put("/tests-stats", response_model=TestStatsOut)
async def upsert_test_stats(
    payload: TestStatsCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    """Upsert by (clientId, testId) — matches mobile select→insert/update flow."""
    repo = TestStatsRepository(db)
    existing = await repo.get_for_client_test(_client_id(user), payload.test_id)
    if existing:
        return await repo.update(
            existing.id,
            started_at=payload.started_at,
            completed_at=payload.completed_at,
            passed=payload.passed,
            data=payload.data,
        )
    return await repo.create(
        client_id=_client_id(user),
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
) -> list:
    repo = RescueStatsRepository(db)
    if rescue_id:
        row = await repo.get_for_client_rescue(_client_id(user), rescue_id)
        return [row] if row else []
    return await repo.list_for_client(_client_id(user))


@router.put("/rescue-stats", response_model=RescueStatsOut)
async def upsert_rescue_stats(
    payload: RescueStatsUpsert,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    return await RescueStatsRepository(db).upsert(
        client_id=_client_id(user),
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
) -> list:
    return await TestResultRepository(db).list_for_client(_client_id(user), test_id)


@router.post("/test-results", response_model=TestResultOut, status_code=status.HTTP_201_CREATED)
async def create_test_result(
    payload: TestResultCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    answers: Any = payload.answers
    return await TestResultRepository(db).create(
        client_id=_client_id(user),
        test_id=payload.test_id,
        total_score=payload.total_score,
        total_errors=payload.total_errors,
        is_passed=payload.is_passed,
        answers=answers,
        completed_at=payload.completed_at or datetime.now(timezone.utc),
    )


# ── Reset all stats for current user ────────────────────────────────


@router.delete("/stats", status_code=status.HTTP_204_NO_CONTENT)
async def reset_all_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    cid = _client_id(user)
    await ArticleStatsRepository(db).delete_for_client(cid)
    await TestStatsRepository(db).delete_for_client(cid)
    await RescueStatsRepository(db).delete_for_client(cid)
    await TestResultRepository(db).delete_for_client(cid)
