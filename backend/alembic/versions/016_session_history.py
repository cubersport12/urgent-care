"""auth_sessions.ended_at — храним историю сессий вместо удаления.

Revision ID: 016
Revises: 015
Create Date: 2026-09-14
"""
from typing import Sequence, Union

from alembic import op

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ")


def downgrade() -> None:
    op.execute("ALTER TABLE auth_sessions DROP COLUMN IF EXISTS ended_at")
