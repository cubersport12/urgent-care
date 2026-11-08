"""Shared Redis connection and generation for disposable cache entries."""
from __future__ import annotations

from uuid import uuid4

import structlog
from redis.asyncio import Redis

from app.core.config import settings

log = structlog.get_logger()

CACHE_GENERATION_KEY = "urgent-care:cache:v1:generation"
_redis_client: Redis | None = None


def initialize_redis_cache() -> None:
    global _redis_client
    if not settings.redis_url or _redis_client is not None:
        return

    _redis_client = Redis.from_url(
        settings.redis_url,
        decode_responses=False,
        socket_connect_timeout=0.1,
        socket_timeout=0.1,
        max_connections=20,
    )
    log.info("redis_cache_configured")


def get_redis_client() -> Redis | None:
    return _redis_client


async def get_cache_generation(redis: Redis) -> bytes:
    generation = await redis.get(CACHE_GENERATION_KEY)
    if generation is not None:
        return generation

    candidate = uuid4().bytes
    if await redis.set(CACHE_GENERATION_KEY, candidate, nx=True):
        return candidate
    return await redis.get(CACHE_GENERATION_KEY) or candidate


async def rotate_cache_generation(redis: Redis) -> None:
    await redis.set(CACHE_GENERATION_KEY, uuid4().bytes)


async def close_redis_cache() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
    _redis_client = None
