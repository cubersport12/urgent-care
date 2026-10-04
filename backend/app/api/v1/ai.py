"""AI generation API endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends
from app.api.deps import get_current_admin
from app.models.user import User
from app.schemas.ai import (
    GenerateRescueRequest,
    GenerateTestRequest,
    GeneratedRescueResponse,
    GeneratedTestResponse,
)
from app.services.ai_generator import AIGeneratorService

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate-test", response_model=GeneratedTestResponse, response_model_exclude_none=True)
async def generate_test(
    payload: GenerateTestRequest,
    _: Annotated[User, Depends(get_current_admin)],
) -> GeneratedTestResponse:
    return await AIGeneratorService.generate_test(payload.prompt)


@router.post("/generate-rescue", response_model=GeneratedRescueResponse, response_model_exclude_none=True)
async def generate_rescue(
    payload: GenerateRescueRequest,
    _: Annotated[User, Depends(get_current_admin)],
) -> GeneratedRescueResponse:
    return await AIGeneratorService.generate_rescue(payload.prompt)
