"""Billing tariffs, subscriptions, payments; content required_tariff_id.

Revision ID: 002
Revises: 001
Create Date: 2026-07-31
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FREE_TARIFF_ID = "00000000-0000-4000-8000-000000000001"


def upgrade() -> None:
    op.create_table(
        "tariffs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("description", sa.String(1000), nullable=True),
        sa.Column("price_rub", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("period_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("rank", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_tariffs_code", "tariffs", ["code"], unique=True)

    op.execute(
        f"""
        INSERT INTO tariffs (id, code, title, description, price_rub, period_days, rank, is_default, is_active, sort_order)
        VALUES (
          '{FREE_TARIFF_ID}'::uuid,
          'free',
          'Бесплатный',
          'Базовый доступ',
          0,
          30,
          0,
          true,
          true,
          0
        )
        """
    )

    op.create_table(
        "user_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tariff_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tariffs.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("yookassa_payment_method_id", sa.String(64), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", name="uq_user_subscriptions_user_id"),
    )
    op.create_index("ix_user_subscriptions_user_id", "user_subscriptions", ["user_id"])
    op.create_index("ix_user_subscriptions_tariff_id", "user_subscriptions", ["tariff_id"])

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("user_subscriptions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tariff_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tariffs.id"), nullable=False),
        sa.Column("amount_rub", sa.Float(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("yookassa_payment_id", sa.String(64), nullable=True),
        sa.Column("idempotency_key", sa.String(64), nullable=False),
        sa.Column("raw_json", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_payments_user_id", "payments", ["user_id"])
    op.create_index("ix_payments_yookassa_payment_id", "payments", ["yookassa_payment_id"], unique=True)
    op.create_index("ix_payments_idempotency_key", "payments", ["idempotency_key"], unique=True)

    op.create_table(
        "payment_methods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("yookassa_payment_method_id", sa.String(64), nullable=False),
        sa.Column("card_last4", sa.String(4), nullable=True),
        sa.Column("type", sa.String(32), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_payment_methods_user_id", "payment_methods", ["user_id"])
    op.create_index(
        "ix_payment_methods_yookassa_payment_method_id",
        "payment_methods",
        ["yookassa_payment_method_id"],
        unique=True,
    )

    op.create_table(
        "subscription_changes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_tariff_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tariffs.id"), nullable=False),
        sa.Column("to_tariff_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tariffs.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="scheduled"),
        sa.Column("effective_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payments.id", ondelete="SET NULL"), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_subscription_changes_user_id", "subscription_changes", ["user_id"])
    op.execute(
        """
        CREATE UNIQUE INDEX uq_subscription_changes_one_scheduled
        ON subscription_changes (user_id)
        WHERE status = 'scheduled'
        """
    )

    for table in ("folders", "articles", "tests", "rescue"):
        op.add_column(
            table,
            sa.Column(
                "required_tariff_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("tariffs.id"),
                nullable=True,
            ),
        )
        op.create_index(f"ix_{table}_required_tariff_id", table, ["required_tariff_id"])
        op.execute(
            f"UPDATE {table} SET required_tariff_id = '{FREE_TARIFF_ID}'::uuid "
            f"WHERE required_tariff_id IS NULL"
        )


def downgrade() -> None:
    for table in ("folders", "articles", "tests", "rescue"):
        op.drop_index(f"ix_{table}_required_tariff_id", table_name=table)
        op.drop_column(table, "required_tariff_id")
    op.execute("DROP INDEX IF EXISTS uq_subscription_changes_one_scheduled")
    op.drop_table("subscription_changes")
    op.drop_table("payment_methods")
    op.drop_table("payments")
    op.drop_table("user_subscriptions")
    op.drop_table("tariffs")
