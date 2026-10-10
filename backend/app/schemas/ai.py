"""AI Generation schemas."""
from __future__ import annotations

from typing import Annotated, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator


def _normalize_severity(v: Any) -> str:
    if not v or not isinstance(v, str):
        return "normal"
    val = v.strip().lower()
    if val in ("normal", "low", "medium", "high"):
        return val
    if val in ("critical", "fatal", "danger", "severe"):
        return "high"
    if val in ("warning", "warn", "moderate"):
        return "medium"
    if val in ("minor", "mild", "slight"):
        return "low"
    return "normal"


def _normalize_operator(v: Any) -> str:
    if not v or not isinstance(v, str):
        return "gte"
    val = v.strip().lower()
    if val in ("eq", "neq", "gt", "gte", "lt", "lte"):
        return val
    if val in (">=", "=>"):
        return "gte"
    if val in ("<=", "=<"):
        return "lte"
    if val == ">":
        return "gt"
    if val == "<":
        return "lt"
    if val in ("==", "="):
        return "eq"
    if val in ("!=", "<>"):
        return "neq"
    return "gte"


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        ser_json_by_alias=True,
    )


class GenerateTestRequest(CamelModel):
    prompt: str


class GeneratedAnswer(CamelModel):
    answer_text: str = Field(alias="answerText")
    is_correct: bool = Field(alias="isCorrect")
    score: float | None = 1.0


class GeneratedQuestion(CamelModel):
    question_text: str = Field(alias="questionText")
    name: str | None = None
    answers: list[GeneratedAnswer]


class GeneratedTestResponse(CamelModel):
    questions: list[GeneratedQuestion]


_DIFFICULTY_LEVELS = ("лёгкая", "легкая", "средняя", "высокая")


class GenerateRescueRequest(CamelModel):
    prompt: str
    # Annotated целиком: pydantic v2 молча игнорирует Field(alias=...) на union-типе
    scene_count: Annotated[int | None, Field(None, alias="sceneCount", ge=1, le=15)] = None
    difficulty: Annotated[str | None, Field(None, alias="difficulty")] = None

    @field_validator("difficulty", mode="before")
    @classmethod
    def validate_difficulty(cls, v: Any) -> str | None:
        if isinstance(v, str) and v.strip().lower() in _DIFFICULTY_LEVELS:
            return v.strip().lower()
        return None


class RescueParameterSeverity(CamelModel):
    min: float | None = None
    max: float | None = None
    severity: str | None = "normal"
    description: str | None = None

    @field_validator("severity", mode="before")
    @classmethod
    def validate_severity(cls, v: Any) -> str:
        return _normalize_severity(v)


class RescueTimerParameter(CamelModel):
    id: str
    name: str
    delta: float = 0.0
    start_value: float = Field(0.0, alias="startValue")
    type: str = "numeric"
    severities: list[RescueParameterSeverity] | None = None
    is_hidden: bool | None = Field(None, alias="isHidden")

    @field_validator("type", mode="before")
    @classmethod
    def validate_type(cls, v: Any) -> str:
        if isinstance(v, str) and v.lower() == "timer":
            return "timer"
        return "numeric"


class RescueChoiceParameterChange(CamelModel):
    parameter_id: str = Field(alias="parameterId")
    value: float


class RescueSceneChoiceImplication(CamelModel):
    description: str
    severity: str = "normal"

    @field_validator("severity", mode="before")
    @classmethod
    def validate_severity(cls, v: Any) -> str:
        return _normalize_severity(v)


class RescueSceneChoice(CamelModel):
    id: str
    text: str
    parameter_changes: list[RescueChoiceParameterChange] = Field(default_factory=list, alias="parameterChanges")
    next_scene_id: str | None = Field(None, alias="nextSceneId")
    implications: list[RescueSceneChoiceImplication] = Field(default_factory=list)


class RescueScene(CamelModel):
    id: str
    order: int | None = None
    background: str = "bg-hospital"
    text: str
    choices: list[RescueSceneChoice] = Field(default_factory=list)
    hidden: bool | None = None
    is_reviewed: bool | None = Field(None, alias="isReviewed")


class RescueCompletionCondition(CamelModel):
    type: str = "compare"
    parameter_id: str | None = Field(None, alias="parameterId")
    operator: str | None = "gte"
    value: float | None = None
    logical_operator: str | None = Field(None, alias="logicalOperator")
    conditions: list[Any] | None = None

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v: Any) -> str:
        return _normalize_operator(v)


class RescueCompletion(CamelModel):
    success: RescueCompletionCondition | None = None
    failure: RescueCompletionCondition | None = None


class GeneratedRescueResponse(CamelModel):
    parameters: list[RescueTimerParameter] = Field(default_factory=list)
    scenes: list[RescueScene] = Field(default_factory=list)
    default_background: str | None = Field("bg-hospital", alias="defaultBackground")
    completion: RescueCompletion | None = None
