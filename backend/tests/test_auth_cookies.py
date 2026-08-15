"""httpOnly cookie auth and JWT refresh (phase 8)."""
import uuid

import pytest
from httpx import AsyncClient

from app.core.auth_cookies import ACCESS_COOKIE, REFRESH_COOKIE
from tests.helpers import bearer, register_company_user


@pytest.mark.asyncio
async def test_login_sets_http_only_auth_cookies(client: AsyncClient):
    """Register/login responses include access + refresh httpOnly cookies."""
    uid = uuid.uuid4().hex[:8]
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Cookie User",
            "email": f"cookie-{uid}@example.com",
            "password": "StrongPass1",
            "company_name": f"Cookie Co {uid}",
        },
    )
    assert response.status_code == 200
    assert ACCESS_COOKIE in response.cookies
    assert REFRESH_COOKIE in response.cookies
    raw_headers = " ".join(v for k, v in response.headers.multi_items() if k.lower() == "set-cookie")
    assert "httponly" in raw_headers.lower()


@pytest.mark.asyncio
async def test_me_works_with_cookie_without_bearer(client: AsyncClient):
    """Session cookie alone authenticates GET /auth/me."""
    reg = await register_company_user(client, company_name=f"Cookie Me {uuid.uuid4().hex[:6]}")

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == reg["user"]["email"]


@pytest.mark.asyncio
async def test_bearer_header_still_works(client: AsyncClient):
    """Authorization Bearer remains supported for API clients."""
    reg = await register_company_user(client, company_name=f"Bearer Co {uuid.uuid4().hex[:6]}")

    client.cookies.clear()
    me = await client.get("/api/v1/auth/me", headers=bearer(reg["access_token"]))
    assert me.status_code == 200


@pytest.mark.asyncio
async def test_refresh_rotates_session(client: AsyncClient):
    """POST /auth/refresh issues new cookies and returns user payload."""
    await register_company_user(client, company_name=f"Refresh Co {uuid.uuid4().hex[:6]}")

    refresh_resp = await client.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 200
    assert refresh_resp.json()["user"]["email"]
    assert ACCESS_COOKIE in refresh_resp.cookies
    assert REFRESH_COOKIE in refresh_resp.cookies

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200


@pytest.mark.asyncio
async def test_logout_clears_cookies(client: AsyncClient):
    """POST /auth/logout clears auth cookies."""
    await register_company_user(client, company_name=f"Logout Co {uuid.uuid4().hex[:6]}")

    logout_resp = await client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 204

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_refresh_token(client: AsyncClient):
    """Logout invalidates the refresh JWT even if the cookie is replayed."""
    await register_company_user(client, company_name=f"Revoke Co {uuid.uuid4().hex[:6]}")
    refresh_val = client.cookies.get(REFRESH_COOKIE)
    assert refresh_val

    logout_resp = await client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 204

    client.cookies.set(REFRESH_COOKIE, refresh_val)
    refresh_resp = await client.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_rejected_for_api_access(client: AsyncClient):
    """Refresh JWT cannot be used as a Bearer access token."""
    await register_company_user(client, company_name=f"Type Co {uuid.uuid4().hex[:6]}")
    refresh_cookie = client.cookies.get(REFRESH_COOKIE)
    assert refresh_cookie
    client.cookies.clear()

    me = await client.get("/api/v1/auth/me", headers=bearer(refresh_cookie))
    assert me.status_code == 401
