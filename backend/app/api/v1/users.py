"""User public profiles (QR scan) + admin user management."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.db.repositories.achievements import AchievementRepository
from app.models.achievement import Reward, UserAchievement
from app.models.learning_event import LearningEvent
from app.models.user import User
from app.schemas.users import (
    QrProfileOut,
    QrRewardOut,
    QrStatsOut,
    ResetStatsOut,
    ResetStatsRequest,
    UserListItemOut,
)
from app.services.reward_unlock import is_reward_unlocked, reward_unlocked_at
from app.services.stats_from_events import count_distinct_completed

router = APIRouter(tags=["users"])


@router.get("/users", response_model=list[UserListItemOut])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> list[UserListItemOut]:
    result = await db.execute(select(User).order_by(User.full_name, User.email))
    return [
        UserListItemOut(id=u.id, full_name=u.full_name, email=u.email)
        for u in result.scalars().all()
    ]


@router.post(
    "/users/reset-stats",
    response_model=ResetStatsOut,
    status_code=status.HTTP_200_OK,
)
async def reset_users_stats(
    payload: ResetStatsRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> ResetStatsOut:
    """Полный сброс статистики и прогресса: события обучения (аналитика,
    статистика тестов/статей/режимов) и записи о полученных достижениях."""
    # Dedupe preserving order
    user_ids = list(dict.fromkeys(payload.user_ids))
    await db.execute(delete(LearningEvent).where(LearningEvent.user_id.in_(user_ids)))
    await db.execute(delete(UserAchievement).where(UserAchievement.user_id.in_(user_ids)))
    return ResetStatsOut(users_count=len(user_ids))


@router.get("/users/{user_id}/qr-profile", response_model=QrProfileOut)
async def get_user_qr_profile(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _viewer: Annotated[User, Depends(get_current_user)],
) -> QrProfileOut:
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    repo = AchievementRepository(db)
    unlocks = await repo.list_user_unlocks(user_id)
    unlocked_set = {u.achievement_id for u in unlocks}
    achievements = await repo.list_achievements(active_only=True)

    rewards: list[tuple[Reward, datetime]] = []
    for reward in await repo.list_rewards(active_only=True):
        if not is_reward_unlocked(reward, unlocked_set):
            continue
        unlocked_at = reward_unlocked_at(
            reward, {u.achievement_id: u.unlocked_at for u in unlocks}
        )
        if unlocked_at is None:
            continue
        rewards.append((reward, unlocked_at))
    rewards.sort(key=lambda item: (item[0].sort_order, item[0].title))

    stats = QrStatsOut(
        articles_read=await count_distinct_completed(db, user_id, "article", "completed"),
        tests_passed=await count_distinct_completed(
            db, user_id, "test", "finished", passed_only=True
        ),
        rescues_passed=await count_distinct_completed(
            db, user_id, "rescue", "finished", passed_only=True
        ),
    )

    return QrProfileOut(
        id=user.id,
        full_name=user.full_name,
        city=user.city.name if user.city else None,
        achievements_count=len(unlocked_set & {a.id for a in achievements}),
        rewards=[
            QrRewardOut(
                id=reward.id,
                title=reward.title,
                description=reward.description,
                files=reward.files,
            )
            for reward, _unlocked_at in rewards
        ],
        stats=stats,
    )
