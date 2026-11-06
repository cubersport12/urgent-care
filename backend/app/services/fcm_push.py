"""Register devices and send Android notifications through FCM."""
from __future__ import annotations

import json
import logging
import time
from typing import Any
from uuid import UUID

import httpx
from jose import jwt
from jose.exceptions import JOSEError
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.push_token import PushToken

log = logging.getLogger(__name__)


async def upsert_push_token(
    session: AsyncSession, *, user_id: UUID, token: str, platform: str
) -> PushToken:
    token = token.strip()
    platform = (platform or "unknown").strip()[:20] or "unknown"
    statement = insert(PushToken).values(user_id=user_id, token=token, platform=platform)
    statement = statement.on_conflict_do_update(
        index_elements=[PushToken.token],
        set_={"user_id": user_id, "platform": platform, "updated_at": func.now()},
    ).returning(PushToken)
    return (await session.execute(statement)).scalar_one()


async def delete_push_token(session: AsyncSession, *, user_id: UUID, token: str) -> None:
    await session.execute(
        delete(PushToken).where(PushToken.user_id == user_id, PushToken.token == token.strip())
    )


async def tokens_for_user(session: AsyncSession, user_id: UUID) -> list[str]:
    rows = (
        await session.execute(select(PushToken.token).where(
            PushToken.user_id == user_id, PushToken.platform == "android",
            ~PushToken.token.startswith("ExponentPushToken["),
            ~PushToken.token.startswith("ExpoPushToken["),
        ))
    ).scalars().all()
    return list(rows)


async def send_fcm_push(messages: list[dict[str, Any]]) -> tuple[int, int, bool]:
    if not messages:
        return 0, 0, False
    try:
        account = json.loads(settings.fcm_service_account_json)
        now = int(time.time())
        assertion = jwt.encode({
            "iss": account["client_email"],
            "scope": "https://www.googleapis.com/auth/firebase.messaging",
            "aud": "https://oauth2.googleapis.com/token",
            "iat": now,
            "exp": now + 3600,
        }, account["private_key"], algorithm="RS256")
        project_id = account["project_id"]
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post("https://oauth2.googleapis.com/token", data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            })
            response.raise_for_status()
            access_token = response.json()["access_token"]
            accepted = failed = 0
            uncertain = False
            for message in messages:
                try:
                    response = await client.post(
                        f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send",
                        headers={"Authorization": f"Bearer {access_token}"},
                        json={"message": message},
                    )
                    if response.status_code >= 500:
                        uncertain = True
                    elif response.is_success:
                        accepted += 1
                    else:
                        failed += 1
                        log.warning("FCM rejected notification: HTTP %s", response.status_code)
                except httpx.HTTPError:
                    log.warning("FCM notification result is unknown")
                    uncertain = True
            return accepted, failed, uncertain
    except (ValueError, KeyError, TypeError, JOSEError, httpx.HTTPError):
        log.warning("FCM credentials or authentication are invalid")
        return 0, len(messages), False


async def push_user(
    session: AsyncSession,
    user_id: UUID,
    *,
    title: str,
    body: str = "",
    data: dict[str, Any] | None = None,
) -> None:
    tokens = await tokens_for_user(session, user_id)
    await send_fcm_push([
        {"token": token, "notification": {"title": title, "body": body or title},
         "data": data or {}, "android": {"notification": {"channel_id": "default"}}}
        for token in tokens
    ])
