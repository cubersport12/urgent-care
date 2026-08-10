"""Self-check: reward gate filter (no DB)."""
from pathlib import Path
import sys
from types import SimpleNamespace
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.entitlements import filter_by_reward, is_reward_visible

r1, r2 = uuid4(), uuid4()
items = [
    SimpleNamespace(id="a", required_reward_id=None),
    SimpleNamespace(id="b", required_reward_id=r1),
    SimpleNamespace(id="c", required_reward_id=r2),
]

assert is_reward_visible(required_reward_id=None, unlocked=set())
assert not is_reward_visible(required_reward_id=r1, unlocked=set())
assert is_reward_visible(required_reward_id=r1, unlocked={r1})

open_none = filter_by_reward(items, unlocked=set())
assert [i.id for i in open_none] == ["a"]

open_r1 = filter_by_reward(items, unlocked={r1})
assert [i.id for i in open_r1] == ["a", "b"]

print("ok: reward visibility")
