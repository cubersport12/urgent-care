"""users.email_verified + login_codes — подтверждение почты и вход по коду.

Revision ID: 017
Revises: 016
Create Date: 2026-09-20
"""
from typing import Sequence, Union

from alembic import op

revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false"
    )
    # Существующие пользователи созданы до появления подтверждения — не блокируем им вход
    op.execute("UPDATE users SET email_verified = TRUE WHERE email_verified = false")
    op.execute("""
        CREATE TABLE IF NOT EXISTS login_codes (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            code_hash VARCHAR(64) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_login_codes_user_id ON login_codes (user_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS login_codes")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS email_verified")
