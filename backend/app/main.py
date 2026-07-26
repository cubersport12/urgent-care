"""FastAPI application factory."""
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from sqlalchemy import text

from app.api.v1 import api_router
from app.core.config import settings
from app.core.errors import AppError
from app.db.base import engine


def _generate_operation_id(route: APIRoute) -> str:
    """Stable OpenAPI operationId: `{tag}_{name}` for codegen."""
    tag = route.tags[0] if route.tags else "api"
    return f"{tag}_{route.name}"


def configure_logging() -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer()
            if settings.is_dev
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(20),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    log = structlog.get_logger()
    log.info("app_starting", environment=settings.environment)
    if settings.is_dev:
        from app.utils.s3 import get_s3_client

        try:
            s3 = get_s3_client()
            await s3.ensure_bucket()
            await s3.ensure_public_read_policy()
        except Exception as exc:
            log.warning("minio_setup_skipped", error=str(exc))
    yield
    await engine.dispose()
    log.info("app_stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description=(
            "Urgent Care API — content CMS, learning stats, auth, media. "
            "OpenAPI: `/openapi.json` · Swagger UI: `/docs` · ReDoc: `/redoc`."
        ),
        docs_url="/docs" if not settings.is_prod else None,
        redoc_url="/redoc" if not settings.is_prod else None,
        openapi_url="/openapi.json" if not settings.is_prod else None,
        generate_unique_id_function=_generate_operation_id,
        lifespan=lifespan,
        swagger_ui_parameters={
            "persistAuthorization": True,
            "displayRequestDuration": True,
            "filter": True,
        },
    )

    cors_kwargs: dict[str, Any] = {
        "allow_origins": settings.cors_origins,
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }
    if settings.effective_cors_origin_regex:
        cors_kwargs["allow_origin_regex"] = settings.effective_cors_origin_regex
    app.add_middleware(CORSMiddleware, **cors_kwargs)

    @app.middleware("http")
    async def request_id_and_logging(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        start = time.perf_counter()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        structlog.get_logger().info(
            "request_completed",
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
        )
        structlog.contextvars.clear_contextvars()
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/health", tags=["meta"])
    async def health() -> dict:
        return {"status": "ok", "environment": settings.environment}

    @app.get("/ready", tags=["meta"])
    async def ready() -> dict:
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return {"status": "ready"}
        except Exception as e:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "error": str(e)},
            )

    return app


app = create_app()
