"""Content repositories (folders, articles, tests, rescue)."""
from __future__ import annotations

from typing import TypeVar

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.base import BaseRepository
from app.models.article import Article
from app.models.content_status import ContentStatus
from app.models.folder import Folder
from app.models.rescue import Rescue
from app.models.test import Test

T = TypeVar("T")


def published_content_statement(model: type[T]):
    draft_folders = (
        select(Folder.id.label("id"))
        .where(Folder.status == ContentStatus.DRAFT)
        .cte("draft_folders", recursive=True)
    )
    draft_folders = draft_folders.union(
        select(Folder.id).join(draft_folders, Folder.parent_id == draft_folders.c.id)
    )
    return select(model).where(
        model.status == ContentStatus.PUBLISHED,  # type: ignore[attr-defined]
        or_(
            model.parent_id.is_(None),  # type: ignore[attr-defined]
            model.parent_id.not_in(select(draft_folders.c.id)),  # type: ignore[attr-defined]
        ),
    )


class _ParentFilterMixin(BaseRepository[T]):
    async def list_by_parent(
        self, parent_id: str | None, *, include_drafts: bool = True
    ) -> list[T]:
        col = self.model.parent_id  # type: ignore[attr-defined]
        stmt = select(self.model)
        if not include_drafts:
            stmt = published_content_statement(self.model)
        if parent_id is None:
            stmt = stmt.where(col.is_(None))
        else:
            stmt = stmt.where(col == parent_id)
        stmt = stmt.order_by(self.model.order)  # type: ignore[attr-defined]
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_all(self, *, include_drafts: bool = True) -> list[T]:
        stmt = select(self.model)
        if not include_drafts:
            stmt = published_content_statement(self.model)
        stmt = stmt.order_by(self.model.order)  # type: ignore[attr-defined]
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
