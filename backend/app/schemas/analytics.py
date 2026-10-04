"""Analytics DTOs."""
from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        ser_json_by_alias=True,
    )


class AnalyticsDayOut(CamelModel):
    date: date
    tests: int = 0
    rescues: int = 0


class AnalyticsTariffOut(CamelModel):
    tariff_id: Annotated[str, Field(alias="tariffId")]
    title: str
    price_rub: Annotated[int, Field(alias="priceRub")] = 0
    count: int


class AnalyticsSummaryOut(CamelModel):
    period: str
    users_total: Annotated[int, Field(alias="usersTotal")] = 0
    users_new: Annotated[int, Field(alias="usersNew")] = 0
    active_subscriptions: Annotated[int, Field(alias="activeSubscriptions")] = 0
    revenue_rub: Annotated[float, Field(alias="revenueRub")] = 0
    tests_finished: Annotated[int, Field(alias="testsFinished")] = 0
    rescues_finished: Annotated[int, Field(alias="rescuesFinished")] = 0
    articles_completed: Annotated[int, Field(alias="articlesCompleted")] = 0
    conversion_percent: Annotated[float, Field(alias="conversionPercent")] = 0
    series: list[AnalyticsDayOut] = Field(default_factory=list)
    tariffs: list[AnalyticsTariffOut] = Field(default_factory=list)


class ActivityEventOut(CamelModel):
    id: str
    kind: Literal["test", "rescue", "article", "payment", "registration"]
    event: str
    title: str
    user_name: Annotated[str, Field(alias="userName")] = ""
    score: float | None = None
    created_at: Annotated[datetime, Field(alias="createdAt")]
