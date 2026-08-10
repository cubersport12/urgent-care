"""Interactive test content."""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Test(Base):
    __tablename__ = "tests"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    min_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_errors: Mapped[int | None] = mapped_column(Integer, nullable=True)
    show_correct_answer: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    include_to_statistics: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    show_skip_button: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    show_navigation: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    show_back_button: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    hidden: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    randomize_questions: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    questions_to_show: Mapped[int | None] = mapped_column(Integer, nullable=True)
    questions: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    accessability_conditions: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    required_tariff_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tariffs.id"), nullable=True, index=True
    )
    required_reward_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rewards.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
