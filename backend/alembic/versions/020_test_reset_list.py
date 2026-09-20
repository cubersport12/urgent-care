"""tests.reset_test_ids — список тестов, сбрасываемых при провале экзамена.

Revision ID: 020
Revises: 019
Create Date: 2026-09-20
"""
from typing import Sequence, Union

from alembic import op

revision: str = "020"
down_revision: Union[str, None] = "019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE tests ADD COLUMN IF NOT EXISTS reset_test_ids JSONB")


def downgrade() -> None:
    op.execute("ALTER TABLE tests DROP COLUMN IF EXISTS reset_test_ids")
