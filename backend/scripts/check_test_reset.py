"""In-process проверка сброса зачётов при провале экзамена (append-reset, last-wins).

Запуск: .venv/Scripts/python scripts/check_test_reset.py
"""
import asyncio
from uuid import uuid4

from sqlalchemy import delete, select, text

from app.db.base import AsyncSessionLocal
from app.models.learning_event import LearningEvent
from app.models.test import Test
from app.services.stats_from_events import (
    count_distinct_completed,
    create_test_result,
    list_events,
)

PROBE_EMAIL = "cubersport123455+e2e@yandex.ru"


async def main() -> None:
    async with AsyncSessionLocal() as s:
        uid = (
            await s.execute(text("SELECT id FROM users WHERE email = :e"), {"e": PROBE_EMAIL})
        ).fetchone()[0]

        t1 = Test(id=f"e2e_z1_{uuid4().hex[:8]}", name="Зачёт 1 (e2e)")
        t2 = Test(id=f"e2e_z2_{uuid4().hex[:8]}", name="Зачёт 2 (e2e)")
        exam = Test(
            id=f"e2e_exam_{uuid4().hex[:8]}",
            name="Экзамен (e2e)",
            reset_test_ids=[t1.id, t2.id],
        )
        s.add_all([t1, t2, exam])
        await s.commit()

        try:
            # зачёты сданы
            await create_test_result(
                s, uid, test_id=t1.id, total_score=10, total_errors=0,
                is_passed=True, answers=None,
            )
            await create_test_result(
                s, uid, test_id=t2.id, total_score=9, total_errors=1,
                is_passed=True, answers=None,
            )
            await s.commit()
            base = await count_distinct_completed(s, uid, "test", "finished", passed_only=True)
            assert base >= 2

            # провал экзамена со списком сброса
            res = await create_test_result(
                s, uid, test_id=exam.id, total_score=3, total_errors=7,
                is_passed=False, answers=None,
            )
            await s.commit()
            assert res.reset_tests is not None
            assert {r.id: r.name for r in res.reset_tests} == {t1.id: t1.name, t2.id: t2.name}

            # у зачётов дописалась reset-попытка (последняя, не сдана), история цела
            for t in (t1, t2):
                evs = await list_events(s, uid, entity_type="test", entity_id=t.id)
                assert len(evs) == 2, (t.id, len(evs))
                assert evs[0].payload.get("passed") is True
                assert evs[-1].payload.get("completion_type") == "reset"
                assert evs[-1].payload.get("passed") is False
            after = await count_distinct_completed(s, uid, "test", "finished", passed_only=True)
            assert after == base - 2, (base, after)
            print(f"1: провал экзамена → оба зачёта сброшены (last-wins), тестов сдано {base}→{after}")

            # успех экзамена — сбросов нет
            n_t1 = len(await list_events(s, uid, entity_type="test", entity_id=t1.id))
            await create_test_result(
                s, uid, test_id=exam.id, total_score=10, total_errors=0,
                is_passed=True, answers=None,
            )
            await s.commit()
            assert len(await list_events(s, uid, entity_type="test", entity_id=t1.id)) == n_t1
            print("2: успех экзамена — зачёты не тронуты")

            # провал без списка сброса — тоже
            exam.reset_test_ids = None
            await s.commit()
            res = await create_test_result(
                s, uid, test_id=exam.id, total_score=1, total_errors=9,
                is_passed=False, answers=None,
            )
            await s.commit()
            assert res.reset_tests is None
            assert len(await list_events(s, uid, entity_type="test", entity_id=t1.id)) == n_t1
            print("3: провал без списка сброса — зачёты не тронуты")
        finally:
            await s.execute(
                delete(LearningEvent).where(
                    LearningEvent.user_id == uid,
                    LearningEvent.entity_id.in_([t1.id, t2.id, exam.id]),
                )
            )
            await s.execute(
                delete(Test).where(Test.id.in_([t1.id, t2.id, exam.id]))
            )
            await s.commit()
        print("cleanup: OK")


asyncio.run(main())
