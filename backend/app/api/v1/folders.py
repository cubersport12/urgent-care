"""Folders CRUD."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.api.v1._content_access import (
    assert_content_visible,
    filter_content_list,
    with_default_tariff,
)
from app.api.v1._content_helpers import dump_create, dump_update, new_id, not_found
from app.db.repositories.content import FolderRepository
from app.models.article import Article
from app.models.learning_event import LearningEvent
from app.models.rescue import Rescue
from app.models.test import Test
from app.models.user import User
from app.schemas.content import (
    FolderCreate,
    FolderMaterialCountOut,
    FolderOut,
    FolderUpdate,
)
from app.services.stats_from_events import list_events

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("", response_model=list[FolderOut])
async def list_folders(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    parent_id: str | None = Query(None, alias="parentId"),
    all_items: bool = Query(False, alias="all"),
) -> list:
    repo = FolderRepository(db)
    items = await repo.list_all() if all_items else await repo.list_by_parent(parent_id)
    return await filter_content_list(db, user, items)


@router.get("/material-counts", response_model=list[FolderMaterialCountOut])
async def folders_material_counts(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[FolderMaterialCountOut]:
    """По каждой папке: количество материалов (документы, тесты, режимы спасения)
    во всей вложенности — сама папка + все подпапки (descendants), и сколько из них
    завершено текущим пользователем (документ прочитан, тест/режим пройден успешно)."""

    async def materials_by_folder(model) -> dict[str, list[str]]:
        rows = (await db.execute(select(model.id, model.parent_id))).all()
        by_folder: dict[str, list[str]] = {}
        for mid, pid in rows:
            if pid is not None:
                by_folder.setdefault(pid, []).append(mid)
        return by_folder

    folders = await FolderRepository(db).list_all()
    children: dict[str, list[str]] = {}
    for f in folders:
        children.setdefault(f.parent_id, []).append(f.id)

    articles = await materials_by_folder(Article)
    tests = await materials_by_folder(Test)
    rescues = await materials_by_folder(Rescue)

    # Завершённые материалы пользователя: из событий обучения
    completed_ids: set[str] = set()
    for ev in await list_events(db, user.id):
        if ev.entity_type == "article" and ev.event == "completed":
            completed_ids.add(ev.entity_id)
        elif ev.entity_type in ("test", "rescue") and ev.event == "finished":
            payload = ev.payload if isinstance(ev.payload, dict) else {}
            if payload.get("passed") is True:
                completed_ids.add(ev.entity_id)

    def descendant_ids(folder_id: str) -> set[str]:
        seen: set[str] = set()
        stack = [folder_id]
        while stack:
            fid = stack.pop()
            if fid in seen:
                continue
            seen.add(fid)
            stack.extend(children.get(fid, []))
        return seen

    out: list[FolderMaterialCountOut] = []
    for f in folders:
        ids = descendant_ids(f.id)
        total = 0
        completed = 0
        for by_folder in (articles, tests, rescues):
            for fid in ids:
                mids = by_folder.get(fid, [])
                total += len(mids)
                completed += sum(1 for m in mids if m in completed_ids)
        out.append(
            FolderMaterialCountOut(folder_id=f.id, total=total, completed=completed)
        )
    return out


@router.get("/{item_id}", response_model=FolderOut)
async def get_folder(
    item_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    item = await FolderRepository(db).get(item_id)
    if not item:
        raise not_found("Folder")
    await assert_content_visible(db, user, item)
    return item


@router.post("", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def create_folder(
    payload: FolderCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
):
    fields = await with_default_tariff(db, dump_create(payload))
    return await FolderRepository(db).create(id=new_id(payload.id), **fields)


@router.patch("/{item_id}", response_model=FolderOut)
async def update_folder(
    item_id: str,
    payload: FolderUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
):
    item = await FolderRepository(db).update(item_id, **dump_update(payload))
    if not item:
        raise not_found("Folder")
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    item_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> None:
    if not await FolderRepository(db).delete(item_id):
        raise not_found("Folder")
