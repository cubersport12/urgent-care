"""Notification DTOs."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        ser_json_by_alias=True,
    )


class NotificationOut(CamelModel):
    id: UUID
    title: str
    body: str
    created_at: datetime = Field(alias="createdAt")
    read_at: datetime | None = Field(None, alias="readAt")
    is_read: bool = Field(alias="isRead")


class UnreadCountOut(CamelModel):
    count: int


class NotificationCreate(CamelModel):
    user_id: UUID = Field(alias="userId")
    title: str = Field(min_length=1, max_length=200)
    body: str = Field("", max_length=5000)


class NotificationBroadcast(CamelModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field("", max_length=5000)


class BroadcastOut(CamelModel):
    created: int
