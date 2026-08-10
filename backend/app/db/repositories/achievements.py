"""Achievement / reward persistence and unlock evaluation."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import Achievement, Reward, RewardAchievement, UserAchievement
from app.models.article import Article
from app.models.learning_event import LearningEvent
from app.models.rescue import Rescue
from app.models.test import Test
from app.schemas.achievements import TARGETED_RULE_TYPES
from app.services.stats_from_events import count_distinct_completed


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
        """First active reward (by sort_order) that includes this achievement."""
        result = await self.db.execute(
            select(Reward)
            .join(RewardAchievement, RewardAchievement.reward_id == Reward.id)
            .where(
                RewardAchievement.achievement_id == achievement_id,
                Reward.is_active.is_(True),
            )
            .order_by(Reward.sort_order, Reward.title)
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create_reward(
        self,
        *,
        achievement_ids: list[UUID],
        title: str,
        description: str | None,
        icon_path: str | None,
        sort_order: int,
        is_active: bool,
    ) -> Reward:
        row = Reward(
            id=uuid4(),
            title=title,
            description=description,
            icon_path=icon_path,
            sort_order=sort_order,
            is_active=is_active,
        )
        self.db.add(row)
        await self.db.flush()
        for aid in achievement_ids:
            self.db.add(RewardAchievement(reward_id=row.id, achievement_id=aid))
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def update_reward(
        self,
        row: Reward,
        *,
        achievement_ids: list[UUID] | None = None,
        **fields,
    ) -> Reward:
        for key, value in fields.items():
            setattr(row, key, value)
        if achievement_ids is not None:
            row.links.clear()
            await self.db.flush()
            for aid in achievement_ids:
                self.db.add(RewardAchievement(reward_id=row.id, achievement_id=aid))
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
        user_id = UUID(client_id)
        return {
            "articles_read": await count_distinct_completed(
                self.db, user_id, "article", "completed"
            ),
            "tests_passed": await count_distinct_completed(
                self.db, user_id, "test", "finished", passed_only=True
            ),
            "rescues_completed": await count_distinct_completed(
                self.db, user_id, "rescue", "finished", passed_only=True
            ),
        }

    async def _has_event(
        self,
        user_id: UUID,
        *,
        entity_type: str,
        entity_id: str,
        event: str,
        require_passed: bool | None = None,
    ) -> bool:
        stmt = select(func.count()).select_from(LearningEvent).where(
            LearningEvent.user_id == user_id,
            LearningEvent.entity_type == entity_type,
            LearningEvent.entity_id == entity_id,
            LearningEvent.event == event,
        )
        rows = (await self.db.execute(stmt)).scalar_one()
        if require_passed is not True:
            return int(rows) > 0
        # Filter passed in Python — payload shape varies
        q = select(LearningEvent.payload).where(
            LearningEvent.user_id == user_id,
            LearningEvent.entity_type == entity_type,
            LearningEvent.entity_id == entity_id,
            LearningEvent.event == event,
        )
        for payload in (await self.db.execute(q)).scalars().all():
            if isinstance(payload, dict) and payload.get("passed") is True:
                return True
        return False

    async def _max_test_score(self, user_id: UUID, test_id: str) -> int:
        # Prefer payload.score from finished events
        stmt = (
            select(LearningEvent.payload)
            .where(
                LearningEvent.user_id == user_id,
                LearningEvent.entity_type == "test",
                LearningEvent.entity_id == test_id,
                LearningEvent.event == "finished",
            )
            .order_by(LearningEvent.created_at.desc())
        )
        rows = (await self.db.execute(stmt)).scalars().all()
        best = 0
        for payload in rows:
            if not isinstance(payload, dict):
                continue
            score = payload.get("score", payload.get("total_score"))
            if isinstance(score, (int, float)):
                best = max(best, int(score))
        return best

    async def _folder_children(self, folder_id: str) -> list[tuple[str, str]]:
        """Direct children as (entity_type, entity_id)."""
        articles = (
            await self.db.execute(select(Article.id).where(Article.parent_id == folder_id))
        ).scalars().all()
        tests = (
            await self.db.execute(select(Test.id).where(Test.parent_id == folder_id))
        ).scalars().all()
        rescues = (
            await self.db.execute(select(Rescue.id).where(Rescue.parent_id == folder_id))
        ).scalars().all()
        out: list[tuple[str, str]] = []
        out.extend(("article", i) for i in articles)
        out.extend(("test", i) for i in tests)
        out.extend(("rescue", i) for i in rescues)
        return out

    async def rule_progress(self, user_id: UUID, ach: Achievement) -> int:
        """Current progress toward achievement unlock."""
        client_id = str(user_id)
        rt = ach.rule_type
        target = (ach.rule_target_id or "").strip()

        if rt == "manual":
            return 1 if await self.get_user_unlock(user_id, ach.id) else 0

        if rt in ("articles_read", "tests_passed", "rescues_completed"):
            counts = await self.progress_counts(client_id)
            return counts.get(rt, 0)

        if not target and rt in TARGETED_RULE_TYPES:
            return 0

        if rt == "article_completed":
            ok = await self._has_event(
                user_id, entity_type="article", entity_id=target, event="completed"
            )
            return 1 if ok else 0

        if rt == "test_passed":
            ok = await self._has_event(
                user_id,
                entity_type="test",
                entity_id=target,
                event="finished",
                require_passed=True,
            )
            return 1 if ok else 0

        if rt == "test_score":
            return await self._max_test_score(user_id, target)

        if rt == "rescue_passed":
            ok = await self._has_event(
                user_id,
                entity_type="rescue",
                entity_id=target,
                event="finished",
                require_passed=True,
            )
            return 1 if ok else 0

        if rt == "folder_rescues_passed":
            rescue_ids = (
                await self.db.execute(select(Rescue.id).where(Rescue.parent_id == target))
            ).scalars().all()
            if not rescue_ids:
                return 0
            count = 0
            for rid in rescue_ids:
                if await self._has_event(
                    user_id,
                    entity_type="rescue",
                    entity_id=rid,
                    event="finished",
                    require_passed=True,
                ):
                    count += 1
            return count

        if rt == "folder_completed":
            children = await self._folder_children(target)
            if not children:
                return 0
            done = 0
            for et, eid in children:
                if et == "article":
                    ok = await self._child_done(user_id, "article_completed", eid)
                elif et == "test":
                    ok = await self._child_done(user_id, "test_passed", eid)
                else:
                    ok = await self._child_done(user_id, "rescue_passed", eid)
                if ok:
                    done += 1
            # 0..N children done; unlock check compares done == len(children)
            return done

        return 0

    async def _child_done(self, user_id: UUID, rule_type: str, entity_id: str) -> bool:
        stub = Achievement(
            id=uuid4(),
            code="_",
            title="_",
            rule_type=rule_type,
            rule_threshold=1,
            rule_target_id=entity_id,
        )
        return (await self.rule_progress(user_id, stub)) >= 1

    async def sync_unlocks(self, user_id: UUID) -> list[UserAchievement]:
        """Grant achievements whose rule thresholds are met (non-manual)."""
        achievements = await self.list_achievements(active_only=True)
        unlocked_ids = {
            u.achievement_id for u in await self.list_user_unlocks(user_id)
        }
        newly: list[UserAchievement] = []
        for ach in achievements:
            if ach.id in unlocked_ids or ach.rule_type == "manual":
                continue
            progress = await self.rule_progress(user_id, ach)
            if ach.rule_type == "folder_completed":
                children = await self._folder_children((ach.rule_target_id or "").strip())
                if children and progress >= len(children):
                    newly.append(await self.grant(user_id, ach.id))
                continue
            if progress >= ach.rule_threshold:
                newly.append(await self.grant(user_id, ach.id))
        return newly
