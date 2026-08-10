"""Helpers: reward unlocked only when ALL linked achievements are unlocked."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.models.achievement import Reward


def reward_achievement_ids(reward: Reward) -> list[UUID]:
    return [link.achievement_id for link in (reward.links or [])]


def is_reward_unlocked(reward: Reward, unlocked_achievements: set[UUID]) -> bool:
    ids = reward_achievement_ids(reward)
    return bool(ids) and all(aid in unlocked_achievements for aid in ids)


def reward_unlocked_at(
    reward: Reward, unlock_times: dict[UUID, datetime]
) -> datetime | None:
    ids = reward_achievement_ids(reward)
    if not ids or not all(aid in unlock_times for aid in ids):
        return None
    return max(unlock_times[aid] for aid in ids)
