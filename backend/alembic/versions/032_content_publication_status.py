"""Add draft and published states to learning content."""
import sqlalchemy as sa

from alembic import op

revision = "032"
down_revision = "031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("folders", "articles", "tests", "rescue"):
        op.add_column(
            table,
            sa.Column("status", sa.String(20), nullable=False, server_default="published"),
        )
        op.alter_column(table, "status", server_default="draft")


def downgrade() -> None:
    for table in ("rescue", "tests", "articles", "folders"):
        op.drop_column(table, "status")
