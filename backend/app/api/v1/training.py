"""Training: weak test topics + article recommendations."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embedding_client import embeddings_configured, get_embedding_client
from app.api.deps import get_current_user, get_db
from app.api.v1._content_access import filter_content_list
from app.models.user import User
from app.schemas.training import (
    RecommendedArticleOut,
    TrainingTopicOut,
    WrongQuestionOut,
)
from app.services.article_embeddings import search_similar_articles
from app.services.training import group_wrong_by_test, load_user_wrong_stats

router = APIRouter(prefix="/training", tags=["training"])


@router.get("/me", response_model=list[TrainingTopicOut])
async def training_me(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[TrainingTopicOut]:
    wrong = await load_user_wrong_stats(db, user.id)
    topics = await group_wrong_by_test(db, wrong)

    embedder = get_embedding_client() if embeddings_configured() else None
    # Cache query embeddings per unique question text within this request.
    query_cache: dict[str, list[float]] = {}

    out: list[TrainingTopicOut] = []
    for topic in topics:
        wqs: list[WrongQuestionOut] = []
        for q in topic["questions"]:
            recs: list[RecommendedArticleOut] = []
            if embedder is not None:
                q_text = f"{topic['test_name']} | {q['question_text']}"
                try:
                    if q_text not in query_cache:
                        query_cache[q_text] = (await embedder.embeddings([q_text]))[0]
                    candidates = await search_similar_articles(
                        db, query_cache[q_text], limit=10
                    )
                    visible = await filter_content_list(db, user, candidates)
                    recs = [
                        RecommendedArticleOut(id=a.id, name=a.name)
                        for a in visible[:3]
                    ]
                except Exception:  # noqa: BLE001
                    recs = []
            wqs.append(
                WrongQuestionOut(
                    question_id=q["question_id"],
                    question_text=q["question_text"],
                    wrong_count=q["wrong_count"],
                    last_wrong_at=q["last_wrong_at"],
                    recommended_articles=recs,
                )
            )
        out.append(
            TrainingTopicOut(
                test_id=topic["test_id"],
                test_name=topic["test_name"],
                wrong_questions=wqs,
            )
        )
    return out
