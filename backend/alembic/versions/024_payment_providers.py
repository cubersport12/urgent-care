"""Платёжные провайдеры: payments.provider/external_id, тарифы и подписки для RuStore.

Revision ID: 024
Revises: 023
Create Date: 2026-10-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "024"
down_revision: Union[str, None] = "023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Провайдер платежа: yookassa | rustore
    op.add_column(
        "payments",
        sa.Column("provider", sa.String(32), nullable=False, server_default="yookassa"),
    )
    # yookassa_payment_id → external_id (YooKassa: id платежа, RuStore: purchaseId)
    op.alter_column("payments", "yookassa_payment_id", new_column_name="external_id")
    op.drop_constraint("payments_yookassa_payment_id_key", "payments", type_="unique")
    op.create_unique_constraint(
        "uq_payments_provider_external_id", "payments", ["provider", "external_id"]
    )

    op.add_column(
        "tariffs", sa.Column("rustore_product_id", sa.String(128), nullable=True)
    )
    op.add_column(
        "user_subscriptions",
        sa.Column("rustore_purchase_id", sa.String(128), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_subscriptions", "rustore_purchase_id")
    op.drop_column("tariffs", "rustore_product_id")
    op.drop_constraint("uq_payments_provider_external_id", "payments", type_="unique")
    op.create_unique_constraint(None, "payments", ["external_id"])
    op.alter_column("payments", "external_id", new_column_name="yookassa_payment_id")
    op.drop_column("payments", "provider")
