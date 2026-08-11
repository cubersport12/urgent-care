"""Aggregate wrong test answers from learning_events for Training MVP."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.content import FolderRepository, TestRepository
from app.services.stats_from_events import list_events


@dataclass
class WrongQuestionStat:
    test_id: str
    question_id: str
    wrong_count: int
    total_count: int
    last_wrong_at: datetime | None


def aggregate_wrong_answers(events: list[Any]) -> list[WrongQuestionStat]:
    """Pure: fold test/finished events with payload.answers into per-question stats."""
    stats: dict[tuple[str, str], WrongQuestionStat] = {}
    for ev in events:
        payload = getattr(ev, "payload", None) or {}
        answers = payload.get("answers")
        if not isinstance(answers, list):
            continue
        test_id = str(getattr(ev, "entity_id", "") or "")
        if not test_id:
            continue
        created = getattr(ev, "created_at", None)
        for ans in answers:
            if not isinstance(ans, dict):
                continue
            qid = ans.get("questionId") or ans.get("question_id")
            if not qid:
                continue
            qid = str(qid)
            key = (test_id, qid)
            cur = stats.get(key)
            if cur is None:
                cur = WrongQuestionStat(
                    test_id=test_id,
                    question_id=qid,
                    wrong_count=0,
                    total_count=0,
                    last_wrong_at=None,
                )
                stats[key] = cur
            cur.total_count += 1
            is_correct = ans.get("isCorrect")
            if is_correct is None:
                is_correct = ans.get("is_correct")
            if is_correct is False:
                cur.wrong_count += 1
                if created is not None and (
                    cur.last_wrong_at is None or created > cur.last_wrong_at
                ):
                    cur.last_wrong_at = created
    return [s for s in stats.values() if s.wrong_count >= 1]


def question_text_from_test(questions: list | None, question_id: str) -> str:
    if not questions:
        return question_id
    for q in questions:
        if not isinstance(q, dict):
            continue
        if str(q.get("id") or "") == question_id:
            text = (q.get("questionText") or q.get("question_text") or q.get("name") or "").strip()
            return text or question_id
    return question_id


async def load_user_wrong_stats(
    session: AsyncSession, user_id: UUID
) -> list[WrongQuestionStat]:
    events = await list_events(
        session, user_id, entity_type="test", event="finished"
    )
    return aggregate_wrong_answers(events)


async def group_wrong_by_test(
    session: AsyncSession, wrong: list[WrongQuestionStat]
) -> list[dict[str, Any]]:
    """Attach test names + question texts; shape ready for TrainingMeOut."""
    if not wrong:
        return []
    tests = {t.id: t for t in await TestRepository(session).list_all()}
    folders = {f.id: f for f in await FolderRepository(session).list_all()}

    by_test: dict[str, list[WrongQuestionStat]] = {}
    for w in wrong:
        by_test.setdefault(w.test_id, []).append(w)

    out: list[dict[str, Any]] = []
    for test_id, items in by_test.items():
        test = tests.get(test_id)
        test_name = test.name if test else test_id
        if test and test.parent_id and test.parent_id in folders:
            test_name = f"{folders[test.parent_id].name} / {test_name}"
        items_sorted = sorted(
            items,
            key=lambda x: (
                -x.wrong_count,
                -(x.last_wrong_at.timestamp() if x.last_wrong_at else 0.0),
            ),
        )
        out.append(
            {
                "test_id": test_id,
                "test_name": test_name,
                "questions": [
                    {
                        "question_id": w.question_id,
                        "question_text": question_text_from_test(
                            test.questions if test else None, w.question_id
                        ),
                        "wrong_count": w.wrong_count,
                        "last_wrong_at": w.last_wrong_at,
                    }
                    for w in items_sorted
                ],
            }
        )
    out.sort(key=lambda t: -sum(q["wrong_count"] for q in t["questions"]))
    return out
