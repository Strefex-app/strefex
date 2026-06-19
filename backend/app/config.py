"""Application settings from environment."""
from functools import lru_cache
from typing import List

from pydantic import Field, model_validator
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

    # httpOnly cookie auth (H1) — Bearer header remains supported for API clients
    auth_use_cookies: bool = Field(default=True, description="Set JWT in httpOnly cookies on login")
    auth_cookie_secure: bool = Field(
        default=False,
        description="Secure cookie flag (auto-true when DEBUG=false unless overridden)",
    )
    auth_cookie_samesite: str = Field(default="lax", description="SameSite: lax, strict, or none")
    auth_cookie_domain: str | None = Field(default=None, description="Optional cookie domain")

    # CORS (Bubble, FlutterFlow, local — use allow_origin_regex in main for subdomains)
    cors_origins: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        description="Allowed CORS origins (exact match)",
    )

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if not self.debug:
            if self.jwt_secret_key.startswith("change-me"):
                raise ValueError(
                    "JWT_SECRET_KEY must be set to a strong secret when DEBUG=false"
                )
            if "postgres:postgres@" in self.database_url:
                raise ValueError(
                    "DATABASE_URL must not use default postgres credentials when DEBUG=false"
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
