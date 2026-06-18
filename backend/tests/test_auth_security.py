"""Auth security: rate limiting."""
import pytest
from fastapi import HTTPException

from app.core.rate_limit import check_rate_limit


def test_rate_limit_allows_under_cap():
    key = "test-rate-limit-allow"
    for _ in range(3):
        check_rate_limit(key, max_calls=5, window_seconds=60)


def test_rate_limit_blocks_over_cap():
    key = "test-rate-limit-block"
    for _ in range(3):
        check_rate_limit(key, max_calls=3, window_seconds=60)
    with pytest.raises(HTTPException) as exc:
        check_rate_limit(key, max_calls=3, window_seconds=60)
    assert exc.value.status_code == 429
    assert "Too many requests" in exc.value.detail
