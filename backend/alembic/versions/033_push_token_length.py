"""Allow native device registration tokens."""
import sqlalchemy as sa

from alembic import op

revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("push_tokens", "token", type_=sa.String(2048), existing_nullable=False)


def downgrade() -> None:
    op.alter_column("push_tokens", "token", type_=sa.String(255), existing_nullable=False)
