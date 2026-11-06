"""Check FCM authentication and delivery accounting without external requests."""
import json

import httpx
import pytest

from app.services import fcm_push


@pytest.mark.asyncio
async def test_fcm_send_and_errors(monkeypatch):
    monkeypatch.setattr(fcm_push.settings, "fcm_service_account_json", json.dumps({
        "client_email": "test@example.com", "private_key": "key", "project_id": "test-project",
    }))
    monkeypatch.setattr(fcm_push.jwt, "encode", lambda *args, **kwargs: "signed-assertion")
    requests = []

    def handle(request):
        requests.append(request)
        if request.url.host == "oauth2.googleapis.com":
            return httpx.Response(200, json={"access_token": "test-access-token"})
        if len(requests) == 2:
            return httpx.Response(200, json={"name": "messages/1"})
        return httpx.Response(400, json={"error": {"status": "INVALID_ARGUMENT"}})

    async_client = httpx.AsyncClient
    monkeypatch.setattr(fcm_push.httpx, "AsyncClient", lambda **kwargs: async_client(
        transport=httpx.MockTransport(handle), verify=False, trust_env=False, **kwargs
    ))
    messages = [
        {"token": "device1", "notification": {"title": "Hello", "body": "World"}},
        {"token": "device2", "notification": {"title": "Hello", "body": "World"}},
    ]
    assert await fcm_push.send_fcm_push(messages) == (1, 1, False)
    assert requests[1].url.path == "/v1/projects/test-project/messages:send"
    assert requests[1].headers["Authorization"] == "Bearer test-access-token"
    assert json.loads(requests[1].content)["message"] == messages[0]


@pytest.mark.asyncio
async def test_missing_fcm_credentials(monkeypatch):
    monkeypatch.setattr(fcm_push.settings, "fcm_service_account_json", "")
    assert await fcm_push.send_fcm_push([{"token": "device"}]) == (0, 1, False)
