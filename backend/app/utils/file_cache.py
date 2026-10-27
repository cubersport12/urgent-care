"""Optional Redis cache for MinIO object bytes."""
from __future__ import annotations

from hashlib import sha256
from uuid import uuid4

import structlog
from redis.asyncio import Redis

from app.core.config import settings

log = structlog.get_logger()

_CACHE_PREFIX = "urgent-care:file:v1:"
_DATA_MARKER = b"\x01"
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
    def _key(bucket: str, object_key: str) -> str:
        digest = sha256(f"{bucket}\0{object_key}".encode()).hexdigest()
        return f"{_CACHE_PREFIX}{digest}"

    async def get(
        self, *, bucket: str, object_key: str
    ) -> tuple[tuple[bytes, str] | None, bytes | None]:
        raw = await self._redis.get(self._key(bucket, object_key))
        if raw is None:
            return None, None
        if not raw.startswith(_DATA_MARKER) or len(raw) < 3:
            return None, raw

        content_type_length = int.from_bytes(raw[1:3], "big")
        content_type_end = 3 + content_type_length
        if content_type_end > len(raw):
            return None, raw
        try:
            content_type = raw[3:content_type_end].decode("utf-8")
        except UnicodeDecodeError:
            return None, raw
        return (raw[content_type_end:], content_type), raw

    async def set_if_unchanged(
        self,
        *,
        bucket: str,
        object_key: str,
        body: bytes,
        content_type: str,
        observed_value: bytes | None,
    ) -> None:
        if len(body) > self.max_bytes:
            return
        encoded_content_type = content_type.encode("utf-8")
        if len(encoded_content_type) > 65535:
            return
        value = (
            _DATA_MARKER
            + len(encoded_content_type).to_bytes(2, "big")
            + encoded_content_type
            + body
        )
        await self._redis.eval(
            _SET_IF_UNCHANGED,
            1,
            self._key(bucket, object_key),
            b"0" if observed_value is None else b"1",
            observed_value or b"",
            value,
            self.ttl_seconds,
        )

    async def invalidate(self, *, bucket: str, object_key: str) -> None:
        marker = _INVALIDATION_MARKER + uuid4().bytes
        await self._redis.set(
            self._key(bucket, object_key),
            marker,
            ex=self.ttl_seconds * 2,
        )


_redis_client: Redis | None = None
_file_cache: FileCache | None = None


def initialize_file_cache() -> None:
    global _redis_client, _file_cache
    if not settings.redis_url or _redis_client is not None:
        return

    _redis_client = Redis.from_url(
        settings.redis_url,
        decode_responses=False,
        socket_connect_timeout=0.1,
        socket_timeout=0.1,
        max_connections=10,
    )
    _file_cache = FileCache(
        _redis_client,
        ttl_seconds=settings.file_cache_ttl_seconds,
        max_bytes=settings.file_cache_max_bytes,
    )
    log.info("file_cache_configured", ttl_seconds=settings.file_cache_ttl_seconds)


def get_file_cache() -> FileCache | None:
    return _file_cache


async def close_file_cache() -> None:
    global _redis_client, _file_cache
    if _redis_client is not None:
        await _redis_client.aclose()
    _redis_client = None
    _file_cache = None
