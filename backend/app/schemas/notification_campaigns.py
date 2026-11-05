"""Inputs and outputs for administrative notification campaigns."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from croniter import croniter
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class CampaignInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(default="", max_length=5000)
    icon_path: str | None = Field(default=None, max_length=500)
    audience: Literal["all", "selected"]
    user_ids: list[UUID] = Field(default_factory=list)
    cron: str | None = Field(default=None, max_length=100)

    @field_validator("name", "title")
    @classmethod
    def require_nonblank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Поле не может быть пустым")
        return value

    @field_validator("cron")
    @classmethod
    def validate_cron(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if len(value.split()) != 5 or not croniter.is_valid(value):
            raise ValueError("Укажите корректное cron-выражение из пяти полей")
        return value

    @field_validator("icon_path")
    @classmethod
    def validate_icon_path(cls, value: str | None) -> str | None:
        if value is None:
            return None
        prefix = "public/notifications/"
        if not value.startswith(prefix) or not value.endswith(".png"):
            raise ValueError("Некорректный путь к иконке")
        try:
            image_id = UUID(value[len(prefix):-4])
        except ValueError as exc:
            raise ValueError("Некорректный путь к иконке") from exc
        if value != f"{prefix}{image_id}.png":
            raise ValueError("Некорректный путь к иконке")
        return value

    @model_validator(mode="after")
    def validate_audience(self) -> CampaignInput:
        if self.audience == "selected" and not self.user_ids:
            raise ValueError("Выберите хотя бы одного пользователя")
        if self.audience == "all":
            self.user_ids = []
        else:
            self.user_ids = list(dict.fromkeys(self.user_ids))
        return self


class TemplateOut(CampaignInput):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class DispatchInput(CampaignInput):
    template_id: UUID | None = None


class DispatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source: str
    title: str
    body: str
    icon_path: str | None
    audience: str
    recipient_count: int
    status: str
    push_accepted: int
    push_failed: int
    created_at: datetime


class ScheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    snapshot: dict
    cron: str
    next_run_at: datetime
    active: bool
