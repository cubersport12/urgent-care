"""Stats / results DTOs — camelCase aliases."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        ser_json_by_alias=True,
    )


class ArticleStatsOut(CamelModel):
    id: UUID | None = None
    client_id: str = Field(alias="clientId")
    article_id: str = Field(alias="articleId")
    readed: bool | None = None
    created_at: datetime = Field(alias="createdAt")


class ArticleStatsUpsert(CamelModel):
    article_id: str = Field(alias="articleId")
    readed: bool | None = None
    created_at: datetime | None = Field(None, alias="createdAt")


class TestStatsOut(CamelModel):
    id: UUID | None = None
    client_id: str = Field(alias="clientId")
    test_id: str = Field(alias="testId")
    started_at: datetime = Field(alias="startedAt")
    completed_at: datetime | None = Field(None, alias="completedAt")
    passed: bool | None = None
    data: Any | None = None


class TestStatsCreate(CamelModel):
    test_id: str = Field(alias="testId")
    started_at: datetime = Field(alias="startedAt")
    completed_at: datetime | None = Field(None, alias="completedAt")
    passed: bool | None = None
    data: Any | None = None


class TestStatsUpdate(CamelModel):
    started_at: datetime | None = Field(None, alias="startedAt")
    completed_at: datetime | None = Field(None, alias="completedAt")
    passed: bool | None = None
    data: Any | None = None


class RescueStatsOut(CamelModel):
    id: UUID | None = None
    client_id: str = Field(alias="clientId")
    rescue_id: str = Field(alias="rescueId")
    started_at: datetime = Field(alias="startedAt")
    completed_at: datetime | None = Field(None, alias="completedAt")
    passed: bool | None = None
    data: Any | None = None


class RescueStatsUpsert(CamelModel):
    rescue_id: str = Field(alias="rescueId")
    started_at: datetime = Field(alias="startedAt")
    completed_at: datetime | None = Field(None, alias="completedAt")
    passed: bool | None = None
    data: Any | None = None


class TestResultOut(CamelModel):
    id: UUID | None = None
    client_id: str | None = Field(None, alias="clientId")
    test_id: str = Field(alias="testId")
    total_score: int = Field(alias="totalScore")
    total_errors: int = Field(alias="totalErrors")
    is_passed: bool = Field(alias="isPassed")
    completion_type: str | None = Field(None, alias="completionType")
    answers: Any | None = None
    completed_at: datetime | None = Field(None, alias="completedAt")


class TestResultCreate(CamelModel):
    test_id: str = Field(alias="testId")
    total_score: int = Field(alias="totalScore")
    total_errors: int = Field(alias="totalErrors")
    is_passed: bool = Field(alias="isPassed")
    completion_type: str | None = Field(None, alias="completionType")
    answers: Any | None = None
    completed_at: datetime | None = Field(None, alias="completedAt")
