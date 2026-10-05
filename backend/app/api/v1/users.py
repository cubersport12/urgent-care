"""User public profiles (QR scan) + admin user management."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.core.config import settings
from app.core.security import hash_password
from app.db.repositories.achievements import AchievementRepository
from app.db.repositories.password_reset import PasswordResetRepository
from app.db.repositories.user import UserRepository
from app.models.achievement import Reward, UserAchievement
from app.models.learning_event import LearningEvent
from app.models.user import User
from app.models.user_bonus import UserBonusTransaction
from app.schemas.users import (
    AdminActionOut,
    GrantBonusRequest,
    UserAdminCreate,
    UserAdminUpdate,
    UserStatusUpdateRequest,
)
from app.models.billing import UserSubscription, Tariff
from sqlalchemy.orm import selectinload
from sqlalchemy import select, func, update

from app.schemas.users import (
    QrProfileOut,
    QrRewardOut,
    QrStatsOut,
    ResetStatsOut,
    ResetStatsRequest,
    UserListItemOut,
)
from app.services.reward_unlock import is_reward_unlocked, reward_unlocked_at
from app.services.stats_from_events import count_distinct_completed
from app.utils.email import send_email_safe
from app.utils.s3 import get_s3_client

router = APIRouter(tags=["users"])


@router.get("/users", response_model=list[UserListItemOut])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> list[UserListItemOut]:
    # Query users with their total score and active tariff
    stmt = (
        select(
            User,
            func.coalesce(func.sum(UserBonusTransaction.amount), 0).label("score"),
            Tariff.title.label("tariff_name")
        )
        .outerjoin(UserBonusTransaction, User.id == UserBonusTransaction.user_id)
        .outerjoin(
            UserSubscription, 
            (User.id == UserSubscription.user_id) & (UserSubscription.status == "active")
        )
        .outerjoin(Tariff, UserSubscription.tariff_id == Tariff.id)
        .group_by(User.id, Tariff.title)
        .order_by(User.full_name, User.email)
    )
    result = await db.execute(stmt)
    
    out = []
    for user, score, tariff_name in result.all():
        out.append(UserListItemOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            status="active" if user.is_active else "banned",
            score=int(score),
            tariff_name=tariff_name,
            role=user.role,
            occupation=user.occupation,
            birth_year=user.birth_year,
        ))
    return out


@router.post("/users", status_code=status.HTTP_201_CREATED, response_model=AdminActionOut)
async def admin_create_user(
    payload: UserAdminCreate,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> AdminActionOut:
    """Создание пользователя администратором. Без пароля — уйдёт письмо со ссылкой установки."""
    email = payload.email.lower()
    if await db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email уже существует",
        )

    from app.services.billing import BillingService

    user = await UserRepository(db).create(
        id=uuid4(),
        email=email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password) if payload.password else None,
        role=payload.role,
        occupation=payload.occupation,
        birth_year=payload.birth_year,
        is_active=True,
        email_verified=True,
    )
    await BillingService(db).ensure_subscription(user)

    message = "Пользователь создан"
    if not payload.password:
        raw_token = await PasswordResetRepository(db).issue(user.id)
        link = f"{settings.password_reset_url.rstrip('/')}?token={raw_token}"
        background_tasks.add_task(
            send_email_safe,
            to=user.email,
            subject="Приглашение в Trouble Dent",
            body=(
                f"{user.full_name or 'Пользователь'}, вам создан аккаунт в Trouble Dent.\n\n"
                f"Задайте пароль по ссылке:\n{link}\n\nСсылка действует 2 часа."
            ),
        )
        message = "Пользователь создан. Ссылка для установки пароля отправлена на email"

    return AdminActionOut(success=True, message=message)


@router.patch("/users/{user_id}", response_model=AdminActionOut)
async def admin_update_user(
    user_id: UUID,
    payload: UserAdminUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(get_current_admin)],
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Семантика явного null: переданное поле применяется, включая null (очистка occupation/birthYear).
    fields = payload.model_fields_set
    if "role" in fields and payload.role is not None:
        if user.id == admin.id and payload.role != user.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя изменить собственную роль",
            )
        user.role = payload.role
    if "full_name" in fields and payload.full_name is not None:
        user.full_name = payload.full_name
    if "occupation" in fields:
        user.occupation = payload.occupation
    if "birth_year" in fields:
        user.birth_year = payload.birth_year

    await db.commit()
    return AdminActionOut(success=True, message="Изменения сохранены")


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def admin_delete_user(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(get_current_admin)],
) -> Response:
    """Полное удаление аккаунта и всех связанных данных (каскад по FK, как DELETE /auth/me)."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить собственный аккаунт",
        )
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.avatar_key:
        await get_s3_client().delete_file(key=user.avatar_key)
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/users/{user_id}/bonus")
async def grant_user_bonus(
    user_id: UUID,
    payload: GrantBonusRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    txn = UserBonusTransaction(
        user_id=user_id,
        amount=payload.points,
        reason=payload.reason or "Admin bonus"
    )
    db.add(txn)
    await db.commit()
    return {"success": True}

@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: UUID,
    payload: UserStatusUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = (payload.status == "active")
    await db.commit()
    return {"success": True}

@router.post(
    "/users/reset-stats",
    response_model=ResetStatsOut,
    status_code=status.HTTP_200_OK,
)
async def reset_users_stats(
    payload: ResetStatsRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> ResetStatsOut:
    """Полный сброс статистики и прогресса: события обучения (аналитика,
    статистика тестов/статей/режимов) и записи о полученных достижениях."""
    # Dedupe preserving order
    user_ids = list(dict.fromkeys(payload.user_ids))
    await db.execute(delete(LearningEvent).where(LearningEvent.user_id.in_(user_ids)))
    await db.execute(delete(UserAchievement).where(UserAchievement.user_id.in_(user_ids)))
    return ResetStatsOut(users_count=len(user_ids))


@router.get("/users/{user_id}/qr-profile", response_model=QrProfileOut)
async def get_user_qr_profile(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _viewer: Annotated[User, Depends(get_current_user)],
) -> QrProfileOut:
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    repo = AchievementRepository(db)
    unlocks = await repo.list_user_unlocks(user_id)
    unlocked_set = {u.achievement_id for u in unlocks}
    achievements = await repo.list_achievements(active_only=True)

    rewards: list[tuple[Reward, datetime]] = []
    for reward in await repo.list_rewards(active_only=True):
        if not is_reward_unlocked(reward, unlocked_set):
            continue
        unlocked_at = reward_unlocked_at(
            reward, {u.achievement_id: u.unlocked_at for u in unlocks}
        )
        if unlocked_at is None:
            continue
        rewards.append((reward, unlocked_at))
    rewards.sort(key=lambda item: (item[0].sort_order, item[0].title))

    stats = QrStatsOut(
        articles_read=await count_distinct_completed(db, user_id, "article", "completed"),
        tests_passed=await count_distinct_completed(
            db, user_id, "test", "finished", passed_only=True
        ),
        rescues_passed=await count_distinct_completed(
            db, user_id, "rescue", "finished", passed_only=True
        ),
    )

    return QrProfileOut(
        id=user.id,
        full_name=user.full_name,
        city=user.city.name if user.city else None,
        achievements_count=len(unlocked_set & {a.id for a in achievements}),
        rewards=[
            QrRewardOut(
                id=reward.id,
                title=reward.title,
                description=reward.description,
                files=reward.files,
            )
            for reward, _unlocked_at in rewards
        ],
        stats=stats,
    )
