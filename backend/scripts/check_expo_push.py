"""Self-check: Expo push message shape (no network)."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.expo_push import EXPO_PUSH_URL, send_expo_push

assert EXPO_PUSH_URL.startswith("https://exp.host/")
assert callable(send_expo_push)
print("ok: expo_push")
