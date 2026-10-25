"""AI Generator service using DeepSeek API with structured JSON outputs."""
from __future__ import annotations

import os

import httpx
from openai import AsyncOpenAI
import structlog
from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.ai import GeneratedRescueResponse, GeneratedTestResponse

logger = structlog.get_logger()

_AI_NOT_CONFIGURED = "ИИ не настроен: не задан API-ключ DeepSeek (DEEPSEEK_API_KEY)."


def _get_deepseek_api_key() -> str:
    return (
        settings.deepseek_api_key
        or os.environ.get("DEEPSEEK_API_KEY")
        or os.environ.get("DEEPSEEK_TOKEN")
        or ""
    ).strip()


def _clean_json(text: str) -> str:
    trimmed = text.strip()
    if trimmed.startswith("```"):
        lines = trimmed.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        trimmed = "\n".join(lines).strip()
    return trimmed


class AIGeneratorService:
    @classmethod
    def _create_client(cls, timeout_seconds: float = 60.0) -> AsyncOpenAI:
        api_key = _get_deepseek_api_key()
        if not api_key:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail=_AI_NOT_CONFIGURED)
        base_url = (settings.deepseek_base_url or "https://api.deepseek.com").rstrip("/") + "/"
        return AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=httpx.Timeout(timeout_seconds, connect=10.0),
        )

    @classmethod
    async def generate_test(cls, prompt: str) -> GeneratedTestResponse:
        """Generate structured test questions from prompt using DeepSeek."""
        client = cls._create_client()
        try:
            system_instruction = (
                "Ты методист по медицинским тестам. Генерируешь качественные вопросы с "
                "вариантами ответов для проверки знаний и навыков оказания неотложной помощи.\n"
                "Верни ответ ИСКЛЮЧИТЕЛЬНО в формате JSON со следующей структурой:\n"
                "{\n"
                '  "questions": [\n'
                "    {\n"
                '      "questionText": "Текст вопроса",\n'
                '      "name": "Вопрос 1",\n'
                '      "answers": [\n'
                '        {"answerText": "Вариант ответа", "isCorrect": true, "score": 1.0},\n'
                '        {"answerText": "Неверный ответ", "isCorrect": false, "score": 0.0}\n'
                "      ]\n"
                "    }\n"
                "  ]\n"
                "}\n"
                "Каждый вопрос должен иметь минимум 2 варианта ответа, хотя бы один правильный."
            )

            completion = await client.chat.completions.create(
                model=settings.deepseek_model or "deepseek-flash",
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            raw = completion.choices[0].message.content or ""
            return GeneratedTestResponse.model_validate_json(_clean_json(raw))
        except Exception as exc:
            logger.warning("deepseek_generate_test_failed", error=str(exc))
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY, detail=f"Ошибка генерации ИИ: {exc}"
            ) from exc

    @classmethod
    async def generate_rescue(
        cls,
        prompt: str,
        scene_count: int | None = None,
        difficulty: str | None = None,
    ) -> GeneratedRescueResponse:
        """Generate structured rescue scenario from prompt using DeepSeek."""
        client = cls._create_client(
            timeout_seconds=300.0 if scene_count and scene_count > 15 else 60.0
        )
        try:
            scene_rule = (
                f"Количество сцен: ровно {scene_count}."
                if scene_count
                else "Количество сцен выбери самостоятельно, исходя из сюжета (обычно 6–10 для полноценного квеста)."
            )
            difficulty_rule = (
                f"\nЦелевая сложность прохождения для пользователя: {difficulty}."
                if difficulty
                else ""
            )
            system_instruction = (
                "Ты сценарист медицинских интерактивных квестов и визуальных новелл по первой помощи.\n"
                "Создай многошаговый сценарий спасения с параметрами (таймер, пульс, сознание и т.д.), "
                "сценами выбора и условиями завершения.\n"
                f"{scene_rule} Жёсткий максимум — 100 сцен. Сюжет не обрезай: выдай все задуманные сцены целиком."
                f"{difficulty_rule}\n"
                "ПРАВИЛА ДЛЯ ЗНАЧЕНИЙ ПОЛЕЙ:\n"
                "- severity в implications ДОЛЖЕН быть строго одним из: \"normal\", \"low\", \"medium\", \"high\". Использовать warning или critical ЗАПРЕЩЕНО.\n"
                "- operator в completion ДОЛЖЕН быть строго одним из: \"gte\", \"gt\", \"lte\", \"lt\", \"eq\", \"neq\".\n"
                "- type в parameters ДОЛЖЕН быть \"numeric\" или \"timer\".\n"
                "- Не передавай поля со значением null.\n"
                "- implications.description — одно короткое предложение.\n"
                "- id делай короткими и уникальными: параметры p1..pN, сцены s1..sN, выборы c1..cM. UUID НЕ генерируй; nextSceneId, parameterId и completion.parameterId ссылаются на эти же короткие id.\n"
                "- ЭКОНОМЬ ВЫВОД: JSON пиши компактно, без переносов строк и отступов — иначе ответ не влезет в лимит и будет обрезан.\n"
                "Верни ответ ИСКЛЮЧИТЕЛЬНО в формате JSON со структурой:\n"
                "{\n"
                '  "defaultBackground": "bg-hospital",\n'
                '  "parameters": [\n'
                '    {"id": "p1", "name": "Название", "delta": -1.0, "startValue": 100.0, "type": "numeric"}\n'
                "  ],\n"
                '  "scenes": [\n'
                "    {\n"
                '      "id": "s1", "order": 0, "background": "bg-hospital", "text": "Описание ситуации",\n'
                '      "choices": [\n'
                '        {"id": "c1", "text": "Текст выбора", "nextSceneId": "s2-или-null", "parameterChanges": [{"parameterId": "p1", "value": 10.0}], "implications": [{"description": "Пояснение", "severity": "normal"}]}\n'
                "      ]\n"
                "    }\n"
                "  ],\n"
                '  "completion": {\n'
                '    "success": {"type": "compare", "parameterId": "p1", "operator": "gte", "value": 50.0},\n'
                '    "failure": {"type": "compare", "parameterId": "p1", "operator": "lt", "value": 30.0}\n'
                "  }\n"
                "}"
            )

            completion = await client.chat.completions.create(
                model=settings.deepseek_model or "deepseek-flash",
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                # Для запросов свыше 15 сцен увеличиваем лимит, чтобы ответ не обрезался.
                max_tokens=65_536 if scene_count and scene_count > 15 else 8_192,
            )
            choice = completion.choices[0]
            if choice.finish_reason == "length":
                raise ValueError(
                    "ответ ИИ обрезан лимитом вывода — уменьшите количество сцен или упростите промпт"
                )
            raw = choice.message.content or ""
            return GeneratedRescueResponse.model_validate_json(_clean_json(raw))
        except Exception as exc:
            logger.warning("deepseek_generate_rescue_failed", error=str(exc))
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY, detail=f"Ошибка генерации ИИ: {exc}"
            ) from exc
