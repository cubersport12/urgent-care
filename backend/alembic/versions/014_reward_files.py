"""rewards.files — attached media paths (certificates etc.).

Revision ID: 014
Revises: 013
Create Date: 2026-08-30
"""
from typing import Sequence, Union

from alembic import op

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE rewards ADD COLUMN IF NOT EXISTS files JSONB")


def downgrade() -> None:
    op.execute("ALTER TABLE rewards DROP COLUMN IF EXISTS files")
