"""pgvector + articles.embedding for Training recommendations.

Revision ID: 012
Revises: 011
Create Date: 2026-08-11
"""
from typing import Sequence, Union

from alembic import op

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        "ALTER TABLE articles ADD COLUMN IF NOT EXISTS embedding vector(4096)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE articles DROP COLUMN IF EXISTS embedding")
