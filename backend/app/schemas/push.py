"""Push token DTOs."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        ser_json_by_alias=True,
    )


class PushTokenUpsert(CamelModel):
    token: str = Field(min_length=8, max_length=255)
    platform: str = Field("unknown", max_length=20)
