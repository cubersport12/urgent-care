"""Stats / results repositories."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.repositories.base import BaseRepository
from app.models.stats import ArticleStats, RescueStats, TestResult, TestStats


class ArticleStatsRepository(BaseRepository[ArticleStats]):
    model = ArticleStats

    async def list_for_client(self, client_id: str) -> list[ArticleStats]:
        stmt = select(ArticleStats).where(ArticleStats.client_id == client_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_for_client_article(
        self, client_id: str, article_id: str
    ) -> ArticleStats | None:
        stmt = select(ArticleStats).where(
            ArticleStats.client_id == client_id,
            ArticleStats.article_id == article_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(
        self,
        *,
        client_id: str,
        article_id: str,
        readed: bool | None,
        created_at: datetime | None = None,
    ) -> ArticleStats:
        values = {
            "client_id": client_id,
            "article_id": article_id,
            "readed": readed,
        }
        if created_at is not None:
            values["created_at"] = created_at
        stmt = (
            pg_insert(ArticleStats)
            .values(**values)
            .on_conflict_do_update(
                constraint="articles_stats_client_article_unique",
                set_={"readed": readed},
            )
            .returning(ArticleStats)
        )
        result = await self.session.execute(stmt)
        row = result.scalar_one()
        await self.session.flush()
        return row

    async def delete_for_client(self, client_id: str) -> int:
        stmt = delete(ArticleStats).where(ArticleStats.client_id == client_id)
        result = await self.session.execute(stmt)
        return result.rowcount or 0


class TestStatsRepository(BaseRepository[TestStats]):
    model = TestStats

    async def list_for_client(self, client_id: str) -> list[TestStats]:
        stmt = select(TestStats).where(TestStats.client_id == client_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_for_client_test(self, client_id: str, test_id: str) -> TestStats | None:
        stmt = select(TestStats).where(
            TestStats.client_id == client_id,
            TestStats.test_id == test_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete_for_client(self, client_id: str) -> int:
        stmt = delete(TestStats).where(TestStats.client_id == client_id)
        result = await self.session.execute(stmt)
        return result.rowcount or 0


class RescueStatsRepository(BaseRepository[RescueStats]):
    model = RescueStats

    async def list_for_client(self, client_id: str) -> list[RescueStats]:
        stmt = select(RescueStats).where(RescueStats.client_id == client_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_for_client_rescue(
        self, client_id: str, rescue_id: str
    ) -> RescueStats | None:
        stmt = select(RescueStats).where(
            RescueStats.client_id == client_id,
            RescueStats.rescue_id == rescue_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(
        self,
        *,
        client_id: str,
        rescue_id: str,
        started_at: datetime,
        completed_at: datetime | None = None,
        passed: bool | None = None,
        data: dict | list | None = None,
        id_: UUID | None = None,
    ) -> RescueStats:
        values: dict = {
            "client_id": client_id,
            "rescue_id": rescue_id,
            "started_at": started_at,
            "completed_at": completed_at,
            "passed": passed,
            "data": data,
        }
        if id_ is not None:
            values["id"] = id_
        stmt = (
            pg_insert(RescueStats)
            .values(**values)
            .on_conflict_do_update(
                constraint="rescue_stats_client_rescue_unique",
                set_={
                    "started_at": started_at,
                    "completed_at": completed_at,
                    "passed": passed,
                    "data": data,
                },
            )
            .returning(RescueStats)
        )
        result = await self.session.execute(stmt)
        row = result.scalar_one()
        await self.session.flush()
        return row

    async def delete_for_client(self, client_id: str) -> int:
        stmt = delete(RescueStats).where(RescueStats.client_id == client_id)
        result = await self.session.execute(stmt)
        return result.rowcount or 0


class TestResultRepository(BaseRepository[TestResult]):
    model = TestResult

    async def list_for_client(
        self, client_id: str, test_id: str | None = None
    ) -> list[TestResult]:
        stmt = select(TestResult).where(TestResult.client_id == client_id)
        if test_id is not None:
            stmt = stmt.where(TestResult.test_id == test_id)
        stmt = stmt.order_by(TestResult.completed_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def delete_for_client(self, client_id: str) -> int:
        stmt = delete(TestResult).where(TestResult.client_id == client_id)
        result = await self.session.execute(stmt)
        return result.rowcount or 0
