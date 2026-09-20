"""rewards.subscription_tariff_id + subscription_days — подписка как награда.

Revision ID: 018
Revises: 017
Create Date: 2026-09-20
"""
from typing import Sequence, Union

from alembic import op

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE rewards ADD COLUMN IF NOT EXISTS subscription_tariff_id UUID "
        "REFERENCES tariffs(id) ON DELETE SET NULL"
    )
    op.execute("ALTER TABLE rewards ADD COLUMN IF NOT EXISTS subscription_days INTEGER")


def downgrade() -> None:
    op.execute("ALTER TABLE rewards DROP COLUMN IF EXISTS subscription_days")
    op.execute("ALTER TABLE rewards DROP COLUMN IF EXISTS subscription_tariff_id")
