"""Промокоды: валидация схем и расчёт скидки (без БД).

Запуск: .venv/Scripts/python -m pytest tests/ -q
"""
import pytest
from pydantic import ValidationError

from app.schemas.billing import PromoCodeCreate
from app.services.billing import discounted_price, normalize_promo_code


def test_percent_bounds():
    assert PromoCodeCreate(code="x", discountPercent=1).discount_percent == 1
    assert PromoCodeCreate(code="x", discountPercent=99).discount_percent == 99
    with pytest.raises(ValidationError):
        PromoCodeCreate(code="x", discountPercent=0)
    with pytest.raises(ValidationError):
        PromoCodeCreate(code="x", discountPercent=100)


def test_defaults():
    p = PromoCodeCreate(code="X")
    assert p.type == "discount"
    assert p.is_active is True
    assert p.tariff_id is None
    assert p.max_activations is None


def test_normalize_code():
    assert normalize_promo_code(" ab-12 ") == "AB-12"
    assert normalize_promo_code("") == ""


def test_discounted_price():
    assert discounted_price(1000, 50) == 500.0
    assert discounted_price(999, 33) == 669.33
    assert discounted_price(100, 99) == 1.0  # минимум 1 ₽
    assert discounted_price(30, 99) == 1.0
