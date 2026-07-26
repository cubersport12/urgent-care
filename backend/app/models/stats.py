"""User progress / stats tables."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ArticleStats(Base):
    __tablename__ = "articles_stats"
    __table_args__ = (
        UniqueConstraint("client_id", "article_id", name="articles_stats_client_article_unique"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    article_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    readed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class TestStats(Base):
    __tablename__ = "tests_stats"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    test_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    data: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)


class RescueStats(Base):
    __tablename__ = "rescue_stats"
    __table_args__ = (
        UniqueConstraint("client_id", "rescue_id", name="rescue_stats_client_rescue_unique"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    rescue_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    data: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)


class TestResult(Base):
    __tablename__ = "test_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    test_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    total_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_errors: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    answers: Mapped[list | dict | str | None] = mapped_column(JSONB, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
