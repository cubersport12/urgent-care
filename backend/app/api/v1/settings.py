"""Admin-persisted system settings (key-value)."""
from __future__ import annotations

from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Response, status
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.schemas.settings import SystemSettingsOut, SystemSettingsUpdate
from app.utils.redis_cache import get_redis_client, rotate_cache_generation

router = APIRouter(prefix="/system-settings", tags=["system-settings"])
log = structlog.get_logger()


async def _load(db: AsyncSession) -> dict[str, object]:
    rows = (await db.execute(select(SystemSetting))).scalars().all()
    return {r.key: r.value for r in rows}


@router.get("", response_model=SystemSettingsOut)
async def get_system_settings(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> SystemSettingsOut:
    data = await _load(db)
    return SystemSettingsOut(maintenance_mode=bool(data.get("maintenance_mode", False)))


@router.patch("", response_model=SystemSettingsOut)
async def update_system_settings(
    payload: SystemSettingsUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> SystemSettingsOut:
    updates: dict[str, object] = {}
    if payload.maintenance_mode is not None:
        updates["maintenance_mode"] = payload.maintenance_mode

    for key, value in updates.items():
        row = await db.get(SystemSetting, key)
        if row is None:
            db.add(SystemSetting(key=key, value=value))
        else:
            row.value = value
    await db.flush()

    data = await _load(db)
    return SystemSettingsOut(maintenance_mode=bool(data.get("maintenance_mode", False)))


@router.post("/cache/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_redis_cache(
    admin: Annotated[User, Depends(get_current_admin)],
) -> Response:
    redis = get_redis_client()
    if redis is None:
        raise HTTPException(status_code=503, detail="Redis cache is not configured")
    try:
        await rotate_cache_generation(redis)
    except RedisError as exc:
        log.error("redis_cache_clear_failed", admin_id=str(admin.id), error=str(exc))
        raise HTTPException(status_code=503, detail="Redis cache is unavailable") from exc
    log.info("redis_cache_cleared", admin_id=str(admin.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
