"""Rescue content CRUD."""
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.api.v1._content_access import (
    annotate_content_list,
    assert_content_visible,
    content_out,
    hide_unpublished_article_links,
    with_default_tariff,
)
from app.api.v1._content_helpers import dump_create, dump_update, new_id, not_found
from app.core.errors import AppError
from app.db.repositories.content import RescueRepository
from app.models.rescue import Rescue
from app.models.user import User
from app.schemas.content import RescueCreate, RescueOut, RescueUpdate
from app.services.rescue_graph import validate_rescue_graph
from app.utils.content_cache import cached_content_item, cached_content_list

router = APIRouter(prefix="/rescue", tags=["rescue"])


@router.get("", response_model=list[RescueOut])
async def list_rescue(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    parent_id: str | None = Query(None, alias="parentId"),
    all_items: bool = Query(False, alias="all"),
    enforce_tariff: bool = Query(False, alias="enforceTariff"),
    include_drafts: bool = Query(False, alias="includeDrafts"),
) -> list[RescueOut]:
    repo = RescueRepository(db)
    show_drafts = include_drafts and user.role == "admin"
    items = await cached_content_list(
        db,
        "rescue",
        {
            "all": all_items,
            "parentId": None if all_items else parent_id,
            "includeDrafts": show_drafts,
        },
        RescueOut,
        lambda: repo.list_all(include_drafts=show_drafts)
        if all_items
        else repo.list_by_parent(parent_id, include_drafts=show_drafts),
    )
    annotated = await annotate_content_list(db, user, items, enforce_for_admin=enforce_tariff)
    result = [content_out(item, RescueOut, locked) for item, locked in annotated]
    await hide_unpublished_article_links(db, result, include_drafts=show_drafts)
    return result


@router.get("/{item_id}", response_model=RescueOut)
async def get_rescue(
    item_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    enforce_tariff: bool = Query(False, alias="enforceTariff"),
    include_drafts: bool = Query(False, alias="includeDrafts"),
):
    repo = RescueRepository(db)
    item = await cached_content_item(db, "rescue", item_id, RescueOut, lambda: repo.get(item_id))
    if not item:
        raise not_found("Rescue")
    await assert_content_visible(
        db, user, item, enforce_for_admin=enforce_tariff,
        include_drafts=include_drafts and user.role == "admin",
        content_model=Rescue,
    )
    visible_item = RescueOut.model_validate(item)
    await hide_unpublished_article_links(
        db, [visible_item], include_drafts=include_drafts and user.role == "admin"
    )
    return visible_item


@router.post("", response_model=RescueOut, status_code=status.HTTP_201_CREATED)
async def create_rescue(
    payload: RescueCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
    force: bool = Query(False, description="Сохранить несмотря на ошибки графа сцен"),
):
    if payload.data and not force:
        errs = validate_rescue_graph(payload.data)
        if errs:
            raise AppError(detail="; ".join(errs), status_code=400)
    fields = await with_default_tariff(db, dump_create(payload))
    if fields.get("created_at") is None:
        fields["created_at"] = datetime.now(UTC)
    if fields.get("data") is None:
        fields["data"] = {}
    return await RescueRepository(db).create(id=new_id(payload.id), **fields)


@router.patch("/{item_id}", response_model=RescueOut)
async def update_rescue(
    item_id: str,
    payload: RescueUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
    force: bool = Query(False, description="Сохранить несмотря на ошибки графа сцен"),
):
    if payload.data and not force:
        errs = validate_rescue_graph(payload.data)
        if errs:
            raise AppError(detail="; ".join(errs), status_code=400)
    item = await RescueRepository(db).update(item_id, **dump_update(payload))
    if not item:
        raise not_found("Rescue")
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rescue(
    item_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> None:
    if not await RescueRepository(db).delete(item_id):
        raise not_found("Rescue")
