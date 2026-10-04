"""Admin-persisted system settings (key-value)."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.schemas.settings import SystemSettingsOut, SystemSettingsUpdate

router = APIRouter(prefix="/system-settings", tags=["system-settings"])


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
