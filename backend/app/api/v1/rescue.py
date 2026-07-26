"""Rescue content CRUD."""
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.api.v1._content_helpers import dump_create, dump_update, new_id, not_found
from app.db.repositories.content import RescueRepository
from app.models.user import User
from app.schemas.content import RescueCreate, RescueOut, RescueUpdate

router = APIRouter(prefix="/rescue", tags=["rescue"])


@router.get("", response_model=list[RescueOut])
async def list_rescue(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    parent_id: str | None = Query(None, alias="parentId"),
    all_items: bool = Query(False, alias="all"),
) -> list:
    repo = RescueRepository(db)
    if all_items:
        return await repo.list_all()
    return await repo.list_by_parent(parent_id)


@router.get("/{item_id}", response_model=RescueOut)
async def get_rescue(
    item_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    item = await RescueRepository(db).get(item_id)
    if not item:
        raise not_found("Rescue")
    return item


@router.post("", response_model=RescueOut, status_code=status.HTTP_201_CREATED)
async def create_rescue(
    payload: RescueCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
):
    fields = dump_create(payload)
    if fields.get("created_at") is None:
        fields["created_at"] = datetime.now(timezone.utc)
    if fields.get("data") is None:
        fields["data"] = {}
    return await RescueRepository(db).create(id=new_id(payload.id), **fields)


@router.patch("/{item_id}", response_model=RescueOut)
async def update_rescue(
    item_id: str,
    payload: RescueUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
):
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
