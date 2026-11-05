"""End-to-end checks for an isolated campaign test server."""
import os
import time
from uuid import uuid4

import httpx
import pytest


@pytest.mark.skipif(not os.environ.get("TEST_NOTIFICATION_API_BASE"), reason="test server is not running")
def test_campaign_http_flow():
    base_url = os.environ["TEST_NOTIFICATION_API_BASE"]
    assert base_url == "http://127.0.0.1:8100"
    with httpx.Client(base_url=base_url, timeout=10) as client:
        assert client.get("/api/v1/admin/notifications/history").status_code == 401
        login = client.post("/api/v1/auth/login/constructor", json={
            "email": "codex-test@example.com", "password": "local-notification-test",
            "device_name": "Campaign integration test",
        })
        assert login.status_code == 200
        client.headers["X-Session-Id"] = login.json()["session_id"]
        payload = {"name": "Проверка", "title": "Тест", "body": "Привет, {{name}}",
                   "audience": "selected", "user_ids": ["a05a8a4c-00cb-4845-b5c8-6ccc7f8287e0"],
                   "cron": "0 9 * * *"}
        template = client.post("/api/v1/admin/notifications/templates", json=payload)
        assert template.status_code == 201
        payload["template_id"] = template.json()["id"]
        schedule = client.post("/api/v1/admin/notifications/schedules", json=payload)
        assert schedule.status_code == 201
        key = str(uuid4())
        sent = client.post("/api/v1/admin/notifications/send", json=payload, headers={"Idempotency-Key": key})
        assert sent.status_code == 201
        assert sent.json()["recipient_count"] == 1
        duplicate = client.post("/api/v1/admin/notifications/send", json=payload, headers={"Idempotency-Key": key})
        assert duplicate.json()["id"] == sent.json()["id"]
        for _ in range(30):
            history = client.get("/api/v1/admin/notifications/history").json()
            row = next(item for item in history if item["id"] == sent.json()["id"])
            if row["status"] not in ("pending", "processing"):
                break
            time.sleep(0.2)
        assert row["status"] == "completed"
        inbox = client.get("/api/v1/notifications").json()
        assert any(item["body"] == "Привет, Тестовый администратор" for item in inbox)
        repeated = client.post(f"/api/v1/admin/notifications/history/{row['id']}/repeat", headers={"Idempotency-Key": str(uuid4())})
        assert repeated.status_code == 201
        assert repeated.json()["recipient_count"] == 1
        deleted = client.delete(f"/api/v1/admin/notifications/templates/{template.json()['id']}")
        assert deleted.status_code == 204
        schedules = client.get("/api/v1/admin/notifications/schedules").json()
        assert any(item["id"] == schedule.json()["id"] and item["snapshot"]["title"] == "Тест" for item in schedules)
        assert client.post(f"/api/v1/admin/notifications/schedules/{schedule.json()['id']}/stop").status_code == 200
