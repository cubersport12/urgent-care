"""Пара «тариф+дни» в награде: валидация схемы (без БД).

Запуск: .venv/Scripts/python -m pytest tests/ -q
"""
import uuid

import pytest
from pydantic import ValidationError

from app.schemas.achievements import RewardCreate

_AID = str(uuid.uuid4())
_TID = str(uuid.uuid4())


def _base(**over):
    data = {"achievementIds": [_AID], "title": "Награда"}
    data.update(over)
    return data


def test_pair_both_is_ok():
    r = RewardCreate(**_base(subscriptionTariffId=_TID, subscriptionDays=30))
    assert str(r.subscription_tariff_id) == _TID
    assert r.subscription_days == 30


def test_pair_neither_is_ok():
    r = RewardCreate(**_base())
    assert r.subscription_tariff_id is None
    assert r.subscription_days is None


def test_tariff_without_days_rejected():
    with pytest.raises(ValidationError):
        RewardCreate(**_base(subscriptionTariffId=_TID))


def test_days_without_tariff_rejected():
    with pytest.raises(ValidationError):
        RewardCreate(**_base(subscriptionDays=30))


def test_days_bounds():
    with pytest.raises(ValidationError):
        RewardCreate(**_base(subscriptionTariffId=_TID, subscriptionDays=0))
    with pytest.raises(ValidationError):
        RewardCreate(**_base(subscriptionTariffId=_TID, subscriptionDays=3651))
