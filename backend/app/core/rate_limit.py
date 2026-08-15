"""Rate limiting for auth endpoints — Redis when configured, else in-memory."""
from __future__ import annotations

from fastapi import Request

from app.config import get_settings
from app.core.rate_limit_backends import MemoryRateLimitBackend, RateLimitBackend, RedisRateLimitBackend

_backend: RateLimitBackend | None = None


def _resolve_backend() -> RateLimitBackend:
    global _backend
    if _backend is not None:
        return _backend
    settings = get_settings()
    if settings.redis_url:
        _backend = RedisRateLimitBackend(settings.redis_url)
    else:
        _backend = MemoryRateLimitBackend()
    return _backend


def reset_rate_limit_backend_for_tests() -> None:
    """Reset singleton backend (pytest)."""
    global _backend
    _backend = None


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


async def check_rate_limit(key: str, *, max_calls: int, window_seconds: int) -> None:
    backend = _resolve_backend()
    await backend.check(key, max_calls=max_calls, window_seconds=window_seconds)


async def check_auth_rate_limit(request: Request, action: str) -> None:
    ip = client_ip(request)
    limits = {
        "login": (30, 60),
        "register": (10, 3600),
        "verify_resend": (3, 3600),
        "refresh": (30, 60),
    }
    max_calls, window = limits.get(action, (20, 60))
    await check_rate_limit(f"auth:{action}:{ip}", max_calls=max_calls, window_seconds=window)


async def check_email_rate_limit(email: str, action: str) -> None:
    normalized = email.strip().lower()
    limits = {
        "verify_resend": (3, 3600),
    }
    max_calls, window = limits.get(action, (5, 3600))
    await check_rate_limit(f"auth:{action}:email:{normalized}", max_calls=max_calls, window_seconds=window)
