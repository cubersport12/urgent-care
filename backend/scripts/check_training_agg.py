"""Self-check: wrong answers aggregate to weak questions (AND-style presence)."""
from datetime import datetime, timezone
from pathlib import Path
import sys
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.training import aggregate_wrong_answers, question_text_from_test

t1 = datetime(2024, 1, 1, tzinfo=timezone.utc)
t2 = datetime(2024, 2, 1, tzinfo=timezone.utc)

events = [
    SimpleNamespace(
        entity_id="test-a",
        created_at=t1,
        payload={
            "answers": [
                {"questionId": "q1", "isCorrect": False},
                {"questionId": "q2", "isCorrect": True},
            ]
        },
    ),
    SimpleNamespace(
        entity_id="test-a",
        created_at=t2,
        payload={
            "answers": [
                {"questionId": "q1", "isCorrect": False},
                {"questionId": "q2", "isCorrect": False},
            ]
        },
    ),
    SimpleNamespace(
        entity_id="test-b",
        created_at=t1,
        payload={"answers": [{"questionId": "q9", "isCorrect": True}]},
    ),
    SimpleNamespace(
        entity_id="test-c",
        created_at=t1,
        payload={"passed": False, "data": {"answers": [{"questionId": "q3", "isCorrect": False}]}},
    ),
]

weak = aggregate_wrong_answers(events)
by_q = {(w.test_id, w.question_id): w for w in weak}

assert ("test-a", "q1") in by_q
assert by_q[("test-a", "q1")].wrong_count == 2
assert by_q[("test-a", "q1")].total_count == 2
assert by_q[("test-a", "q1")].last_wrong_at == t2

assert ("test-a", "q2") in by_q
assert by_q[("test-a", "q2")].wrong_count == 1
assert by_q[("test-a", "q2")].total_count == 2

assert ("test-b", "q9") not in by_q  # never wrong
assert ("test-c", "q3") in by_q
assert by_q[("test-c", "q3")].wrong_count == 1

questions = [{"id": "q1", "questionText": "Что делать при X?"}]
assert question_text_from_test(questions, "q1") == "Что делать при X?"
assert question_text_from_test(questions, "missing") == "missing"

print("ok: training agg")
