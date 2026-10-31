from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_current_user, get_db
from app.api.v1 import training


def question(index, **extra):
    return {"id": str(index), "questionText": str(index), "answers": [
        {"answerText": "yes", "isCorrect": True}, {"answerText": "no", "isCorrect": False},
    ], **extra}


def test_selection_completion_and_history(monkeypatch):
    user = SimpleNamespace(id=uuid4(), role="user")
    visible = SimpleNamespace(id="visible", name="Visible", hidden=False,
                              questions=[question(i) for i in range(5)] + [question(20, activationCondition={"kind": "CompleteQuestion"})])
    locked = SimpleNamespace(id="locked", name="Locked", hidden=False, questions=[question(i) for i in range(20)])
    tests = [visible, locked]
    db = SimpleNamespace(execute=AsyncMock(), commit=AsyncMock(), flush=AsyncMock(), add=lambda row: setattr(db, "row", row))
    db.scalar = AsyncMock(side_effect=lambda _statement: db.row)
    db.scalars = AsyncMock(side_effect=lambda _statement: SimpleNamespace(all=lambda: [db.row]))
    monkeypatch.setattr(training, "get_user_by_session", AsyncMock(return_value=user))
    monkeypatch.setattr(training.TestRepository, "list_all", AsyncMock(return_value=tests))
    monkeypatch.setattr(training, "annotate_content_list", AsyncMock(side_effect=lambda _db, _user, items, **_kwargs: [(t, "tariff" if t.id == "locked" else None) for t in items]))
    app = FastAPI()
    app.include_router(training.router)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    with TestClient(app) as client:
        with client.websocket_connect('/training/random/ws?session_id=x&difficulty=medium') as ws:
            assert ws.receive_json() == {"type": "insufficient", "available": 5}
        with client.websocket_connect('/training/random/ws?session_id=x&difficulty=easy') as ws:
            progress = [ws.receive_json() for _ in range(5)]
            ready = ws.receive_json()
        assert all(event["testName"] == "Visible" for event in progress)
        assert ready["type"] == "ready"
        assert len({q["id"] for q in ready["questions"]}) == 5
        invalid = client.post(f'/training/random/{ready["id"]}/complete', json={"answers": [
            {"questionId": ready["questions"][0]["id"], "answerIds": [99]},
        ]})
        assert invalid.status_code == 422
        assert db.row.completed_at is None
        response = client.post(f'/training/random/{ready["id"]}/complete', json={"answers": [
            {"questionId": ready["questions"][0]["id"], "answerIds": [0]},
            {"questionId": ready["questions"][1]["id"], "answerIds": [1]},
        ]})
        assert response.status_code == 200
        assert sum(a["isCorrect"] for a in db.row.answers) == 1
        history = client.get('/training/random/history').json()
        assert history[0]["correct"] == 1
        assert history[0]["items"][0]["question"] is not None
        visible.hidden = True
        history = client.get('/training/random/history').json()
        assert all(item["question"] is None for item in history[0]["items"])


def test_selection_rejects_invalid_session(monkeypatch):
    monkeypatch.setattr(training, "get_user_by_session", AsyncMock(return_value=None))
    app = FastAPI()
    app.include_router(training.router)
    app.dependency_overrides[get_db] = lambda: object()
    from starlette.websockets import WebSocketDisconnect

    with TestClient(app) as client, pytest.raises(WebSocketDisconnect) as error:
        with client.websocket_connect('/training/random/ws?session_id=x&difficulty=easy'):
            pass
    assert error.value.code == 4401


@pytest.mark.parametrize("difficulty,count", [("easy", 5), ("medium", 10), ("hard", 20)])
def test_selection_counts(monkeypatch, difficulty, count):
    user = SimpleNamespace(id=uuid4(), role="user")
    test = SimpleNamespace(id="test", name="Test", hidden=False, questions=[question(i) for i in range(20)])
    db = SimpleNamespace(execute=AsyncMock(), commit=AsyncMock(), add=lambda row: None)
    monkeypatch.setattr(training, "get_user_by_session", AsyncMock(return_value=user))
    monkeypatch.setattr(training.TestRepository, "list_all", AsyncMock(return_value=[test]))
    monkeypatch.setattr(training, "annotate_content_list", AsyncMock(return_value=[(test, None)]))
    app = FastAPI()
    app.include_router(training.router)
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as client, client.websocket_connect(
        f'/training/random/ws?session_id=x&difficulty={difficulty}'
    ) as ws:
        events = [ws.receive_json() for _ in range(count)]
        ready = ws.receive_json()
    assert [event["count"] for event in events] == list(range(1, count + 1))
    assert len(ready["questions"]) == count
    assert len({q["questionText"] for q in ready["questions"]}) == count
