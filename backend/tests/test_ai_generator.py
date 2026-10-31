"""Tests for AI generation service and schemas."""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

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


@pytest.mark.asyncio
async def test_generate_rescue_requests_and_preserves_vital_sign_severities(monkeypatch):
    severities = [
        {"min": 0, "max": 29, "severity": "high", "description": "Критическое снижение"},
        {"min": 30, "max": 59, "severity": "medium", "description": "Снижение"},
        {"min": 60, "max": 89, "severity": "low", "description": "Небольшое снижение"},
        {"min": 90, "max": 110, "severity": "normal", "description": "Норма"},
        {"min": 111, "max": 250, "severity": "high", "description": "Повышение"},
    ]
    response = {"parameters": [{"id": "p1", "name": "ЧСС", "severities": severities}]}
    create = AsyncMock(side_effect=[
        SimpleNamespace(choices=[SimpleNamespace(finish_reason="stop", message=SimpleNamespace(content="{"))]),
        SimpleNamespace(choices=[SimpleNamespace(finish_reason="stop", message=SimpleNamespace(content=json.dumps(response)))]),
    ])
    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    monkeypatch.setattr(AIGeneratorService, "_create_client", lambda **kwargs: client)

    result = await AIGeneratorService.generate_rescue("Сценарий для взрослого")

    assert create.await_count == 2
    messages = create.await_args.kwargs["messages"]
    assert create.await_args.kwargs["extra_body"] == {"thinking": {"type": "disabled"}}
    assert create.await_args.kwargs["max_tokens"] == 32_768
    instruction = messages[0]["content"]
    assert messages[0]["role"] == "system"
    assert all(word in instruction for word in ("жизненного показателя", "severities", "min", "max", "description", "normal", "low", "medium", "high"))
    assert "не должны пересекаться" in instruction
    assert "ниже и выше нормы" in instruction
    assert result.model_dump(by_alias=True)["parameters"][0]["severities"] == severities


@pytest.mark.asyncio
async def test_generate_rescue_reports_truncated_response(monkeypatch):
    create = AsyncMock(return_value=SimpleNamespace(choices=[SimpleNamespace(finish_reason="length")]))
    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    monkeypatch.setattr(AIGeneratorService, "_create_client", lambda **kwargs: client)

    with pytest.raises(HTTPException) as exc:
        await AIGeneratorService.generate_rescue("Случай", scene_count=16)

    assert "превысил лимит вывода" in exc.value.detail
    assert create.await_count == 1
    assert create.await_args.kwargs["max_tokens"] == 65_536


def test_generate_rescue_request_scene_count_bounds():
    req = GenerateRescueRequest.model_validate({"prompt": "случай", "sceneCount": 100, "difficulty": "средняя"})
    assert req.scene_count == 100
    assert req.difficulty == "средняя"

    req = GenerateRescueRequest.model_validate({"prompt": "случай", "sceneCount": 16})
    assert req.scene_count == 16

    req = GenerateRescueRequest.model_validate({"prompt": "случай"})
    assert req.scene_count is None
    assert req.difficulty is None

    for bad in (0, 101):
        with pytest.raises(ValidationError):
            GenerateRescueRequest.model_validate({"prompt": "случай", "sceneCount": bad})

    # неизвестная сложность отбрасывается, а не валит запрос
    req = GenerateRescueRequest.model_validate({"prompt": "случай", "difficulty": "хаос"})
    assert req.difficulty is None
