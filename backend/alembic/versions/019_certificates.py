"""certificates — генерируемые сертификаты пользователей.

Revision ID: 019
Revises: 018
Create Date: 2026-09-20
"""
from typing import Sequence, Union

from alembic import op

revision: str = "019"
down_revision: Union[str, None] = "018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS certificates_number_seq")
    op.execute("""
        CREATE TABLE IF NOT EXISTS certificates (
            id UUID PRIMARY KEY,
            number INTEGER NOT NULL UNIQUE DEFAULT nextval('certificates_number_seq'),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            full_name VARCHAR(200) NOT NULL,
            file_path VARCHAR(512) NOT NULL,
            issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_certificates_user_id ON certificates (user_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS certificates")
    op.execute("DROP SEQUENCE IF EXISTS certificates_number_seq")
