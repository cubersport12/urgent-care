"""Самопроверка stateless email-токена и хелперов кода входа (без БД).

Запуск: .venv/Scripts/python -m pytest tests/ -q
"""
from uuid import uuid4

from app.core.security import make_email_token, read_email_token
from app.db.repositories.login_code import hash_code, new_code


def test_roundtrip_normalizes_email():
    uid = uuid4()
    token = make_email_token(uid, "User@Example.com", 3600)
    assert read_email_token(token) == (uid, "user@example.com")


def test_expired_token_is_rejected():
    token = make_email_token(uuid4(), "a@example.com", -1)
    assert read_email_token(token) is None


def test_tampered_payload_is_rejected():
    token = make_email_token(uuid4(), "a@example.com", 3600)
    payload, sig = token.split(".")
    assert read_email_token(f"{payload[:-2]}xx.{sig}") is None


def test_tampered_signature_is_rejected():
    token = make_email_token(uuid4(), "a@example.com", 3600)
    forged = token[:-1] + ("A" if token[-1] != "A" else "B")
    assert read_email_token(forged) is None


def test_garbage_tokens_are_rejected():
    assert read_email_token("") is None
    assert read_email_token("not-a-token") is None
    assert read_email_token("aaaa.bbbb") is None


def test_login_code_format_and_hash():
    code = new_code()
    assert len(code) == 6 and code.isdigit()
    assert hash_code(code) == hash_code(code)
    assert hash_code(code) != hash_code("000000" if code != "000000" else "000001")


def test_smtp_account_fallback(monkeypatch):
    """Аккаунт support без своих кредов слает через базовый SMTP-аккаунт."""
    from app.core.config import settings
    from app.utils.email import _smtp_account

    monkeypatch.setattr(settings, "support_smtp_user", "")
    monkeypatch.setattr(settings, "support_smtp_from", "")
    monkeypatch.setattr(settings, "smtp_user", "noreply@x.ru")
    monkeypatch.setattr(settings, "smtp_from", "noreply@x.ru")
    monkeypatch.setattr(settings, "smtp_password", "base")
    assert _smtp_account("support") == _smtp_account("noreply") == ("noreply@x.ru", "noreply@x.ru", "base")

    monkeypatch.setattr(settings, "support_smtp_user", "support@x.ru")
    monkeypatch.setattr(settings, "support_smtp_from", "support@x.ru")
    monkeypatch.setattr(settings, "support_smtp_password", "sup")
    assert _smtp_account("support") == ("support@x.ru", "support@x.ru", "sup")
    assert _smtp_account("noreply") == ("noreply@x.ru", "noreply@x.ru", "base")
