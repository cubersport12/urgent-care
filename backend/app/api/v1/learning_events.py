"""Learning analytics event ingest."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.learning_events import LearningEventCreate, LearningEventOut
from app.services.learning_events import ALLOWED, record_learning_event

router = APIRouter(prefix="/learning-events", tags=["learning-events"])


@router.post("", response_model=LearningEventOut, status_code=status.HTTP_201_CREATED)
async def create_learning_event(
    payload: LearningEventCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> LearningEventOut:
    pair = (payload.entity_type.strip().lower(), payload.event.strip().lower())
    if pair not in ALLOWED:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event. Allowed pairs: {sorted(ALLOWED)}",
        )
    row = await record_learning_event(
        db,
        user_id=user.id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        event=payload.event,
        payload=payload.payload,
    )
    if not row:
        raise HTTPException(status_code=400, detail="Could not record event")
    return LearningEventOut.model_validate(row)
