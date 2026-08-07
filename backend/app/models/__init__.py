"""ORM models — import for Alembic / metadata registration."""
from app.models.achievement import Achievement, Reward, UserAchievement
from app.models.article import Article
from app.models.billing import (
    Payment,
    PaymentMethod,
    SubscriptionChange,
    Tariff,
    UserSubscription,
)
from app.models.city import City
from app.models.folder import Folder
from app.models.learning_event import LearningEvent
from app.models.notification import Notification
from app.models.password_reset import PasswordResetToken
from app.models.push_token import PushToken
from app.models.rescue import Rescue
from app.models.support import SupportMessage, SupportThread
from app.models.test import Test
from app.models.user import User

__all__ = [
    "User",
    "City",
    "Folder",
    "LearningEvent",
    "Article",
    "Test",
    "Rescue",
    "Tariff",
    "UserSubscription",
    "Payment",
    "PaymentMethod",
    "SubscriptionChange",
    "Notification",
    "PushToken",
    "Achievement",
    "Reward",
    "UserAchievement",
    "SupportThread",
    "SupportMessage",
    "PasswordResetToken",
]
