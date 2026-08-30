"""Training: weak test topics + article recommendations."""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embedding_client import embeddings_configured
from app.api.deps import get_current_user, get_db
from app.db.repositories.content import FolderRepository, TestRepository
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


@router.get("/me", response_model=list[TrainingTopicOut])
async def training_me(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[TrainingTopicOut]:
    wrong = await load_user_wrong_stats(db, user.id)
    topics = await group_wrong_by_test(db, wrong)

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
            rank = await user_content_rank(db, user)
            ranks = await tariff_rank_map(db)
            unlocked = await unlocked_reward_ids(db, user.id)
            for key, text in zip(keys, texts):
                vec = by_text.get(text)
                if not vec:
                    continue
                try:
                    candidates = await search_similar_articles(db, vec, limit=10)
                    visible = (
                        list(candidates)
                        if user.role == "admin"
                        else filter_by_reward(
                            filter_by_rank(candidates, user_rank=rank, ranks=ranks),
                            unlocked=unlocked,
                        )
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
) -> list[RecommendedArticleOut]:
    """Articles to read after finishing a test, picked by embedding similarity
    to the test name and wrongly answered questions."""
    if not embeddings_configured():
        return []

    test = await TestRepository(db).get(payload.test_id)
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

    rank = await user_content_rank(db, user)
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
        visible = (
            list(candidates)
            if user.role == "admin"
            else filter_by_reward(
                filter_by_rank(candidates, user_rank=rank, ranks=ranks),
                unlocked=unlocked,
            )
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
