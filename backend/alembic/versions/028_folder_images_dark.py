"""Add dark-theme folder images."""

from alembic import op
import sqlalchemy as sa


revision = "028"
down_revision = "027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("folders", sa.Column("icon_path_dark", sa.String(length=1000), nullable=True))
    op.add_column("folders", sa.Column("background_path_dark", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column("folders", "background_path_dark")
    op.drop_column("folders", "icon_path_dark")
