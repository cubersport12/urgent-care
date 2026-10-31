"""Tariff profile appearance."""
from alembic import op
import sqlalchemy as sa

revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tariffs", sa.Column("effect_color", sa.String(7), nullable=True))
    op.add_column("tariffs", sa.Column("glow_effect", sa.String(16), nullable=False, server_default="none"))


def downgrade() -> None:
    op.drop_column("tariffs", "glow_effect")
    op.drop_column("tariffs", "effect_color")
