"""Domain errors decoupled from FastAPI HTTPException."""
from __future__ import annotations

from typing import Any


class AppError(Exception):
    def __init__(
        self,
        detail: str | dict[str, Any],
        *,
        status_code: int = 400,
        code: str | None = None,
    ) -> None:
        self.detail = detail
        self.status_code = status_code
        self.code = code
        message = detail if isinstance(detail, str) else detail.get("message", code or "error")
        super().__init__(message)


def raise_http(exc: AppError) -> None:
    from fastapi import HTTPException

    raise HTTPException(status_code=exc.status_code, detail=exc.detail)
