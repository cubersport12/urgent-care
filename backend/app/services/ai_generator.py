"""AI Generator service using DeepSeek API with structured JSON outputs and fallback."""
from __future__ import annotations

import json
import os
import uuid
from typing import Any

import httpx
from openai import AsyncOpenAI
import structlog

from app.core.config import settings
from app.schemas.ai import (
    GeneratedAnswer,
    GeneratedQuestion,
    GeneratedRescueResponse,
    GeneratedTestResponse,
    RescueChoiceParameterChange,
    RescueCompletion,
    RescueCompletionCondition,
    RescueScene,
    RescueSceneChoice,
    RescueSceneChoiceImplication,
    RescueTimerParameter,
)

logger = structlog.get_logger()


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
    def _create_client(cls) -> AsyncOpenAI | None:
        api_key = _get_deepseek_api_key()
        if not api_key:
            return None
        base_url = (settings.deepseek_base_url or "https://api.deepseek.com").rstrip("/") + "/"
        return AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=httpx.Timeout(60.0, connect=10.0),
        )

    @classmethod
    async def generate_test(cls, prompt: str) -> GeneratedTestResponse:
        """Generate structured test questions from prompt using DeepSeek."""
        client = cls._create_client()
        if client:
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

        # Deterministic rich template fallback for development / offline
        return cls._mock_test(prompt)

    @classmethod
    async def generate_rescue(cls, prompt: str) -> GeneratedRescueResponse:
        """Generate structured rescue scenario from prompt using DeepSeek."""
        client = cls._create_client()
        if client:
            try:
                system_instruction = (
                    "Ты сценарист медицинских интерактивных квестов и визуальных новелл по первой помощи.\n"
                    "Создай многошаговый сценарий спасения с параметрами (таймер, пульс, сознание и т.д.), "
                    "сценами выбора и условиями завершения.\n"
                    "ПРАВИЛА ДЛЯ ЗНАЧЕНИЙ ПОЛЕЙ:\n"
                    "- severity в implications ДОЛЖЕН быть строго одним из: \"normal\", \"low\", \"medium\", \"high\". Использовать warning или critical ЗАПРЕЩЕНО.\n"
                    "- operator в completion ДОЛЖЕН быть строго одним из: \"gte\", \"gt\", \"lte\", \"lt\", \"eq\", \"neq\".\n"
                    "- type в parameters ДОЛЖЕН быть \"numeric\" или \"timer\".\n"
                    "- Не передавай поля со значением null.\n"
                    "Верни ответ ИСКЛЮЧИТЕЛЬНО в формате JSON со структурой:\n"
                    "{\n"
                    '  "defaultBackground": "bg-hospital",\n'
                    '  "parameters": [\n'
                    '    {"id": "uuid", "name": "Название", "delta": -1.0, "startValue": 100.0, "type": "numeric"}\n'
                    "  ],\n"
                    '  "scenes": [\n'
                    "    {\n"
                    '      "id": "uuid", "order": 0, "background": "bg-hospital", "text": "Описание ситуации",\n'
                    '      "choices": [\n'
                    '        {"id": "uuid", "text": "Текст выбора", "nextSceneId": "uuid-или-null", "parameterChanges": [{"parameterId": "uuid", "value": 10.0}], "implications": [{"description": "Пояснение", "severity": "normal"}]}\n'
                    "      ]\n"
                    "    }\n"
                    "  ],\n"
                    '  "completion": {\n'
                    '    "success": {"type": "compare", "parameterId": "uuid", "operator": "gte", "value": 50.0},\n'
                    '    "failure": {"type": "compare", "parameterId": "uuid", "operator": "lt", "value": 30.0}\n'
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
                )
                raw = completion.choices[0].message.content or ""
                return GeneratedRescueResponse.model_validate_json(_clean_json(raw))
            except Exception as exc:
                logger.warning("deepseek_generate_rescue_failed", error=str(exc))

        # Fallback template
        return cls._mock_rescue(prompt)

    @staticmethod
    def _mock_test(prompt: str) -> GeneratedTestResponse:
        title = prompt.strip()[:60]
        return GeneratedTestResponse(
            questions=[
                GeneratedQuestion(
                    questionText=f"Первоочередное действие при ситуации: {title}?",
                    name="Вопрос 1",
                    answers=[
                        GeneratedAnswer(
                            answerText="Оценить безопасность обстановки и состояние пострадавшего",
                            isCorrect=True,
                            score=1.0,
                        ),
                        GeneratedAnswer(
                            answerText="Немедленно дать обезболивающие препараты",
                            isCorrect=False,
                            score=0.0,
                        ),
                        GeneratedAnswer(
                            answerText="Переместить пострадавшего без осмотра",
                            isCorrect=False,
                            score=0.0,
                        ),
                        GeneratedAnswer(
                            answerText="Ждать прибытия экстренных служб без действий",
                            isCorrect=False,
                            score=0.0,
                        ),
                    ],
                ),
                GeneratedQuestion(
                    questionText="Каков следующий этап алгоритма первой помощи?",
                    name="Вопрос 2",
                    answers=[
                        GeneratedAnswer(
                            answerText="Вызов скорой медицинской помощи (112 / 103)",
                            isCorrect=True,
                            score=1.0,
                        ),
                        GeneratedAnswer(
                            answerText="Публикация фото инцидента",
                            isCorrect=False,
                            score=0.0,
                        ),
                        GeneratedAnswer(
                            answerText="Предложение попить холодной воды",
                            isCorrect=False,
                            score=0.0,
                        ),
                    ],
                ),
            ]
        )

    @staticmethod
    def _mock_rescue(prompt: str) -> GeneratedRescueResponse:
        p_vital_id = str(uuid.uuid4())
        p_time_id = str(uuid.uuid4())
        s1_id = str(uuid.uuid4())
        s2_id = str(uuid.uuid4())
        s3_win_id = str(uuid.uuid4())
        s4_fail_id = str(uuid.uuid4())

        return GeneratedRescueResponse(
            defaultBackground="bg-hospital",
            parameters=[
                RescueTimerParameter(
                    id=p_vital_id,
                    name="Жизненные показатели",
                    delta=-1.0,
                    startValue=100.0,
                    type="numeric",
                ),
                RescueTimerParameter(
                    id=p_time_id,
                    name="Время до приезда СМП (мин)",
                    delta=-1.0,
                    startValue=10.0,
                    type="timer",
                ),
            ],
            scenes=[
                RescueScene(
                    id=s1_id,
                    order=0,
                    background="bg-hospital",
                    text=f"Экстренная ситуация: {prompt[:120]}. Пострадавший без сознания.",
                    choices=[
                        RescueSceneChoice(
                            id=str(uuid.uuid4()),
                            text="Проверить дыхание и проходимость дыхательных путей",
                            nextSceneId=s2_id,
                            parameterChanges=[
                                RescueChoiceParameterChange(parameterId=p_vital_id, value=10.0)
                            ],
                            implications=[
                                RescueSceneChoiceImplication(
                                    description="Дыхание контролируется, риск асфиксии снижен",
                                    severity="normal",
                                )
                            ],
                        ),
                        RescueSceneChoice(
                            id=str(uuid.uuid4()),
                            text="Попытаться напоить водой без сознания",
                            nextSceneId=s4_fail_id,
                            parameterChanges=[
                                RescueChoiceParameterChange(parameterId=p_vital_id, value=-50.0)
                            ],
                            implications=[
                                RescueSceneChoiceImplication(
                                    description="Опасность аспирации жидкости в дыхательные пути!",
                                    severity="high",
                                )
                            ],
                        ),
                    ],
                ),
                RescueScene(
                    id=s2_id,
                    order=1,
                    background="bg-hospital",
                    text="Дыхание стабильное. Вы вызвали скорую помощь. Ваши дальнейшие действия?",
                    choices=[
                        RescueSceneChoice(
                            id=str(uuid.uuid4()),
                            text="Перевести в устойчивое боковое положение и контролировать пульс",
                            nextSceneId=s3_win_id,
                            parameterChanges=[
                                RescueChoiceParameterChange(parameterId=p_vital_id, value=20.0)
                            ],
                            implications=[
                                RescueSceneChoiceImplication(
                                    description="Положение безопасно до прибытия медиков",
                                    severity="normal",
                                )
                            ],
                        ),
                    ],
                ),
                RescueScene(
                    id=s3_win_id,
                    order=2,
                    background="bg-hospital",
                    text="Скорая помощь прибыла. Пострадавший успешно стабилизирован!",
                    choices=[],
                ),
                RescueScene(
                    id=s4_fail_id,
                    order=3,
                    background="bg-hospital",
                    text="Состояние ухудшилось из-за грубых ошибок в алгоритме первой помощи.",
                    choices=[],
                ),
            ],
            completion=RescueCompletion(
                success=RescueCompletionCondition(
                    type="compare",
                    parameterId=p_vital_id,
                    operator="gte",
                    value=50.0,
                ),
                failure=RescueCompletionCondition(
                    type="compare",
                    parameterId=p_vital_id,
                    operator="lt",
                    value=30.0,
                ),
            ),
        )
