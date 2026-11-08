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
        with client.websocket_connect('/training/random/ws?difficulty=medium') as ws:
            ws.send_json({"type": "auth", "sessionId": "x"})
            assert ws.receive_json() == {"type": "insufficient", "available": 5}
        with client.websocket_connect('/training/random/ws?difficulty=easy') as ws:
            ws.send_json({"type": "auth", "sessionId": "x"})
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
        with client.websocket_connect('/training/random/ws?difficulty=easy') as ws:
            ws.send_json({"type": "auth", "sessionId": "x"})
            ws.receive_json()
    assert error.value.code == 4401


@pytest.mark.asyncio
async def test_marathon_selection_and_completion(monkeypatch):
    user = SimpleNamespace(id=uuid4(), role="user")
    visible = SimpleNamespace(id="visible", name="Visible", hidden=False,
                              questions=[question(i) for i in range(25)])
    locked = SimpleNamespace(id="locked", name="Locked", hidden=False, questions=[question(100)])
    db = SimpleNamespace(execute=AsyncMock(), commit=AsyncMock(), flush=AsyncMock(), add=lambda row: setattr(db, "row", row))
    db.scalar = AsyncMock(side_effect=lambda _statement: db.row)
    db.scalars = AsyncMock(side_effect=lambda _statement: SimpleNamespace(all=lambda: [db.row]))
    monkeypatch.setattr(training, "get_user_by_session", AsyncMock(return_value=user))
    monkeypatch.setattr(training.TestRepository, "list_all", AsyncMock(return_value=[visible, locked]))
    monkeypatch.setattr(training, "annotate_content_list", AsyncMock(return_value=[(visible, None), (locked, "tariff")]))
    events = []
    async def send(event):
        events.append(event)
    ws = SimpleNamespace(
        accept=AsyncMock(),
        close=AsyncMock(),
        send_json=send,
        receive_text=AsyncMock(return_value='{"type":"auth","sessionId":"x"}'),
    )
    await training.random_training_ws(ws, db, "marathon")
    ready = events[-1]
    assert all(event['total'] == 25 for event in events[:-1])
    assert len({q['questionText'] for q in ready['questions']}) == 25
    questions = ready['questions']
    def answer(index, choice):
        return {"questionId": questions[index]["id"], "answerIds": [choice]}
    def payload(answers):
        return training.RandomCompletion(answers=answers)
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as error:
        await training.complete_random_training(db.row.id, payload([answer(1, 0)]), db, user)
    assert error.value.status_code == 422
    with pytest.raises(HTTPException) as error:
        await training.complete_random_training(db.row.id, payload([answer(0, 1), answer(1, 0)]), db, user)
    assert error.value.status_code == 422
    await training.complete_random_training(db.row.id, payload([answer(i, 0) for i in range(21)] + [answer(21, 1)]), db, user)
    history = (await training.random_training_history(db, user))[0]
    assert history['correct'] == 21
    assert history['total'] == 25
    assert len(history['items']) == 22
    await training.complete_random_training(db.row.id, payload([]), db, user)


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
        f'/training/random/ws?difficulty={difficulty}'
    ) as ws:
        ws.send_json({"type": "auth", "sessionId": "x"})
        events = [ws.receive_json() for _ in range(count)]
        ready = ws.receive_json()
    assert [event["count"] for event in events] == list(range(1, count + 1))
    assert len(ready["questions"]) == count
    assert len({q["questionText"] for q in ready["questions"]}) == count
