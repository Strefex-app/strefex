"""
Billing / Subscription endpoints — Stripe integration.

4 tiers: start (free), basic ($10/mo), standard ($50/mo), premium ($200/mo).
Handles: plans, subscriptions, checkout, portal, webhooks, customer creation.
"""
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, CurrentTenant, get_db
from app.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Stripe is optional
try:
    import stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_CONFIGURED = bool(stripe.api_key)
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
except ImportError:
    STRIPE_CONFIGURED = False
    stripe = None
    STRIPE_WEBHOOK_SECRET = ""


# ── Schemas ──────────────────────────────────────────────────

class PlanOut(BaseModel):
    id: str
    name: str
    price: float
    interval: str
    tier: int
    features: list[str]

class CheckoutRequest(BaseModel):
    plan_id: str

class CheckoutResponse(BaseModel):
    session_id: str

class CreateSubscriptionRequest(BaseModel):
    plan_id: str
    payment_method_id: str

class CreateSubscriptionResponse(BaseModel):
    subscription_id: str
    status: str
    client_secret: str | None = None

class PortalResponse(BaseModel):
    url: str

class SubscriptionOut(BaseModel):
    plan_id: str
    status: str
    current_period_end: str | None = None
    cancel_at_period_end: bool = False
    trial_ends_at: str | None = None


# ── Plan definitions (4 tiers: start, basic, standard, premium) ─
# Seller plans start from Free. Buyer plans start from Basic (different prices).

PLANS = [
    PlanOut(id="start", name="Free (Seller)", price=0, interval="month", tier=0, features=[
        "1 user", "Up to 3 projects", "Basic dashboard", "Company profile",
        "Community support", "Basic visibility — 1 industry, 1 equipment category",
    ]),
    PlanOut(id="basic", name="Basic", price=10, interval="month", tier=1, features=[
        "5 users — Team", "Up to 10 projects", "Basic analytics & reports",
        "Email support", "Multiple industries", "Company profile",
    ]),
    PlanOut(id="standard", name="Standard", price=50, interval="month", tier=2, features=[
        "25 users — Team", "Up to 50 projects", "Advanced analytics & reports",
        "Executive Summary", "Project & Audit Schedule", "Priority email support",
    ]),
    PlanOut(id="premium", name="Premium", price=200, interval="month", tier=3, features=[
        "Unlimited users", "Unlimited projects", "Full analytics suite",
        "All management modules", "Messenger", "Profile contact management",
        "Custom integrations", "SLA & priority support",
    ]),
]

STRIPE_PRICE_IDS: dict[str, str] = {
    "basic":    os.getenv("STRIPE_PRICE_BASIC", "price_xxx_basic"),
    "standard": os.getenv("STRIPE_PRICE_STANDARD", "price_xxx_standard"),
    "premium":  os.getenv("STRIPE_PRICE_PREMIUM", "price_xxx_premium"),
}


# ── In-memory subscription store (replace with DB table in production) ─

_subscriptions: dict[str, dict] = {}  # tenant_id -> subscription data
_stripe_customers: dict[str, str] = {}  # tenant_id -> stripe_customer_id


def _get_sub(tenant_id: str) -> dict:
    return _subscriptions.get(tenant_id, {
        "plan_id": "start",
        "status": "active",
        "current_period_end": None,
        "cancel_at_period_end": False,
        "trial_ends_at": None,
    })


def _set_sub(tenant_id: str, **kwargs):
    current = _get_sub(tenant_id)
    current.update(kwargs)
    _subscriptions[tenant_id] = current
    logger.info(f"[Billing] Subscription updated for tenant {tenant_id}: {current}")


async def _get_or_create_stripe_customer(tenant_id: str, email: str, name: str = None) -> str:
    """Get or create a Stripe Customer mapped to a tenant."""
    if tenant_id in _stripe_customers:
        return _stripe_customers[tenant_id]
    if not STRIPE_CONFIGURED:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    customer = stripe.Customer.create(
        email=email,
        name=name or email,
        metadata={"tenant_id": tenant_id},
    )
    _stripe_customers[tenant_id] = customer.id
    return customer.id


# ── Endpoints ────────────────────────────────────────────────

@router.get("/plans", response_model=list[PlanOut])
async def list_plans():
    """Public: list available subscription plans."""
    return PLANS


@router.get("/subscription", response_model=SubscriptionOut)
async def get_subscription(
    current_user: CurrentUser = None,
    tenant: CurrentTenant = None,
):
    """Get current subscription for the authenticated tenant."""
    sub = _get_sub(str(tenant.tenant_id))

    # Check trial expiry
    if sub.get("status") == "trialing" and sub.get("trial_ends_at"):
        trial_end = datetime.fromisoformat(sub["trial_ends_at"])
        if trial_end < datetime.now(timezone.utc):
            _set_sub(str(tenant.tenant_id), plan_id="start", status="active", trial_ends_at=None)
            sub = _get_sub(str(tenant.tenant_id))

    return SubscriptionOut(**sub)


@router.post("/trial")
async def start_trial(
    current_user: CurrentUser = None,
    tenant: CurrentTenant = None,
):
    """Start a 14-day free trial of premium features."""
    tid = str(tenant.tenant_id)
    current = _get_sub(tid)
    if current.get("status") == "trialing":
        raise HTTPException(status_code=400, detail="Trial already active")
    if current.get("plan_id") not in ("start", "free"):
        raise HTTPException(status_code=400, detail="Already on a paid plan")

    from datetime import timedelta
    trial_end = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    _set_sub(tid, plan_id="premium", status="trialing", trial_ends_at=trial_end)
    return {"status": "trialing", "trial_ends_at": trial_end}


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    payload: CheckoutRequest,
    current_user: CurrentUser = None,
    tenant: CurrentTenant = None,
):
    """Create a Stripe Checkout Session for plan upgrade."""
    if not STRIPE_CONFIGURED:
        raise HTTPException(status_code=503, detail="Stripe is not configured on the server")

    price_id = STRIPE_PRICE_IDS.get(payload.plan_id)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {payload.plan_id}")

    tid = str(tenant.tenant_id)
    customer_id = await _get_or_create_stripe_customer(
        tid, current_user.email,
        current_user.full_name,
    )

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=os.getenv("FRONTEND_URL", "http://localhost:5173") + "/plans?success=true",
            cancel_url=os.getenv("FRONTEND_URL", "http://localhost:5173") + "/plans?canceled=true",
            subscription_data={
                "trial_period_days": 0,
                "metadata": {"tenant_id": tid, "plan_id": payload.plan_id},
            },
            metadata={"tenant_id": tid, "plan_id": payload.plan_id},
        )
        return CheckoutResponse(session_id=session.id)
    except Exception as e:
        logger.error(f"[Billing] Checkout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-subscription", response_model=CreateSubscriptionResponse)
async def create_subscription(
    payload: CreateSubscriptionRequest,
    current_user: CurrentUser = None,
    tenant: CurrentTenant = None,
):
    """
    Create a Stripe subscription directly using a PaymentMethod ID.
    Used during signup flow when user selects a paid plan and provides card details inline.
    """
    if not STRIPE_CONFIGURED:
        raise HTTPException(status_code=503, detail="Stripe is not configured on the server")

    price_id = STRIPE_PRICE_IDS.get(payload.plan_id)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {payload.plan_id}")

    tid = str(tenant.tenant_id)
    customer_id = await _get_or_create_stripe_customer(
        tid, current_user.email, current_user.full_name,
    )

    try:
        # Attach the payment method to the customer
        stripe.PaymentMethod.attach(payload.payment_method_id, customer=customer_id)
        # Set as default payment method
        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": payload.payment_method_id},
        )

        # Create the subscription
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            expand=["latest_invoice.payment_intent"],
            metadata={"tenant_id": tid, "plan_id": payload.plan_id},
        )

        sub_status = subscription.status
        client_secret = None

        if sub_status == "active":
            # Payment succeeded immediately
            _set_sub(tid, plan_id=payload.plan_id, status="active", trial_ends_at=None)
        elif sub_status == "incomplete":
            # Requires additional authentication (3D Secure / SCA)
            payment_intent = subscription.latest_invoice.payment_intent
            if payment_intent and payment_intent.status == "requires_action":
                client_secret = payment_intent.client_secret
            else:
                # Other incomplete reason
                logger.warning(f"[Billing] Subscription incomplete for tenant {tid}: {payment_intent}")

        return CreateSubscriptionResponse(
            subscription_id=subscription.id,
            status=sub_status,
            client_secret=client_secret,
        )

    except stripe.error.CardError as e:
        raise HTTPException(status_code=400, detail=f"Card error: {e.user_message}")
    except Exception as e:
        logger.error(f"[Billing] Create subscription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    current_user: CurrentUser = None,
    tenant: CurrentTenant = None,
):
    """Create a Stripe Customer Portal session for managing billing."""
    if not STRIPE_CONFIGURED:
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    tid = str(tenant.tenant_id)
    customer_id = _stripe_customers.get(tid)
    if not customer_id:
        raise HTTPException(status_code=400, detail="No billing account found. Subscribe to a plan first.")

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=os.getenv("FRONTEND_URL", "http://localhost:5173") + "/plans",
    )
    return PortalResponse(url=session.url)


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe webhook handler — processes subscription lifecycle events.
    """
    if not STRIPE_CONFIGURED:
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]
    logger.info(f"[Billing] Webhook: {event_type}")

    if event_type == "checkout.session.completed":
        tenant_id = data.get("metadata", {}).get("tenant_id")
        plan_id = data.get("metadata", {}).get("plan_id")
        if tenant_id and plan_id:
            _set_sub(tenant_id, plan_id=plan_id, status="active", trial_ends_at=None)
            logger.info(f"[Billing] Tenant {tenant_id} upgraded to {plan_id}")

    elif event_type == "customer.subscription.updated":
        tenant_id = data.get("metadata", {}).get("tenant_id")
        status = data.get("status", "active")
        cancel_at = data.get("cancel_at_period_end", False)
        period_end = data.get("current_period_end")
        period_end_iso = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat() if period_end else None
        if tenant_id:
            _set_sub(tenant_id, status=status, cancel_at_period_end=cancel_at, current_period_end=period_end_iso)

    elif event_type == "customer.subscription.deleted":
        tenant_id = data.get("metadata", {}).get("tenant_id")
        if tenant_id:
            _set_sub(tenant_id, plan_id="start", status="active", cancel_at_period_end=False,
                     current_period_end=None, trial_ends_at=None)
            logger.info(f"[Billing] Tenant {tenant_id} downgraded to start (subscription deleted)")

    elif event_type == "invoice.payment_failed":
        customer_id = data.get("customer")
        # Find tenant by customer_id
        for tid, cid in _stripe_customers.items():
            if cid == customer_id:
                _set_sub(tid, status="past_due")
                logger.warning(f"[Billing] Tenant {tid} payment failed — marked past_due")
                break

    return {"status": "ok"}
