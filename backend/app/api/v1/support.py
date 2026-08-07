"""Support chat API + WebSocket."""
import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.core.config import settings
from app.core.security import decode_token
from app.db.base import AsyncSessionLocal
from app.db.repositories.support import SupportRepository
from app.db.repositories.user import UserRepository
from app.models.support import SupportMessage
from app.models.user import User
from app.realtime.support_hub import admin_support_hub, support_hub
from app.schemas.support import (
    SupportMessageCreate,
    SupportMessageOut,
    SupportThreadDetailOut,
    SupportThreadOut,
)
from app.utils.email import send_email

router = APIRouter(prefix="/support", tags=["support"])
log = logging.getLogger(__name__)


def _msg_out(row: SupportMessage) -> SupportMessageOut:
    return SupportMessageOut(
        id=row.id,
        thread_id=row.thread_id,
        sender_role=row.sender_role,
        sender_id=row.sender_id,
        body=row.body,
        created_at=row.created_at,
    )


def _ws_payload(row: SupportMessage) -> dict:
    return {
        "type": "support_message",
        "data": _msg_out(row).model_dump(mode="json", by_alias=True),
    }


def _email_copy(*, to: str, subject: str, body: str) -> None:
    if not to:
        return
    try:
        send_email(to=to, subject=subject, body=body)
    except Exception as exc:
        log.warning("support_email_failed to=%s error=%s", to, exc)


@router.get("/me", response_model=SupportThreadDetailOut)
async def get_my_thread(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> SupportThreadDetailOut:
    repo = SupportRepository(db)
    thread = await repo.get_or_create_thread(user.id)
    msgs = await repo.list_messages(thread.id)
    return SupportThreadDetailOut(
        id=thread.id,
        user_id=thread.user_id,
        user_email=user.email,
        user_full_name=user.full_name,
        messages=[_msg_out(m) for m in msgs],
    )


@router.post("/me/messages", response_model=SupportMessageOut, status_code=status.HTTP_201_CREATED)
async def post_my_message(
    payload: SupportMessageCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> SupportMessageOut:
    repo = SupportRepository(db)
    thread = await repo.get_or_create_thread(user.id)
    msg = await repo.add_message(
        thread_id=thread.id,
        sender_role="user",
        sender_id=user.id,
        body=payload.body,
    )
    _email_copy(
        to=settings.support_inbox,
        subject=f"Поддержка: сообщение от {user.email}",
        body=(
            f"От: {user.full_name or '—'} <{user.email}>\n"
            f"Thread: {thread.id}\n\n"
            f"{msg.body}"
        ),
    )
    data = _ws_payload(msg)
    await support_hub.send_user(user.id, data)
    await admin_support_hub.broadcast(data)
    return _msg_out(msg)


@router.get("/threads", response_model=list[SupportThreadOut])
async def list_threads(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> list[SupportThreadOut]:
    rows = await SupportRepository(db).list_threads()
    return [
        SupportThreadOut(
            id=t.id,
            user_id=t.user_id,
            user_email=u.email,
            user_full_name=u.full_name,
            last_message_at=t.last_message_at,
            updated_at=t.updated_at,
            last_body=last,
        )
        for t, u, last in rows
    ]


@router.get("/threads/{thread_id}", response_model=SupportThreadDetailOut)
async def get_thread(
    thread_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> SupportThreadDetailOut:
    repo = SupportRepository(db)
    thread = await repo.get(thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    user = await UserRepository(db).get(thread.user_id)
    msgs = await repo.list_messages(thread.id)
    return SupportThreadDetailOut(
        id=thread.id,
        user_id=thread.user_id,
        user_email=user.email if user else None,
        user_full_name=user.full_name if user else None,
        messages=[_msg_out(m) for m in msgs],
    )


@router.post(
    "/threads/{thread_id}/messages",
    response_model=SupportMessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def post_admin_message(
    thread_id: UUID,
    payload: SupportMessageCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(get_current_admin)],
) -> SupportMessageOut:
    repo = SupportRepository(db)
    thread = await repo.get(thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    msg = await repo.add_message(
        thread_id=thread.id,
        sender_role="admin",
        sender_id=admin.id,
        body=payload.body,
    )
    thread_user = await UserRepository(db).get(thread.user_id)
    if thread_user and thread_user.email:
        _email_copy(
            to=thread_user.email,
            subject="Ответ службы поддержки",
            body=f"{msg.body}\n\n— Служба поддержки",
        )
    data = _ws_payload(msg)
    await support_hub.send_user(thread.user_id, data)
    await admin_support_hub.broadcast(data)
    return _msg_out(msg)


@router.websocket("/ws")
async def support_ws(websocket: WebSocket, token: str = Query(...)) -> None:
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
        is_admin = user.role == "admin"

    hub = admin_support_hub if is_admin else support_hub
    await hub.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await hub.disconnect(user_id, websocket)
