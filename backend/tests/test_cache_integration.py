"""Run against disposable Redis, PostgreSQL, and MinIO via CACHE_TEST_*."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from os import getenv
from pathlib import Path
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
import pytest_asyncio
from botocore.exceptions import ClientError
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, insert, select, text, update
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.util import load_python_file
from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.db.base import Base
from app.db.repositories.content import (
    ArticleRepository,
    FolderRepository,
    RescueRepository,
)
from app.db.repositories.content import TestRepository as CatalogTestRepository
from app.main import create_app
from app.models.achievement import Achievement, Reward, RewardAchievement, UserAchievement
from app.models.billing import Tariff, UserSubscription
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.schemas.content import FolderOut
from app.utils import content_cache, file_cache, redis_cache
from app.utils.s3 import get_s3_client

_REDIS_URL = getenv("CACHE_TEST_REDIS_URL")
_POSTGRES_URL = getenv("CACHE_TEST_POSTGRES_URL")
_MINIO_ENDPOINT = getenv("CACHE_TEST_MINIO_ENDPOINT")
pytestmark = pytest.mark.skipif(
    not (_REDIS_URL or _POSTGRES_URL or _MINIO_ENDPOINT),
    reason="set both CACHE_TEST_*_URL variables",
)

_CATALOG = [
    (FolderRepository, {}),
    (ArticleRepository, {"links_to_articles": [{"key": "link", "articleId": "draft"}]}),
    (CatalogTestRepository, {"questions": [{"title": "Вопрос"}]}),
    (RescueRepository, {"data": {"scenes": [{"documents": [{"articleId": "draft"}]}]}}),
]


@pytest_asyncio.fixture
async def redis(monkeypatch):
    assert _REDIS_URL, "CACHE_TEST_REDIS_URL is required"
    namespace = f"cache-test:{uuid4().hex}:"
    monkeypatch.setattr(redis_cache, "CACHE_GENERATION_KEY", namespace + "generation")
    monkeypatch.setattr(content_cache, "_CACHE_PREFIX", namespace + "content:")
    monkeypatch.setattr(file_cache, "_CACHE_PREFIX", namespace + "file:")
    monkeypatch.setattr(redis_cache, "_redis_client", None)
    monkeypatch.setattr(file_cache, "_file_cache", None)
    monkeypatch.setattr(settings, "redis_url", _REDIS_URL)
    monkeypatch.setattr(settings, "content_cache_enabled", True)
    monkeypatch.setattr(settings, "file_cache_ttl_seconds", 300)
    redis_cache.initialize_redis_cache()
    client = redis_cache.get_redis_client()
    assert client is not None
    try:
        assert await client.ping()
        file_cache.initialize_file_cache()
        try:
            yield client
        finally:
            keys = [key async for key in client.scan_iter(match=namespace + "*")]
            if keys:
                await client.delete(*keys)
    finally:
        await file_cache.close_file_cache()
        await redis_cache.close_redis_cache()


def _migration(connection, direction):
    migration = load_python_file(
        str(Path(__file__).resolve().parents[1] / "alembic" / "versions"),
        "034_content_cache_revision.py",
    )
    with Operations.context(MigrationContext.configure(connection)):
        getattr(migration, direction)()


@pytest_asyncio.fixture
async def sessions():
    assert _POSTGRES_URL, "CACHE_TEST_POSTGRES_URL is required"
    schema = f"cache_test_{uuid4().hex}"
    engine = create_async_engine(
        _POSTGRES_URL,
        connect_args={"timeout": 5, "server_settings": {"search_path": f"{schema},public"}},
    )
    try:
        async with engine.begin() as conn:
            await conn.execute(text(f"CREATE SCHEMA {schema}"))
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(_migration, "upgrade")
        try:
            yield async_sessionmaker(engine, expire_on_commit=False)
        finally:
            async with engine.begin() as conn:
                await conn.execute(text(f"DROP SCHEMA {schema} CASCADE"))
    finally:
        await engine.dispose()


async def _revision(db):
    return await db.scalar(
        select(SystemSetting.value).where(SystemSetting.key == "content_cache_revision")
    )


@pytest.mark.parametrize(
    ("repo", "fields"), _CATALOG, ids=["folders", "articles", "tests", "rescue"]
)
async def test_revision_tracks_each_mutation_and_rollback(sessions, repo, fields):
    model = repo.model
    async with sessions() as db, sessions() as reader:
        previous = await _revision(reader)
        assert previous
        for operation in (
            insert(model).values(id="item", name="Original", **fields),
            update(model).values(name="Updated"),
            delete(model),
            text(f"TRUNCATE {model.__tablename__} CASCADE"),
        ):
            await db.execute(operation)
            changed = await _revision(db)
            assert changed != previous
            assert await _revision(reader) == previous
            # Further content writes in this transaction reuse its revision.
            await db.execute(update(model).values(name="Updated again"))
            assert await _revision(db) == changed
            await db.commit()
            assert await _revision(reader) == changed
            previous = changed

        await db.execute(insert(model).values(id="rolled-back", name="Discarded", **fields))
        assert await _revision(db) != previous
        await db.rollback()
        assert await _revision(reader) == previous
        assert await reader.get(model, "rolled-back") is None


async def test_revision_migration_downgrade_and_reinstall(sessions):
    async with sessions() as db:
        connection = await db.connection()
        await connection.run_sync(_migration, "downgrade")
        assert await _revision(db) is None
        await db.execute(insert(FolderRepository.model).values(id="f1", name="Folder"))
        assert await _revision(db) is None
        await connection.run_sync(_migration, "upgrade")
        original = await _revision(db)
        await db.execute(update(FolderRepository.model).values(name="Updated"))
        assert await _revision(db) != original


@pytest.fixture
def api(sessions):
    app = create_app()
    admin = User(id=uuid4(), email="admin@example.test", role="admin")

    async def test_db():
        async with sessions() as db:
            yield db
            await db.commit()

    app.dependency_overrides[get_db] = test_db
    app.dependency_overrides[get_current_user] = lambda: admin
    return app


async def _json(client, path, **kwargs):
    response = await client.get(path, **kwargs)
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.parametrize(
    ("repo", "fields"), _CATALOG, ids=["folders", "articles", "tests", "rescue"]
)
async def test_list_and_detail_routes_hit_cache_and_reload_after_publish(
    sessions, api, redis, repo, fields
):
    model = repo.model
    path = f"/api/v1/{model.__tablename__}"
    async with sessions.begin() as db:
        await db.execute(insert(model).values(id="root", name="Root", status="published", **fields))
        await db.execute(insert(model).values(id="draft", name="Draft"))
        await db.execute(
            insert(model).values(id="nested", name="Nested", parent_id="parent", status="published")
        )

    async with AsyncClient(transport=ASGITransport(app=api), base_url="http://test") as client:
        all_params = {"all": "true"}
        preview_params = {**all_params, "includeDrafts": "true"}
        parent_params = {"parentId": "parent"}
        published = await _json(client, path, params=all_params)
        root = await _json(client, path)
        preview = await _json(client, path, params=preview_params)
        nested = await _json(client, path, params=parent_params)
        item = await _json(client, path + "/root")
        assert {entry["id"] for entry in published} == {"root", "nested"}
        assert [entry["id"] for entry in root] == ["root"]
        assert {entry["id"] for entry in preview} == {"root", "draft", "nested"}
        assert [entry["id"] for entry in nested] == ["nested"]
        assert item["name"] == "Root"
        if model is ArticleRepository.model:
            assert item["linksToArticles"] == []
            assert next(entry for entry in preview if entry["id"] == "root")["linksToArticles"] == [
                {"key": "link", "articleId": "draft"}
            ]
        if model is RescueRepository.model:
            assert item["data"]["scenes"][0]["documents"] == []
            assert next(entry for entry in preview if entry["id"] == "root")["data"]["scenes"][0][
                "documents"
            ] == [{"articleId": "draft"}]
        if model is CatalogTestRepository.model:
            assert item["questions"] == fields["questions"]

        with (
            patch.object(repo, "list_all", side_effect=AssertionError("list cache missed")),
            patch.object(repo, "list_by_parent", side_effect=AssertionError("parent cache missed")),
            patch.object(repo, "get", side_effect=AssertionError("detail cache missed")),
        ):
            assert await _json(client, path, params=all_params) == published
            assert await _json(client, path) == root
            assert await _json(client, path, params=preview_params) == preview
            assert await _json(client, path, params=parent_params) == nested
            assert await _json(client, path + "/root") == item

        keys = [key async for key in redis.scan_iter(match=content_cache._CACHE_PREFIX + "*")]
        assert len(keys) == 5
        for key in keys:
            assert 290_000 < await redis.pttl(key) <= 300_000
        async with sessions.begin() as db:
            await db.execute(update(model).where(model.id == "root").values(status="draft"))
        assert [entry["id"] for entry in await _json(client, path, params=all_params)] == ["nested"]
        assert (await client.get(path + "/root")).status_code == 404


async def test_cached_draft_tariff_and_reward_access_are_checked_per_request(
    sessions, api, redis, monkeypatch
):
    monkeypatch.setattr(settings, "billing_enforcement", True)
    admin = api.dependency_overrides[get_current_user]()
    free = User(id=uuid4(), email="free@example.test", role="user")
    paid = User(id=uuid4(), email="paid@example.test", role="user")
    premium = Tariff(id=uuid4(), code="premium", title="Premium", rank=2)
    reward = Reward(id=uuid4(), title="Reward")
    achievement = Achievement(id=uuid4(), code="badge", title="Badge")
    async with sessions.begin() as db:
        db.add_all(
            [
                admin,
                free,
                paid,
                premium,
                reward,
                achievement,
                Tariff(code="free", title="Free", is_default=True),
            ]
        )
        await db.flush()
        now = datetime.now(UTC)
        db.add_all(
            [
                RewardAchievement(reward_id=reward.id, achievement_id=achievement.id),
                UserSubscription(
                    user_id=paid.id,
                    tariff_id=premium.id,
                    current_period_start=now,
                    current_period_end=now + timedelta(days=1),
                ),
            ]
        )
        await db.execute(
            insert(CatalogTestRepository.model),
            [
                {
                    "id": "exam",
                    "name": "Exam",
                    "status": "published",
                    "questions": [{"answer": "secret"}],
                    "required_tariff_id": premium.id,
                    "required_reward_id": reward.id,
                },
                {
                    "id": "draft",
                    "name": "Draft",
                    "status": "draft",
                    "questions": [],
                    "required_tariff_id": None,
                    "required_reward_id": None,
                },
            ],
        )

    path = "/api/v1/tests"
    preview = {"includeDrafts": "true"}
    async with AsyncClient(transport=ASGITransport(app=api), base_url="http://test") as client:
        assert await _json(client, path + "/draft", params=preview)
        assert len(await _json(client, path, params=preview)) == 2
        assert (await _json(client, path + "/exam"))["questions"] == [{"answer": "secret"}]
        assert (await _json(client, path))[0]["isLocked"] is False

        with (
            patch.object(
                CatalogTestRepository, "get", side_effect=AssertionError("detail cache missed")
            ),
            patch.object(
                CatalogTestRepository,
                "list_by_parent",
                side_effect=AssertionError("list cache missed"),
            ),
        ):
            for user, locked_by in [(free, "tariff"), (paid, "reward")]:
                api.dependency_overrides[get_current_user] = lambda user=user: user
                (entry,) = await _json(client, path, params=preview)
                assert entry["lockedBy"] == locked_by
                assert entry["isLocked"] is True and entry["questions"] is None
                assert (await client.get(path + "/exam")).status_code == 404
                assert (await client.get(path + "/draft", params=preview)).status_code == 404

            async with sessions.begin() as db:
                db.add(UserAchievement(user_id=paid.id, achievement_id=achievement.id))
            (entry,) = await _json(client, path)
            assert entry["isLocked"] is False
            assert (await _json(client, path + "/exam"))["questions"] == [{"answer": "secret"}]

        api.dependency_overrides[get_current_user] = lambda: admin
        assert (await _json(client, path, params={"enforceTariff": "true"}))[0][
            "lockedBy"
        ] == "tariff"


@pytest.mark.parametrize("existing", [False, True], ids=["miss", "hit"])
async def test_redis_lua_blocks_stale_file_fill_after_invalidation(redis, existing):
    cache = file_cache.get_file_cache()
    obj = {"bucket": "bucket", "object_key": "file.pdf"}

    async def write(body, observed, key):
        await cache.set_if_unchanged(
            **obj,
            body=body,
            content_type="application/pdf",
            etag='"etag"',
            observed_value=observed,
            cache_key=key,
        )

    _, observed, key = await cache.get(**obj)
    if existing:
        await write(b"old", observed, key)
        _, observed, key = await cache.get(**obj)

    await cache.invalidate(**obj)
    cached, marker, _ = await cache.get(**obj)
    assert cached is None and marker is not None and marker != observed
    assert 300_000 < await redis.pttl(key) <= 600_000
    await write(b"stale", observed, key)
    assert await redis.get(key) == marker

    await write(b"fresh\x00\xff", marker, key)
    assert (await cache.get(**obj))[0] == (b"fresh\x00\xff", "application/pdf", '"etag"')
    assert 0 < await redis.pttl(key) <= 300_000
    await redis.pexpireat(key, 1)
    assert await cache.get(**obj) == (None, None, key)


async def test_admin_clear_bypasses_both_caches_without_deleting_keys(api, redis):
    cache = file_cache.get_file_cache()
    obj = {"bucket": "bucket", "object_key": "a.pdf"}
    _, observed, file_key = await cache.get(**obj)
    await cache.set_if_unchanged(
        **obj,
        body=b"old",
        content_type="application/pdf",
        etag=None,
        observed_value=observed,
        cache_key=file_key,
    )
    db = AsyncMock()
    db.scalar.return_value = "revision"
    load = AsyncMock(
        side_effect=[
            {"id": "f1", "name": "Old", "status": "published"},
            {"id": "f1", "name": "New", "status": "published"},
        ]
    )

    async def read():
        return await content_cache.cached_content_item(db, "folders", "f1", FolderOut, load)

    assert (await read())["name"] == "Old"
    assert (await read()).name == "Old"
    (content_key,) = [key async for key in redis.scan_iter(match=content_cache._CACHE_PREFIX + "*")]
    unrelated = redis_cache.CACHE_GENERATION_KEY + ":unrelated"
    await redis.set(unrelated, b"keep")
    async with AsyncClient(transport=ASGITransport(app=api), base_url="http://test") as client:
        response = await client.post("/api/v1/system-settings/cache/clear")
        assert response.status_code == 204
    assert (await read())["name"] == "New"
    assert (await cache.get(**obj))[0] is None
    assert await redis.get(file_key) is not None
    assert await redis.get(content_key) is not None
    assert await redis.get(unrelated) == b"keep"
    assert load.await_count == 2


async def test_content_expiry_refills_entry(redis):
    db = AsyncMock()
    db.scalar.return_value = "revision"
    old = FolderOut(id="f1", name="Old", status="published")
    new = FolderOut(id="f1", name="New", status="published")
    load = AsyncMock(side_effect=[old, new])

    async def read():
        return await content_cache.cached_content_item(db, "folders", "f1", FolderOut, load)

    assert await read() == old
    assert await read() == old
    (key,) = [key async for key in redis.scan_iter(match=content_cache._CACHE_PREFIX + "*")]
    assert await redis.pexpireat(key, 1)
    assert await read() == new
    assert await read() == new
    assert load.await_count == 2
    assert 290_000 < await redis.pttl(key) <= 300_000


async def test_redis_and_file_cache_lifecycle(redis, monkeypatch):
    cache = file_cache.get_file_cache()
    redis_cache.initialize_redis_cache()
    file_cache.initialize_file_cache()
    assert redis_cache.get_redis_client() is redis
    assert file_cache.get_file_cache() is cache
    generations = await asyncio.gather(*(redis_cache.get_cache_generation(redis) for _ in range(8)))
    assert len(set(generations)) == 1
    assert await redis.get(redis_cache.CACHE_GENERATION_KEY) == generations[0]

    await file_cache.close_file_cache()
    await redis_cache.close_redis_cache()
    await redis_cache.close_redis_cache()
    assert file_cache.get_file_cache() is None
    assert redis_cache.get_redis_client() is None
    monkeypatch.setattr(settings, "redis_url", "")
    redis_cache.initialize_redis_cache()
    file_cache.initialize_file_cache()
    assert redis_cache.get_redis_client() is None
    assert file_cache.get_file_cache() is None
    # Restore the connection owner so fixture teardown can close the cleanup connection.
    monkeypatch.setattr(redis_cache, "_redis_client", redis)


@pytest.mark.skipif(not _MINIO_ENDPOINT, reason="set CACHE_TEST_MINIO_ENDPOINT for MinIO")
async def test_minio_pdf_cache_refreshes_after_external_replace_and_delete(redis, monkeypatch):
    access_key = getenv("CACHE_TEST_MINIO_ACCESS_KEY")
    secret_key = getenv("CACHE_TEST_MINIO_SECRET_KEY")
    assert access_key and secret_key, "MinIO test credentials are required"
    bucket = f"cache-test-{uuid4().hex}"
    monkeypatch.setattr(settings, "s3_endpoint", _MINIO_ENDPOINT)
    monkeypatch.setattr(settings, "s3_access_key", access_key)
    monkeypatch.setattr(settings, "s3_secret_key", secret_key)
    monkeypatch.setattr(settings, "s3_bucket_media", bucket)
    client = get_s3_client()
    storage = client._client
    key = "public/article.PDF"
    await client.ensure_bucket()
    try:
        await client.upload_bytes(data=b"old", key=key, content_type="application/pdf")
        with patch.object(storage, "get_object", wraps=storage.get_object) as get:
            assert await client.get_object(key=key) == (b"old", "application/pdf")
            assert await client.get_object(key=key) == (b"old", "application/pdf")
            assert get.call_count == 1
            storage.put_object(
                Bucket=bucket, Key=key, Body=b"updated", ContentType="application/pdf"
            )
            assert await client.get_object(key=key) == (b"updated", "application/pdf")
            assert await client.get_object(key=key) == (b"updated", "application/pdf")
            assert get.call_count == 2
            storage.delete_object(Bucket=bucket, Key=key)
            with pytest.raises(ClientError) as error:
                await client.get_object(key=key)
            assert error.value.response["Error"]["Code"] == "NoSuchKey"
    finally:
        storage.delete_object(Bucket=bucket, Key=key)
        storage.delete_bucket(Bucket=bucket)
