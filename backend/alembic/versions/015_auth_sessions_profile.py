"""auth_sessions (single active session) + user profile columns.

Revision ID: 015
Revises: 014
Create Date: 2026-09-12
"""
from typing import Sequence, Union

from alembic import op

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS auth_sessions (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            device_name VARCHAR(200),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            expires_at TIMESTAMPTZ NOT NULL
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_auth_sessions_user_id ON auth_sessions(user_id)"
    )
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_key VARCHAR(500)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_year INTEGER")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation VARCHAR(100)")
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ"
    )
    # Согласие на обработку ПД пользователи уже давали чекбоксом при регистрации —
    # фиксируем фактом, чтобы не собирать согласия задним числом повторно.
    op.execute(
        "UPDATE users SET consent_accepted_at = created_at WHERE consent_accepted_at IS NULL"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS consent_accepted_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS occupation")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS birth_year")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS avatar_key")
    op.execute("DROP TABLE IF EXISTS auth_sessions")
