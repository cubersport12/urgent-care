"""Refresh / search article embeddings + query-vector cache."""
from __future__ import annotations

import asyncio
import hashlib
import logging

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embedding_client import EmbeddingClient, embeddings_configured, get_embedding_client
from app.ai.embeddings import build_article_embedding_text
from app.ai.pdf_text import load_article_pdf_text
from app.db.repositories.content import FolderRepository
from app.models.article import Article
from app.models.embedding_cache import EmbeddingCache

log = logging.getLogger(__name__)

DEFAULT_DISTANCE_THRESHOLD = 0.55
_REC_TIMEOUT_S = 8.0


def query_text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def vectors_for_texts(
    session: AsyncSession, texts: list[str]
) -> dict[str, list[float]]:
    """Return embeddings for texts; vsellm only for cache misses."""
    unique = list(dict.fromkeys(t for t in texts if t.strip()))
    if not unique:
        return {}
    hashes = {t: query_text_hash(t) for t in unique}
    rows = (
        await session.execute(
            select(EmbeddingCache).where(EmbeddingCache.text_hash.in_(list(hashes.values())))
        )
    ).scalars().all()
    by_hash = {r.text_hash: list(r.embedding) for r in rows}
    missing = [t for t in unique if hashes[t] not in by_hash]
    if missing and embeddings_configured():
        try:
            vecs = await asyncio.wait_for(
                get_embedding_client().embeddings(missing), timeout=_REC_TIMEOUT_S
            )
            for text, vec in zip(missing, vecs):
                h = hashes[text]
                session.add(EmbeddingCache(text_hash=h, embedding=vec))
                by_hash[h] = vec
            await session.flush()
        except Exception as e:  # noqa: BLE001
            log.warning("query embed cache fill skipped: %s", e)
    return {t: by_hash[hashes[t]] for t in unique if hashes[t] in by_hash}


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
