"""In-app notifications API + WebSocket."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.core.security import decode_token
from app.db.base import AsyncSessionLocal
from app.db.repositories.notifications import NotificationRepository
from app.db.repositories.user import UserRepository
from app.models.notification import Notification
from app.models.user import User
from app.realtime.notifications_hub import notification_hub
from app.schemas.notifications import (
    BroadcastOut,
    NotificationBroadcast,
    NotificationCreate,
    NotificationOut,
    UnreadCountOut,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _out(row: Notification) -> NotificationOut:
    return NotificationOut(
        id=row.id,
        title=row.title,
        body=row.body,
        created_at=row.created_at,
        read_at=row.read_at,
        is_read=row.read_at is not None,
    )


def _ws_payload(row: Notification) -> dict:
    return {
        "type": "notification",
        "data": _out(row).model_dump(mode="json", by_alias=True),
    }


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    unread_only: bool = Query(False, alias="unreadOnly"),
) -> list[NotificationOut]:
    rows = await NotificationRepository(db).list_for_user(
        user.id, unread_only=unread_only
    )
    return [_out(r) for r in rows]


@router.get("/unread-count", response_model=UnreadCountOut)
async def unread_count(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> UnreadCountOut:
    count = await NotificationRepository(db).unread_count(user.id)
    return UnreadCountOut(count=count)


@router.post("/read-all", response_model=UnreadCountOut)
async def mark_all_read(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> UnreadCountOut:
    await NotificationRepository(db).mark_all_read(user.id)
    return UnreadCountOut(count=0)


@router.post("/broadcast", response_model=BroadcastOut, status_code=status.HTTP_201_CREATED)
async def broadcast_notification(
    payload: NotificationBroadcast,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> BroadcastOut:
    """Create the same notification for every active user and push over WS."""
    user_ids = await UserRepository(db).list_active_ids()
    rows = await NotificationRepository(db).create_for_users(
        user_ids=user_ids,
        title=payload.title,
        body=payload.body,
    )
    for row in rows:
        await notification_hub.send_user(row.user_id, _ws_payload(row))
    return BroadcastOut(created=len(rows))


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> NotificationOut:
    repo = NotificationRepository(db)
    row = await repo.get_for_user(notification_id, user.id)
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _out(await repo.mark_read(row))


@router.post("", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
async def create_notification(
    payload: NotificationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> NotificationOut:
    row = await NotificationRepository(db).create(
        user_id=payload.user_id,
        title=payload.title,
        body=payload.body,
    )
    await notification_hub.send_user(row.user_id, _ws_payload(row))
    return _out(row)


@router.websocket("/ws")
async def notifications_ws(websocket: WebSocket, token: str = Query(...)) -> None:
    """Auth via access JWT query `token` (Bearer is not available on WS handshake)."""
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=4401)
            return
        user_id = UUID(payload["sub"])
    except Exception:
        await websocket.close(code=4401)
        return

    async with AsyncSessionLocal() as db:
        user = await UserRepository(db).get(user_id)
        if not user or not user.is_active:
            await websocket.close(code=4401)
            return

    await notification_hub.connect(user_id, websocket)
    try:
        while True:
            # Keepalive / ignore client pings; server pushes events.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await notification_hub.disconnect(user_id, websocket)
