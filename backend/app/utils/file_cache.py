"""Optional Redis cache for MinIO object bytes."""
from __future__ import annotations

from hashlib import sha256
from uuid import uuid4

import structlog
from redis.asyncio import Redis

from app.core.config import settings
from app.utils.redis_cache import get_cache_generation, get_redis_client

log = structlog.get_logger()

_CACHE_PREFIX = "urgent-care:file:v2:"
_DATA_MARKER = b"\x02"
_INVALIDATION_MARKER = b"\x00"
_SET_IF_UNCHANGED = """
local current = redis.call('GET', KEYS[1])
if ARGV[1] == '0' then
    if current then return 0 end
elseif current ~= ARGV[2] then
    return 0
end
redis.call('SET', KEYS[1], ARGV[3], 'EX', ARGV[4])
return 1
"""


class FileCache:
    def __init__(self, redis: Redis, *, ttl_seconds: int, max_bytes: int) -> None:
        self._redis = redis
        self.ttl_seconds = ttl_seconds
        self.max_bytes = max_bytes

    @staticmethod
    def _key(bucket: str, object_key: str, generation: bytes) -> str:
        digest = sha256(f"{bucket}\0{object_key}".encode()).hexdigest()
        return f"{_CACHE_PREFIX}{generation.hex()}:{digest}"

    async def get(
        self, *, bucket: str, object_key: str
    ) -> tuple[tuple[bytes, str, str | None] | None, bytes | None, str]:
        key = self._key(bucket, object_key, await get_cache_generation(self._redis))
        raw = await self._redis.get(key)
        if raw is None:
            return None, None, key
        if not raw.startswith(_DATA_MARKER) or len(raw) < 3:
            return None, raw, key

        content_type_length = int.from_bytes(raw[1:3], "big")
        content_type_end = 3 + content_type_length
        if content_type_end > len(raw):
            return None, raw, key
        try:
            content_type = raw[3:content_type_end].decode("utf-8")
        except UnicodeDecodeError:
            return None, raw, key
        if content_type_end + 2 > len(raw):
            return None, raw, key
        etag_length = int.from_bytes(raw[content_type_end:content_type_end + 2], "big")
        etag_end = content_type_end + 2 + etag_length
        if etag_end > len(raw):
            return None, raw, key
        try:
            etag = raw[content_type_end + 2:etag_end].decode("utf-8") or None
        except UnicodeDecodeError:
            return None, raw, key
        return (raw[etag_end:], content_type, etag), raw, key

    async def set_if_unchanged(
        self,
        *,
        bucket: str,
        object_key: str,
        body: bytes,
        content_type: str,
        etag: str | None,
        observed_value: bytes | None,
        cache_key: str,
    ) -> None:
        if len(body) > self.max_bytes:
            return
        encoded_content_type = content_type.encode("utf-8")
        encoded_etag = (etag or "").encode("utf-8")
        if len(encoded_content_type) > 65535 or len(encoded_etag) > 65535:
            return
        value = (
            _DATA_MARKER
            + len(encoded_content_type).to_bytes(2, "big")
            + encoded_content_type
            + len(encoded_etag).to_bytes(2, "big")
            + encoded_etag
            + body
        )
        await self._redis.eval(
            _SET_IF_UNCHANGED,
            1,
            cache_key,
            b"0" if observed_value is None else b"1",
            observed_value or b"",
            value,
            self.ttl_seconds,
        )

    async def invalidate(self, *, bucket: str, object_key: str) -> None:
        marker = _INVALIDATION_MARKER + uuid4().bytes
        generation = await get_cache_generation(self._redis)
        await self._redis.set(
            self._key(bucket, object_key, generation),
            marker,
            ex=self.ttl_seconds * 2,
        )


_file_cache: FileCache | None = None


def initialize_file_cache() -> None:
    global _file_cache
    redis = get_redis_client()
    if redis is None or _file_cache is not None:
        return

    _file_cache = FileCache(
        redis,
        ttl_seconds=settings.file_cache_ttl_seconds,
        max_bytes=settings.file_cache_max_bytes,
    )
    log.info("file_cache_configured", ttl_seconds=settings.file_cache_ttl_seconds)


def get_file_cache() -> FileCache | None:
    return _file_cache


async def close_file_cache() -> None:
    global _file_cache
    _file_cache = None
