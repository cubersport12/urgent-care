"""In-process проверка выдачи сертификатов: генерация, идемпотентность, WS, письмо.

Запуск: .venv/Scripts/python scripts/check_certificates.py
Реально пишет в S3, если MinIO поднят; иначе перехватывает upload (ponytail: путь
upload_bytes общий с media и проверяется на реальной выдаче).
"""
import asyncio

from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select, text

from app.db.base import AsyncSessionLocal
from app.db.repositories.user import UserRepository
from app.main import app
from app.models.certificate import Certificate
from app.models.user import User
from app.realtime.notifications_hub import notification_hub


class CaptureS3:
    def __init__(self):
        self.uploads: list[tuple[str, bytes]] = []

    async def ensure_bucket(self):
        pass

    async def upload_bytes(self, *, data: bytes, key: str, content_type: str):
        self.uploads.append((key, data))

    async def get_object(self, key: str):
        for k, data in reversed(self.uploads):
            if k == key:
                return data, "image/png"
        raise FileNotFoundError(key)

    async def delete_file(self, key: str):
        return True


class FakeWS:
    def __init__(self):
        self.sent = []

    async def accept(self):
        pass

    async def send_json(self, data):
        self.sent.append(data)


async def main() -> None:
    async with AsyncSessionLocal() as s:
        user = await UserRepository(s).get_by_email("cubersport123455+e2e@yandex.ru")
        assert user, "probe-пользователь не найден"
        uid = user.id

        # S3: реальный, если MinIO поднят, иначе захват
        try:
            s3 = cert_service_s3()
            await s3.ensure_bucket()
            print("S3: реальный")
        except Exception:
            import app.utils.s3 as s3_module

            capture = CaptureS3()
            s3_module.get_s3_client = lambda: capture  # type: ignore[assignment]
            print("S3: MinIO недоступен — upload/get_object перехвачены")

        # FakeWS + перехват письма в роутере
        ws = FakeWS()
        await notification_hub.connect(uid, ws)
        emails: list[dict] = []
        import app.api.v1.certificates as cert_router

        cert_router.send_email_safe = lambda **kw: emails.append(kw)  # type: ignore[assignment]

        # админ-оверрайд: probe-пользователь выдаёт сертификаты
        from app.api.deps import get_current_admin, get_current_user

        app.dependency_overrides[get_current_admin] = lambda: user
        app.dependency_overrides[get_current_user] = lambda: user

        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
                # 1) первая выдача без displayName → фолбэк на email
                resp = await c.post(
                    "/api/v1/certificates",
                    json={"userId": str(uid), "displayName": None},
                )
                assert resp.status_code == 201, resp.text
                cert = resp.json()
                assert cert["fullName"] == user.email, cert
                assert cert["filePath"] == f"public/certificates/{cert['number']:06d}.png"
                ws_types = [m["type"] for m in ws.sent]
                assert ws_types == ["certificate_issued"], ws_types
                assert ws.sent[0]["data"]["numberLabel"].startswith("TD-"), ws.sent[0]
                assert len(emails) == 1 and emails[0]["to"] == user.email, emails
                assert emails[0]["attachment"][0].endswith(".png")
                print(f"1: выдан №{cert['number']}, WS + письмо OK, файл={cert['filePath']}")

                # 2) повторная выдача с тем же именем → тот же сертификат, без WS/письма
                ws.sent.clear()
                emails.clear()
                resp = await c.post(
                    "/api/v1/certificates",
                    json={"userId": str(uid), "displayName": None},
                )
                assert resp.status_code == 201
                cert2 = resp.json()
                assert cert2["number"] == cert["number"] and cert2["id"] == cert["id"]
                assert ws.sent == [] and emails == [], (ws.sent, emails)
                print(f"2: повторная выдача вернула существующий №{cert2['number']} без WS/письма")

                # 3) другое имя → перерисовка под тем же номером + WS/письмо
                resp = await c.post(
                    "/api/v1/certificates",
                    json={"userId": str(uid), "displayName": "Петр Петров-Сидоров"},
                )
                assert resp.status_code == 201
                cert3 = resp.json()
                assert cert3["number"] == cert["number"] and cert3["fullName"] == "Петр Петров-Сидоров"
                assert [m["type"] for m in ws.sent] == ["certificate_issued"], ws.sent
                assert len(emails) == 1
                print(f"3: имя исправлено, номер прежний №{cert3['number']}, WS + письмо OK")

                # 4) /my для владельца
                resp = await c.get("/api/v1/certificates/my")
                assert resp.status_code == 200 and len(resp.json()) == 1, resp.text
                assert resp.json()[0]["number"] == cert3["number"]
                print("4: GET /certificates/my OK")

                # 5) публичная проверка
                resp = await c.get(f"/api/v1/certificates/{cert3['number']}")
                assert resp.status_code == 200 and resp.json()["valid"] is True
                assert (await c.get("/api/v1/certificates/999999999")).status_code == 404
                print("5: публичная проверка OK (200 valid / 404 unknown)")
        finally:
            app.dependency_overrides.pop(get_current_admin, None)
            app.dependency_overrides.pop(get_current_user, None)
            await notification_hub.disconnect(uid, ws)

        # очистка тестовых строк (номера секвенса не откатываются — это норм)
        await s.execute(delete(Certificate).where(Certificate.user_id == uid))
        await s.commit()
        left = (await s.execute(select(text("count(*)")).select_from(Certificate))).scalar()
        print("cleanup: OK, строк сертификатов осталось:", left)


def cert_service_s3():
    from app.services.certificates import get_s3_client

    return get_s3_client()


asyncio.run(main())
