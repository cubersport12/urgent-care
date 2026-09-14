"""Self-check: session-only auth (X-Session-Id), single session, profile, deletion.

Run from backend/: PYTHONPATH=. python scripts/_selfcheck_auth_015.py
Uses the real local DB via ASGITransport; cleans up after itself.
"""
import asyncio

from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.main import app  # noqa: E402

BASE = "http://test/api/v1"
EMAIL = "probe.session2.20260912@gmail.com"
PASSWORD = "Probe#12345"


async def main() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE) as c:
        # 1. register: только session_id + user, никакого access_token
        r = await c.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})
        assert r.status_code == 201, r.text
        body = r.json()
        assert set(body.keys()) == {"session_id", "user"}, body.keys()
        sid1 = body["session_id"]
        print("1. register returns session_id+user only")

        h1 = {"X-Session-Id": sid1}
        # 2. запросы с заголовком работают, без заголовка — 401
        r = await c.get("/auth/me", headers=h1)
        assert r.status_code == 200, r.text
        r = await c.get("/auth/me")
        assert r.status_code == 401
        r = await c.get("/auth/me", headers={"X-Session-Id": "not-a-uuid"})
        assert r.status_code == 401
        print("2. X-Session-Id auth ok, missing/garbage -> 401")

        # 3. второй логин убивает первую сессию
        r = await c.post("/auth/login/json", json={"email": EMAIL, "password": PASSWORD, "device_name": "d2"})
        sid2 = r.json()["session_id"]
        h2 = {"X-Session-Id": sid2}
        r = await c.get("/auth/me", headers=h1)
        assert r.status_code == 401, "old session still alive"
        r = await c.get("/auth/me", headers=h2)
        assert r.status_code == 200
        print("3. single-session limit enforced")

        # 4. refresh-эндпойнт удалён
        r = await c.post("/auth/refresh", json={"session_id": sid2})
        assert r.status_code == 404, r.status_code
        print("4. /auth/refresh gone (404)")

        # 5. профиль и список сессий: история сохраняется — 2 строки, активна одна
        r = await c.patch("/auth/me", headers=h2, json={"birth_year": 1990, "occupation": "врач"})
        assert r.status_code == 200 and r.json()["occupation"] == "врач"
        r = await c.get("/auth/sessions", headers=h2)
        assert r.status_code == 200, r.text
        sessions = r.json()
        assert len(sessions) == 2, sessions
        active = [x for x in sessions if x["ended_at"] is None]
        ended = [x for x in sessions if x["ended_at"] is not None]
        assert len(active) == 1 and active[0]["device_name"] == "d2"
        assert len(ended) == 1
        print("5. profile + session history ok (2 rows, 1 active)")

        # 6. logout закрывает сессию, но строка остаётся в истории
        r = await c.post("/auth/logout", json={"session_id": sid2})
        assert r.status_code == 204
        r = await c.get("/auth/me", headers=h2)
        assert r.status_code == 401
        r = await c.get("/auth/sessions", headers=h2)
        assert r.status_code == 401, "closed session must not authorize"
        print("6. logout ok (history kept)")

        # 7. удаление аккаунта с паролем
        r = await c.post("/auth/login/json", json={"email": EMAIL, "password": PASSWORD})
        sid3 = r.json()["session_id"]
        h3 = {"X-Session-Id": sid3}
        r = await c.request("DELETE", "/auth/me", headers=h3, json={"password": "wrong"})
        assert r.status_code == 403
        r = await c.request("DELETE", "/auth/me", headers=h3, json={"password": PASSWORD})
        assert r.status_code == 204, r.text
        r = await c.post("/auth/login/json", json={"email": EMAIL, "password": PASSWORD})
        assert r.status_code == 401
        print("7. account deleted")

    from sqlalchemy import text

    from app.db.base import engine

    async with engine.begin() as conn:
        n = (await conn.execute(text("SELECT count(*) FROM users WHERE email = :e"), {"e": EMAIL})).scalar()
        assert n == 0
    await engine.dispose()
    print("8. DB clean")
    print("ALL SESSION-ONLY CHECKS PASSED")


asyncio.run(main())
