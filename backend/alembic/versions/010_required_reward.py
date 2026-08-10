"""Add required_reward_id to content tables.

Revision ID: 010
Revises: 009
Create Date: 2026-08-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = ("folders", "articles", "tests", "rescue")


def upgrade() -> None:
    for table in _TABLES:
        op.add_column(
            table,
            sa.Column(
                "required_reward_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("rewards.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )
        op.create_index(f"ix_{table}_required_reward_id", table, ["required_reward_id"])


def downgrade() -> None:
    for table in reversed(_TABLES):
        op.drop_index(f"ix_{table}_required_reward_id", table_name=table)
        op.drop_column(table, "required_reward_id")
