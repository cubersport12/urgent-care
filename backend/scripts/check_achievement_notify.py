"""Self-check: achievement WS payload shape (no DB)."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import achievement_notify as m

assert hasattr(m, "sync_and_notify")
assert hasattr(m, "notify_unlocks")
print("ok: achievement_notify")
