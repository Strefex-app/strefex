"""Auth security: rate limiting."""
import pytest
from fastapi import HTTPException

from app.core.rate_limit import check_rate_limit, reset_rate_limit_backend_for_tests
from app.core.rate_limit_backends import MemoryRateLimitBackend


@pytest.fixture(autouse=True)
def _memory_backend():
    reset_rate_limit_backend_for_tests()
    yield
    reset_rate_limit_backend_for_tests()


@pytest.mark.asyncio
async def test_rate_limit_allows_under_cap():
    key = "test-rate-limit-allow"
    for _ in range(3):
        await check_rate_limit(key, max_calls=5, window_seconds=60)


@pytest.mark.asyncio
async def test_rate_limit_blocks_over_cap():
    key = "test-rate-limit-block"
    for _ in range(3):
        await check_rate_limit(key, max_calls=3, window_seconds=60)
    with pytest.raises(HTTPException) as exc:
        await check_rate_limit(key, max_calls=3, window_seconds=60)
    assert exc.value.status_code == 429
    assert "Too many requests" in exc.value.detail


@pytest.mark.asyncio
async def test_memory_backend_blocks_over_cap_directly():
    backend = MemoryRateLimitBackend()
    key = "direct-memory"
    for _ in range(2):
        await backend.check(key, max_calls=2, window_seconds=60)
    with pytest.raises(HTTPException):
        await backend.check(key, max_calls=2, window_seconds=60)
