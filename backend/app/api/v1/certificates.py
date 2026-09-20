"""Сертификаты: выдача (admin), список, свои сертификаты, публичная проверка (QR)."""
import logging
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.models.certificate import Certificate
from app.models.user import User
from app.schemas.certificates import (
    CertificateIssueRequest,
    CertificateOut,
    CertificateVerifyOut,
)
from app.services.certificates import issue_certificate
from app.utils.email import send_email_safe

router = APIRouter(prefix="/certificates", tags=["certificates"])
log = logging.getLogger(__name__)


async def _email_certificate(
    to: str, number: int, year: int, full_name: str, file_key: str
) -> None:
    """BackgroundTasks: письмо пользователю с его сертификатом во вложении."""
    try:
        from app.core.config import settings
        from app.utils.s3 import get_s3_client

        label = f"TD-{year}-{number:06d}"
        data, _ct = await get_s3_client().get_object(key=file_key)
        send_email_safe(
            to=to,
            subject=f"Ваш сертификат {label} — Trouble Dent",
            body=(
                f"{full_name}, поздравляем!\n\n"
                f"Ваш сертификат {label} — во вложении.\n\n"
                f"Проверить подлинность: "
                f"{settings.api_public_base_url.rstrip('/')}/api/v1/certificates/{number}"
            ),
            attachment=(f"{label}.png", data, "image/png"),
        )
    except Exception:
        log.exception("certificate_email_failed number=%s to=%s", number, to)


@router.post("", response_model=CertificateOut, status_code=status.HTTP_201_CREATED)
async def issue(
    payload: CertificateIssueRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> Certificate:
    user = await db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    cert, delivered = await issue_certificate(db, user, payload.display_name)
    if delivered and user.email:
        background_tasks.add_task(
            _email_certificate,
            user.email,
            cert.number,
            cert.issued_at.year if cert.issued_at else datetime.now(timezone.utc).year,
            cert.full_name,
            cert.file_path,
        )
    return cert


@router.get("", response_model=list[CertificateOut])
async def list_certificates(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> list[Certificate]:
    rows = await db.execute(
        select(Certificate).order_by(Certificate.number.desc()).limit(500)
    )
    return list(rows.scalars().all())


@router.get("/my", response_model=list[CertificateOut])
async def list_my_certificates(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[Certificate]:
    rows = await db.execute(
        select(Certificate)
        .where(Certificate.user_id == user.id)
        .order_by(Certificate.number.desc())
    )
    return list(rows.scalars().all())


@router.get("/{number}", response_model=CertificateVerifyOut)
async def verify_certificate(
    number: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CertificateVerifyOut:
    """Публичная проверка подлинности — цель QR-кода на сертификате."""
    row = (
        await db.execute(select(Certificate).where(Certificate.number == number))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")
    return CertificateVerifyOut.model_validate(row)
