"""PostgreSQL DDL shared by the Alembic migration and empty-database bootstrap."""
from sqlalchemy import text

_INSTALL_STATEMENTS = (
    """
    INSERT INTO system_settings (key, value)
    VALUES ('content_cache_revision', to_jsonb(gen_random_uuid()::text))
    ON CONFLICT (key) DO NOTHING
    """,
    """
    CREATE OR REPLACE FUNCTION touch_content_cache_revision()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
        IF current_setting('urgent_care.content_cache_revision_updated', true) IS DISTINCT FROM 'true' THEN
            INSERT INTO system_settings (key, value, updated_at)
            VALUES ('content_cache_revision', to_jsonb(gen_random_uuid()::text), now())
            ON CONFLICT (key) DO UPDATE
            SET value = EXCLUDED.value, updated_at = now();
            PERFORM set_config('urgent_care.content_cache_revision_updated', 'true', true);
        END IF;
        RETURN NULL;
    END;
    $$
    """,
    *(
        f"""
        CREATE TRIGGER {table}_content_cache_revision
        AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON {table}
        FOR EACH STATEMENT EXECUTE FUNCTION touch_content_cache_revision()
        """
        for table in ("folders", "articles", "tests", "rescue")
    ),
)


def install_content_cache_revision(connection) -> None:
    for statement in _INSTALL_STATEMENTS:
        connection.execute(text(statement))
