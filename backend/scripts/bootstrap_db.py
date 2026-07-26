"""Bootstrap empty Postgres: create schema from models, then alembic stamp/upgrade."""
from __future__ import annotations

import asyncio
import subprocess
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.db.base import Base
import app.models  # noqa: F401


async def _is_empty_schema(engine) -> bool:
    async with engine.connect() as conn:
        row = await conn.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
            )
        )
        return int(row.scalar_one()) == 0


async def bootstrap() -> None:
    engine = create_async_engine(str(settings.database_url), pool_pre_ping=True)
    try:
        empty = await _is_empty_schema(engine)
        if empty:
            print("bootstrap: empty schema — create_all")
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print("bootstrap: alembic stamp head")
            subprocess.check_call([sys.executable, "-m", "alembic", "stamp", "head"])
        else:
            print("bootstrap: schema present — alembic upgrade head")
            subprocess.check_call([sys.executable, "-m", "alembic", "upgrade", "head"])
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(bootstrap())
