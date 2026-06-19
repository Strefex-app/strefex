"""Auth message helpers."""
from app.services.auth import format_multi_company_login_error


def test_format_multi_company_login_error_lists_slugs():
    msg = format_multi_company_login_error(["beta", "acme", "gamma"])
    assert "acme, beta, gamma" in msg
    assert "company slug" in msg


def test_format_multi_company_login_error_truncates_long_lists():
    slugs = [f"co-{i}" for i in range(8)]
    msg = format_multi_company_login_error(slugs)
    assert "co-0" in msg
    assert "…" in msg
