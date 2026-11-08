"""Short-lived Redis cache for the shared learning catalog."""
from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from hashlib import sha256
from typing import Any, TypeVar

import structlog
from pydantic import BaseModel, ValidationError
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.utils.redis_cache import get_cache_generation, get_redis_client

log = structlog.get_logger()
_CACHE_PREFIX = "urgent-care:content:v1:"
_CACHE_TTL_SECONDS = 300
_MAX_ENTRY_BYTES = 1_048_576
T = TypeVar("T", bound=BaseModel)


async def _cache_key(
    db: AsyncSession, kind: str, selector: dict[str, Any]
) -> tuple[Any, str] | None:
    redis = get_redis_client()
    if not settings.content_cache_enabled or redis is None:
        return None
    try:
        revision = await db.scalar(
            text("SELECT value #>> '{}' FROM system_settings WHERE key = 'content_cache_revision'")
        )
        if not revision:
            return None
        generation = await get_cache_generation(redis)
    except RedisError as exc:
        log.warning("content_cache_key_failed", error=str(exc))
        return None

    selector_hash = sha256(
        json.dumps(selector, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    return redis, f"{_CACHE_PREFIX}{generation.hex()}:{revision}:{kind}:{selector_hash}"


async def _read(
    db: AsyncSession, kind: str, selector: dict[str, Any], schema: type[T], *, many: bool
) -> tuple[Any, Any] | None:
    key_data = await _cache_key(db, kind, selector)
    if key_data is None:
        return None
    redis, key = key_data
    try:
        raw = await redis.get(key)
    except RedisError as exc:
        log.warning("content_cache_read_failed", kind=kind, error=str(exc))
        return None
    if raw is None:
        return redis, key

    try:
        data = json.loads(raw)
        if many:
            if not isinstance(data, list):
                raise ValueError("cached content list is malformed")
            return redis, [schema.model_validate(item) for item in data]
        if not isinstance(data, dict):
            raise ValueError("cached content item is malformed")
        return redis, schema.model_validate(data)
    except (ValueError, ValidationError) as exc:
        log.warning("content_cache_entry_invalid", kind=kind, error=str(exc))
        return redis, key


async def _write(redis: Any, key: str, data: Any, schema: type[T], *, many: bool) -> None:
    try:
        if many:
            payload = [schema.model_validate(item).model_dump(mode="json", by_alias=True) for item in data]
        elif data is not None:
            payload = schema.model_validate(data).model_dump(mode="json", by_alias=True)
        else:
            return
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
        if len(encoded) <= _MAX_ENTRY_BYTES:
            await redis.set(key, encoded, ex=_CACHE_TTL_SECONDS)
    except (RedisError, TypeError, ValueError, ValidationError) as exc:
        log.warning("content_cache_write_failed", error=str(exc))


async def cached_content_list(
    db: AsyncSession,
    kind: str,
    selector: dict[str, Any],
    schema: type[T],
    loader: Callable[[], Awaitable[list[Any]]],
) -> list[Any]:
    cached = await _read(db, kind, selector, schema, many=True)
    if cached is None:
        return await loader()
    redis, value = cached
    if isinstance(value, list):
        return value
    items = await loader()
    await _write(redis, value, items, schema, many=True)
    return items


async def cached_content_item(
    db: AsyncSession,
    kind: str,
    item_id: str,
    schema: type[T],
    loader: Callable[[], Awaitable[Any]],
) -> Any:
    cached = await _read(db, kind, {"id": item_id}, schema, many=False)
    if cached is None:
        return await loader()
    redis, value = cached
    if isinstance(value, BaseModel):
        return value
    item = await loader()
    await _write(redis, value, item, schema, many=False)
    return item
