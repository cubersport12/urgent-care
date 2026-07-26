"""Learning article content."""
from __future__ import annotations

from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

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
