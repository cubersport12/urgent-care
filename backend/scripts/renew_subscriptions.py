"""Daily subscription renewals / scheduled changes / grace downgrades.

Usage (inside API container or venv):
  python scripts/renew_subscriptions.py
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.base import AsyncSessionLocal  # noqa: E402
from app.services.billing import BillingService  # noqa: E402


async def main() -> None:
    async with AsyncSessionLocal() as db:
        result = await BillingService(db).renew_due()
        print(result)


if __name__ == "__main__":
    asyncio.run(main())
