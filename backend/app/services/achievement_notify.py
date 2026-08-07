"""Grant achievements and push unlock events over the notifications hub."""
from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.achievements import AchievementRepository
from app.models.achievement import UserAchievement
from app.models.notification import Notification
from app.realtime.notifications_hub import notification_hub
from app.services.expo_push import push_user


def _notif_payload(row: Notification) -> dict:
    return {
        "id": str(row.id),
        "title": row.title,
        "body": row.body,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "readAt": row.read_at.isoformat() if row.read_at else None,
        "isRead": row.read_at is not None,
    }


async def notify_unlocks(
    session: AsyncSession,
    user_id: UUID,
    newly: list[UserAchievement],
) -> None:
    if not newly:
        return
    repo = AchievementRepository(session)
    for unlock in newly:
        ach = await repo.get_achievement(unlock.achievement_id)
        if not ach:
            continue
        reward = await repo.get_reward_for_achievement(ach.id)
        if reward and not reward.is_active:
            reward = None
        body = (ach.description or "").strip() or "Новое достижение разблокировано"
        title = f"Достижение: {ach.title}"
        notif = Notification(
            id=uuid4(),
            user_id=user_id,
            title=title,
            body=body,
        )
        session.add(notif)
        await session.flush()
        await session.refresh(notif)

        payload = {
            "type": "achievement_unlocked",
            "data": {
                "notification": _notif_payload(notif),
                "achievement": {
                    "id": str(ach.id),
                    "title": ach.title,
                    "description": ach.description,
                    "iconPath": ach.icon_path,
                },
                "reward": (
                    {
                        "title": reward.title,
                        "description": reward.description,
                        "iconPath": reward.icon_path,
                    }
                    if reward
                    else None
                ),
            },
        }
        await notification_hub.send_user(user_id, payload)
        await push_user(
            session,
            user_id,
            title=title,
            body=body,
            data={"kind": "achievement", "achievementId": str(ach.id)},
        )


async def sync_and_notify(session: AsyncSession, user_id: UUID) -> list[UserAchievement]:
    newly = await AchievementRepository(session).sync_unlocks(user_id)
    await notify_unlocks(session, user_id, newly)
    return newly
