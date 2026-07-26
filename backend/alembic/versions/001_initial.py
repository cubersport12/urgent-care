"""Initial schema: users, content, stats.

Revision ID: 001
Revises:
Create Date: 2026-07-26
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("hashed_password", sa.String(255), nullable=True),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "folders",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("order", sa.Integer(), nullable=True),
        sa.Column("parent_id", sa.String(64), nullable=True),
    )
    op.create_index("ix_folders_parent_id", "folders", ["parent_id"])

    op.create_table(
        "articles",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("order", sa.Integer(), nullable=True),
        sa.Column("parent_id", sa.String(64), nullable=True),
        sa.Column("next_run_article", sa.String(64), nullable=True),
        sa.Column("time_read", sa.Float(), nullable=True),
        sa.Column("disable_while_not_prev_complete", sa.Boolean(), nullable=True),
        sa.Column("hide_while_not_prev_complete", sa.Boolean(), nullable=True),
        sa.Column("include_to_statistics", sa.Boolean(), nullable=True),
        sa.Column("links_to_articles", postgresql.JSONB(), nullable=True),
    )
    op.create_index("ix_articles_parent_id", "articles", ["parent_id"])

    op.create_table(
        "tests",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("order", sa.Integer(), nullable=True),
        sa.Column("parent_id", sa.String(64), nullable=True),
        sa.Column("min_score", sa.Integer(), nullable=True),
        sa.Column("max_errors", sa.Integer(), nullable=True),
        sa.Column("show_correct_answer", sa.Boolean(), nullable=True),
        sa.Column("include_to_statistics", sa.Boolean(), nullable=True),
        sa.Column("show_skip_button", sa.Boolean(), nullable=True),
        sa.Column("show_navigation", sa.Boolean(), nullable=True),
        sa.Column("show_back_button", sa.Boolean(), nullable=True),
        sa.Column("hidden", sa.Boolean(), nullable=True),
        sa.Column("questions", postgresql.JSONB(), nullable=True),
        sa.Column("accessability_conditions", postgresql.JSONB(), nullable=True),
    )
    op.create_index("ix_tests_parent_id", "tests", ["parent_id"])

    op.create_table(
        "rescue",
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("order", sa.Integer(), nullable=True),
        sa.Column("parent_id", sa.String(64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("data", postgresql.JSONB(), nullable=True),
    )
    op.create_index("ix_rescue_parent_id", "rescue", ["parent_id"])

    op.create_table(
        "articles_stats",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("client_id", sa.String(64), nullable=False),
        sa.Column("article_id", sa.String(64), nullable=False),
        sa.Column("readed", sa.Boolean(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "client_id", "article_id", name="articles_stats_client_article_unique"
        ),
    )
    op.create_index("ix_articles_stats_client_id", "articles_stats", ["client_id"])
    op.create_index("ix_articles_stats_article_id", "articles_stats", ["article_id"])

    op.create_table(
        "tests_stats",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("client_id", sa.String(64), nullable=False),
        sa.Column("test_id", sa.String(64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.Column("data", postgresql.JSONB(), nullable=True),
    )
    op.create_index("ix_tests_stats_client_id", "tests_stats", ["client_id"])
    op.create_index("ix_tests_stats_test_id", "tests_stats", ["test_id"])

    op.create_table(
        "rescue_stats",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("client_id", sa.String(64), nullable=False),
        sa.Column("rescue_id", sa.String(64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.Column("data", postgresql.JSONB(), nullable=True),
        sa.UniqueConstraint(
            "client_id", "rescue_id", name="rescue_stats_client_rescue_unique"
        ),
    )
    op.create_index("ix_rescue_stats_client_id", "rescue_stats", ["client_id"])
    op.create_index("ix_rescue_stats_rescue_id", "rescue_stats", ["rescue_id"])

    op.create_table(
        "test_results",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("client_id", sa.String(64), nullable=True),
        sa.Column("test_id", sa.String(64), nullable=False),
        sa.Column("total_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_errors", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_passed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("answers", postgresql.JSONB(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_test_results_client_id", "test_results", ["client_id"])
    op.create_index("ix_test_results_test_id", "test_results", ["test_id"])


def downgrade() -> None:
    op.drop_table("test_results")
    op.drop_table("rescue_stats")
    op.drop_table("tests_stats")
    op.drop_table("articles_stats")
    op.drop_table("rescue")
    op.drop_table("tests")
    op.drop_table("articles")
    op.drop_table("folders")
    op.drop_table("users")
