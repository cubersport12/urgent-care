"""Shared helpers for content CRUD routers."""
from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import HTTPException, Query


def parse_parent_id(
    parent_id: str | None = Query(None, alias="parentId"),
    all_items: bool = Query(False, alias="all"),
) -> tuple[str | None | object, bool]:
    """Returns (parent_filter, fetch_all).

    parent_filter is None for roots, a string for children, or a sentinel for 'no filter' when all=true.
    """
    return parent_id, all_items


ALL = object()


def resolve_list_filter(parent_id: str | None, all_items: bool) -> str | None | object:
    if all_items:
        return ALL
    return parent_id


def new_id(provided: str | None) -> str:
    return provided or str(uuid4())


def dump_create(payload: Any) -> dict[str, Any]:
    data = payload.model_dump(by_alias=False, exclude_unset=False)
    data.pop("id", None)
    return {k: v for k, v in data.items()}


def dump_update(payload: Any) -> dict[str, Any]:
    return payload.model_dump(by_alias=False, exclude_unset=True)


def not_found(entity: str = "Item") -> HTTPException:
    return HTTPException(status_code=404, detail=f"{entity} not found")
