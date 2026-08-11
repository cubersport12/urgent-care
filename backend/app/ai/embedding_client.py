"""Async embeddings via OpenAI-compatible API (vsellm.ru / qwen3) — ported from GymAI."""
from __future__ import annotations

import asyncio

import httpx
from openai import AsyncOpenAI, BadRequestError

from app.core.config import settings


class EmbeddingAPIError(Exception):
    """Unrecoverable embedding provider error."""


def embeddings_configured() -> bool:
    return len((settings.embedding_api_key or "").strip()) >= 10


class EmbeddingClient:
    def __init__(self) -> None:
        base_url = settings.embedding_base_url.rstrip("/") + "/"
        self._client = AsyncOpenAI(
            api_key=settings.embedding_api_key or "unused",
            base_url=base_url,
            timeout=httpx.Timeout(settings.embedding_timeout_seconds, connect=10.0),
            max_retries=0,
        )

    async def embeddings(
        self,
        texts: list[str],
        *,
        model: str | None = None,
    ) -> list[list[float]]:
        if not texts:
            return []
        if not embeddings_configured():
            raise EmbeddingAPIError("EMBEDDING_API_KEY is not configured")

        all_embeddings: list[list[float]] = []
        batch_size = 64
        model_name = model or settings.embedding_model
        retries = max(1, settings.embedding_max_retries)

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            last_err: Exception | None = None
            for attempt in range(retries):
                try:
                    response = await self._client.embeddings.create(
                        model=model_name,
                        input=batch,
                    )
                    break
                except BadRequestError as e:
                    raise EmbeddingAPIError(
                        f"Embedding API error for model {model_name!r}: {e}"
                    ) from e
                except (
                    httpx.HTTPStatusError,
                    httpx.TimeoutException,
                    httpx.TransportError,
                    httpx.ReadError,
                    OSError,
                ) as e:
                    last_err = e
                    if attempt + 1 >= retries:
                        raise EmbeddingAPIError(str(e)) from e
                    await asyncio.sleep(min(30, 2**attempt))
                except Exception as e:
                    # openai wraps transport failures as APIConnectionError, etc.
                    name = type(e).__name__
                    if name not in ("APIConnectionError", "APITimeoutError", "InternalServerError"):
                        raise
                    last_err = e
                    if attempt + 1 >= retries:
                        raise EmbeddingAPIError(str(e)) from e
                    await asyncio.sleep(min(30, 2**attempt))
            else:
                raise EmbeddingAPIError(str(last_err) if last_err else "embed failed")

            sorted_data = sorted(response.data, key=lambda d: d.index)
            vectors = [d.embedding for d in sorted_data]
            expected = settings.embedding_dim
            for vec in vectors:
                if len(vec) != expected:
                    raise EmbeddingAPIError(
                        f"Expected embedding dim {expected}, got {len(vec)}. "
                        "Update EMBEDDING_DIM in .env to match the model output."
                    )
            all_embeddings.extend(vectors)
        return all_embeddings


_client: EmbeddingClient | None = None


def get_embedding_client() -> EmbeddingClient:
    global _client
    if _client is None:
        _client = EmbeddingClient()
    return _client
