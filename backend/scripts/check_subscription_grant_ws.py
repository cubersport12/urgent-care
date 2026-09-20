"""In-process e2e: выдача подписки (покупка/продление/награда) + WS subscription_granted.

Запуск: .venv/Scripts/python scripts/check_subscription_grant_ws.py
Использует dev-базу и пользователя cubersport123455+e2e@yandex.ru; состояние восстанавливает.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import delete, select, text

from app.db.base import AsyncSessionLocal
from app.db.repositories.achievements import AchievementRepository
from app.models.achievement import Achievement, Reward, RewardAchievement, UserAchievement
from app.models.billing import Payment, Tariff, UserSubscription
from app.models.notification import Notification
from app.models.user import User
from app.realtime.notifications_hub import notification_hub
from app.services.billing import BillingService
from app.services.achievement_notify import notify_unlocks

PROBE_EMAIL = "cubersport123455+e2e@yandex.ru"


class FakeWS:
    def __init__(self):
        self.sent = []

    async def accept(self):
        pass

    async def send_json(self, data):
        self.sent.append(data)


async def _reset_to_free(s: AsyncSessionLocal, user: User, default_id) -> UserSubscription:
    svc = BillingService(s)
    sub = await svc.ensure_subscription(user)
    now = datetime.now(timezone.utc)
    sub.tariff_id = default_id
    sub.status = "active"
    sub.cancel_at_period_end = False
    sub.yookassa_payment_method_id = None
    sub.current_period_start = now
    sub.current_period_end = now + timedelta(days=30)
    await s.commit()
    return sub


async def main() -> None:
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as s:
        uid = (await s.execute(text("SELECT id FROM users WHERE email=:e"), {"e": PROBE_EMAIL})).fetchone()[0]
        user = await s.get(User, uid)
        default = (await s.execute(select(Tariff).where(Tariff.is_default.is_(True)))).scalar_one()
        paid = (
            await s.execute(select(Tariff).where(Tariff.price_rub > 0).order_by(Tariff.rank).limit(1))
        ).scalar_one()
        assert paid, "нет платного тарифа в dev-базе"
        paid_id, default_id = paid.id, default.id

        # ── A: покупка (payment.succeeded через _apply_yookassa_object) → WS purchase
        sub = await _reset_to_free(s, user, default_id)
        payment = Payment(
            id=uuid4(), user_id=uid, subscription_id=sub.id, tariff_id=paid_id,
            amount_rub=float(paid.price_rub), status="pending",
            yookassa_payment_id=f"e2e-{uuid4().hex}", idempotency_key=f"e2e-{uuid4().hex}", raw_json=None,
        )
        s.add(payment)
        await s.commit()
        ws_a = FakeWS()
        await notification_hub.connect(uid, ws_a)
        await BillingService(s)._apply_yookassa_object(
            payment, {"status": "succeeded", "id": payment.yookassa_payment_id, "metadata": {}}
        )
        await s.commit()
        granted_a = [m for m in ws_a.sent if m["type"] == "subscription_granted"]
        assert len(granted_a) == 1, ws_a.sent
        assert granted_a[0]["data"]["source"] == "purchase", granted_a[0]
        assert granted_a[0]["data"]["tariffId"] == str(paid_id)
        await s.refresh(sub)
        assert sub.tariff_id == paid_id, "тариф не сменился на купленный"
        print("A purchase: OK, source=purchase, periodEnd=", granted_a[0]["data"]["periodEnd"])

        # ── A2: продление (тот же объект с metadata.renewal=1) → WS renewal
        payment2 = Payment(
            id=uuid4(), user_id=uid, subscription_id=sub.id, tariff_id=paid_id,
            amount_rub=float(paid.price_rub), status="pending",
            yookassa_payment_id=f"e2e-{uuid4().hex}", idempotency_key=f"e2e-{uuid4().hex}", raw_json=None,
        )
        s.add(payment2)
        await s.commit()
        before_end = sub.current_period_end
        await BillingService(s)._apply_yookassa_object(
            payment2, {"status": "succeeded", "id": payment2.yookassa_payment_id, "metadata": {"renewal": "1"}}
        )
        await s.commit()
        granted_a2 = [m for m in ws_a.sent if m["type"] == "subscription_granted"][-1]
        assert granted_a2["data"]["source"] == "renewal", granted_a2
        await s.refresh(sub)
        assert sub.current_period_end > before_end, "период не продлён"
        print("A2 renewal: OK, source=renewal")

        # ── B: награда — grant достижения → подписка (reward) + achievement_unlocked
        await _reset_to_free(s, user, default_id)
        await s.refresh(sub)
        free_end = sub.current_period_end  # now + 30 дней
        ach = Achievement(
            id=uuid4(), code=f"e2e_sub_{uuid4().hex[:8]}", title="E2E подписка",
            rule_type="manual", rule_threshold=1,
        )
        reward = Reward(
            id=uuid4(), title="Награда с подпиской",
            subscription_tariff_id=paid_id, subscription_days=14,
        )
        s.add_all([ach, reward, RewardAchievement(reward_id=reward.id, achievement_id=ach.id)])
        await s.commit()

        ws_b = FakeWS()
        await notification_hub.connect(uid, ws_b)
        unlock = await AchievementRepository(s).grant(uid, ach.id)  # коммитит сам
        await notify_unlocks(s, uid, [unlock])
        await s.commit()

        types_b = [m["type"] for m in ws_b.sent]
        assert types_b == ["achievement_unlocked", "subscription_granted"], types_b
        granted_b = ws_b.sent[1]["data"]
        assert granted_b["source"] == "reward", granted_b
        assert granted_b["tariffId"] == str(paid_id)
        await s.refresh(sub)
        assert sub.tariff_id == paid_id, "награда не подняла тариф"
        expected_end = free_end + timedelta(days=14)
        assert abs((sub.current_period_end - expected_end).total_seconds()) < 5, (
            sub.current_period_end, expected_end,
        )
        print("B reward: OK, source=reward, период продлён на 14 дней поверх активного")

        # ── C: повторный unlock не выдаёт дни дважды
        newly = await AchievementRepository(s).sync_unlocks(uid)
        await notify_unlocks(s, uid, newly)
        await s.commit()
        assert newly == [], "повторный sync вернул unlock"
        assert len(ws_b.sent) == 2, f"лишние WS-сообщения: {[m['type'] for m in ws_b.sent]}"
        had = await AchievementRepository(s).get_user_unlock(uid, ach.id)
        assert had is not None
        end_after = (await s.refresh(sub), sub.current_period_end)[1]
        assert abs((end_after - expected_end).total_seconds()) < 5, "дни выданы повторно"
        print("C no-double: OK")

        # ── очистка
        await notification_hub.disconnect(uid, ws_a)
        await notification_hub.disconnect(uid, ws_b)
        await s.execute(delete(UserAchievement).where(UserAchievement.user_id == uid))
        await s.execute(delete(RewardAchievement).where(RewardAchievement.reward_id == reward.id))
        await s.execute(delete(Reward).where(Reward.id == reward.id))
        await s.execute(delete(Achievement).where(Achievement.id == ach.id))
        await s.execute(delete(Payment).where(Payment.id.in_([payment.id, payment2.id])))
        await s.execute(
            delete(Notification).where(
                Notification.user_id == uid, Notification.title == "Достижение: E2E подписка"
            )
        )
        await _reset_to_free(s, user, default_id)
        await s.commit()
        print("cleanup: OK — состояние восстановлено")


asyncio.run(main())
