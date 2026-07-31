"""Achievement / reward persistence and unlock evaluation."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import Achievement, Reward, UserAchievement
from app.models.stats import ArticleStats, RescueStats, TestStats


class AchievementRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_achievements(self, *, active_only: bool = False) -> Sequence[Achievement]:
        stmt = select(Achievement).order_by(Achievement.sort_order, Achievement.title)
        if active_only:
            stmt = stmt.where(Achievement.is_active.is_(True))
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_achievement(self, achievement_id: UUID) -> Achievement | None:
        return await self.db.get(Achievement, achievement_id)

    async def get_achievement_by_code(self, code: str) -> Achievement | None:
        result = await self.db.execute(select(Achievement).where(Achievement.code == code))
        return result.scalar_one_or_none()

    async def create_achievement(self, **fields) -> Achievement:
        row = Achievement(id=uuid4(), **fields)
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def update_achievement(self, row: Achievement, **fields) -> Achievement:
        for key, value in fields.items():
            setattr(row, key, value)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def delete_achievement(self, row: Achievement) -> None:
        await self.db.delete(row)
        await self.db.commit()

    async def list_rewards(self, *, active_only: bool = False) -> Sequence[Reward]:
        stmt = select(Reward).order_by(Reward.sort_order, Reward.title)
        if active_only:
            stmt = stmt.where(Reward.is_active.is_(True))
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_reward(self, reward_id: UUID) -> Reward | None:
        return await self.db.get(Reward, reward_id)

    async def get_reward_for_achievement(self, achievement_id: UUID) -> Reward | None:
        result = await self.db.execute(
            select(Reward).where(Reward.achievement_id == achievement_id)
        )
        return result.scalar_one_or_none()

    async def create_reward(self, **fields) -> Reward:
        row = Reward(id=uuid4(), **fields)
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def update_reward(self, row: Reward, **fields) -> Reward:
        for key, value in fields.items():
            setattr(row, key, value)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def delete_reward(self, row: Reward) -> None:
        await self.db.delete(row)
        await self.db.commit()

    async def list_user_unlocks(self, user_id: UUID) -> Sequence[UserAchievement]:
        result = await self.db.execute(
            select(UserAchievement).where(UserAchievement.user_id == user_id)
        )
        return result.scalars().all()

    async def get_user_unlock(
        self, user_id: UUID, achievement_id: UUID
    ) -> UserAchievement | None:
        result = await self.db.execute(
            select(UserAchievement).where(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement_id,
            )
        )
        return result.scalar_one_or_none()

    async def grant(self, user_id: UUID, achievement_id: UUID) -> UserAchievement:
        existing = await self.get_user_unlock(user_id, achievement_id)
        if existing:
            return existing
        row = UserAchievement(
            id=uuid4(),
            user_id=user_id,
            achievement_id=achievement_id,
            unlocked_at=datetime.now(timezone.utc),
        )
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def progress_counts(self, client_id: str) -> dict[str, int]:
        articles = await self.db.execute(
            select(func.count())
            .select_from(ArticleStats)
            .where(ArticleStats.client_id == client_id, ArticleStats.readed.is_(True))
        )
        tests = await self.db.execute(
            select(func.count())
            .select_from(TestStats)
            .where(TestStats.client_id == client_id, TestStats.passed.is_(True))
        )
        rescues = await self.db.execute(
            select(func.count())
            .select_from(RescueStats)
            .where(RescueStats.client_id == client_id, RescueStats.passed.is_(True))
        )
        return {
            "articles_read": int(articles.scalar_one()),
            "tests_passed": int(tests.scalar_one()),
            "rescues_completed": int(rescues.scalar_one()),
        }

    async def sync_unlocks(self, user_id: UUID) -> list[UserAchievement]:
        """Grant achievements whose rule_type thresholds are met (non-manual)."""
        client_id = str(user_id)
        counts = await self.progress_counts(client_id)
        achievements = await self.list_achievements(active_only=True)
        unlocked_ids = {
            u.achievement_id for u in await self.list_user_unlocks(user_id)
        }
        newly: list[UserAchievement] = []
        for ach in achievements:
            if ach.id in unlocked_ids:
                continue
            if ach.rule_type == "manual":
                continue
            progress = counts.get(ach.rule_type, 0)
            if progress >= ach.rule_threshold:
                newly.append(await self.grant(user_id, ach.id))
        return newly
