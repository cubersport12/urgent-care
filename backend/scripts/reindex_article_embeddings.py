"""Backfill articles.embedding from name + folder + PDF text (NULL only, or --all).

Usage:
    python scripts/reindex_article_embeddings.py
    python scripts/reindex_article_embeddings.py --all
    python scripts/reindex_article_embeddings.py --article-id <id>
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select, update

from app.ai.embedding_client import EmbeddingClient, embeddings_configured
from app.ai.embeddings import build_article_embedding_text
from app.ai.pdf_text import load_article_pdf_text
from app.db.base import AsyncSessionLocal, engine
from app.db.repositories.content import FolderRepository
from app.models.article import Article

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


async def main(all_: bool, article_id: str | None) -> None:
    if not embeddings_configured():
        log.error("EMBEDDING_API_KEY is not configured")
        return

    embedder = EmbeddingClient()
    batch_size = 8

    async with AsyncSessionLocal() as session:
        if article_id:
            stmt = select(Article).where(Article.id == article_id)
        elif all_:
            stmt = select(Article).order_by(Article.id)
        else:
            stmt = (
                select(Article)
                .where(Article.embedding.is_(None))
                .order_by(Article.id)
            )
        articles = list((await session.execute(stmt)).scalars().all())
        if not articles:
            log.info("no articles to embed")
            return
        folders = {f.id: f.name for f in await FolderRepository(session).list_all()}
        log.info("total to embed: %s", len(articles))

        for i in range(0, len(articles), batch_size):
            batch = articles[i : i + batch_size]
            pdf_texts = await asyncio.gather(
                *[load_article_pdf_text(a.id) for a in batch]
            )
            texts = [
                build_article_embedding_text(
                    a,
                    folders.get(a.parent_id) if a.parent_id else None,
                    pdf,
                )
                for a, pdf in zip(batch, pdf_texts)
            ]
            with_pdf = sum(1 for t in pdf_texts if t.strip())
            log.info("batch %s: pdf_text for %s/%s", i, with_pdf, len(batch))
            try:
                vectors = await embedder.embeddings(texts)
            except Exception as e:  # noqa: BLE001
                log.error("batch failed at %s: %s — retrying one-by-one", i, e)
                for a, text in zip(batch, texts):
                    try:
                        vec = (await embedder.embeddings([text]))[0]
                        await session.execute(
                            update(Article).where(Article.id == a.id).values(embedding=vec)
                        )
                        await session.commit()
                    except Exception as e2:  # noqa: BLE001
                        log.error("skip %s: %s", a.id, e2)
                continue
            for a, vec in zip(batch, vectors):
                await session.execute(
                    update(Article).where(Article.id == a.id).values(embedding=vec)
                )
            await session.commit()
            log.info(
                "embedded %s/%s", min(i + batch_size, len(articles)), len(articles)
            )

    await engine.dispose()
    log.info("done")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--all", action="store_true")
    p.add_argument("--article-id", default=None)
    args = p.parse_args()
    asyncio.run(main(args.all, args.article_id))
