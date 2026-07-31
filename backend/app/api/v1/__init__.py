"""API v1 router aggregator."""
from fastapi import APIRouter

from app.api.v1.achievements import router as achievements_router
from app.api.v1.articles import router as articles_router
from app.api.v1.auth import router as auth_router
from app.api.v1.billing import router as billing_router
from app.api.v1.folders import router as folders_router
from app.api.v1.media import router as media_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.rescue import router as rescue_router
from app.api.v1.stats import router as stats_router
from app.api.v1.tests import router as tests_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(billing_router)
api_router.include_router(notifications_router)
api_router.include_router(achievements_router)
api_router.include_router(folders_router)
api_router.include_router(articles_router)
api_router.include_router(tests_router)
api_router.include_router(rescue_router)
api_router.include_router(stats_router)
api_router.include_router(media_router)
