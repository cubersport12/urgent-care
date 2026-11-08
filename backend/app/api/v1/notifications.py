"""In-app notifications API + WebSocket."""
import asyncio
import json
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_admin,
    get_current_user,
    get_db,
    get_websocket_session_user,
)
from app.db.repositories.notifications import NotificationRepository
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
from app.services.notification_campaigns import create_dispatch

router = APIRouter(prefix="/notifications", tags=["notifications"])
WS_SESSION_RECHECK_SECONDS = 10


def _out(row: Notification) -> NotificationOut:
    return NotificationOut(
        id=row.id,
        title=row.title,
        body=row.body,
        created_at=row.created_at,
        read_at=row.read_at,
        is_read=row.read_at is not None,
        icon_path=row.icon_path,
    )


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
    dispatch = await create_dispatch(db, title=payload.title, body=payload.body, icon_path=None,
                                     audience="all", user_ids=[], source="manual", personalize=False)
    return BroadcastOut(created=dispatch.recipient_count)


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
    dispatch = await create_dispatch(db, title=payload.title, body=payload.body, icon_path=None,
                                     audience="selected", user_ids=[payload.user_id], source="manual", personalize=False)
    row = await db.scalar(select(Notification).where(Notification.dispatch_id == dispatch.id))
    if row is None:
        raise HTTPException(status_code=404, detail="User not found or inactive")
    return _out(row)


@router.websocket("/ws")
async def notifications_ws(
    websocket: WebSocket,
) -> None:
    await websocket.accept()
    try:
        auth_frame = await asyncio.wait_for(websocket.receive_text(), timeout=5)
        if len(auth_frame) > 256:
            await websocket.close(code=4401)
            return
        auth = json.loads(auth_frame)
    except WebSocketDisconnect:
        return
    except (asyncio.TimeoutError, json.JSONDecodeError):
        await websocket.close(code=4401)
        return
    if (
        not isinstance(auth, dict)
        or auth.get("type") != "auth"
        or not isinstance(auth.get("sessionId"), str)
    ):
        await websocket.close(code=4401)
        return
    identity = await get_websocket_session_user(auth.get("sessionId"))
    if not identity:
        await websocket.close(code=4401)
        return

    user_id, _ = identity
    await notification_hub.connect(user_id, websocket, accept=False)
    last_check = asyncio.get_running_loop().time()
    try:
        while True:
            try:
                frame = await asyncio.wait_for(
                    websocket.receive_text(), timeout=WS_SESSION_RECHECK_SECONDS
                )
            except asyncio.TimeoutError:
                frame = None
            now = asyncio.get_running_loop().time()
            if now - last_check >= WS_SESSION_RECHECK_SECONDS:
                current = await get_websocket_session_user(auth.get("sessionId"))
                if not current or current[0] != user_id:
                    await websocket.close(code=4401)
                    return
                last_check = now
            if frame == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        await notification_hub.disconnect(user_id, websocket)
