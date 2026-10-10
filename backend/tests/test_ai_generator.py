"""Tests for AI generation service and schemas."""
import pytest
from pydantic import ValidationError

from app.schemas.ai import GenerateRescueRequest
from app.services.ai_generator import AIGeneratorService


@pytest.mark.asyncio
async def test_ai_generate_test_schema():
    res = await AIGeneratorService.generate_test("Сердечно-легочная реанимация")
    assert len(res.questions) >= 1
    q = res.questions[0]
    assert len(q.question_text) > 0
    assert len(q.answers) >= 2
    assert any(a.is_correct for a in q.answers)


@pytest.mark.asyncio
async def test_ai_generate_rescue_schema():
    res = await AIGeneratorService.generate_rescue("Анафилактический шок у взрослого")
    assert len(res.scenes) >= 1
    assert len(res.parameters) >= 1
    assert res.default_background is not None
    assert res.completion is not None
    assert res.completion.success is not None


def test_generate_rescue_request_scene_count_bounds():
    req = GenerateRescueRequest.model_validate({"prompt": "случай", "sceneCount": 15, "difficulty": "средняя"})
    assert req.scene_count == 15
    assert req.difficulty == "средняя"

    req = GenerateRescueRequest.model_validate({"prompt": "случай"})
    assert req.scene_count is None
    assert req.difficulty is None

    for bad in (0, 16, 99):
        with pytest.raises(ValidationError):
            GenerateRescueRequest.model_validate({"prompt": "случай", "sceneCount": bad})

    # неизвестная сложность отбрасывается, а не валит запрос
    req = GenerateRescueRequest.model_validate({"prompt": "случай", "difficulty": "хаос"})
    assert req.difficulty is None
