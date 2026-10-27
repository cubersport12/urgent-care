"""Checks the MinIO file cache and its invalidation behavior."""
from __future__ import annotations

from io import BytesIO
from typing import Any
from unittest.mock import patch

import pytest
from redis.exceptions import RedisError

from app.utils.file_cache import FileCache
from app.utils.s3 import S3Client


class _FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, bytes] = {}
        self.fail = False

    async def get(self, key: str) -> bytes | None:
        if self.fail:
            raise RedisError("Redis unavailable")
        return self.values.get(key)

    async def set(self, key: str, value: bytes, *, ex: int) -> None:
        if self.fail:
            raise RedisError("Redis unavailable")
        self.values[key] = value

    async def eval(
        self,
        _script: str,
        _key_count: int,
        key: str,
        has_expected: bytes,
        expected: bytes,
        value: bytes,
        _ttl: int,
    ) -> int:
        if self.fail:
            raise RedisError("Redis unavailable")
        current = self.values.get(key)
        if has_expected == b"0":
            if current is not None:
                return 0
        elif current != expected:
            return 0
        self.values[key] = value
        return 1


class _FakeS3:
    def __init__(self) -> None:
        self.objects: dict[str, tuple[bytes, str]] = {"public/a.pdf": (b"old", "application/pdf")}
        self.get_calls = 0

    def get_object(self, **kwargs: Any) -> dict:
        assert kwargs["Bucket"] == "bucket"
        self.get_calls += 1
        body, content_type = self.objects[kwargs["Key"]]
        return {"Body": BytesIO(body), "ContentType": content_type}

    def put_object(self, **kwargs: Any) -> None:
        assert kwargs["Bucket"] == "bucket"
        self.objects[kwargs["Key"]] = (kwargs["Body"], kwargs["ContentType"])

    def delete_object(self, **kwargs: Any) -> None:
        assert kwargs["Bucket"] == "bucket"
        self.objects.pop(kwargs["Key"], None)


def _s3_client(redis: _FakeRedis, s3: _FakeS3, *, max_bytes: int = 1024) -> S3Client:
    cache = FileCache(redis, ttl_seconds=300, max_bytes=max_bytes)  # type: ignore[arg-type]
    with patch("app.utils.s3.boto3.client", return_value=s3):
        return S3Client(
            endpoint="http://minio",
            access_key="key",
            secret_key="secret",
            bucket="bucket",
            file_cache=cache,
        )


@pytest.mark.asyncio
async def test_cache_hit_and_upload_invalidate() -> None:
    redis = _FakeRedis()
    s3 = _FakeS3()
    client = _s3_client(redis, s3)

    assert await client.get_object(key="public/a.pdf") == (b"old", "application/pdf")
    assert await client.get_object(key="public/a.pdf") == (b"old", "application/pdf")
    assert s3.get_calls == 1

    await client.upload_bytes(
        data=b"new",
        key="public/a.pdf",
        content_type="application/pdf",
        public=False,
    )
    assert await client.get_object(key="public/a.pdf") == (b"new", "application/pdf")
    assert s3.get_calls == 2


@pytest.mark.asyncio
async def test_delete_invalidates_cached_entry() -> None:
    redis = _FakeRedis()
    s3 = _FakeS3()
    client = _s3_client(redis, s3)
    cache = client._file_cache
    assert cache is not None
    await client.get_object(key="public/a.pdf")

    assert await client.delete_file(key="public/a.pdf") is True
    cached, _ = await cache.get(bucket="bucket", object_key="public/a.pdf")
    assert cached is None


@pytest.mark.asyncio
async def test_stale_read_cannot_repopulate_after_invalidation() -> None:
    redis = _FakeRedis()
    cache = FileCache(redis, ttl_seconds=300, max_bytes=1024)  # type: ignore[arg-type]

    cached, observed = await cache.get(bucket="bucket", object_key="public/a.pdf")
    assert cached is None
    await cache.invalidate(bucket="bucket", object_key="public/a.pdf")
    await cache.set_if_unchanged(
        bucket="bucket",
        object_key="public/a.pdf",
        body=b"stale",
        content_type="application/pdf",
        observed_value=observed,
    )
    cached, observed = await cache.get(bucket="bucket", object_key="public/a.pdf")
    assert cached is None
    await cache.set_if_unchanged(
        bucket="bucket",
        object_key="public/a.pdf",
        body=b"fresh",
        content_type="application/pdf",
        observed_value=observed,
    )
    cached, _ = await cache.get(bucket="bucket", object_key="public/a.pdf")
    assert cached == (b"fresh", "application/pdf")


@pytest.mark.asyncio
async def test_large_objects_bypass_cache() -> None:
    redis = _FakeRedis()
    s3 = _FakeS3()
    s3.objects["public/a.pdf"] = (b"larger than limit", "application/pdf")
    client = _s3_client(redis, s3, max_bytes=4)

    assert await client.get_object(key="public/a.pdf") == (b"larger than limit", "application/pdf")
    assert await client.get_object(key="public/a.pdf") == (b"larger than limit", "application/pdf")
    assert s3.get_calls == 2


@pytest.mark.asyncio
async def test_redis_failure_falls_back_to_minio() -> None:
    redis = _FakeRedis()
    redis.fail = True
    s3 = _FakeS3()
    client = _s3_client(redis, s3)

    assert await client.get_object(key="public/a.pdf") == (b"old", "application/pdf")
    assert s3.get_calls == 1
    await client.upload_bytes(
        data=b"new",
        key="public/a.pdf",
        content_type="application/pdf",
        public=False,
    )
    assert s3.objects["public/a.pdf"] == (b"new", "application/pdf")
