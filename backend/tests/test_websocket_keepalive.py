from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.api.v1 import notifications, support


@pytest.mark.parametrize('module,path', [(notifications, '/notifications/ws'), (support, '/support/ws')])
def test_websocket_replies_to_keepalive(monkeypatch, module, path):
    app = FastAPI()
    app.include_router(module.router)
    app.dependency_overrides[get_db] = lambda: object()
    monkeypatch.setattr(module, 'get_user_by_session', AsyncMock(return_value=SimpleNamespace(id=uuid4(), role='user')))
    with TestClient(app) as client:
        with client.websocket_connect(f'{path}?session_id=test') as socket:
            socket.send_text('ping')
            assert socket.receive_text() == 'pong'
