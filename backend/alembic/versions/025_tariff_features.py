"""Особенности тарифов: tariff_features + tariff_feature_links.

Revision ID: 025
Revises: 024
Create Date: 2026-10-23
"""
from typing import Sequence, Union

from alembic import op

revision: str = "025"
down_revision: Union[str, None] = "024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS tariff_features (
            id UUID PRIMARY KEY,
            code VARCHAR(64) NOT NULL UNIQUE,
            description VARCHAR(500) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_tariff_features_code ON tariff_features (code)")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS tariff_feature_links (
            tariff_id UUID NOT NULL REFERENCES tariffs(id) ON DELETE CASCADE,
            feature_id UUID NOT NULL REFERENCES tariff_features(id) ON DELETE CASCADE,
            PRIMARY KEY (tariff_id, feature_id)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS tariff_feature_links")
    op.execute("DROP TABLE IF EXISTS tariff_features")
