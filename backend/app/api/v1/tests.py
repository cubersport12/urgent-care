"""Tests CRUD."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.api.v1._content_helpers import dump_create, dump_update, new_id, not_found
from app.db.repositories.content import TestRepository
from app.models.user import User
from app.schemas.content import TestCreate, TestOut, TestUpdate

router = APIRouter(prefix="/tests", tags=["tests"])


@router.get("", response_model=list[TestOut])
async def list_tests(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    parent_id: str | None = Query(None, alias="parentId"),
    all_items: bool = Query(False, alias="all"),
) -> list:
    repo = TestRepository(db)
    if all_items:
        return await repo.list_all()
    return await repo.list_by_parent(parent_id)


@router.get("/{item_id}", response_model=TestOut)
async def get_test(
    item_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    item = await TestRepository(db).get(item_id)
    if not item:
        raise not_found("Test")
    return item


@router.post("", response_model=TestOut, status_code=status.HTTP_201_CREATED)
async def create_test(
    payload: TestCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
):
    fields = dump_create(payload)
    return await TestRepository(db).create(id=new_id(payload.id), **fields)


@router.patch("/{item_id}", response_model=TestOut)
async def update_test(
    item_id: str,
    payload: TestUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
):
    item = await TestRepository(db).update(item_id, **dump_update(payload))
    if not item:
        raise not_found("Test")
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test(
    item_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> None:
    if not await TestRepository(db).delete(item_id):
        raise not_found("Test")
