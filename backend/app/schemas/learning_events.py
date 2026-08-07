"""Learning event DTOs."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        ser_json_by_alias=True,
    )


class LearningEventCreate(CamelModel):
    entity_type: str = Field(alias="entityType", min_length=1, max_length=20)
    entity_id: str = Field(alias="entityId", min_length=1, max_length=64)
    event: str = Field(min_length=1, max_length=40)
    payload: dict[str, Any] | None = None


class LearningEventOut(CamelModel):
    id: UUID
    entity_type: str = Field(alias="entityType")
    entity_id: str = Field(alias="entityId")
    event: str
    payload: dict[str, Any] | None = None
