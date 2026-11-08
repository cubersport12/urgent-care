"""Checks the MinIO file cache and its invalidation behavior."""

from __future__ import annotations

from hashlib import sha256
from io import BytesIO
from typing import Any
from unittest.mock import AsyncMock, patch

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

    async def set(self, key: str, value: bytes, *, ex: int | None = None, nx: bool = False) -> bool:
        if self.fail:
            raise RedisError("Redis unavailable")
        if nx and key in self.values:
            return False
        self.values[key] = value
        return True

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
        self.head_calls = 0

    def get_object(self, **kwargs: Any) -> dict:
        assert kwargs["Bucket"] == "bucket"
        self.get_calls += 1
        body, content_type = self.objects[kwargs["Key"]]
        return {"Body": BytesIO(body), "ContentType": content_type, "ETag": self._etag(body)}

    def head_object(self, **kwargs: Any) -> dict:
        self.head_calls += 1
        body, content_type = self.objects[kwargs["Key"]]
        return {"ContentType": content_type, "ETag": self._etag(body)}

    @staticmethod
    def _etag(body: bytes) -> str:
        return f'"{sha256(body).hexdigest()}"'

    def put_object(self, **kwargs: Any) -> None:
        assert kwargs["Bucket"] == "bucket"
        self.objects[kwargs["Key"]] = (kwargs["Body"], kwargs["ContentType"])

    def delete_object(self, **kwargs: Any) -> None:
        assert kwargs["Bucket"] == "bucket"
        self.objects.pop(kwargs["Key"], None)


def _s3_client(redis: _FakeRedis | None, s3: _FakeS3, *, max_bytes: int = 1024) -> S3Client:
    cache = None if redis is None else FileCache(redis, ttl_seconds=300, max_bytes=max_bytes)
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

    key = "public/a.png"
    s3.objects[key] = (b"old", "image/png")
    assert await client.get_object(key=key) == (b"old", "image/png")
    assert await client.get_object(key=key) == (b"old", "image/png")
    assert s3.get_calls == 1
    assert s3.head_calls == 0

    await client.upload_bytes(
        data=b"new",
        key=key,
        content_type="image/png",
    )
    assert await client.get_object(key=key) == (b"new", "image/png")
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
    cached, _, _ = await cache.get(bucket="bucket", object_key="public/a.pdf")
    assert cached is None
    with pytest.raises(KeyError):
        await client.get_object(key="public/a.pdf")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "replacement", [(b"replaced", "application/pdf"), (b"old", "application/x-pdf")]
)
async def test_pdf_revalidates_etag_and_content_type(replacement) -> None:
    redis = _FakeRedis()
    s3 = _FakeS3()
    client = _s3_client(redis, s3)
    await client.get_object(key="public/a.pdf")

    assert await client.get_object(key="public/a.pdf") == (b"old", "application/pdf")
    assert s3.get_calls == 1
    s3.objects["public/a.pdf"] = replacement
    assert await client.get_object(key="public/a.pdf") == replacement
    assert await client.get_object(key="public/a.pdf") == replacement
    assert s3.get_calls == 2
    assert s3.head_calls == 3


async def test_pdf_head_failure_falls_back_to_get():
    s3 = _FakeS3()
    client = _s3_client(_FakeRedis(), s3)
    assert await client.get_object(key="public/a.pdf") == (b"old", "application/pdf")
    s3.objects["public/a.pdf"] = (b"new", "application/pdf")
    with patch.object(s3, "head_object", side_effect=OSError("HEAD failed")) as head:
        assert await client.get_object(key="public/a.pdf") == (b"new", "application/pdf")
    head.assert_called_once()
    assert s3.get_calls == 2


@pytest.mark.asyncio
@pytest.mark.parametrize(("body", "gets"), [(b"1234", 1), (b"12345", 2), (b"", 1)])
async def test_file_cache_size_limit(body, gets) -> None:
    redis = _FakeRedis()
    s3 = _FakeS3()
    s3.objects["public/a.pdf"] = (body, "application/pdf")
    client = _s3_client(redis, s3, max_bytes=4)

    assert await client.get_object(key="public/a.pdf") == (body, "application/pdf")
    assert await client.get_object(key="public/a.pdf") == (body, "application/pdf")
    assert s3.get_calls == gets


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
    assert await client.delete_file(key="public/a.pdf") is True
    assert "public/a.pdf" not in s3.objects


async def test_redis_write_failure_does_not_discard_object(monkeypatch):
    redis = _FakeRedis()
    s3 = _FakeS3()
    write = AsyncMock(side_effect=RedisError("EVAL failed"))
    monkeypatch.setattr(redis, "eval", write)
    client = _s3_client(redis, s3)
    assert await client.get_object(key="public/a.pdf") == (b"old", "application/pdf")
    assert await client.get_object(key="public/a.pdf") == (b"old", "application/pdf")
    assert s3.get_calls == write.await_count == 2


async def test_file_operations_work_without_a_configured_cache():
    client = _s3_client(None, _FakeS3())
    key = "public/a.pdf"
    assert await client.get_object(key=key) == (b"old", "application/pdf")
    await client.upload_bytes(data=b"new", key=key)
    assert await client.get_object(key=key) == (b"new", "application/octet-stream")
    assert await client.delete_file(key=key)
    with pytest.raises(KeyError):
        await client.get_object(key=key)


@pytest.mark.parametrize(
    "raw",
    [
        b"",
        b"\x02",
        b"\x02\x00\x02x",
        b"\x02\x00\x01\xff",
        b"\x02\x00\x00",
        b"\x02\x00\x00\x00\x02x",
        b"\x02\x00\x00\x00\x01\xff",
    ],
)
async def test_corrupt_file_entry_is_repaired(raw):
    redis = _FakeRedis()
    s3 = _FakeS3()
    client = _s3_client(redis, s3)
    cache = client._file_cache
    _, _, key = await cache.get(bucket="bucket", object_key="public/a.pdf")
    redis.values[key] = raw
    assert await client.get_object(key="public/a.pdf") == (b"old", "application/pdf")
    assert await client.get_object(key="public/a.pdf") == (b"old", "application/pdf")
    assert s3.get_calls == 1


@pytest.mark.parametrize(
    ("body", "content_type", "etag"),
    [
        (b"12345", "image/png", None),
        (b"", "я" * 32768, None),
        (b"", "image/png", "x" * 65536),
    ],
    ids=["body", "content-type", "etag"],
)
async def test_file_cache_rejects_unencodable_entries(body, content_type, etag):
    redis = _FakeRedis()
    cache = FileCache(redis, ttl_seconds=300, max_bytes=4)
    obj = {"bucket": "bucket", "object_key": "file"}
    _, observed, key = await cache.get(**obj)
    await cache.set_if_unchanged(
        **obj,
        body=body,
        content_type=content_type,
        etag=etag,
        observed_value=observed,
        cache_key=key,
    )
    assert await cache.get(**obj) == (None, None, key)


async def test_file_cache_isolates_buckets_and_object_keys():
    cache = FileCache(_FakeRedis(), ttl_seconds=300, max_bytes=4)
    obj = {"bucket": "bucket", "object_key": "file"}
    _, observed, key = await cache.get(**obj)
    await cache.set_if_unchanged(
        **obj,
        body=b"data",
        content_type="image/png",
        etag=None,
        observed_value=observed,
        cache_key=key,
    )
    assert (await cache.get(**obj))[0] == (b"data", "image/png", None)
    assert (await cache.get(bucket="other", object_key="file"))[0] is None
    assert (await cache.get(bucket="bucket", object_key="other"))[0] is None
