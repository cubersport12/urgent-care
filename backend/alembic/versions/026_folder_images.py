"""Add optional images for folders.

Revision ID: 026
Revises: 025
"""
import sqlalchemy as sa

from alembic import op

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("folders", sa.Column("icon_path", sa.String(1000), nullable=True))
    op.add_column("folders", sa.Column("background_path", sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column("folders", "background_path")
    op.drop_column("folders", "icon_path")
