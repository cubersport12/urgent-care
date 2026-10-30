"""Training: weak test topics + article recommendations."""
from __future__ import annotations

import logging
import random
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embedding_client import embeddings_configured
from app.api.deps import get_current_user, get_db, get_user_by_session
from app.api.v1._content_access import annotate_content_list, assert_content_visible
from app.db.repositories.content import FolderRepository, TestRepository
from app.models.random_training import RandomTraining
from app.models.user import User
from app.schemas.training import (
    RecommendedArticleOut,
    TestRecommendationsCreate,
    TrainingTopicOut,
    WrongQuestionOut,
)
from app.services.article_embeddings import search_similar_articles, vectors_for_texts
from app.services.entitlements import (
    filter_by_rank,
    filter_by_reward,
    tariff_rank_map,
    unlocked_reward_ids,
    user_content_rank,
)
from app.services.training import (
    group_wrong_by_test,
    load_user_wrong_stats,
    question_text_from_test,
)

log = logging.getLogger(__name__)

router = APIRouter(prefix="/training", tags=["training"])

DIFFICULTIES = {"easy": 5, "medium": 10, "hard": 20}


class RandomAnswer(BaseModel):
    question_id: str = Field(alias="questionId")
    answer_ids: list[int] = Field(alias="answerIds", max_length=100)


class RandomCompletion(BaseModel):
    answers: list[RandomAnswer] = Field(max_length=20)


@router.websocket("/random/ws")
async def random_training_ws(
    websocket: WebSocket,
    db: Annotated[AsyncSession, Depends(get_db)],
    session_id: str,
    difficulty: str,
) -> None:
    user = await get_user_by_session(db, session_id)
    if not user:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    if difficulty not in DIFFICULTIES:
        await websocket.send_json({"type": "error", "message": "Неизвестный уровень сложности"})
        await websocket.close()
        return
    try:
        tests = await TestRepository(db).list_all()
        annotated = await annotate_content_list(db, user, tests, enforce_for_admin=True)
        pools = []
        seen = set()
        for test, locked in annotated:
            if locked or test.hidden:
                continue
            questions = []
            for q in test.questions or []:
                if not isinstance(q, dict) or not isinstance(q.get("id"), str) or q["id"] in seen or q.get("activationCondition"):
                    continue
                choices = q.get("answers")
                if not isinstance(choices, list) or not choices or not all(isinstance(a, dict) for a in choices) or not any(a.get("isCorrect") for a in choices):
                    continue
                seen.add(q["id"])
                questions.append(q)
            if questions:
                pools.append([test, questions])
        available = sum(len(pool[1]) for pool in pools)
        count = DIFFICULTIES[difficulty]
        if available < count:
            await websocket.send_json({"type": "insufficient", "available": available})
            await websocket.close()
            return
        selected = []
        while len(selected) < count:
            pool = random.choice(pools)
            test, questions = pool
            question = dict(questions.pop(random.randrange(len(questions))))
            question["id"] = str(uuid4())
            selected.append({"testId": test.id, "testName": test.name, "question": question})
            if not questions:
                pools.remove(pool)
            await websocket.send_json({"type": "progress", "count": len(selected), "total": count, "testName": test.name})
        await db.execute(delete(RandomTraining).where(
            RandomTraining.user_id == user.id, RandomTraining.completed_at.is_(None),
            RandomTraining.created_at < datetime.now(UTC) - timedelta(days=1),
        ))
        attempt = RandomTraining(id=uuid4(), user_id=user.id, difficulty=difficulty, questions=selected)
        db.add(attempt)
        await db.commit()
        await websocket.send_json({"type": "ready", "id": str(attempt.id), "questions": [q["question"] for q in selected]})
        await websocket.close()
    except WebSocketDisconnect:
        return


@router.post("/random/{attempt_id}/complete")
async def complete_random_training(
    attempt_id: UUID, payload: RandomCompletion,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    row = await db.scalar(select(RandomTraining).where(
        RandomTraining.id == attempt_id, RandomTraining.user_id == user.id,
    ).with_for_update())
    if not row:
        raise HTTPException(404, "Попытка не найдена")
    if row.completed_at:
        return {"id": str(row.id)}
    tests = await TestRepository(db).list_all()
    visible = {test.id for test, locked in await annotate_content_list(db, user, tests, enforce_for_admin=True) if not locked and not test.hidden}
    if any(item["testId"] not in visible for item in row.questions):
        raise HTTPException(403, "Доступ к вопросам изменился")
    by_id = {a.question_id: a.answer_ids for a in payload.answers}
    if len(by_id) != len(payload.answers) or set(by_id) - {item["question"]["id"] for item in row.questions}:
        raise HTTPException(422, "Некорректные ответы")
    answers = []
    for item in row.questions:
        question = item["question"]
        choices = question["answers"]
        indices = by_id.get(question["id"], [])
        if len(set(indices)) != len(indices) or any(i < 0 or i >= len(choices) for i in indices):
            raise HTTPException(422, "Некорректные ответы")
        correct = {i for i, a in enumerate(choices) if a.get("isCorrect")}
        answers.append({"questionId": question["id"], "answerIds": indices,
                        "isCorrect": bool(indices) and set(indices) == correct})
    row.answers = answers
    row.completed_at = datetime.now(UTC)
    await db.flush()
    return {"id": str(row.id)}


@router.get("/random/history")
async def random_training_history(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    rows = (await db.scalars(select(RandomTraining).where(
        RandomTraining.user_id == user.id, RandomTraining.completed_at.is_not(None),
    ).order_by(RandomTraining.completed_at.desc()))).all()
    tests = await TestRepository(db).list_all()
    visible = {test.id for test, locked in await annotate_content_list(db, user, tests, enforce_for_admin=True) if not locked and not test.hidden}
    result = []
    for row in rows:
        answers = {a["questionId"]: a for a in row.answers or []}
        items = [{"testName": item["testName"], "question": item["question"], "answer": answers.get(item["question"]["id"])}
                 if item["testId"] in visible else {"question": None} for item in row.questions]
        result.append({"id": str(row.id), "difficulty": row.difficulty, "completedAt": row.completed_at,
                       "correct": sum(bool(a["isCorrect"]) for a in row.answers or []),
                       "total": len(row.questions), "items": items})
    return result


@router.get("/me", response_model=list[TrainingTopicOut])
async def training_me(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    enforce_tariff: Annotated[bool, Query(alias="enforceTariff")] = False,
) -> list[TrainingTopicOut]:
    wrong = await load_user_wrong_stats(db, user.id)
    tests = await TestRepository(db).list_all() if enforce_tariff and wrong else None
    visible_test_ids: set[str] | None = None
    if tests is not None:
        annotated_tests = await annotate_content_list(
            db, user, tests, enforce_for_admin=True
        )
        visible_test_ids = {
            str(test.id) for test, locked_by in annotated_tests if locked_by is None
        }
    topics = await group_wrong_by_test(db, wrong, tests=tests)
    if visible_test_ids is not None:
        topics = [topic for topic in topics if topic["test_id"] in visible_test_ids]

    recs_by_q: dict[tuple[str, str], list[RecommendedArticleOut]] = {}
    if embeddings_configured() and topics:
        texts: list[str] = []
        keys: list[tuple[str, str]] = []
        for topic in topics:
            for q in topic["questions"]:
                texts.append(f"{topic['test_name']} | {q['question_text']}")
                keys.append((topic["test_id"], q["question_id"]))
        by_text = await vectors_for_texts(db, texts)
        if by_text:
            rank = await user_content_rank(db, user, enforce_for_admin=enforce_tariff)
            ranks = await tariff_rank_map(db)
            unlocked = await unlocked_reward_ids(db, user.id)
            for key, text in zip(keys, texts, strict=True):
                vec = by_text.get(text)
                if not vec:
                    continue
                try:
                    candidates = await search_similar_articles(db, vec, limit=10)
                    if user.role == "admin":
                        visible = (
                            filter_by_rank(candidates, user_rank=rank, ranks=ranks)
                            if enforce_tariff
                            else list(candidates)
                        )
                    else:
                        visible = filter_by_reward(
                            filter_by_rank(candidates, user_rank=rank, ranks=ranks),
                            unlocked=unlocked,
                        )
                    recs_by_q[key] = [
                        RecommendedArticleOut(id=a.id, name=a.name) for a in visible[:3]
                    ]
                except Exception as e:  # noqa: BLE001
                    log.warning("training recs search failed: %s", e)

    out: list[TrainingTopicOut] = []
    for topic in topics:
        wqs = [
            WrongQuestionOut(
                question_id=q["question_id"],
                question_text=q["question_text"],
                wrong_count=q["wrong_count"],
                last_wrong_at=q["last_wrong_at"],
                recommended_articles=recs_by_q.get(
                    (topic["test_id"], q["question_id"]), []
                ),
            )
            for q in topic["questions"]
        ]
        out.append(
            TrainingTopicOut(
                test_id=topic["test_id"],
                test_name=topic["test_name"],
                wrong_questions=wqs,
            )
        )
    return out


@router.post("/test-recommendations", response_model=list[RecommendedArticleOut])
async def test_recommendations(
    payload: TestRecommendationsCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    enforce_tariff: Annotated[bool, Query(alias="enforceTariff")] = False,
) -> list[RecommendedArticleOut]:
    """Articles to read after finishing a test, picked by embedding similarity
    to the test name and wrongly answered questions."""
    if not embeddings_configured():
        return []

    test = await TestRepository(db).get(payload.test_id)
    if test is not None:
        await assert_content_visible(db, user, test, enforce_for_admin=enforce_tariff)
    test_name = test.name if test else payload.test_id
    if test and test.parent_id:
        folders = {f.id: f for f in await FolderRepository(db).list_all()}
        folder = folders.get(test.parent_id)
        if folder:
            test_name = f"{folder.name} / {test_name}"

    wrong_ids = payload.wrong_question_ids or []
    texts = [
        f"{test_name} | {question_text_from_test(test.questions if test else None, qid)}"
        for qid in wrong_ids
    ]
    if not texts:
        texts = [test_name]

    by_text = await vectors_for_texts(db, texts)
    if not by_text:
        return []

    rank = await user_content_rank(db, user, enforce_for_admin=enforce_tariff)
    ranks = await tariff_rank_map(db)
    unlocked = await unlocked_reward_ids(db, user.id)
    # Дедупликация и по id, и по имени: разные статьи с одинаковым названием
    # выглядят в списке как дубли.
    seen: set[str] = set()
    out: list[RecommendedArticleOut] = []
    for text in texts:
        vec = by_text.get(text)
        if not vec:
            continue
        try:
            candidates = await search_similar_articles(db, vec, limit=10)
        except Exception as e:  # noqa: BLE001
            log.warning("test-recs search failed: %s", e)
            continue
        if user.role == "admin":
            visible = (
                filter_by_rank(candidates, user_rank=rank, ranks=ranks)
                if enforce_tariff
                else list(candidates)
            )
        else:
            visible = filter_by_reward(
                filter_by_rank(candidates, user_rank=rank, ranks=ranks),
                unlocked=unlocked,
            )
        for article in visible:
            if article.id in seen or article.name in seen:
                continue
            seen.add(article.id)
            seen.add(article.name)
            out.append(RecommendedArticleOut(id=article.id, name=article.name))
            if len(out) >= 5:
                return out
    return out
