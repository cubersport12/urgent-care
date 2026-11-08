"""Shared catalog cache and admin cache controls."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from redis.exceptions import RedisError

from app.api.deps import get_current_user
from app.core.config import settings
from app.main import create_app
from app.schemas.content import FolderOut
from app.utils import content_cache, redis_cache
from app.utils.content_cache import cached_content_item, cached_content_list
from app.utils.redis_cache import CACHE_GENERATION_KEY, rotate_cache_generation


class _FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, bytes] = {}
        self.fail = False

    async def get(self, key: str) -> bytes | None:
        if self.fail:
            raise RedisError("Redis unavailable")
        return self.values.get(key)

    async def set(self, key: str, value: bytes, *, ex: int | None = None, nx: bool = False) -> bool:
        if self.fail:
            raise RedisError("Redis unavailable")
        if nx and key in self.values:
            return False
        self.values[key] = value
        return True


class _FakeDb:
    revision: str | None = "revision-1"

    async def scalar(self, _statement: Any) -> str | None:
        return self.revision


@pytest.fixture
def redis(monkeypatch):
    client = _FakeRedis()
    monkeypatch.setattr(redis_cache, "_redis_client", client)
    monkeypatch.setattr(settings, "content_cache_enabled", True)
    return client


@pytest.mark.asyncio
async def test_content_cache_hit_returns_fresh_models_and_clear_forces_reload(
    redis: _FakeRedis,
) -> None:
    source = [{"id": "f1", "name": "Original", "status": "published"}]
    calls = 0

    async def load() -> list[dict[str, str]]:
        nonlocal calls
        calls += 1
        return [dict(item) for item in source]

    db = _FakeDb()  # type: ignore[assignment]
    first = await cached_content_list(
        db,
        "folders",
        {"parentId": None},
        FolderOut,
        load,  # type: ignore[arg-type]
    )
    first[0]["name"] = "Local change"
    second = await cached_content_list(
        db,
        "folders",
        {"parentId": None},
        FolderOut,
        load,  # type: ignore[arg-type]
    )
    assert calls == 1
    assert second[0].name == "Original"

    source[0]["name"] = "Updated"
    await rotate_cache_generation(redis)  # type: ignore[arg-type]
    third = await cached_content_list(
        db,
        "folders",
        {"parentId": None},
        FolderOut,
        load,  # type: ignore[arg-type]
    )
    assert calls == 2
    assert third[0]["name"] == "Updated"


@pytest.mark.asyncio
@pytest.mark.parametrize("failure", ["generation", "get", "set"])
async def test_redis_failure_uses_the_database_loader(redis, monkeypatch, failure):
    entry = {"id": "f1", "name": "Folder", "status": "published"}
    db = _FakeDb()
    if failure != "generation":
        await redis_cache.get_cache_generation(redis)
    if failure == "get":
        get = redis.get

        async def fail_entry_read(key):
            if key != CACHE_GENERATION_KEY:
                raise RedisError("read failed")
            return await get(key)

        monkeypatch.setattr(redis, "get", fail_entry_read)
    elif failure == "set":
        monkeypatch.setattr(redis, "set", AsyncMock(side_effect=RedisError("write failed")))
    else:
        redis.fail = True

    load_list = AsyncMock(return_value=[entry])
    load_item = AsyncMock(return_value=entry)
    assert await cached_content_list(db, "folders", {}, FolderOut, load_list) == [entry]
    assert await cached_content_item(db, "folders", "f1", FolderOut, load_item) == entry
    load_list.assert_awaited_once()
    load_item.assert_awaited_once()
    assert not any(key.startswith(content_cache._CACHE_PREFIX) for key in redis.values)
    if failure == "set":
        assert redis.set.await_count == 2


@pytest.mark.parametrize("reason", ["disabled", "no-client", "no-revision"])
async def test_unavailable_cache_is_bypassed(redis, monkeypatch, reason):
    db = _FakeDb()
    if reason == "disabled":
        monkeypatch.setattr(settings, "content_cache_enabled", False)
    elif reason == "no-client":
        monkeypatch.setattr(redis_cache, "_redis_client", None)
    else:
        db.revision = None
    if reason != "no-revision":
        monkeypatch.setattr(db, "scalar", AsyncMock(side_effect=AssertionError("unexpected query")))
    load = AsyncMock(return_value=[])
    assert await cached_content_list(db, "folders", {}, FolderOut, load) == []
    load.assert_awaited_once()
    assert not redis.values


@pytest.mark.parametrize(
    ("many", "invalid"),
    [(True, b"invalid json"), (True, b"{}"), (True, b"[{}]"), (False, b"[]"), (False, b"{}")],
)
async def test_corrupt_entry_is_reloaded_and_repaired(redis, many, invalid):
    db = _FakeDb()
    old = {"id": "f1", "name": "Старая папка", "status": "published"}
    fresh = {**old, "name": "Новая папка"}
    load = AsyncMock(return_value=[old] if many else old)

    async def read():
        if many:
            return await cached_content_list(db, "folders", {}, FolderOut, load)
        return await cached_content_item(db, "folders", "f1", FolderOut, load)

    await read()
    (key,) = redis.values.keys() - {CACHE_GENERATION_KEY}
    redis.values[key] = invalid
    load.return_value = [fresh] if many else fresh
    assert await read() == load.return_value
    model = FolderOut.model_validate(fresh)
    assert await read() == ([model] if many else model)
    assert load.await_count == 2


async def test_empty_lists_are_cached_but_missing_items_are_not(redis):
    db = _FakeDb()
    load_list = AsyncMock(return_value=[])
    load_item = AsyncMock(return_value=None)
    for _ in range(2):
        assert await cached_content_list(db, "folders", {}, FolderOut, load_list) == []
        assert await cached_content_item(db, "folders", "f1", FolderOut, load_item) is None
    load_list.assert_awaited_once()
    assert load_item.await_count == 2


async def test_cache_key_is_canonical_and_separates_kinds_and_selectors(redis):
    db = _FakeDb()
    folder = {"id": "f1", "name": "Folder", "status": "published"}
    other = {**folder, "name": "Other"}
    second_item = {**other, "id": "f2"}
    load = AsyncMock(side_effect=[[folder], [other], [other], folder, second_item])
    selector = {"all": False, "parentId": "parent"}
    assert await cached_content_list(db, "folders", selector, FolderOut, load) == [folder]
    assert await cached_content_list(
        db, "folders", {"parentId": "parent", "all": False}, FolderOut, load
    ) == [FolderOut.model_validate(folder)]
    assert await cached_content_list(db, "articles", selector, FolderOut, load) == [other]
    assert await cached_content_list(
        db, "folders", {**selector, "parentId": "other"}, FolderOut, load
    ) == [other]
    assert await cached_content_item(db, "folders", "f1", FolderOut, load) == folder
    assert await cached_content_item(db, "folders", "f2", FolderOut, load) == second_item
    assert load.await_count == 5


async def test_invalid_source_is_not_stored(redis):
    db = _FakeDb()
    entry = {"id": "f1", "status": "published"}
    load = AsyncMock(return_value=entry)
    for _ in range(2):
        assert await cached_content_item(db, "folders", "f1", FolderOut, load) is entry
    assert load.await_count == 2
    assert set(redis.values) == {CACHE_GENERATION_KEY}


@pytest.mark.parametrize("extra_bytes", [0, 1], ids=["at-limit", "over-limit"])
async def test_content_size_limit_counts_utf8_bytes(redis, extra_bytes):
    entry = FolderOut(id="f1", name="", status="published")
    padding = 1_048_576 + extra_bytes - len(entry.model_dump_json(by_alias=True).encode())
    entry.name = "я" * (padding // 2) + "x" * (padding % 2)
    db = _FakeDb()
    load = AsyncMock(return_value=entry)
    assert await cached_content_item(db, "folders", "f1", FolderOut, load) == entry
    assert await cached_content_item(db, "folders", "f1", FolderOut, load) == entry
    assert load.await_count == (2 if extra_bytes else 1)


async def test_source_error_propagates_and_does_not_poison_cache(redis):
    load = AsyncMock(side_effect=RuntimeError("database error"))
    with pytest.raises(RuntimeError, match="database error"):
        await cached_content_list(_FakeDb(), "folders", {}, FolderOut, load)
    assert set(redis.values) == {CACHE_GENERATION_KEY}


@pytest.mark.parametrize("winner", [b"other-worker", None])
async def test_generation_race_reads_winner_or_uses_candidate(winner):
    redis = SimpleNamespace(
        get=AsyncMock(side_effect=[None, winner]), set=AsyncMock(return_value=False)
    )
    generation = await redis_cache.get_cache_generation(redis)
    key, candidate = redis.set.await_args.args
    assert key == CACHE_GENERATION_KEY
    assert len(candidate) == 16
    assert redis.set.await_args.kwargs == {"nx": True}
    assert redis.get.await_count == 2
    assert generation == (winner or candidate)


def test_cache_clear_endpoint_is_admin_only(redis) -> None:
    app = create_app()
    client = TestClient(app)
    path = "/api/v1/system-settings/cache/clear"
    redis.values[CACHE_GENERATION_KEY] = b"original"

    assert client.post(path).status_code == 401
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="user", role="user")
    assert client.post(path).status_code == 403
    assert redis.values[CACHE_GENERATION_KEY] == b"original"

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="admin", role="admin")
    assert client.post(path).status_code == 204
    assert redis.values[CACHE_GENERATION_KEY] != b"original"


@pytest.mark.parametrize("configured", [False, True])
def test_cache_clear_reports_unavailable_redis(redis, monkeypatch, configured):
    redis.fail = True
    if not configured:
        monkeypatch.setattr(redis_cache, "_redis_client", None)
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="admin", role="admin")
    response = TestClient(app).post("/api/v1/system-settings/cache/clear")
    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Redis cache is unavailable" if configured else "Redis cache is not configured"
    )
