"""In-memory rate limiting for auth endpoints (single-process; use Redis for multi-worker)."""
import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status

_lock = Lock()
_hits: dict[str, list[float]] = defaultdict(list)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def check_rate_limit(key: str, *, max_calls: int, window_seconds: int) -> None:
    now = time.monotonic()
    with _lock:
        recent = [t for t in _hits[key] if now - t < window_seconds]
        if len(recent) >= max_calls:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )
        recent.append(now)
        _hits[key] = recent


def check_auth_rate_limit(request: Request, action: str) -> None:
    ip = client_ip(request)
    limits = {
        "login": (30, 60),
        "register": (10, 3600),
    }
    max_calls, window = limits.get(action, (20, 60))
    check_rate_limit(f"auth:{action}:{ip}", max_calls=max_calls, window_seconds=window)
