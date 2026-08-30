"""User public profiles (QR scan)."""
from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.db.repositories.achievements import AchievementRepository
from app.models.achievement import Reward
from app.models.user import User
from app.schemas.users import QrProfileOut, QrRewardOut, QrStatsOut
from app.services.reward_unlock import is_reward_unlocked, reward_unlocked_at
from app.services.stats_from_events import count_distinct_completed

router = APIRouter(tags=["users"])


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
