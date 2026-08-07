"""Cities reference table; users.city string → city_id FK.

Revision ID: 006
Revises: 005
Create Date: 2026-08-07
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("fias_id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("region", sa.String(200), nullable=False, server_default=""),
        sa.Column("region_type", sa.String(50), nullable=False, server_default=""),
        sa.Column("area", sa.String(200), nullable=False, server_default=""),
        sa.Column("area_type", sa.String(50), nullable=False, server_default=""),
        sa.Column("address", sa.String(400), nullable=False, server_default=""),
    )
    op.create_index("ix_cities_fias_id", "cities", ["fias_id"], unique=True)
    op.create_index("ix_cities_name", "cities", ["name"], unique=False)

    op.drop_column("users", "city")
    op.add_column(
        "users",
        sa.Column("city_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_users_city_id_cities",
        "users",
        "cities",
        ["city_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_users_city_id_cities", "users", type_="foreignkey")
    op.drop_column("users", "city_id")
    op.add_column("users", sa.Column("city", sa.String(120), nullable=True))
    op.drop_index("ix_cities_name", table_name="cities")
    op.drop_index("ix_cities_fias_id", table_name="cities")
    op.drop_table("cities")
