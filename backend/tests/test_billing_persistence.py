"""Billing subscription persistence in PostgreSQL."""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.subscription import subscription_repository
from tests.helpers import bearer, register_company_user


@pytest.mark.asyncio
async def test_default_subscription_is_start_plan(client: AsyncClient):
    """New company gets implicit start plan without a pre-existing row."""
    reg = await register_company_user(client, company_name=f"Free Co {uuid.uuid4().hex[:6]}")

    resp = await client.get(
        "/api/v1/billing/subscription",
        headers=bearer(reg["access_token"]),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["plan_id"] == "start"
    assert body["status"] == "active"


@pytest.mark.asyncio
async def test_trial_persisted_in_database(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """POST /billing/trial writes trialing state readable on subsequent GET."""
    reg = await register_company_user(client, company_name=f"Trial Co {uuid.uuid4().hex[:6]}")
    headers = bearer(reg["access_token"])

    trial_resp = await client.post("/api/v1/billing/trial", headers=headers)
    assert trial_resp.status_code == 200
    assert trial_resp.json()["status"] == "trialing"

    sub_resp = await client.get("/api/v1/billing/subscription", headers=headers)
    assert sub_resp.json()["plan_id"] == "premium"
    assert sub_resp.json()["status"] == "trialing"
    assert sub_resp.json()["trial_ends_at"]

    row = await subscription_repository.get_by_company_id(
        db_session,
        uuid.UUID(reg["tenant"]["id"]),
    )
    assert row is not None
    assert row.status == "trialing"
    assert row.plan_id == "premium"
