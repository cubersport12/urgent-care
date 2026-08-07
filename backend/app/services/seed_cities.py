"""Seed cities from data/city.csv when the table is empty."""
from __future__ import annotations

import csv
import uuid
from pathlib import Path

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.city import City

CSV_PATH = Path(__file__).resolve().parents[2] / "data" / "city.csv"
log = structlog.get_logger()


def _name(row: dict[str, str]) -> str:
    name = (row.get("city") or row.get("settlement") or "").strip()
    if name:
        return name
    addr = (row.get("address") or "").strip()
    tail = addr.split(",")[-1].strip() if addr else ""
    # "г Майкоп" / "пгт X" → drop type prefix if short
    for prefix in ("г ", "пгт ", "п ", "с ", "д ", "рп "):
        if tail.startswith(prefix):
            return tail[len(prefix) :].strip() or addr
    return tail or addr or (row.get("fias_id") or "unknown")


def rows_from_csv(path: Path = CSV_PATH) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        return [
            {
                "id": uuid.uuid4(),
                "fias_id": (row["fias_id"] or "").strip(),
                "name": _name(row),
                "region": (row.get("region") or "").strip(),
                "region_type": (row.get("region_type") or "").strip(),
                "area": (row.get("area") or "").strip(),
                "area_type": (row.get("area_type") or "").strip(),
                "address": (row.get("address") or "").strip(),
            }
            for row in csv.DictReader(f)
            if (row.get("fias_id") or "").strip()
        ]


async def seed_cities_if_empty(session: AsyncSession) -> int:
    count = int(
        (await session.execute(select(func.count()).select_from(City))).scalar_one()
    )
    if count:
        return 0
    if not CSV_PATH.is_file():
        log.warning("cities_csv_missing", path=str(CSV_PATH))
        return 0
    rows = rows_from_csv()
    session.add_all(City(**r) for r in rows)
    await session.commit()
    log.info("cities_seeded", count=len(rows))
    return len(rows)
