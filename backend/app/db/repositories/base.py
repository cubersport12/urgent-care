"""Generic async repository with common CRUD operations."""
from typing import Any, Generic, TypeVar

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, id_: Any) -> ModelT | None:
        stmt = select(self.model).where(self.model.id == id_)  # type: ignore[attr-defined]
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_many(
        self,
        *,
        offset: int = 0,
        limit: int = 10_000,
        order_by: Any = None,
    ) -> list[ModelT]:
        stmt = select(self.model).offset(offset).limit(limit)
        if order_by is not None:
            stmt = stmt.order_by(order_by)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count(self) -> int:
        stmt = select(func.count()).select_from(self.model)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def create(self, **fields: Any) -> ModelT:
        obj = self.model(**fields)
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, id_: Any, **fields: Any) -> ModelT | None:
        stmt = (
            sa_update(self.model)
            .where(self.model.id == id_)  # type: ignore[attr-defined]
            .values(**fields)
            .returning(self.model)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete(self, id_: Any) -> bool:
        stmt = sa_delete(self.model).where(self.model.id == id_)  # type: ignore[attr-defined]
        result = await self.session.execute(stmt)
        return result.rowcount > 0
