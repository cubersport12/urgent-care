"""Folders CRUD."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import delete as sa_delete, select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.api.v1._content_access import (
    annotate_content_list,
    assert_content_visible,
    content_out,
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
    BulkDeleteRequest,
    BulkMoveRequest,
    BulkResult,
    BulkTariffRequest,
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
) -> list[FolderOut]:
    repo = FolderRepository(db)
    items = await repo.list_all() if all_items else await repo.list_by_parent(parent_id)
    annotated = await annotate_content_list(db, user, items)
    return [content_out(item, FolderOut, locked) for item, locked in annotated]


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


@router.post("/bulk-delete", response_model=BulkResult)
async def bulk_delete_content(
    payload: BulkDeleteRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> BulkResult:
    deleted = 0
    if payload.folder_ids:
        res = await db.execute(sa_delete(Folder).where(Folder.id.in_(payload.folder_ids)))
        deleted += res.rowcount or 0
    if payload.article_ids:
        res = await db.execute(sa_delete(Article).where(Article.id.in_(payload.article_ids)))
        deleted += res.rowcount or 0
    if payload.test_ids:
        res = await db.execute(sa_delete(Test).where(Test.id.in_(payload.test_ids)))
        deleted += res.rowcount or 0
    if payload.rescue_ids:
        res = await db.execute(sa_delete(Rescue).where(Rescue.id.in_(payload.rescue_ids)))
        deleted += res.rowcount or 0
    await db.commit()
    return BulkResult(success=True, deleted_count=deleted)


@router.post("/bulk-move", response_model=BulkResult)
async def bulk_move_content(
    payload: BulkMoveRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> BulkResult:
    moved = 0
    target_pid = payload.target_parent_id
    if payload.folder_ids:
        res = await db.execute(
            sa_update(Folder).where(Folder.id.in_(payload.folder_ids)).values(parent_id=target_pid)
        )
        moved += res.rowcount or 0
    if payload.article_ids:
        res = await db.execute(
            sa_update(Article).where(Article.id.in_(payload.article_ids)).values(parent_id=target_pid)
        )
        moved += res.rowcount or 0
    if payload.test_ids:
        res = await db.execute(
            sa_update(Test).where(Test.id.in_(payload.test_ids)).values(parent_id=target_pid)
        )
        moved += res.rowcount or 0
    if payload.rescue_ids:
        res = await db.execute(
            sa_update(Rescue).where(Rescue.id.in_(payload.rescue_ids)).values(parent_id=target_pid)
        )
        moved += res.rowcount or 0
    await db.commit()
    return BulkResult(success=True, moved_count=moved)


@router.post("/bulk-tariff", response_model=BulkResult)
async def bulk_tariff_content(
    payload: BulkTariffRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> BulkResult:
    updated = 0
    tid = payload.tariff_id
    if payload.folder_ids:
        res = await db.execute(
            sa_update(Folder).where(Folder.id.in_(payload.folder_ids)).values(required_tariff_id=tid)
        )
        updated += res.rowcount or 0
    if payload.article_ids:
        res = await db.execute(
            sa_update(Article).where(Article.id.in_(payload.article_ids)).values(required_tariff_id=tid)
        )
        updated += res.rowcount or 0
    if payload.test_ids:
        res = await db.execute(
            sa_update(Test).where(Test.id.in_(payload.test_ids)).values(required_tariff_id=tid)
        )
        updated += res.rowcount or 0
    if payload.rescue_ids:
        res = await db.execute(
            sa_update(Rescue).where(Rescue.id.in_(payload.rescue_ids)).values(required_tariff_id=tid)
        )
        updated += res.rowcount or 0
    await db.commit()
    return BulkResult(success=True, updated_count=updated)


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
