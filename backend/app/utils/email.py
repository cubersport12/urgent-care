"""Minimal SMTP helper. No-op when SMTP_HOST is empty."""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

log = logging.getLogger(__name__)


def send_email(*, to: str, subject: str, body: str) -> bool:
    host = (settings.smtp_host or "").strip()
    if not host:
        log.warning("SMTP_HOST empty — email not sent to %s: %s", to, subject)
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from or settings.smtp_user or "noreply@localhost"
    msg["To"] = to
    msg.set_content(body)

    port = settings.smtp_port
    if settings.smtp_tls:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
    return True
