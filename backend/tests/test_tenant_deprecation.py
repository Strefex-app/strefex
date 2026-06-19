"""Legacy tenants table removal — API and ORM retired."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_legacy_tenants_api_not_mounted(client: AsyncClient):
    """GET /api/v1/tenants is no longer registered (companies-only model)."""
    response = await client.get("/api/v1/tenants")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_companies_via_register_still_works(client: AsyncClient):
    """Company creation path is register — not legacy /tenants."""
    import uuid

    uid = uuid.uuid4().hex[:8]
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Phase7 Admin",
            "email": f"phase7-{uid}@example.com",
            "password": "StrongPass1",
            "company_name": f"Phase7 Co {uid}",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tenant"]["slug"]
    assert data["user"]["role"] == "admin"
