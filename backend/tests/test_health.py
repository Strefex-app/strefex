"""Basic health and billing endpoint tests."""
import pytest
from httpx import AsyncClient
from tests.conftest import make_auth_header


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Health endpoint should return 200 OK."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_list_plans(client: AsyncClient):
    """GET /api/v1/billing/plans should return 4 plans."""
    response = await client.get("/api/v1/billing/plans")
    assert response.status_code == 200
    plans = response.json()
    assert len(plans) == 4
    plan_ids = [p["id"] for p in plans]
    assert plan_ids == ["start", "basic", "standard", "premium"]


@pytest.mark.asyncio
async def test_plans_have_correct_prices(client: AsyncClient):
    """Verify plan prices match specification."""
    response = await client.get("/api/v1/billing/plans")
    plans = {p["id"]: p for p in response.json()}
    assert plans["start"]["price"] == 0
    assert plans["basic"]["price"] == 10
    assert plans["standard"]["price"] == 50
    assert plans["premium"]["price"] == 200


@pytest.mark.asyncio
async def test_plans_have_tier_levels(client: AsyncClient):
    """Verify plan tiers are 0-3."""
    response = await client.get("/api/v1/billing/plans")
    plans = response.json()
    tiers = [p["tier"] for p in plans]
    assert tiers == [0, 1, 2, 3]


@pytest.mark.asyncio
async def test_auth_required_for_subscription(client: AsyncClient):
    """GET /api/v1/billing/subscription should require auth."""
    response = await client.get("/api/v1/billing/subscription")
    assert response.status_code in (401, 422)  # 401 if auth enforced, 422 if dependency missing


@pytest.mark.asyncio
async def test_login_without_credentials(client: AsyncClient):
    """POST /api/v1/auth/login without body should return 422."""
    response = await client.post("/api/v1/auth/login", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_validation(client: AsyncClient):
    """POST /api/v1/auth/register with weak password should fail."""
    response = await client.post("/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "weak",  # Too short
    })
    assert response.status_code == 400
    assert "8 characters" in response.json().get("detail", "")


@pytest.mark.asyncio
async def test_register_email_validation(client: AsyncClient):
    """POST /api/v1/auth/register with invalid email should fail."""
    response = await client.post("/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": "not-an-email",
        "password": "StrongPass1",
    })
    assert response.status_code == 400
