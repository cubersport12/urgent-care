"""Add notification templates, schedules and dispatch history."""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "031"
down_revision = "030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    uuid = postgresql.UUID(as_uuid=True)
    op.create_table(
        "notification_templates",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("icon_path", sa.String(500)),
        sa.Column("audience", sa.String(20), nullable=False),
        sa.Column("user_ids", postgresql.JSONB(), nullable=False),
        sa.Column("cron", sa.String(100)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "notification_schedules",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("template_id", uuid, sa.ForeignKey("notification_templates.id", ondelete="SET NULL")),
        sa.Column("snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("cron", sa.String(100), nullable=False),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_notification_schedules_next_run_at", "notification_schedules", ["next_run_at"])
    op.create_table(
        "notification_dispatches",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("template_id", uuid, sa.ForeignKey("notification_templates.id", ondelete="SET NULL")),
        sa.Column("schedule_id", uuid, sa.ForeignKey("notification_schedules.id", ondelete="SET NULL")),
        sa.Column("scheduled_at", sa.DateTime(timezone=True)),
        sa.Column("idempotency_key", sa.String(200)),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("icon_path", sa.String(500)),
        sa.Column("audience", sa.String(20), nullable=False),
        sa.Column("recipient_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("push_accepted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("push_failed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("schedule_id", "scheduled_at", name="uq_notification_schedule_run"),
        sa.UniqueConstraint("idempotency_key", name="uq_notification_dispatch_idempotency"),
    )
    op.create_index("ix_notification_dispatches_created_at", "notification_dispatches", ["created_at"])
    op.add_column("notifications", sa.Column("dispatch_id", uuid, nullable=True))
    op.add_column("notifications", sa.Column("icon_path", sa.String(500), nullable=True))
    op.create_foreign_key("fk_notifications_dispatch", "notifications", "notification_dispatches", ["dispatch_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_notifications_dispatch_id", "notifications", ["dispatch_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_dispatch_id", table_name="notifications")
    op.drop_constraint("fk_notifications_dispatch", "notifications", type_="foreignkey")
    op.drop_column("notifications", "icon_path")
    op.drop_column("notifications", "dispatch_id")
    op.drop_table("notification_dispatches")
    op.drop_table("notification_schedules")
    op.drop_table("notification_templates")
