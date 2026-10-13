"""Tests for AI generation service and schemas."""
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas.ai import GenerateRescueRequest
from app.services.ai_generator import AIGeneratorService


@pytest.mark.asyncio
async def test_ai_generate_test_without_key_raises(monkeypatch):
    monkeypatch.setattr("app.services.ai_generator._get_deepseek_api_key", lambda: "")
    with pytest.raises(HTTPException) as exc:
        await AIGeneratorService.generate_test("Сердечно-легочная реанимация")
    assert exc.value.status_code == 503
    assert "ИИ не настроен" in exc.value.detail


@pytest.mark.asyncio
async def test_ai_generate_rescue_without_key_raises(monkeypatch):
    monkeypatch.setattr("app.services.ai_generator._get_deepseek_api_key", lambda: "")
    with pytest.raises(HTTPException) as exc:
        await AIGeneratorService.generate_rescue("Анафилактический шок у взрослого")
    assert exc.value.status_code == 503
    assert "ИИ не настроен" in exc.value.detail


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
