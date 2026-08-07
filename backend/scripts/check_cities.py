"""Self-check: CSV parse → unique fias_id, non-empty names."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.seed_cities import rows_from_csv

rows = rows_from_csv()
assert rows, "no rows"
fias = [r["fias_id"] for r in rows]
assert len(fias) == len(set(fias)), "duplicate fias_id"
assert all(r["name"] for r in rows), "empty name"
print(f"ok: {len(rows)} cities")
