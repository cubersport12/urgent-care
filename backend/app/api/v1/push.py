"""Register Expo push tokens for system notifications."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.push import PushTokenUpsert
from app.services import expo_push

router = APIRouter(prefix="/push-tokens", tags=["push"])


@router.put("", status_code=status.HTTP_204_NO_CONTENT)
async def upsert_push_token(
    payload: PushTokenUpsert,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    await expo_push.upsert_push_token(
        db, user_id=user.id, token=payload.token, platform=payload.platform
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_push_token(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    token: str = Query(..., min_length=8, max_length=255),
) -> None:
    await expo_push.delete_push_token(db, user_id=user.id, token=token)
