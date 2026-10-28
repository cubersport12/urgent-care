"""Admin-only recovery of content disconnected from the folder tree."""
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only

from app.api.deps import get_current_admin, get_db
from app.models.article import Article
from app.models.folder import Folder
from app.models.rescue import Rescue
from app.models.test import Test
from app.models.user import User

router = APIRouter(prefix="/content-trash", tags=["content-trash"])
Kind = Literal["article", "test", "rescue"]
MODELS = {"article": Article, "test": Test, "rescue": Rescue}


class ItemRef(BaseModel):
    kind: Kind
    id: str


class DeleteRequest(BaseModel):
    items: list[ItemRef] = Field(min_length=1)


class RestoreRequest(ItemRef):
    target_parent_id: str | None = Field(None, alias="targetParentId")


def folder_reasons(parents: dict[str, str | None]) -> dict[str, str | None]:
    """Resolve reachability without recursion; None means connected to a root."""
    result: dict[str, str | None] = {}
    for folder_id in parents:
        chain: list[str] = []
        seen: set[str] = set()
        current: str | None = folder_id
        while current is not None and current not in result:
            if current in seen:
                reason = "cycle"
                break
            if current not in parents:
                reason = "missing_parent"
                break
            seen.add(current)
            chain.append(current)
            current = parents[current]
        else:
            reason = result[current] if current is not None else None
        for item in chain:
            result[item] = reason
    return result


async def snapshot(
    db: AsyncSession, *, lock: bool = False, refs: set[tuple[str, str]] | None = None
):
    folder_query = select(Folder).options(load_only(Folder.id, Folder.name, Folder.parent_id)).order_by(Folder.id)
    if lock:
        # ponytail: lock the whole folder tree for a consistent decision; revisit for very large trees.
        folder_query = folder_query.with_for_update()
    folders = list((await db.execute(folder_query)).scalars())
    reasons = folder_reasons({folder.id: folder.parent_id for folder in folders})
    items = {}
    for kind, model in MODELS.items():
        query = select(model).options(load_only(model.id, model.name, model.parent_id)).order_by(model.id)
        if refs is not None:
            ids = [item_id for item_kind, item_id in refs if item_kind == kind]
            if not ids:
                continue
            query = query.where(model.id.in_(ids))
        if lock:
            query = query.with_for_update()
        for item in (await db.execute(query)).scalars():
            if item.parent_id is not None:
                reason = reasons.get(item.parent_id, "missing_parent")
                if reason is not None:
                    items[(kind, item.id)] = (item, reason)
    return folders, reasons, items


@router.get("")
async def list_trash(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
):
    folders, reasons, items = await snapshot(db)
    return {
        "items": [
            {"kind": kind, "id": item.id, "name": item.name, "parentId": item.parent_id, "reason": reason}
            for (kind, _), (item, reason) in items.items()
        ],
        "folders": [
            {"id": f.id, "name": f.name, "parentId": f.parent_id}
            for f in folders if reasons[f.id] is None
        ],
    }


@router.post("/delete")
async def delete_trash(
    payload: DeleteRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
):
    requested = {(ref.kind, ref.id) for ref in payload.items}
    _, _, items = await snapshot(db, lock=True, refs=requested)
    if not requested.issubset(items):
        raise HTTPException(409, "Список корзины изменился. Обновите страницу.")
    for key in requested:
        await db.delete(items[key][0])
    await db.flush()
    return {"deletedCount": len(requested)}


@router.post("/restore")
async def restore_trash(
    payload: RestoreRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
):
    key = (payload.kind, payload.id)
    _, reasons, items = await snapshot(db, lock=True, refs={key})
    if key not in items:
        raise HTTPException(409, "Объект больше не находится в корзине.")
    if payload.target_parent_id is not None and (
        payload.target_parent_id not in reasons or reasons[payload.target_parent_id] is not None
    ):
        raise HTTPException(409, "Папка назначения недоступна.")
    items[key][0].parent_id = payload.target_parent_id
    await db.flush()
    return {"success": True}
