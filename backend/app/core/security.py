"""Password hashing + stateless email-токены. Авторизация — по session id (app/api/deps.py), JWT не используется."""
import base64
import hashlib
import hmac
import time
from uuid import UUID

import bcrypt

from app.core.config import settings


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=settings.bcrypt_rounds)
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def make_email_token(user_id: UUID, email: str, ttl_seconds: int) -> str:
    """Stateless подписанный токен «uid:email:exp» для подтверждения почты (идемпотентно — без таблицы)."""
    payload = f"{user_id}:{email.lower()}:{int(time.time()) + ttl_seconds}".encode()
    sig = hmac.new(settings.jwt_secret.encode(), payload, hashlib.sha256).digest()
    return f"{_b64e(payload)}.{_b64e(sig)}"


def read_email_token(token: str) -> tuple[UUID, str] | None:
    try:
        payload_b64, sig_b64 = token.split(".")
        payload = _b64d(payload_b64)
        expected = hmac.new(settings.jwt_secret.encode(), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64d(sig_b64)):
            return None
        user_id_raw, email, exp_raw = payload.decode().rsplit(":", 2)
        if int(exp_raw) < time.time():
            return None
        return UUID(user_id_raw), email
    except Exception:
        return None
