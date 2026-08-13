"""Training (work on mistakes) DTOs."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        ser_json_by_alias=True,
    )


class RecommendedArticleOut(CamelModel):
    id: str
    name: str


class WrongQuestionOut(CamelModel):
    question_id: str = Field(alias="questionId")
    question_text: str = Field(alias="questionText")
    wrong_count: int = Field(alias="wrongCount")
    last_wrong_at: datetime | None = Field(None, alias="lastWrongAt")
    recommended_articles: list[RecommendedArticleOut] = Field(
        default_factory=list, alias="recommendedArticles"
    )


class TrainingTopicOut(CamelModel):
    test_id: str = Field(alias="testId")
    test_name: str = Field(alias="testName")
    wrong_questions: list[WrongQuestionOut] = Field(alias="wrongQuestions")
