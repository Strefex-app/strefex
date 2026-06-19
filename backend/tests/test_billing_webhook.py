"""Stripe webhook handling — subscription lifecycle updates (mocked, no live Stripe)."""
import json
import uuid
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient

from tests.helpers import bearer, register_company_user


@pytest.fixture(autouse=True)
def clear_billing_memory():
    from app.api.v1 import billing

    billing._subscriptions.clear()
    billing._stripe_customers.clear()
    yield
    billing._subscriptions.clear()
    billing._stripe_customers.clear()


@pytest.fixture
def stripe_webhook_ready(monkeypatch):
    import app.api.v1.billing as billing_mod

    monkeypatch.setattr(billing_mod, "STRIPE_CONFIGURED", True)
    monkeypatch.setattr(billing_mod, "STRIPE_WEBHOOK_SECRET", "whsec_test")

    mock_stripe = MagicMock()

    class SignatureVerificationError(Exception):
        pass

    mock_stripe.error.SignatureVerificationError = SignatureVerificationError

    def construct_event(payload, _sig_header, _secret):
        return json.loads(payload)

    mock_stripe.Webhook.construct_event = construct_event
    monkeypatch.setattr(billing_mod, "stripe", mock_stripe)
    return billing_mod


def _webhook_payload(event_type: str, obj: dict) -> dict:
    return {"type": event_type, "data": {"object": obj}}


@pytest.mark.asyncio
async def test_webhook_checkout_completed_upgrades_plan(
    client: AsyncClient,
    stripe_webhook_ready,
):
    """checkout.session.completed sets tenant subscription plan from metadata."""
    reg = await register_company_user(client, company_name=f"Billing Co {uuid.uuid4().hex[:6]}")
    tenant_id = reg["tenant"]["id"]

    event = _webhook_payload(
        "checkout.session.completed",
        {"metadata": {"tenant_id": tenant_id, "plan_id": "premium"}},
    )
    resp = await client.post(
        "/api/v1/billing/webhook",
        content=json.dumps(event).encode(),
        headers={"stripe-signature": "test_sig"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    sub_resp = await client.get(
        "/api/v1/billing/subscription",
        headers=bearer(reg["access_token"]),
    )
    assert sub_resp.status_code == 200
    assert sub_resp.json()["plan_id"] == "premium"
    assert sub_resp.json()["status"] == "active"


@pytest.mark.asyncio
async def test_webhook_subscription_deleted_downgrades_to_start(
    client: AsyncClient,
    stripe_webhook_ready,
):
    """customer.subscription.deleted resets tenant to free start plan."""
    reg = await register_company_user(client, company_name=f"Churn Co {uuid.uuid4().hex[:6]}")
    tenant_id = reg["tenant"]["id"]

    stripe_webhook_ready._set_sub(tenant_id, plan_id="standard", status="active")

    event = _webhook_payload(
        "customer.subscription.deleted",
        {"metadata": {"tenant_id": tenant_id}},
    )
    resp = await client.post(
        "/api/v1/billing/webhook",
        content=json.dumps(event).encode(),
        headers={"stripe-signature": "test_sig"},
    )
    assert resp.status_code == 200

    sub_resp = await client.get(
        "/api/v1/billing/subscription",
        headers=bearer(reg["access_token"]),
    )
    body = sub_resp.json()
    assert body["plan_id"] == "start"
    assert body["status"] == "active"


@pytest.mark.asyncio
async def test_webhook_rejects_invalid_signature(client: AsyncClient, monkeypatch):
    """Invalid stripe-signature returns 400."""
    import app.api.v1.billing as billing_mod

    monkeypatch.setattr(billing_mod, "STRIPE_CONFIGURED", True)
    monkeypatch.setattr(billing_mod, "STRIPE_WEBHOOK_SECRET", "whsec_test")

    mock_stripe = MagicMock()

    class SignatureVerificationError(Exception):
        pass

    mock_stripe.error.SignatureVerificationError = SignatureVerificationError
    mock_stripe.Webhook.construct_event = MagicMock(side_effect=SignatureVerificationError())
    monkeypatch.setattr(billing_mod, "stripe", mock_stripe)

    resp = await client.post(
        "/api/v1/billing/webhook",
        content=b"{}",
        headers={"stripe-signature": "bad"},
    )
    assert resp.status_code == 400
    assert "Invalid signature" in resp.json()["detail"]
