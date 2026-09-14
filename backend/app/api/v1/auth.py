"""Authentication endpoints. Авторизация — только по session id (X-Session-Id)."""
import mimetypes
from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.db.repositories.password_reset import PasswordResetRepository
from app.db.repositories.user import UserRepository
from app.models.auth_session import AuthSession
from app.models.city import City
from app.models.user import User
from app.schemas.auth import (
    DeleteAccount,
    ForgotPassword,
    LoginJson,
    ResetPassword,
    SessionCreated,
    SessionLogout,
    SessionOut,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.utils.email import send_email
from app.utils.s3 import get_s3_client

router = APIRouter(prefix="/auth", tags=["auth"])

AVATAR_MAX_BYTES = 5 * 1024 * 1024


async def _require_city(db: AsyncSession, city_id) -> None:
    if city_id is None:
        return
    city = await db.get(City, city_id)
    if not city:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown city")


async def _issue_session(user: User, db: AsyncSession, device_name: str | None) -> SessionCreated:
    """Одна активная сессия: новый логин закрывает остальные (история сохраняется)."""
    await db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user.id, AuthSession.ended_at.is_(None))
        .values(ended_at=datetime.now(timezone.utc))
    )
    name = (device_name or "").strip()[:200]
    session = AuthSession(
        id=uuid4(),
        user_id=user.id,
        device_name=name or None,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.session_ttl_days),
    )
    db.add(session)
    await db.flush()
    return SessionCreated(session_id=session.id, user=UserOut.model_validate(user))


@router.post("/register", response_model=SessionCreated, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SessionCreated:
    repo = UserRepository(db)
    existing = await repo.get_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    await _require_city(db, payload.city_id)
    role = "admin" if payload.email.lower() == settings.admin_email.lower() else "user"
    user = await repo.create(
        id=uuid4(),
        email=payload.email.lower(),
        full_name="",
        city_id=payload.city_id,
        hashed_password=hash_password(payload.password),
        role=role,
        is_active=True,
        consent_accepted_at=datetime.now(timezone.utc),
    )
    from app.services.billing import BillingService

    await BillingService(db).ensure_subscription(user)
    return await _issue_session(user, db, None)


@router.post("/login/json", response_model=SessionCreated)
async def login_json(
    payload: LoginJson,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SessionCreated:
    """JSON login for mobile/web clients (email + password)."""
    repo = UserRepository(db)
    user = await repo.get_by_email(payload.email.lower())
    if not user or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")
    return await _issue_session(user, db, payload.device_name)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def logout(
    payload: SessionLogout,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Явный разлогин устройства: закрываем сессию по её id."""
    await db.execute(
        update(AuthSession)
        .where(AuthSession.id == payload.session_id, AuthSession.ended_at.is_(None))
        .values(ended_at=datetime.now(timezone.utc))
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[AuthSession]:
    rows = await db.execute(
        select(AuthSession)
        .where(AuthSession.user_id == user.id)
        .order_by(AuthSession.ended_at.is_(None).desc(), AuthSession.last_active_at.desc())
    )
    return list(rows.scalars().all())


@router.get("/me", response_model=UserOut)
async def me(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    from app.services.billing import BillingService

    await BillingService(db).ensure_subscription(user)
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    fields: dict = {}
    if payload.full_name is not None:
        fields["full_name"] = payload.full_name.strip()
    if "city_id" in payload.model_fields_set:
        await _require_city(db, payload.city_id)
        fields["city_id"] = payload.city_id
    if "birth_year" in payload.model_fields_set:
        fields["birth_year"] = payload.birth_year
    if payload.occupation is not None:
        fields["occupation"] = payload.occupation.strip()
    if not fields:
        return user
    # Assign on the loaded instance so the identity map + relationship stay in sync
    # (bulk UPDATE leaves user.city stale → client shows the previous city).
    for key, value in fields.items():
        setattr(user, key, value)
    await db.flush()
    if "city_id" in fields:
        await db.refresh(user, attribute_names=["city"])
    return user


@router.put("/me/avatar", response_model=UserOut)
async def upload_avatar(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> User:
    data = await file.read()
    if len(data) > AVATAR_MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 5 MB)")
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed")
    ext = mimetypes.guess_extension(content_type) or ".jpg"
    key = f"public/avatars/{user.id}/{uuid4().hex}{ext}"
    s3 = get_s3_client()
    await s3.ensure_bucket()
    await s3.upload_bytes(data=data, key=key, content_type=content_type)
    previous = user.avatar_key
    user.avatar_key = key
    await db.flush()
    if previous:
        await s3.delete_file(key=previous)
    return user


@router.delete("/me/avatar", response_model=UserOut)
async def delete_avatar(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    previous = user.avatar_key
    if not previous:
        return user
    user.avatar_key = None
    await db.flush()
    await get_s3_client().delete_file(key=previous)
    return user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_me(
    payload: DeleteAccount,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """152-ФЗ: полное удаление аккаунта и всех связанных данных (каскад по FK)."""
    if not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Wrong password")
    if user.avatar_key:
        await get_s3_client().delete_file(key=user.avatar_key)
    await db.execute(delete(User).where(User.id == user.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
async def forgot_password(
    payload: ForgotPassword,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Always 204 — do not reveal whether the email exists."""
    user = await UserRepository(db).get_by_email(payload.email.lower())
    if user and user.is_active:
        raw = await PasswordResetRepository(db).issue(user.id)
        link = f"{settings.password_reset_url.rstrip('/')}?token={raw}"
        send_email(
            to=user.email,
            subject="Сброс пароля",
            body=f"Перейдите по ссылке, чтобы задать новый пароль:\n\n{link}\n\nСсылка действует 2 часа.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    payload: ResetPassword,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    row = await PasswordResetRepository(db).consume(payload.token)
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user = await UserRepository(db).get(row.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    await UserRepository(db).update(user.id, hashed_password=hash_password(payload.password))
    # Пароль сменён — все активные сессии больше недействительны
    await db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user.id, AuthSession.ended_at.is_(None))
        .values(ended_at=datetime.now(timezone.utc))
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
