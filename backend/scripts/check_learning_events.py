"""Self-check: event catalog + rule evaluation helpers (no DB)."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.schemas.achievements import RULE_TYPES, TARGETED_RULE_TYPES
from app.services.learning_events import ALLOWED, EVENTS, ENTITY_TYPES

assert "opened" in EVENTS and "finished" in EVENTS
assert ("article", "completed") in ALLOWED
assert ("test", "finished") in ALLOWED
assert ("rescue", "finished") in ALLOWED
assert ("folder", "opened") not in ALLOWED  # folder has no events

for t in TARGETED_RULE_TYPES:
    assert t in RULE_TYPES, t

assert "test_score" in RULE_TYPES
assert "folder_completed" in RULE_TYPES
assert "folder_rescues_passed" in RULE_TYPES

# entity types used in events
for et, _ev in ALLOWED:
    assert et in ENTITY_TYPES or et in {"article", "test", "rescue"}

print(f"ok: {len(ALLOWED)} event pairs, {len(RULE_TYPES)} rule types")
