"""Rate limit storage backends — memory (single-process) or Redis (multi-worker)."""
from __future__ import annotations

import time
from abc import ABC, abstractmethod
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, status


class RateLimitBackend(ABC):
    @abstractmethod
    async def check(self, key: str, *, max_calls: int, window_seconds: int) -> None:
        """Raise HTTP 429 when the key exceeds max_calls within window_seconds."""


class MemoryRateLimitBackend(RateLimitBackend):
    """Thread-safe in-memory sliding window (single uvicorn worker)."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def check(self, key: str, *, max_calls: int, window_seconds: int) -> None:
        now = time.monotonic()
        with self._lock:
            recent = [t for t in self._hits[key] if now - t < window_seconds]
            if len(recent) >= max_calls:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again later.",
                )
            recent.append(now)
            self._hits[key] = recent


class RedisRateLimitBackend(RateLimitBackend):
    """Fixed-window counter in Redis — shared across workers."""

    def __init__(self, redis_url: str) -> None:
        self._redis_url = redis_url
        self._client = None

    async def _get_client(self):
        if self._client is None:
            import redis.asyncio as aioredis

            self._client = aioredis.from_url(self._redis_url, decode_responses=True)
        return self._client

    async def check(self, key: str, *, max_calls: int, window_seconds: int) -> None:
        client = await self._get_client()
        redis_key = f"rl:{key}"
        count = await client.incr(redis_key)
        if count == 1:
            await client.expire(redis_key, window_seconds)
        if count > max_calls:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None
