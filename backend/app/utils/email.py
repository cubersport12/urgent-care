"""Minimal SMTP helper. No-op when SMTP_HOST is empty."""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from typing import Literal

from app.core.config import settings

log = logging.getLogger(__name__)

EmailAccount = Literal["noreply", "support"]


def _smtp_account(account: EmailAccount) -> tuple[str, str, str]:
    """(From, user, password). Аккаунт support без своих кредов падает на базовый SMTP."""
    if account == "support" and (settings.support_smtp_user or settings.support_smtp_from):
        return (
            settings.support_smtp_from or settings.support_smtp_user,
            settings.support_smtp_user,
            settings.support_smtp_password,
        )
    return (
        settings.smtp_from or settings.smtp_user or "noreply@localhost",
        settings.smtp_user,
        settings.smtp_password,
    )


def send_email(*, to: str, subject: str, body: str, account: EmailAccount = "noreply") -> bool:
    host = (settings.smtp_host or "").strip()
    if not host:
        log.warning("SMTP_HOST empty — email not sent to %s: %s", to, subject)
        return False

    from_addr, user, password = _smtp_account(account)
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.set_content(body)

    port = settings.smtp_port
    if settings.smtp_tls:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            smtp.starttls()
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)
    return True


def send_email_safe(*, to: str, subject: str, body: str, account: EmailAccount = "noreply") -> None:
    """Обёртка для BackgroundTasks: ошибка SMTP логируется, но не роняет ответ."""
    try:
        send_email(to=to, subject=subject, body=body, account=account)
    except Exception:
        log.exception("email_send_failed account=%s to=%s subject=%s", account, to, subject)
