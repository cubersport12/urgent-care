"""Migrate legacy stats into learning_events, then drop old tables.

Revision ID: 008
Revises: 007
Create Date: 2026-08-07
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_UUID = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"


def upgrade() -> None:
    # client_id was the user UUID as text; skip invalid / orphaned rows.
    op.execute(
        f"""
        INSERT INTO learning_events (id, user_id, entity_type, entity_id, event, payload, created_at)
        SELECT gen_random_uuid(), a.client_id::uuid, 'article', a.article_id, 'completed', NULL, a.created_at
        FROM articles_stats a
        JOIN users u ON u.id = a.client_id::uuid
        WHERE a.readed IS TRUE
          AND a.client_id ~ '{_UUID}'
          AND NOT EXISTS (
            SELECT 1 FROM learning_events e
            WHERE e.user_id = a.client_id::uuid
              AND e.entity_type = 'article'
              AND e.entity_id = a.article_id
              AND e.event = 'completed'
          )
        """
    )
    op.execute(
        f"""
        INSERT INTO learning_events (id, user_id, entity_type, entity_id, event, payload, created_at)
        SELECT gen_random_uuid(), t.client_id::uuid, 'test', t.test_id, 'started',
               CASE WHEN t.data IS NULL THEN NULL ELSE jsonb_build_object('data', t.data) END,
               t.started_at
        FROM tests_stats t
        JOIN users u ON u.id = t.client_id::uuid
        WHERE t.client_id ~ '{_UUID}'
          AND NOT EXISTS (
            SELECT 1 FROM learning_events e
            WHERE e.user_id = t.client_id::uuid
              AND e.entity_type = 'test'
              AND e.entity_id = t.test_id
              AND e.event = 'started'
          )
        """
    )
    # Prefer rich results (scores/answers) before bare finished from tests_stats.
    op.execute(
        f"""
        INSERT INTO learning_events (id, user_id, entity_type, entity_id, event, payload, created_at)
        SELECT tr.id, tr.client_id::uuid, 'test', tr.test_id, 'finished',
               jsonb_build_object(
                   'score', tr.total_score,
                   'errors', tr.total_errors,
                   'passed', tr.is_passed,
                   'answers', tr.answers
               ),
               COALESCE(tr.completed_at, now())
        FROM test_results tr
        JOIN users u ON u.id = tr.client_id::uuid
        WHERE tr.client_id IS NOT NULL
          AND tr.client_id ~ '{_UUID}'
          AND NOT EXISTS (SELECT 1 FROM learning_events e WHERE e.id = tr.id)
        """
    )
    op.execute(
        f"""
        INSERT INTO learning_events (id, user_id, entity_type, entity_id, event, payload, created_at)
        SELECT gen_random_uuid(), t.client_id::uuid, 'test', t.test_id, 'finished',
               jsonb_strip_nulls(jsonb_build_object('passed', t.passed, 'data', t.data)),
               COALESCE(t.completed_at, t.started_at)
        FROM tests_stats t
        JOIN users u ON u.id = t.client_id::uuid
        WHERE t.completed_at IS NOT NULL
          AND t.client_id ~ '{_UUID}'
          AND NOT EXISTS (
            SELECT 1 FROM learning_events e
            WHERE e.user_id = t.client_id::uuid
              AND e.entity_type = 'test'
              AND e.entity_id = t.test_id
              AND e.event = 'finished'
          )
        """
    )
    op.execute(
        f"""
        INSERT INTO learning_events (id, user_id, entity_type, entity_id, event, payload, created_at)
        SELECT gen_random_uuid(), r.client_id::uuid, 'rescue', r.rescue_id, 'started',
               CASE WHEN r.data IS NULL THEN NULL ELSE jsonb_build_object('data', r.data) END,
               r.started_at
        FROM rescue_stats r
        JOIN users u ON u.id = r.client_id::uuid
        WHERE r.client_id ~ '{_UUID}'
          AND NOT EXISTS (
            SELECT 1 FROM learning_events e
            WHERE e.user_id = r.client_id::uuid
              AND e.entity_type = 'rescue'
              AND e.entity_id = r.rescue_id
              AND e.event = 'started'
          )
        """
    )
    op.execute(
        f"""
        INSERT INTO learning_events (id, user_id, entity_type, entity_id, event, payload, created_at)
        SELECT gen_random_uuid(), r.client_id::uuid, 'rescue', r.rescue_id, 'finished',
               jsonb_strip_nulls(jsonb_build_object('passed', r.passed, 'data', r.data)),
               COALESCE(r.completed_at, r.started_at)
        FROM rescue_stats r
        JOIN users u ON u.id = r.client_id::uuid
        WHERE r.completed_at IS NOT NULL
          AND r.client_id ~ '{_UUID}'
          AND NOT EXISTS (
            SELECT 1 FROM learning_events e
            WHERE e.user_id = r.client_id::uuid
              AND e.entity_type = 'rescue'
              AND e.entity_id = r.rescue_id
              AND e.event = 'finished'
          )
        """
    )

    op.drop_index("ix_test_results_test_id", table_name="test_results")
    op.drop_index("ix_test_results_client_id", table_name="test_results")
    op.drop_table("test_results")

    op.drop_index("ix_rescue_stats_rescue_id", table_name="rescue_stats")
    op.drop_index("ix_rescue_stats_client_id", table_name="rescue_stats")
    op.drop_table("rescue_stats")

    op.drop_index("ix_tests_stats_test_id", table_name="tests_stats")
    op.drop_index("ix_tests_stats_client_id", table_name="tests_stats")
    op.drop_table("tests_stats")

    op.drop_index("ix_articles_stats_article_id", table_name="articles_stats")
    op.drop_index("ix_articles_stats_client_id", table_name="articles_stats")
    op.drop_table("articles_stats")


def downgrade() -> None:
    op.create_table(
        "articles_stats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("client_id", sa.String(64), nullable=False),
        sa.Column("article_id", sa.String(64), nullable=False),
        sa.Column("readed", sa.Boolean(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("client_id", "article_id", name="articles_stats_client_article_unique"),
    )
    op.create_index("ix_articles_stats_client_id", "articles_stats", ["client_id"])
    op.create_index("ix_articles_stats_article_id", "articles_stats", ["article_id"])

    op.create_table(
        "tests_stats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
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
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("client_id", sa.String(64), nullable=False),
        sa.Column("rescue_id", sa.String(64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.Column("data", postgresql.JSONB(), nullable=True),
        sa.UniqueConstraint("client_id", "rescue_id", name="rescue_stats_client_rescue_unique"),
    )
    op.create_index("ix_rescue_stats_client_id", "rescue_stats", ["client_id"])
    op.create_index("ix_rescue_stats_rescue_id", "rescue_stats", ["rescue_id"])

    op.create_table(
        "test_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("client_id", sa.String(64), nullable=True),
        sa.Column("test_id", sa.String(64), nullable=False),
        sa.Column("total_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_errors", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_passed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("answers", postgresql.JSONB(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_test_results_client_id", "test_results", ["client_id"])
    op.create_index("ix_test_results_test_id", "test_results", ["test_id"])
