"""Self-check: reward unlocks only when ALL linked achievements are present (AND)."""
from pathlib import Path
import sys
from types import SimpleNamespace
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.reward_unlock import is_reward_unlocked, reward_unlocked_at

a1, a2, a3 = uuid4(), uuid4(), uuid4()
reward = SimpleNamespace(
    links=[
        SimpleNamespace(achievement_id=a1),
        SimpleNamespace(achievement_id=a2),
    ]
)

assert not is_reward_unlocked(reward, set())
assert not is_reward_unlocked(reward, {a1})
assert not is_reward_unlocked(reward, {a1, a3})
assert is_reward_unlocked(reward, {a1, a2})
assert is_reward_unlocked(reward, {a1, a2, a3})

from datetime import datetime, timezone

t1 = datetime(2024, 1, 1, tzinfo=timezone.utc)
t2 = datetime(2024, 2, 1, tzinfo=timezone.utc)
assert reward_unlocked_at(reward, {a1: t1}) is None
assert reward_unlocked_at(reward, {a1: t1, a2: t2}) == t2

empty = SimpleNamespace(links=[])
assert not is_reward_unlocked(empty, {a1})

print("ok: reward unlock AND")
