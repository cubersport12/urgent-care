"""Authentication endpoints."""
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.repositories.password_reset import PasswordResetRepository
from app.db.repositories.user import UserRepository
from app.models.city import City
from app.models.user import User
from app.schemas.auth import (
    ForgotPassword,
    LoginJson,
    ResetPassword,
    Token,
    TokenRefresh,
    TokenRefreshResponse,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.utils.email import send_email

router = APIRouter(prefix="/auth", tags=["auth"])


async def _require_city(db: AsyncSession, city_id) -> None:
    if city_id is None:
        return
    city = await db.get(City, city_id)
    if not city:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown city")


def _issue_token(user: User) -> Token:
    return Token(
        access_token=create_access_token(subject=str(user.id), role=user.role),  # type: ignore[arg-type]
        refresh_token=create_refresh_token(subject=str(user.id)),
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    repo = UserRepository(db)
    existing = await repo.get_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    await _require_city(db, payload.city_id)
    full_name = payload.full_name or payload.name or ""
    role = "admin" if payload.email.lower() == settings.admin_email.lower() else "user"
    user = await repo.create(
        id=uuid4(),
        email=payload.email.lower(),
        full_name=full_name,
        city_id=payload.city_id,
        hashed_password=hash_password(payload.password),
        role=role,
        is_active=True,
    )
    from app.services.billing import BillingService

    await BillingService(db).ensure_subscription(user)
    return _issue_token(user)


@router.post("/login", response_model=Token)
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    repo = UserRepository(db)
    user = await repo.get_by_email(form.username.lower())
    if not user or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")
    return _issue_token(user)


@router.post("/login/json", response_model=Token)
async def login_json(
    payload: LoginJson,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    """JSON login for mobile/web clients (email + password)."""
    repo = UserRepository(db)
    user = await repo.get_by_email(payload.email.lower())
    if not user or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")
    return _issue_token(user)


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh(
    payload: TokenRefresh,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenRefreshResponse:
    data = decode_token(payload.refresh_token)
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Wrong token type")
    from uuid import UUID

    user = await UserRepository(db).get(UUID(data["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return TokenRefreshResponse(
        access_token=create_access_token(subject=str(user.id), role=user.role),  # type: ignore[arg-type]
        expires_in=settings.access_token_expire_minutes * 60,
    )


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
    return Response(status_code=status.HTTP_204_NO_CONTENT)
