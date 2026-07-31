"""Content access by tariff rank."""
from __future__ import annotations

from typing import Sequence, TypeVar
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.repositories.billing import BillingRepository
from app.models.billing import Tariff
from app.models.user import User
from app.services.billing import BillingService

T = TypeVar("T")


async def user_content_rank(db: AsyncSession, user: User) -> int:
    return await BillingService(db).user_rank(user)


async def tariff_rank_map(db: AsyncSession) -> dict[UUID, int]:
    result = await db.execute(select(Tariff.id, Tariff.rank))
    return {row[0]: row[1] for row in result.all()}


async def default_tariff_id(db: AsyncSession) -> UUID | None:
    tariff = await BillingRepository(db).get_default_tariff()
    return tariff.id if tariff else None


def filter_by_rank(
    items: Sequence[T],
    *,
    user_rank: int,
    ranks: dict[UUID, int],
    default_rank: int = 0,
) -> list[T]:
    if not settings.billing_enforcement:
        return list(items)
    out: list[T] = []
    for item in items:
        tid = getattr(item, "required_tariff_id", None)
        need = ranks.get(tid, default_rank) if tid else default_rank
        if need <= user_rank:
            out.append(item)
    return out


def is_visible(
    *,
    required_tariff_id: UUID | None,
    user_rank: int,
    ranks: dict[UUID, int],
    default_rank: int = 0,
) -> bool:
    if not settings.billing_enforcement:
        return True
    need = ranks.get(required_tariff_id, default_rank) if required_tariff_id else default_rank
    return need <= user_rank
