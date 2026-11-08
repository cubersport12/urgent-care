from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.api.v1 import notifications, support


@pytest.mark.parametrize(
    'module,path', [(notifications, '/notifications/ws'), (support, '/support/ws')]
)
def test_websocket_replies_to_keepalive(monkeypatch, module, path):
    app = FastAPI()
    app.include_router(module.router)
    monkeypatch.setattr(
        module,
        'get_websocket_session_user',
        AsyncMock(return_value=(uuid4(), 'user')),
    )
    with TestClient(app) as client:
        with client.websocket_connect(path) as socket:
            socket.send_text('{"type":"auth","sessionId":"test"}')
            socket.send_text('ping')
            assert socket.receive_text() == 'pong'


@pytest.mark.parametrize(
    'module,path', [(notifications, '/notifications/ws'), (support, '/support/ws')]
)
def test_websocket_requires_auth_frame(monkeypatch, module, path):
    app = FastAPI()
    app.include_router(module.router)
    with TestClient(app) as client:
        with client.websocket_connect(path) as socket:
            socket.send_text('ping')
            with pytest.raises(WebSocketDisconnect) as disconnect:
                socket.receive_text()
            assert disconnect.value.code == 4401
