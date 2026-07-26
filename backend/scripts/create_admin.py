"""Create or update an admin user.

Usage:
    python scripts/create_admin.py --email test@yandex.ru --password test
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.security import hash_password
from app.db.base import AsyncSessionLocal
from app.models.user import User


async def main(email: str, password: str, full_name: str) -> None:
    async with AsyncSessionLocal() as session:
        row = {
            "id": uuid4(),
            "email": email.lower(),
            "full_name": full_name,
            "hashed_password": hash_password(password),
            "role": "admin",
            "is_active": True,
        }
        stmt = pg_insert(User).values(**row)
        stmt = stmt.on_conflict_do_update(
            index_elements=["email"],
            set_={
                "hashed_password": hash_password(password),
                "role": "admin",
                "full_name": full_name,
                "is_active": True,
            },
        )
        await session.execute(stmt)
        await session.commit()
    print(f"admin ready: {email}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--email", default="test@yandex.ru")
    p.add_argument("--password", default="test")
    p.add_argument("--full-name", default="Admin")
    args = p.parse_args()
    asyncio.run(main(args.email, args.password, args.full_name))
