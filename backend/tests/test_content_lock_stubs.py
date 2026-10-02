"""Замки контента: стаб заблокированного элемента не отдаёт содержимое.

Запуск: .venv/Scripts/python -m pytest tests/ -q
"""
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.api.v1._content_access import content_out
from app.schemas import content as cs


def _item(**over):
    data = {
        "id": "t1",
        "name": "Тест",
        "order": 1,
        "parent_id": "f1",
        "min_score": 5,
        "questions": [{"q": "secret"}],
        "required_tariff_id": uuid4(),
        "required_reward_id": None,
    }
    data.update(over)
    return SimpleNamespace(**data)


def test_unlocked_full_dto():
    out = content_out(_item(), cs.TestOut, None)
    assert out.is_locked is False
    assert out.locked_by is None
    assert out.questions == [{"q": "secret"}]


def test_locked_test_stub_hides_questions():
    item = _item()
    out = content_out(item, cs.TestOut, "tariff")
    assert out.is_locked is True
    assert out.locked_by == "tariff"
    assert out.questions is None
    assert out.name == "Тест"
    assert str(out.required_tariff_id) == str(item.required_tariff_id)


def test_locked_article_stub_hides_links():
    item = _item(id="a1", links_to_articles=[{"key": "k", "articleId": "x"}])
    out = content_out(item, cs.ArticleOut, "reward")
    assert out.is_locked is True
    assert out.locked_by == "reward"
    assert out.links_to_articles is None


def test_locked_rescue_stub_hides_data_keeps_created_at():
    created = datetime(2026, 1, 1, tzinfo=timezone.utc)
    item = _item(id="r1", created_at=created, data={"scenes": [{"secret": 1}]})
    out = content_out(item, cs.RescueOut, "tariff")
    assert out.is_locked is True
    assert out.created_at == created
    assert out.data is None
