"""Self-check: token hash + shuffle/slice for random tests."""
from __future__ import annotations

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.repositories.password_reset import hash_token, new_raw_token


def prepare_questions(
    questions: list[str],
    *,
    randomize: bool,
    questions_to_show: int | None,
    seed: int = 1,
) -> list[str]:
    q = list(questions)
    if randomize:
        rng = random.Random(seed)
        rng.shuffle(q)
    if questions_to_show is not None and questions_to_show > 0:
        q = q[:questions_to_show]
    return q


def main() -> None:
    raw = new_raw_token()
    assert hash_token(raw) != raw
    assert hash_token(raw) == hash_token(raw)
    assert len(hash_token(raw)) == 64

    pool = [f"q{i}" for i in range(10)]
    shown = prepare_questions(pool, randomize=True, questions_to_show=3, seed=42)
    assert len(shown) == 3
    assert len(set(shown)) == 3
    assert all(x in pool for x in shown)
    plain = prepare_questions(pool, randomize=False, questions_to_show=None)
    assert plain == pool
    print("ok")


if __name__ == "__main__":
    main()
