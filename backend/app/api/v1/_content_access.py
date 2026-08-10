"""Shared content access + default tariff assignment."""
from __future__ import annotations

from typing import Any, Sequence, TypeVar
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.entitlements import (
    default_tariff_id,
    filter_by_rank,
    filter_by_reward,
    is_reward_visible,
    is_visible,
    tariff_rank_map,
    unlocked_reward_ids,
    user_content_rank,
)

T = TypeVar("T")


async def filter_content_list(
    db: AsyncSession,
    user: User,
    items: Sequence[T],
) -> list[T]:
    if user.role == "admin":
        return list(items)
    rank = await user_content_rank(db, user)
    ranks = await tariff_rank_map(db)
    out = filter_by_rank(items, user_rank=rank, ranks=ranks)
    unlocked = await unlocked_reward_ids(db, user.id)
    return filter_by_reward(out, unlocked=unlocked)


async def assert_content_visible(db: AsyncSession, user: User, item: Any) -> None:
    if user.role == "admin":
        return
    rank = await user_content_rank(db, user)
    ranks = await tariff_rank_map(db)
    tid: UUID | None = getattr(item, "required_tariff_id", None)
    if not is_visible(required_tariff_id=tid, user_rank=rank, ranks=ranks):
        raise HTTPException(status_code=404, detail="Item not found")
    unlocked = await unlocked_reward_ids(db, user.id)
    rid: UUID | None = getattr(item, "required_reward_id", None)
    if not is_reward_visible(required_reward_id=rid, unlocked=unlocked):
        raise HTTPException(status_code=404, detail="Item not found")


async def with_default_tariff(db: AsyncSession, fields: dict[str, Any]) -> dict[str, Any]:
    if fields.get("required_tariff_id") is None:
        fields["required_tariff_id"] = await default_tariff_id(db)
    return fields
