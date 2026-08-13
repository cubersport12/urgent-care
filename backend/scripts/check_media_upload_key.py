"""Self-check: media upload key prefers explicit file_name over original filename."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.v1.media import resolve_upload_key

assert resolve_upload_key("11e5a2d0-adfd-0614-26ec-7c06168652f2.pdf", "doc.pdf") == (
    "public/11e5a2d0-adfd-0614-26ec-7c06168652f2.pdf"
)
assert resolve_upload_key(None, "icon.png") == "public/icon.png"
assert resolve_upload_key("public/rewards/a.png", "x.png") == "public/rewards/a.png"

print("ok: media upload key")
