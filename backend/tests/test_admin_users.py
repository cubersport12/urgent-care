"""Tests for admin user management endpoints (create/update/delete)."""
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.api.v1.users import admin_create_user, admin_delete_user, admin_update_user
from app.models.user import User
from app.schemas.users import UserAdminCreate, UserAdminUpdate


def _db() -> AsyncMock:
    return AsyncMock()


def _admin() -> MagicMock:
    admin = MagicMock(spec=User)
    admin.id = uuid.uuid4()
    admin.role = "admin"
    return admin


@pytest.mark.asyncio
async def test_create_user_with_password_hashes_it_and_skips_email():
    db = _db()
    db.scalar.return_value = None  # email свободен
    created_user = MagicMock(spec=User)
    created_user.email = "new@example.com"
    create_mock = AsyncMock(return_value=created_user)

    with (
        patch("app.db.repositories.base.BaseRepository.create", new=create_mock),
        patch("app.services.billing.BillingService.ensure_subscription", new=AsyncMock()),
        patch("app.api.v1.users.send_email_safe") as send_email,
    ):
        res = await admin_create_user(
            UserAdminCreate(email="new@example.com", fullName="Иван Иванов", password="secret1"),
            MagicMock(),
            db,
            _admin(),
        )

    assert res.success is True
    kwargs = create_mock.call_args.kwargs
    assert kwargs["hashed_password"].startswith("$2b")
    assert kwargs["email_verified"] is True
    assert kwargs["role"] == "user"
    send_email.assert_not_called()


@pytest.mark.asyncio
async def test_create_user_without_password_issues_reset_link_email():
    db = _db()
    db.scalar.return_value = None
    created_user = MagicMock(spec=User)
    created_user.email = "new@example.com"
    created_user.full_name = "Иван Иванов"
    bg = MagicMock()

    with (
        patch("app.db.repositories.base.BaseRepository.create", new=AsyncMock(return_value=created_user)),
        patch("app.services.billing.BillingService.ensure_subscription", new=AsyncMock()),
        patch("app.api.v1.users.PasswordResetRepository") as reset_repo,
        patch("app.api.v1.users.send_email_safe") as send_email,
    ):
        reset_repo.return_value.issue = AsyncMock(return_value="raw-token")
        res = await admin_create_user(
            UserAdminCreate(email="new@example.com", fullName="Иван Иванов"),
            bg,
            db,
            _admin(),
        )

    assert res.message == "Пользователь создан. Ссылка для установки пароля отправлена на email"
    reset_repo.return_value.issue.assert_awaited_once()
    bg.add_task.assert_called_once()
    body = bg.add_task.call_args.kwargs["body"]
    assert "token=raw-token" in body


@pytest.mark.asyncio
async def test_create_user_conflict_on_existing_email():
    db = _db()
    db.scalar.return_value = uuid.uuid4()
    with pytest.raises(HTTPException) as exc:
        await admin_create_user(
            UserAdminCreate(email="busy@example.com", fullName="Кто-то"),
            MagicMock(),
            db,
            _admin(),
        )
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_update_user_applies_fields():
    db = _db()
    user_id = uuid.uuid4()
    user = MagicMock(spec=User)
    user.id = user_id
    user.role = "user"
    db.get.return_value = user

    res = await admin_update_user(
        user_id,
        UserAdminUpdate(fullName="Пётр Петров", role="admin", occupation="Врач", birthYear=1990),
        db,
        _admin(),
    )

    assert res.success is True
    assert user.full_name == "Пётр Петров"
    assert user.role == "admin"
    assert user.occupation == "Врач"
    assert user.birth_year == 1990


@pytest.mark.asyncio
async def test_update_user_cannot_change_own_role():
    db = _db()
    admin = _admin()
    user = MagicMock(spec=User)
    user.id = admin.id
    user.role = "admin"
    db.get.return_value = user

    with pytest.raises(HTTPException) as exc:
        await admin_update_user(admin.id, UserAdminUpdate(role="user"), db, admin)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_delete_user_cannot_delete_self():
    db = _db()
    admin = _admin()
    with pytest.raises(HTTPException) as exc:
        await admin_delete_user(admin.id, db, admin)
    assert exc.value.status_code == 400
    db.get.assert_not_called()


@pytest.mark.asyncio
async def test_delete_user_removes_avatar_and_cascades():
    db = _db()
    user_id = uuid.uuid4()
    user = MagicMock(spec=User)
    user.id = user_id
    user.avatar_key = "public/avatars/x.png"
    db.get.return_value = user

    with patch("app.api.v1.users.get_s3_client") as s3:
        s3.return_value.delete_file = AsyncMock()
        res = await admin_delete_user(user_id, db, _admin())

    assert res.status_code == 204
    s3.return_value.delete_file.assert_awaited_once_with(key="public/avatars/x.png")
    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()
