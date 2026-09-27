"""Промокоды: promo_codes + promo_activations.

Revision ID: 021
Revises: 020
Create Date: 2026-09-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "021"
down_revision: Union[str, None] = "020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS promo_codes (
            id UUID PRIMARY KEY,
            code VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(200),
            type VARCHAR(20) NOT NULL DEFAULT 'discount',
            discount_percent INTEGER NOT NULL DEFAULT 1,
            tariff_id UUID REFERENCES tariffs(id) ON DELETE SET NULL,
            max_activations INTEGER,
            valid_from TIMESTAMPTZ,
            valid_until TIMESTAMPTZ,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_promo_codes_code ON promo_codes (code)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_promo_codes_tariff_id ON promo_codes (tariff_id)")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS promo_activations (
            id UUID PRIMARY KEY,
            promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            used_at TIMESTAMPTZ,
            payment_id UUID REFERENCES payments(id) ON DELETE SET NULL
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_promo_activations_promo_code_id "
        "ON promo_activations (promo_code_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_promo_activations_user_id ON promo_activations (user_id)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS promo_activations")
    op.execute("DROP TABLE IF EXISTS promo_codes")
