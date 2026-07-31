"""User repository."""
from typing import Sequence
from uuid import UUID

from sqlalchemy import select

from app.db.repositories.base import BaseRepository
from app.models.user import User


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower())
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_active_ids(self) -> Sequence[UUID]:
        result = await self.session.execute(
            select(User.id).where(User.is_active.is_(True))
        )
        return result.scalars().all()
