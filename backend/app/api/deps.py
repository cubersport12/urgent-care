"""Common FastAPI dependencies."""
from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.base import AsyncSessionLocal
from app.db.repositories.user import UserRepository
from app.models.auth_session import AuthSession
from app.models.user import User


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_user_by_session(
    db: AsyncSession, session_id_raw: str | None
) -> User | None:
    """Валидация session id: возвращает юзера или None. Общая для HTTP и WebSocket."""
    try:
        session_id = UUID(session_id_raw)
    except (TypeError, ValueError):
        return None
    session = await db.get(AuthSession, session_id)
    now = datetime.now(timezone.utc)
    if not session or session.ended_at is not None or session.expires_at <= now:
        return None
    user = await UserRepository(db).get(session.user_id)
    if not user or not user.is_active:
        return None
    # ponytail: активность и скользящее продление пишем не чаще раза в минуту
    if now - session.last_active_at > timedelta(minutes=1):
        session.last_active_at = now
        session.expires_at = now + timedelta(days=settings.session_ttl_days)
    return user


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    x_session_id: Annotated[
        str | None, Header(alias="X-Session-Id", auto_error=False)
    ] = None,
) -> User:
    if not x_session_id:
        raise HTTPException(status_code=401, detail="Session missing")
    user = await get_user_by_session(db, x_session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or revoked")
    return user


async def get_current_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return user
