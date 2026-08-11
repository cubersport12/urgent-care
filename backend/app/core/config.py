"""Application settings via pydantic-settings."""
from functools import lru_cache
from typing import Any

from pydantic import Field, PostgresDsn, computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Urgent Care API"
    environment: str = Field(default="dev", pattern="^(dev|staging|prod)$")
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_public_base_url: str = "http://localhost:8000"

    database_url: PostgresDsn
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_echo: bool = False

    jwt_secret: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 30
    refresh_token_expire_days: int = 60
    bcrypt_rounds: int = 12

    admin_email: str = "test@yandex.ru"
    # Inbox for user→support messages (falls back to ADMIN_EMAIL if empty)
    support_email: str = ""

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_tls: bool = True
    password_reset_url: str = "https://trouble-dent.ru/mobile-app/reset-password"

    @property
    def support_inbox(self) -> str:
        return (self.support_email or self.admin_email or "").strip()

    s3_endpoint: str
    s3_access_key: str
    s3_secret_key: str
    s3_bucket_media: str = "cubersport12"
    s3_region: str = "us-east-1"

    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:4200",
            "http://localhost:8081",
            "http://localhost:3000",
        ]
    )
    cors_origin_regex: str | None = None

    yookassa_shop_id: str = ""
    yookassa_secret_key: str = ""
    yookassa_return_url: str = "https://trouble-dent.ru/mobile-app/"
    billing_enforcement: bool = True

    # Embeddings (OpenAI-compatible — vsellm.ru / qwen3-embedding-8b), same as GymAI
    embedding_api_key: str = ""
    embedding_base_url: str = "https://api.vsellm.ru/v1"
    embedding_model: str = "qwen/qwen3-embedding-8b"
    embedding_dim: int = 4096
    embedding_timeout_seconds: int = 60
    embedding_max_retries: int = 4

    @property
    def yookassa_configured(self) -> bool:
        return bool(self.yookassa_shop_id and self.yookassa_secret_key)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if value is None:
            return value
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("["):
                import json

                return json.loads(raw)
            return [part.strip() for part in raw.split(",") if part.strip()]
        return value

    @property
    def effective_cors_origin_regex(self) -> str | None:
        if self.cors_origin_regex:
            return self.cors_origin_regex
        if self.is_dev:
            return (
                r"^https?://"
                r"(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})"
                r"(:\d+)?$"
            )
        return None

    @computed_field
    @property
    def is_prod(self) -> bool:
        return self.environment == "prod"

    @computed_field
    @property
    def is_dev(self) -> bool:
        return self.environment == "dev"

    def model_post_init(self, __context: Any) -> None:
        pass


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
