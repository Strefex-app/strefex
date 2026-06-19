"""httpOnly JWT cookie helpers for browser session auth."""
from datetime import timedelta

from fastapi import Response

from app.config import get_settings

settings = get_settings()

ACCESS_COOKIE = "strefex_access_token"
REFRESH_COOKIE = "strefex_refresh_token"


def _cookie_kwargs(max_age: int) -> dict:
    secure = settings.auth_cookie_secure or not settings.debug
    return {
        "httponly": True,
        "secure": secure,
        "samesite": settings.auth_cookie_samesite,
        "path": "/",
        "max_age": max_age,
        **({"domain": settings.auth_cookie_domain} if settings.auth_cookie_domain else {}),
    }


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Attach access + refresh JWTs as httpOnly cookies."""
    if not settings.auth_use_cookies:
        return
    access_max = int(timedelta(minutes=settings.jwt_access_expire_minutes).total_seconds())
    refresh_max = int(timedelta(days=settings.jwt_refresh_expire_days).total_seconds())
    response.set_cookie(ACCESS_COOKIE, access_token, **_cookie_kwargs(access_max))
    response.set_cookie(REFRESH_COOKIE, refresh_token, **_cookie_kwargs(refresh_max))


def clear_auth_cookies(response: Response) -> None:
    """Remove auth cookies on logout."""
    delete_kwargs = {
        "path": "/",
        **({"domain": settings.auth_cookie_domain} if settings.auth_cookie_domain else {}),
    }
    response.delete_cookie(ACCESS_COOKIE, **delete_kwargs)
    response.delete_cookie(REFRESH_COOKIE, **delete_kwargs)


def read_access_cookie(request) -> str | None:
    token = request.cookies.get(ACCESS_COOKIE)
    return token if token else None


def read_refresh_cookie(request) -> str | None:
    token = request.cookies.get(REFRESH_COOKIE)
    return token if token else None
