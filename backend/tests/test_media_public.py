"""Публичный кэшируемый роут декоративных изображений: только whitelisted префиксы и картинки."""
import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from app.api.v1 import media


class FakeS3:
    async def get_object(self, key: str) -> tuple[bytes, str]:
        return b"image-bytes", "image/png"


@pytest.fixture
def fake_s3(monkeypatch):
    client = FakeS3()
    monkeypatch.setattr(media, "get_s3_client", lambda: client)
    return client


async def test_public_image_served_without_auth(fake_s3):
    res = await media.download_public_image("public/folders/abc.png", None)
    assert res.status_code == 200
    assert res.body == b"image-bytes"
    assert res.media_type == "image/png"
    assert res.headers["cache-control"] == "public, max-age=604800"


async def test_public_image_allowed_namespaces(fake_s3):
    # Аватар (UUID+hex) и корневая картинка (фон сцены / вопрос теста, ключ = имя файла)
    for path in ("public/avatars/6f0a/9c2b7d.png", "public/scene-1.jpg", "public/вопрос.webp", "public/rewards/g--f.jpeg", "public/achievements/x.gif"):
        res = await media.download_public_image(path, None)
        assert res.status_code == 200, path


async def test_public_image_rejects_sensitive_paths(fake_s3):
    # Сертификаты (последовательный номер + ФИО), PDF статей (тариф-гейт), legal, не-картинки
    for path in ("public/certificates/000123.png", "public/avatars/u1/face.exe", "public/article-id.pdf", "public/folders/notes.txt", "public/legal/offer.pdf", "public/notes.txt"):
        with pytest.raises(HTTPException) as exc:
            await media.download_public_image(path, None)
        assert exc.value.status_code == 404


async def test_legacy_certificate_download_requires_session(fake_s3, monkeypatch):
    app = FastAPI()
    app.include_router(media.router)
    app.dependency_overrides[media.get_db] = lambda: object()

    async def current_user(db, session_id):
        if session_id != "valid":
            raise HTTPException(status_code=401)
        return object()

    monkeypatch.setattr(media, "get_current_user", current_user)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        path = "/media/public/certificates/000123.png"
        assert (await client.get(path)).status_code == 401
        response = await client.get(path, headers={"X-Session-Id": "valid"})
        assert response.status_code == 200
        assert response.content == b"image-bytes"
        assert response.headers["cache-control"] == "private, max-age=86400"
        assert (await client.get("/media/public/public/certificates/000123.png")).status_code == 404
