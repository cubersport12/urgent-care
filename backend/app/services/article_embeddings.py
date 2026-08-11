"""Refresh / search article embeddings."""
from __future__ import annotations

import logging

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embedding_client import EmbeddingClient, embeddings_configured, get_embedding_client
from app.ai.embeddings import build_article_embedding_text
from app.ai.pdf_text import load_article_pdf_text
from app.db.repositories.content import FolderRepository
from app.models.article import Article

log = logging.getLogger(__name__)

DEFAULT_DISTANCE_THRESHOLD = 0.55


async def refresh_article_embedding(
    session: AsyncSession,
    article: Article,
    *,
    embedder: EmbeddingClient | None = None,
    pdf_text: str | None = None,
) -> None:
    if not embeddings_configured():
        return
    client = embedder or get_embedding_client()
    folder_name = None
    if article.parent_id:
        folder = await FolderRepository(session).get(article.parent_id)
        folder_name = folder.name if folder else None
    body = pdf_text if pdf_text is not None else await load_article_pdf_text(article.id)
    text = build_article_embedding_text(article, folder_name, body)
    vec = (await client.embeddings([text]))[0]
    await session.execute(
        update(Article).where(Article.id == article.id).values(embedding=vec)
    )


async def refresh_article_embedding_safe(
    session: AsyncSession, article: Article
) -> None:
    try:
        await refresh_article_embedding(session, article)
    except Exception as e:  # noqa: BLE001 — never break content writes
        log.warning("article embedding refresh failed id=%s: %s", article.id, e)


async def search_similar_articles(
    session: AsyncSession,
    query_embedding: list[float],
    *,
    limit: int = 3,
    distance_threshold: float = DEFAULT_DISTANCE_THRESHOLD,
) -> list[Article]:
    distance = Article.embedding.cosine_distance(query_embedding)
    stmt = (
        select(Article)
        .where(Article.embedding.isnot(None))
        .where(distance < distance_threshold)
        .order_by(distance)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
