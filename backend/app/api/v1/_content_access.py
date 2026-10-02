"""Shared content access + default tariff assignment."""
from __future__ import annotations

from typing import Any, Sequence, TypeVar
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.content import CamelModel, RescueOut
from app.services.entitlements import (
    default_tariff_id,
    is_reward_visible,
    is_visible,
    tariff_rank_map,
    unlocked_reward_ids,
    user_content_rank,
)

T = TypeVar("T")


async def annotate_content_list(
    db: AsyncSession,
    user: User,
    items: Sequence[T],
) -> list[tuple[T, str | None]]:
    """Для каждого элемента — (item, locked_by): None доступен, 'tariff'/'reward' закрыт.
    Закрытые элементы не удаляются из списка: клиент показывает их с замком (стаб)."""
    if user.role == "admin":
        return [(item, None) for item in items]
    rank = await user_content_rank(db, user)
    ranks = await tariff_rank_map(db)
    unlocked = await unlocked_reward_ids(db, user.id)
    out: list[tuple[T, str | None]] = []
    for item in items:
        if not is_visible(
            required_tariff_id=getattr(item, "required_tariff_id", None),
            user_rank=rank,
            ranks=ranks,
        ):
            out.append((item, "tariff"))
        elif not is_reward_visible(
            required_reward_id=getattr(item, "required_reward_id", None),
            unlocked=unlocked,
        ):
            out.append((item, "reward"))
        else:
            out.append((item, None))
    return out


def content_out(item: Any, schema: type[CamelModel], locked_by: str | None) -> CamelModel:
    """Доступный элемент — полный DTO; заблокированный — стаб только с полями
    отображения (questions/data/linksToArticles не отдаём)."""
    if locked_by is None:
        return schema.model_validate(item, from_attributes=True)
    fields: dict[str, Any] = {
        "id": item.id,
        "name": item.name,
        "order": item.order,
        "parent_id": item.parent_id,
        "required_tariff_id": item.required_tariff_id,
        "required_reward_id": item.required_reward_id,
        "is_locked": True,
        "locked_by": locked_by,
    }
    if schema is RescueOut:
        fields["created_at"] = item.created_at
    return schema.model_validate(fields)


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
