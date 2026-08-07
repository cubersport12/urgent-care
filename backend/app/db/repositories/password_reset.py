"""Password reset token repository."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy import select

from app.db.repositories.base import BaseRepository
from app.models.password_reset import PasswordResetToken

TOKEN_TTL = timedelta(hours=2)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def new_raw_token() -> str:
    return secrets.token_urlsafe(32)


class PasswordResetRepository(BaseRepository[PasswordResetToken]):
    model = PasswordResetToken

    async def issue(self, user_id: UUID) -> str:
        raw = new_raw_token()
        await self.create(
            id=uuid4(),
            user_id=user_id,
            token_hash=hash_token(raw),
            expires_at=datetime.now(timezone.utc) + TOKEN_TTL,
        )
        return raw

    async def consume(self, raw: str) -> PasswordResetToken | None:
        row = (
            await self.session.execute(
                select(PasswordResetToken).where(
                    PasswordResetToken.token_hash == hash_token(raw)
                )
            )
        ).scalar_one_or_none()
        if not row or row.used_at is not None:
            return None
        if row.expires_at < datetime.now(timezone.utc):
            return None
        row.used_at = datetime.now(timezone.utc)
        await self.session.flush()
        return row
