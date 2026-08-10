"""Achievements and rewards API."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.db.repositories.achievements import AchievementRepository
from app.models.achievement import Achievement, Reward
from app.models.user import User
from app.schemas.achievements import (
    RULE_TYPES,
    TARGETED_RULE_TYPES,
    AchievementCreate,
    AchievementMeOut,
    AchievementOut,
    AchievementUpdate,
    GrantAchievementRequest,
    RewardCreate,
    RewardMeOut,
    RewardOut,
    RewardUpdate,
)
from app.services.reward_unlock import (
    is_reward_unlocked,
    reward_achievement_ids,
    reward_unlocked_at,
)

router = APIRouter(tags=["achievements"])


def _achievement_out(row: Achievement) -> AchievementOut:
    return AchievementOut.model_validate(row)


def _reward_out(row: Reward) -> RewardOut:
    return RewardOut(
        id=row.id,
        achievement_ids=reward_achievement_ids(row),
        title=row.title,
        description=row.description,
        icon_path=row.icon_path,
        sort_order=row.sort_order,
        is_active=row.is_active,
    )


def _validate_rule_type(rule_type: str) -> None:
    if rule_type not in RULE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ruleType. Allowed: {', '.join(RULE_TYPES)}",
        )


def _validate_rule_target(rule_type: str, rule_target_id: str | None) -> None:
    if rule_type in TARGETED_RULE_TYPES and not (rule_target_id or "").strip():
        raise HTTPException(
            status_code=400,
            detail="ruleTargetId is required for this ruleType",
        )


async def _validate_achievement_ids(
    repo: AchievementRepository, achievement_ids: list[UUID]
) -> list[UUID]:
    # Dedupe preserving order
    seen: set[UUID] = set()
    unique: list[UUID] = []
    for aid in achievement_ids:
        if aid in seen:
            continue
        seen.add(aid)
        unique.append(aid)
    if not unique:
        raise HTTPException(status_code=400, detail="achievementIds must not be empty")
    for aid in unique:
        if not await repo.get_achievement(aid):
            raise HTTPException(status_code=404, detail=f"Achievement not found: {aid}")
    return unique


# ── User (static paths before {id}) ─────────────────────────────────


@router.get("/achievements/me", response_model=list[AchievementMeOut])
async def list_achievements_me(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[AchievementMeOut]:
    from app.services.achievement_notify import sync_and_notify

    repo = AchievementRepository(db)
    await sync_and_notify(db, user.id)
    achievements = await repo.list_achievements(active_only=True)
    unlocks = {u.achievement_id: u for u in await repo.list_user_unlocks(user.id)}
    rewards = await repo.list_rewards(active_only=True)
    # Map achievement → first reward (by sort) that includes it
    reward_by_ach: dict[UUID, Reward] = {}
    for r in sorted(rewards, key=lambda x: (x.sort_order, x.title)):
        for aid in reward_achievement_ids(r):
            reward_by_ach.setdefault(aid, r)
    out: list[AchievementMeOut] = []
    for ach in achievements:
        unlock = unlocks.get(ach.id)
        progress = await repo.rule_progress(user.id, ach)
        reward = reward_by_ach.get(ach.id)
        out.append(
            AchievementMeOut(
                id=ach.id,
                code=ach.code,
                title=ach.title,
                description=ach.description,
                icon_path=ach.icon_path,
                rule_type=ach.rule_type,
                rule_threshold=ach.rule_threshold,
                rule_target_id=ach.rule_target_id,
                sort_order=ach.sort_order,
                unlocked=unlock is not None,
                unlocked_at=unlock.unlocked_at if unlock else None,
                progress=progress,
                reward=_reward_out(reward) if reward else None,
            )
        )
    return out


@router.get("/rewards/me", response_model=list[RewardMeOut])
async def list_rewards_me(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[RewardMeOut]:
    repo = AchievementRepository(db)
    unlocks = {u.achievement_id: u for u in await repo.list_user_unlocks(user.id)}
    unlock_times = {u.achievement_id: u.unlocked_at for u in unlocks.values()}
    unlocked_set = set(unlocks)
    achievements = {a.id: a for a in await repo.list_achievements(active_only=True)}
    out: list[RewardMeOut] = []
    for reward in await repo.list_rewards(active_only=True):
        if not is_reward_unlocked(reward, unlocked_set):
            continue
        unlocked_at = reward_unlocked_at(reward, unlock_times)
        if unlocked_at is None:
            continue
        ids = reward_achievement_ids(reward)
        titles = [achievements[aid].title for aid in ids if aid in achievements]
        out.append(
            RewardMeOut(
                id=reward.id,
                achievement_ids=ids,
                achievement_titles=titles,
                title=reward.title,
                description=reward.description,
                icon_path=reward.icon_path,
                sort_order=reward.sort_order,
                unlocked_at=unlocked_at,
            )
        )
    out.sort(key=lambda r: (r.sort_order, r.title))
    return out


# ── Achievements admin ──────────────────────────────────────────────


@router.get("/achievements", response_model=list[AchievementOut])
async def list_achievements_admin(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> list[AchievementOut]:
    rows = await AchievementRepository(db).list_achievements()
    return [_achievement_out(r) for r in rows]


@router.post(
    "/achievements",
    response_model=AchievementOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_achievement(
    payload: AchievementCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> AchievementOut:
    _validate_rule_type(payload.rule_type)
    _validate_rule_target(payload.rule_type, payload.rule_target_id)
    repo = AchievementRepository(db)
    if await repo.get_achievement_by_code(payload.code):
        raise HTTPException(status_code=400, detail="Achievement code already exists")
    row = await repo.create_achievement(
        code=payload.code.strip(),
        title=payload.title.strip(),
        description=payload.description,
        icon_path=payload.icon_path,
        rule_type=payload.rule_type,
        rule_threshold=payload.rule_threshold,
        rule_target_id=(payload.rule_target_id or "").strip() or None,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    return _achievement_out(row)


@router.patch("/achievements/{achievement_id}", response_model=AchievementOut)
async def update_achievement(
    achievement_id: UUID,
    payload: AchievementUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> AchievementOut:
    repo = AchievementRepository(db)
    row = await repo.get_achievement(achievement_id)
    if not row:
        raise HTTPException(status_code=404, detail="Achievement not found")
    data = payload.model_dump(exclude_unset=True)
    if "rule_type" in data:
        _validate_rule_type(data["rule_type"])
    rule_type = data.get("rule_type", row.rule_type)
    target = data["rule_target_id"] if "rule_target_id" in data else row.rule_target_id
    _validate_rule_target(rule_type, target)
    if "rule_target_id" in data and data["rule_target_id"] is not None:
        data["rule_target_id"] = data["rule_target_id"].strip() or None
    if "code" in data and data["code"]:
        data["code"] = data["code"].strip()
        other = await repo.get_achievement_by_code(data["code"])
        if other and other.id != row.id:
            raise HTTPException(status_code=400, detail="Achievement code already exists")
    if "title" in data and data["title"]:
        data["title"] = data["title"].strip()
    return _achievement_out(await repo.update_achievement(row, **data))


@router.delete("/achievements/{achievement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_achievement(
    achievement_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> None:
    repo = AchievementRepository(db)
    row = await repo.get_achievement(achievement_id)
    if not row:
        raise HTTPException(status_code=404, detail="Achievement not found")
    await repo.delete_achievement(row)


@router.post("/achievements/{achievement_id}/grant", response_model=AchievementMeOut)
async def grant_achievement(
    achievement_id: UUID,
    payload: GrantAchievementRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> AchievementMeOut:
    repo = AchievementRepository(db)
    from app.services.achievement_notify import notify_unlocks

    ach = await repo.get_achievement(achievement_id)
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")
    had = await repo.get_user_unlock(payload.user_id, achievement_id)
    unlock = await repo.grant(payload.user_id, achievement_id)
    if not had:
        await notify_unlocks(db, payload.user_id, [unlock])
    reward = await repo.get_reward_for_achievement(achievement_id)
    return AchievementMeOut(
        id=ach.id,
        code=ach.code,
        title=ach.title,
        description=ach.description,
        icon_path=ach.icon_path,
        rule_type=ach.rule_type,
        rule_threshold=ach.rule_threshold,
        rule_target_id=ach.rule_target_id,
        sort_order=ach.sort_order,
        unlocked=True,
        unlocked_at=unlock.unlocked_at,
        progress=ach.rule_threshold,
        reward=_reward_out(reward) if reward else None,
    )


# ── Rewards admin ───────────────────────────────────────────────────


@router.get("/rewards", response_model=list[RewardOut])
async def list_rewards_admin(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> list[RewardOut]:
    rows = await AchievementRepository(db).list_rewards()
    return [_reward_out(r) for r in rows]


@router.post("/rewards", response_model=RewardOut, status_code=status.HTTP_201_CREATED)
async def create_reward(
    payload: RewardCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> RewardOut:
    repo = AchievementRepository(db)
    aids = await _validate_achievement_ids(repo, payload.achievement_ids)
    row = await repo.create_reward(
        achievement_ids=aids,
        title=payload.title.strip(),
        description=payload.description,
        icon_path=payload.icon_path,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    return _reward_out(row)


@router.patch("/rewards/{reward_id}", response_model=RewardOut)
async def update_reward(
    reward_id: UUID,
    payload: RewardUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> RewardOut:
    repo = AchievementRepository(db)
    row = await repo.get_reward(reward_id)
    if not row:
        raise HTTPException(status_code=404, detail="Reward not found")
    data = payload.model_dump(exclude_unset=True)
    achievement_ids = data.pop("achievement_ids", None)
    if achievement_ids is not None:
        achievement_ids = await _validate_achievement_ids(repo, achievement_ids)
    if "title" in data and data["title"]:
        data["title"] = data["title"].strip()
    return _reward_out(
        await repo.update_reward(row, achievement_ids=achievement_ids, **data)
    )


@router.delete("/rewards/{reward_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reward(
    reward_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> None:
    repo = AchievementRepository(db)
    row = await repo.get_reward(reward_id)
    if not row:
        raise HTTPException(status_code=404, detail="Reward not found")
    await repo.delete_reward(row)
