"""Content DTOs — camelCase aliases matching App*Vm."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        ser_json_by_alias=True,
        # Prefer camelCase names in OpenAPI / generated clients
        json_schema_serialization_defaults_required=True,
    )


class LinkToArticle(CamelModel):
    key: str
    article_id: str = Field(alias="articleId")


class FolderOut(CamelModel):
    id: str
    name: str
    order: int | None = None
    parent_id: str | None = Field(None, alias="parentId")


class FolderCreate(CamelModel):
    id: str | None = None
    name: str
    order: int | None = None
    parent_id: str | None = Field(None, alias="parentId")


class FolderUpdate(CamelModel):
    name: str | None = None
    order: int | None = None
    parent_id: str | None = Field(None, alias="parentId")


class ArticleOut(CamelModel):
    id: str
    name: str
    order: int | None = None
    parent_id: str | None = Field(None, alias="parentId")
    next_run_article: str | None = Field(None, alias="nextRunArticle")
    time_read: float | None = Field(None, alias="timeRead")
    disable_while_not_prev_complete: bool | None = Field(
        None, alias="disableWhileNotPrevComplete"
    )
    hide_while_not_prev_complete: bool | None = Field(
        None, alias="hideWhileNotPrevComplete"
    )
    include_to_statistics: bool | None = Field(None, alias="includeToStatistics")
    links_to_articles: list[LinkToArticle] | None = Field(None, alias="linksToArticles")


class ArticleCreate(CamelModel):
    id: str | None = None
    name: str
    order: int | None = None
    parent_id: str | None = Field(None, alias="parentId")
    next_run_article: str | None = Field(None, alias="nextRunArticle")
    time_read: float | None = Field(None, alias="timeRead")
    disable_while_not_prev_complete: bool | None = Field(
        None, alias="disableWhileNotPrevComplete"
    )
    hide_while_not_prev_complete: bool | None = Field(
        None, alias="hideWhileNotPrevComplete"
    )
    include_to_statistics: bool | None = Field(None, alias="includeToStatistics")
    links_to_articles: list[LinkToArticle] | None = Field(None, alias="linksToArticles")


class ArticleUpdate(CamelModel):
    name: str | None = None
    order: int | None = None
    parent_id: str | None = Field(None, alias="parentId")
    next_run_article: str | None = Field(None, alias="nextRunArticle")
    time_read: float | None = Field(None, alias="timeRead")
    disable_while_not_prev_complete: bool | None = Field(
        None, alias="disableWhileNotPrevComplete"
    )
    hide_while_not_prev_complete: bool | None = Field(
        None, alias="hideWhileNotPrevComplete"
    )
    include_to_statistics: bool | None = Field(None, alias="includeToStatistics")
    links_to_articles: list[LinkToArticle] | None = Field(None, alias="linksToArticles")


class TestOut(CamelModel):
    id: str
    name: str
    order: int | None = None
    parent_id: str | None = Field(None, alias="parentId")
    min_score: int | None = Field(None, alias="minScore")
    max_errors: int | None = Field(None, alias="maxErrors")
    show_correct_answer: bool | None = Field(None, alias="showCorrectAnswer")
    include_to_statistics: bool | None = Field(None, alias="includeToStatistics")
    show_skip_button: bool | None = Field(None, alias="showSkipButton")
    show_navigation: bool | None = Field(None, alias="showNavigation")
    show_back_button: bool | None = Field(None, alias="showBackButton")
    hidden: bool | None = None
    questions: list[Any] | None = None
    accessability_conditions: list[Any] | None = Field(None, alias="accessabilityConditions")


class TestCreate(CamelModel):
    id: str | None = None
    name: str
    order: int | None = None
    parent_id: str | None = Field(None, alias="parentId")
    min_score: int | None = Field(None, alias="minScore")
    max_errors: int | None = Field(None, alias="maxErrors")
    show_correct_answer: bool | None = Field(None, alias="showCorrectAnswer")
    include_to_statistics: bool | None = Field(None, alias="includeToStatistics")
    show_skip_button: bool | None = Field(None, alias="showSkipButton")
    show_navigation: bool | None = Field(None, alias="showNavigation")
    show_back_button: bool | None = Field(None, alias="showBackButton")
    hidden: bool | None = None
    questions: list[Any] | None = None
    accessability_conditions: list[Any] | None = Field(None, alias="accessabilityConditions")


class TestUpdate(CamelModel):
    name: str | None = None
    order: int | None = None
    parent_id: str | None = Field(None, alias="parentId")
    min_score: int | None = Field(None, alias="minScore")
    max_errors: int | None = Field(None, alias="maxErrors")
    show_correct_answer: bool | None = Field(None, alias="showCorrectAnswer")
    include_to_statistics: bool | None = Field(None, alias="includeToStatistics")
    show_skip_button: bool | None = Field(None, alias="showSkipButton")
    show_navigation: bool | None = Field(None, alias="showNavigation")
    show_back_button: bool | None = Field(None, alias="showBackButton")
    hidden: bool | None = None
    questions: list[Any] | None = None
    accessability_conditions: list[Any] | None = Field(None, alias="accessabilityConditions")


class RescueOut(CamelModel):
    id: str
    name: str
    order: int | None = None
    parent_id: str | None = Field(None, alias="parentId")
    created_at: datetime = Field(alias="createdAt")
    description: str = ""
    data: dict[str, Any] | None = None


class RescueCreate(CamelModel):
    id: str | None = None
    name: str
    order: int | None = None
    parent_id: str | None = Field(None, alias="parentId")
    created_at: datetime | None = Field(None, alias="createdAt")
    description: str = ""
    data: dict[str, Any] | None = None


class RescueUpdate(CamelModel):
    name: str | None = None
    order: int | None = None
    parent_id: str | None = Field(None, alias="parentId")
    description: str | None = None
    data: dict[str, Any] | None = None
