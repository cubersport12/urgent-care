"""Learning events analytics + achievement rule_target_id.

Revision ID: 007
Revises: 006
Create Date: 2026-08-07
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "learning_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("entity_type", sa.String(20), nullable=False),
        sa.Column("entity_id", sa.String(64), nullable=False),
        sa.Column("event", sa.String(40), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_learning_events_user_id", "learning_events", ["user_id"])
    op.create_index("ix_learning_events_user_event", "learning_events", ["user_id", "event"])
    op.create_index(
        "ix_learning_events_user_entity",
        "learning_events",
        ["user_id", "entity_type", "entity_id"],
    )
    op.create_index("ix_learning_events_created_at", "learning_events", ["created_at"])

    op.add_column(
        "achievements",
        sa.Column("rule_target_id", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("achievements", "rule_target_id")
    op.drop_index("ix_learning_events_created_at", table_name="learning_events")
    op.drop_index("ix_learning_events_user_entity", table_name="learning_events")
    op.drop_index("ix_learning_events_user_event", table_name="learning_events")
    op.drop_index("ix_learning_events_user_id", table_name="learning_events")
    op.drop_table("learning_events")
