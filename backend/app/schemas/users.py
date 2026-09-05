"""Public profile surfaced via QR scan DTOs."""
from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        ser_json_by_alias=True,
    )


class QrRewardOut(CamelModel):
    id: UUID
    title: str
    description: str | None = None
    files: list[str] | None = None


class QrStatsOut(CamelModel):
    articles_read: int = Field(0, alias="articlesRead")
    tests_passed: int = Field(0, alias="testsPassed")
    rescues_passed: int = Field(0, alias="rescuesPassed")


class QrProfileOut(CamelModel):
    id: UUID
    full_name: str = Field(alias="fullName")
    city: str | None = None
    achievements_count: int = Field(0, alias="achievementsCount")
    rewards: list[QrRewardOut] = []
    stats: QrStatsOut = QrStatsOut()


class UserListItemOut(CamelModel):
    id: UUID
    email: str
    full_name: str = Field(alias="fullName")


class ResetStatsRequest(CamelModel):
    user_ids: list[UUID] = Field(alias="userIds", min_length=1)


class ResetStatsOut(CamelModel):
    users_count: int = Field(alias="usersCount")
