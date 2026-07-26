"""Export OpenAPI schema to stdout or a file (no server required).

Usage:
    python scripts/export_openapi.py
    python scripts/export_openapi.py --out ../mobile-app/openapi.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import app  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=None, help="Write JSON to this path")
    args = parser.parse_args()
    spec = app.openapi()
    text = json.dumps(spec, indent=2, ensure_ascii=False) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
        print(f"Wrote {args.out} ({len(spec.get('paths') or {})} paths)")
    else:
        sys.stdout.write(text)


if __name__ == "__main__":
    main()
