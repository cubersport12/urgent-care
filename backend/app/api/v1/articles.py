"""Articles CRUD."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.api.v1._content_access import (
    assert_content_visible,
    filter_content_list,
    with_default_tariff,
)
from app.api.v1._content_helpers import dump_create, dump_update, new_id, not_found
from app.db.repositories.content import ArticleRepository
from app.models.user import User
from app.schemas.content import ArticleCreate, ArticleOut, ArticleUpdate
from app.services.article_embeddings import refresh_article_embedding_safe

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=list[ArticleOut])
async def list_articles(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    parent_id: str | None = Query(None, alias="parentId"),
    all_items: bool = Query(False, alias="all"),
) -> list:
    repo = ArticleRepository(db)
    items = await repo.list_all() if all_items else await repo.list_by_parent(parent_id)
    return await filter_content_list(db, user, items)


@router.get("/{item_id}", response_model=ArticleOut)
async def get_article(
    item_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    item = await ArticleRepository(db).get(item_id)
    if not item:
        raise not_found("Article")
    await assert_content_visible(db, user, item)
    return item


@router.post("", response_model=ArticleOut, status_code=status.HTTP_201_CREATED)
async def create_article(
    payload: ArticleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
):
    fields = await with_default_tariff(db, dump_create(payload))
    item = await ArticleRepository(db).create(id=new_id(payload.id), **fields)
    await refresh_article_embedding_safe(db, item)
    return item


@router.patch("/{item_id}", response_model=ArticleOut)
async def update_article(
    item_id: str,
    payload: ArticleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
):
    item = await ArticleRepository(db).update(item_id, **dump_update(payload))
    if not item:
        raise not_found("Article")
    await refresh_article_embedding_safe(db, item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    item_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> None:
    if not await ArticleRepository(db).delete(item_id):
        raise not_found("Article")
