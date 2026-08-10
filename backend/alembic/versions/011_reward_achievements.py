"""Reward ↔ many achievements (M2M link table).

Revision ID: 011
Revises: 010
Create Date: 2026-08-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "reward_achievements",
        sa.Column(
            "reward_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("rewards.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "achievement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("achievements.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
    )
    op.create_index(
        "ix_reward_achievements_achievement_id",
        "reward_achievements",
        ["achievement_id"],
    )
    op.execute(
        """
        INSERT INTO reward_achievements (reward_id, achievement_id)
        SELECT id, achievement_id FROM rewards
        WHERE achievement_id IS NOT NULL
        """
    )
    op.drop_index("ix_rewards_achievement_id", table_name="rewards")
    op.drop_constraint("rewards_achievement_id_fkey", "rewards", type_="foreignkey")
    op.drop_column("rewards", "achievement_id")


def downgrade() -> None:
    op.add_column(
        "rewards",
        sa.Column(
            "achievement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("achievements.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    # Pick one achievement per reward (arbitrary) for downgrade.
    op.execute(
        """
        UPDATE rewards r
        SET achievement_id = (
            SELECT ra.achievement_id
            FROM reward_achievements ra
            WHERE ra.reward_id = r.id
            LIMIT 1
        )
        """
    )
    op.execute("DELETE FROM rewards WHERE achievement_id IS NULL")
    op.alter_column("rewards", "achievement_id", nullable=False)
    op.create_index("ix_rewards_achievement_id", "rewards", ["achievement_id"], unique=True)
    op.drop_index("ix_reward_achievements_achievement_id", table_name="reward_achievements")
    op.drop_table("reward_achievements")
