"""Content folder tree node."""
from __future__ import annotations

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
