"""Multi-tenant isolation: company-scoped resources must not leak across tenants."""
import uuid

import pytest
from httpx import AsyncClient

from tests.helpers import bearer, register_company_user


@pytest.mark.asyncio
async def test_project_not_visible_across_companies(client: AsyncClient):
    """User in company B cannot read a project created in company A."""
    company_a = await register_company_user(client, company_name=f"Alpha {uuid.uuid4().hex[:6]}")
    company_b = await register_company_user(client, company_name=f"Beta {uuid.uuid4().hex[:6]}")

    create_resp = await client.post(
        "/api/v1/projects",
        json={"name": "Alpha secret project", "status": "active"},
        headers=bearer(company_a["access_token"]),
    )
    assert create_resp.status_code == 201
    project_id = create_resp.json()["id"]

    cross_get = await client.get(
        f"/api/v1/projects/{project_id}",
        headers=bearer(company_b["access_token"]),
    )
    assert cross_get.status_code == 404

    list_b = await client.get(
        "/api/v1/projects",
        headers=bearer(company_b["access_token"]),
    )
    assert list_b.status_code == 200
    ids = [p["id"] for p in list_b.json()["results"]]
    assert project_id not in ids


@pytest.mark.asyncio
async def test_project_update_blocked_for_other_company(client: AsyncClient):
    """PATCH/DELETE from another company returns 404 (no cross-tenant mutation)."""
    company_a = await register_company_user(client, company_name=f"Gamma {uuid.uuid4().hex[:6]}")
    company_b = await register_company_user(client, company_name=f"Delta {uuid.uuid4().hex[:6]}")

    create_resp = await client.post(
        "/api/v1/projects",
        json={"name": "Shared boundary", "status": "draft"},
        headers=bearer(company_a["access_token"]),
    )
    project_id = create_resp.json()["id"]

    patch_resp = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={"name": "Hijacked"},
        headers=bearer(company_b["access_token"]),
    )
    assert patch_resp.status_code == 404

    delete_resp = await client.delete(
        f"/api/v1/projects/{project_id}",
        headers=bearer(company_b["access_token"]),
    )
    assert delete_resp.status_code == 404

    still_there = await client.get(
        f"/api/v1/projects/{project_id}",
        headers=bearer(company_a["access_token"]),
    )
    assert still_there.status_code == 200
    assert still_there.json()["name"] == "Shared boundary"


@pytest.mark.asyncio
async def test_user_not_visible_across_companies(client: AsyncClient):
    """GET /users/{id} returns 404 when the user belongs to another company."""
    company_a = await register_company_user(client, company_name=f"Epsilon {uuid.uuid4().hex[:6]}")
    company_b = await register_company_user(client, company_name=f"Zeta {uuid.uuid4().hex[:6]}")

    user_a_id = company_a["user"]["id"]

    cross_get = await client.get(
        f"/api/v1/users/{user_a_id}",
        headers=bearer(company_b["access_token"]),
    )
    assert cross_get.status_code == 404


@pytest.mark.asyncio
async def test_auth_me_scoped_to_token_company(client: AsyncClient):
    """/auth/me always reflects the JWT company, not another tenant."""
    company_a = await register_company_user(client, company_name=f"Theta {uuid.uuid4().hex[:6]}")
    company_b = await register_company_user(client, company_name=f"Iota {uuid.uuid4().hex[:6]}")

    me_a = await client.get("/api/v1/auth/me", headers=bearer(company_a["access_token"]))
    me_b = await client.get("/api/v1/auth/me", headers=bearer(company_b["access_token"]))

    assert me_a.status_code == 200
    assert me_b.status_code == 200
    assert me_a.json()["id"] == company_a["user"]["id"]
    assert me_b.json()["id"] == company_b["user"]["id"]
    assert me_a.json()["id"] != me_b.json()["id"]
