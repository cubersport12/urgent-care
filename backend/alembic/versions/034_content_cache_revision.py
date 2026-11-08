"""Track learning-content edits transactionally for Redis cache keys."""
from alembic import op
from app.db.content_cache_revision_schema_v1 import install_content_cache_revision

revision = "034"
down_revision = "033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    install_content_cache_revision(op.get_bind())


def downgrade() -> None:
    for table in ("folders", "articles", "tests", "rescue"):
        op.execute(f"DROP TRIGGER IF EXISTS {table}_content_cache_revision ON {table}")
    op.execute("DROP FUNCTION IF EXISTS touch_content_cache_revision()")
    op.execute("DELETE FROM system_settings WHERE key = 'content_cache_revision'")
