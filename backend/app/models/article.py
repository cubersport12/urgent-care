"""Learning article content."""
from __future__ import annotations

import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base import Base


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    next_run_article: Mapped[str | None] = mapped_column(String(64), nullable=True)
    time_read: Mapped[float | None] = mapped_column(Float, nullable=True)
    disable_while_not_prev_complete: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    hide_while_not_prev_complete: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    include_to_statistics: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    links_to_articles: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    required_tariff_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tariffs.id"), nullable=True, index=True
    )
    required_reward_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rewards.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(settings.embedding_dim), nullable=True
    )
