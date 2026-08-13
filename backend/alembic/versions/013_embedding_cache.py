"""pgvector cache for query texts (wrong questions → article search).

Revision ID: 013
Revises: 012
Create Date: 2026-08-13
"""
from typing import Sequence, Union

from alembic import op

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS embedding_cache (
            text_hash varchar(64) PRIMARY KEY,
            embedding vector(4096) NOT NULL
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS embedding_cache")
