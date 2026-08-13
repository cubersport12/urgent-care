"""Cached query embeddings — compute once, reuse for Training search."""
from __future__ import annotations

from pgvector.sqlalchemy import Vector
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base import Base


class EmbeddingCache(Base):
    __tablename__ = "embedding_cache"

    text_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    embedding: Mapped[list[float]] = mapped_column(Vector(settings.embedding_dim), nullable=False)
