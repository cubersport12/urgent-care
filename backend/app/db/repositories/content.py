"""Content repositories (folders, articles, tests, rescue)."""
from __future__ import annotations

from typing import TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.base import BaseRepository
from app.models.article import Article
from app.models.folder import Folder
from app.models.rescue import Rescue
from app.models.test import Test

T = TypeVar("T")


class _ParentFilterMixin(BaseRepository[T]):
    async def list_by_parent(self, parent_id: str | None) -> list[T]:
        col = self.model.parent_id  # type: ignore[attr-defined]
        if parent_id is None:
            stmt = select(self.model).where(col.is_(None)).order_by(self.model.order)  # type: ignore[attr-defined]
        else:
            stmt = select(self.model).where(col == parent_id).order_by(self.model.order)  # type: ignore[attr-defined]
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_all(self) -> list[T]:
        stmt = select(self.model).order_by(self.model.order)  # type: ignore[attr-defined]
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class FolderRepository(_ParentFilterMixin[Folder]):
    model = Folder


class ArticleRepository(_ParentFilterMixin[Article]):
    model = Article


class TestRepository(_ParentFilterMixin[Test]):
    model = Test


class RescueRepository(_ParentFilterMixin[Rescue]):
    model = Rescue


def content_repo_for(session: AsyncSession, kind: str) -> BaseRepository:
    mapping = {
        "folders": FolderRepository,
        "articles": ArticleRepository,
        "tests": TestRepository,
        "rescue": RescueRepository,
    }
    return mapping[kind](session)
