"""Embedding helpers — truncate + article text (GymAI pattern)."""
from __future__ import annotations

from app.models.article import Article


def truncate_for_embedding(text: str, max_chars: int = 2000) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars]


def build_article_embedding_text(
    article: Article,
    folder_name: str | None = None,
    pdf_text: str | None = None,
) -> str:
    parts = [article.name]
    if folder_name:
        parts.append(folder_name)
    if pdf_text and pdf_text.strip():
        parts.append(pdf_text.strip())
    return truncate_for_embedding(" | ".join(parts))
