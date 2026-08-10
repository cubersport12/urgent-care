"""Achievement / reward DTOs."""
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


RULE_TYPES = (
    "manual",
    "articles_read",
    "tests_passed",
    "rescues_completed",
    "article_completed",
    "test_passed",
    "test_score",
    "rescue_passed",
    "folder_completed",
    "folder_rescues_passed",
)

TARGETED_RULE_TYPES = frozenset(
    {
        "article_completed",
        "test_passed",
        "test_score",
        "rescue_passed",
        "folder_completed",
        "folder_rescues_passed",
    }
)


class AchievementOut(CamelModel):
    id: UUID
    code: str
    title: str
    description: str | None = None
    icon_path: str | None = Field(None, alias="iconPath")
    rule_type: str = Field(alias="ruleType")
    rule_threshold: int = Field(alias="ruleThreshold")
    rule_target_id: str | None = Field(None, alias="ruleTargetId")
    sort_order: int = Field(alias="sortOrder")
    is_active: bool = Field(alias="isActive")


class AchievementCreate(CamelModel):
    code: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    icon_path: str | None = Field(None, alias="iconPath", max_length=512)
    rule_type: str = Field("manual", alias="ruleType")
    rule_threshold: int = Field(1, alias="ruleThreshold", ge=0)
    rule_target_id: str | None = Field(None, alias="ruleTargetId", max_length=64)
    sort_order: int = Field(0, alias="sortOrder")
    is_active: bool = Field(True, alias="isActive")


class AchievementUpdate(CamelModel):
    code: str | None = Field(None, min_length=1, max_length=64)
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    icon_path: str | None = Field(None, alias="iconPath", max_length=512)
    rule_type: str | None = Field(None, alias="ruleType")
    rule_threshold: int | None = Field(None, alias="ruleThreshold", ge=0)
    rule_target_id: str | None = Field(None, alias="ruleTargetId", max_length=64)
    sort_order: int | None = Field(None, alias="sortOrder")
    is_active: bool | None = Field(None, alias="isActive")


class RewardOut(CamelModel):
    id: UUID
    achievement_ids: list[UUID] = Field(alias="achievementIds")
    title: str
    description: str | None = None
    icon_path: str | None = Field(None, alias="iconPath")
    sort_order: int = Field(alias="sortOrder")
    is_active: bool = Field(alias="isActive")


class RewardCreate(CamelModel):
    achievement_ids: list[UUID] = Field(alias="achievementIds", min_length=1)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    icon_path: str | None = Field(None, alias="iconPath", max_length=512)
    sort_order: int = Field(0, alias="sortOrder")
    is_active: bool = Field(True, alias="isActive")


class RewardUpdate(CamelModel):
    achievement_ids: list[UUID] | None = Field(None, alias="achievementIds", min_length=1)
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    icon_path: str | None = Field(None, alias="iconPath", max_length=512)
    sort_order: int | None = Field(None, alias="sortOrder")
    is_active: bool | None = Field(None, alias="isActive")


class AchievementMeOut(CamelModel):
    id: UUID
    code: str
    title: str
    description: str | None = None
    icon_path: str | None = Field(None, alias="iconPath")
    rule_type: str = Field(alias="ruleType")
    rule_threshold: int = Field(alias="ruleThreshold")
    rule_target_id: str | None = Field(None, alias="ruleTargetId")
    sort_order: int = Field(alias="sortOrder")
    unlocked: bool
    unlocked_at: datetime | None = Field(None, alias="unlockedAt")
    progress: int = 0
    reward: RewardOut | None = None


class RewardMeOut(CamelModel):
    id: UUID
    achievement_ids: list[UUID] = Field(alias="achievementIds")
    achievement_titles: list[str] = Field(alias="achievementTitles")
    title: str
    description: str | None = None
    icon_path: str | None = Field(None, alias="iconPath")
    sort_order: int = Field(alias="sortOrder")
    unlocked_at: datetime = Field(alias="unlockedAt")


class GrantAchievementRequest(CamelModel):
    user_id: UUID = Field(alias="userId")
