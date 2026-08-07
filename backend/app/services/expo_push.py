"""Send system push via Expo Push API (works when the app is closed)."""
from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.push_token import PushToken

log = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def upsert_push_token(
    session: AsyncSession, *, user_id: UUID, token: str, platform: str
) -> PushToken:
    token = token.strip()
    platform = (platform or "unknown").strip()[:20] or "unknown"
    row = (
        await session.execute(select(PushToken).where(PushToken.token == token))
    ).scalar_one_or_none()
    if row:
        row.user_id = user_id
        row.platform = platform
        await session.flush()
        return row
    row = PushToken(user_id=user_id, token=token, platform=platform)
    session.add(row)
    await session.flush()
    return row


async def delete_push_token(session: AsyncSession, *, user_id: UUID, token: str) -> None:
    await session.execute(
        delete(PushToken).where(PushToken.user_id == user_id, PushToken.token == token.strip())
    )


async def tokens_for_user(session: AsyncSession, user_id: UUID) -> list[str]:
    rows = (
        await session.execute(select(PushToken.token).where(PushToken.user_id == user_id))
    ).scalars().all()
    return list(rows)


async def send_expo_push(
    tokens: list[str],
    *,
    title: str,
    body: str = "",
    data: dict[str, Any] | None = None,
) -> None:
    if not tokens:
        return
    # Expo accepts batches of up to 100.
    messages = [
        {
            "to": t,
            "sound": "default",
            "title": title,
            "body": body or title,
            "data": data or {},
            "channelId": "default",
        }
        for t in tokens
    ]
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            for i in range(0, len(messages), 100):
                chunk = messages[i : i + 100]
                resp = await client.post(EXPO_PUSH_URL, json=chunk)
                if resp.status_code >= 400:
                    log.warning("expo push http %s: %s", resp.status_code, resp.text[:300])
                    continue
                # Drop DeviceNotRegistered tokens is left for a later cleanup pass.
                _ = resp.json()
    except Exception:
        log.exception("expo push failed")


async def push_user(
    session: AsyncSession,
    user_id: UUID,
    *,
    title: str,
    body: str = "",
    data: dict[str, Any] | None = None,
) -> None:
    await send_expo_push(
        await tokens_for_user(session, user_id),
        title=title,
        body=body,
        data=data,
    )
