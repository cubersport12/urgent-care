"""Login code repository: одноразовый 6-значный код входа по email."""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy import select, update

from app.db.repositories.base import BaseRepository
from app.models.login_code import LoginCode

CODE_TTL = timedelta(minutes=10)
MAX_ATTEMPTS = 5


def new_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


class LoginCodeRepository(BaseRepository[LoginCode]):
    model = LoginCode

    async def issue(self, user_id: UUID) -> str:
        # Один активный код на пользователя: прежние неиспользованные гасим
        await self.session.execute(
            update(LoginCode)
            .where(LoginCode.user_id == user_id, LoginCode.used_at.is_(None))
            .values(used_at=datetime.now(timezone.utc))
        )
        code = new_code()
        await self.create(
            id=uuid4(),
            user_id=user_id,
            code_hash=hash_code(code),
            expires_at=datetime.now(timezone.utc) + CODE_TTL,
        )
        return code

    async def consume(self, user_id: UUID, code: str) -> bool:
        row = (
            await self.session.execute(
                select(LoginCode)
                .where(LoginCode.user_id == user_id, LoginCode.used_at.is_(None))
                .order_by(LoginCode.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if not row or row.expires_at < datetime.now(timezone.utc):
            return False
        if row.attempts >= MAX_ATTEMPTS:
            return False
        if not hmac.compare_digest(row.code_hash, hash_code(code)):
            row.attempts += 1
            await self.session.flush()
            return False
        row.used_at = datetime.now(timezone.utc)
        await self.session.flush()
        return True
