"""Redis-backed rate limiting."""
import os
import uuid

import pytest
from fastapi import HTTPException

from app.core.rate_limit import check_rate_limit, reset_rate_limit_backend_for_tests
from app.core.rate_limit_backends import RedisRateLimitBackend


@pytest.fixture
def redis_url():
    url = os.environ.get("REDIS_URL")
    if not url:
        pytest.skip("REDIS_URL not set")
    return url


@pytest.fixture(autouse=True)
def _reset_backend():
    reset_rate_limit_backend_for_tests()
    yield
    reset_rate_limit_backend_for_tests()


@pytest.mark.asyncio
async def test_redis_backend_blocks_over_cap(redis_url):
    backend = RedisRateLimitBackend(redis_url)
    key = f"test-redis-{uuid.uuid4().hex[:8]}"
    try:
        for _ in range(2):
            await backend.check(key, max_calls=2, window_seconds=60)
        with pytest.raises(HTTPException) as exc:
            await backend.check(key, max_calls=2, window_seconds=60)
        assert exc.value.status_code == 429
    finally:
        await backend.close()


@pytest.mark.asyncio
async def test_check_rate_limit_uses_redis_when_configured(monkeypatch, redis_url):
    monkeypatch.setenv("REDIS_URL", redis_url)
    reset_rate_limit_backend_for_tests()

    key = f"env-redis-{uuid.uuid4().hex[:8]}"
    for _ in range(2):
        await check_rate_limit(key, max_calls=2, window_seconds=60)
    with pytest.raises(HTTPException):
        await check_rate_limit(key, max_calls=2, window_seconds=60)

    reset_rate_limit_backend_for_tests()
