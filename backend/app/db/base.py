"""SQLAlchemy 2.0 async engine + session factory + Base."""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    str(settings.database_url),
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    echo=settings.db_echo,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Register models on metadata
from app.models.article import Article  # noqa: E402, F401
from app.models.billing import (  # noqa: E402, F401
    Payment,
    PaymentMethod,
    SubscriptionChange,
    Tariff,
    UserSubscription,
)
from app.models.city import City  # noqa: E402, F401
from app.models.embedding_cache import EmbeddingCache  # noqa: E402, F401
from app.models.folder import Folder  # noqa: E402, F401
from app.models.learning_event import LearningEvent  # noqa: E402, F401
from app.models.push_token import PushToken  # noqa: E402, F401
from app.models.rescue import Rescue  # noqa: E402, F401
from app.models.test import Test  # noqa: E402, F401
from app.models.user import User  # noqa: E402, F401
