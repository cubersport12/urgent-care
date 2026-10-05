"""Public profile surfaced via QR scan DTOs."""
from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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
    status: str = "active"
    phone: str | None = None
    tariff_name: str | None = Field(None, alias="tariffName")
    score: int = 0
    role: str = "user"
    occupation: str | None = None
    birth_year: int | None = Field(None, alias="birthYear")


class UserAdminCreate(CamelModel):
    email: EmailStr
    full_name: str = Field(alias="fullName", min_length=1, max_length=200)
    role: Literal["user", "admin"] = "user"
    occupation: str | None = Field(None, max_length=100)
    birth_year: int | None = Field(None, alias="birthYear", ge=1900, le=2100)
    password: str | None = Field(None, min_length=6, max_length=100)


class UserAdminUpdate(CamelModel):
    full_name: str | None = Field(None, alias="fullName", min_length=1, max_length=200)
    role: Literal["user", "admin"] | None = None
    occupation: str | None = Field(None, max_length=100)
    birth_year: int | None = Field(None, alias="birthYear", ge=1900, le=2100)

class GrantBonusRequest(CamelModel):
    points: int
    reason: str | None = None

class UserStatusUpdateRequest(CamelModel):
    status: str


class AdminActionOut(CamelModel):
    success: bool
    message: str


class ResetStatsRequest(CamelModel):
    user_ids: list[UUID] = Field(alias="userIds", min_length=1)


class ResetStatsOut(CamelModel):
    users_count: int = Field(alias="usersCount")

