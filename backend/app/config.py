"""Application settings from environment."""
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = Field(default="STREFEX B2B API", description="Application name")
    debug: bool = Field(default=False, description="Debug mode")

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/strefex",
        description="PostgreSQL async URL",
    )
    database_echo: bool = Field(default=False, description="Echo SQL for debugging")

    # JWT
    jwt_secret_key: str = Field(
        default="change-me-in-production-use-openssl-rand-hex-32",
        description="Secret for signing JWTs",
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_access_expire_minutes: int = Field(default=60, description="Access token TTL")
    jwt_refresh_expire_days: int = Field(default=7, description="Refresh token TTL")

    # CORS (Bubble, FlutterFlow, local)
    cors_origins: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000", "https://*.bubble.io", "https://*.flutterflow.io"],
        description="Allowed CORS origins",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
