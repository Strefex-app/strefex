"""
Billing / Subscription endpoints — Stripe integration.

4 tiers: start (free), basic ($10/mo), standard ($50/mo), premium ($200/mo).
Handles: plans, subscriptions, checkout, portal, webhooks, customer creation.
Subscription state is persisted in PostgreSQL (company_subscriptions).
"""
import os
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, CurrentTenant, get_db
from app.repositories.subscription import subscription_repository
from app.repositories.stripe_webhook import stripe_webhook_repository
from app.schemas.billing import (
    CheckoutRequest,
    CheckoutResponse,
    CreateSubscriptionRequest,
    CreateSubscriptionResponse,
    PlanOut,
    PortalResponse,
    SubscriptionOut,
)
from app.services.billing_subscription import get_subscription_out, update_subscription

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


async def _get_or_create_stripe_customer(
    db: AsyncSession,
    company_id,
    email: str,
    name: str | None = None,
) -> str:
    """Get or create a Stripe Customer mapped to a company; persist customer id."""
    sub = await subscription_repository.get_or_create(db, company_id)
    if sub.stripe_customer_id:
        return sub.stripe_customer_id
    if not STRIPE_CONFIGURED:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    customer = stripe.Customer.create(
        email=email,
        name=name or email,
        metadata={"tenant_id": str(company_id)},
    )
    await subscription_repository.update(db, company_id, stripe_customer_id=customer.id)
    return customer.id


@router.get("/plans", response_model=list[PlanOut])
async def list_plans():
    """Public: list available subscription plans."""
    return PLANS


@router.get("/subscription", response_model=SubscriptionOut)
async def get_subscription(
    current_user: CurrentUser = None,
    tenant: CurrentTenant = None,
    db: AsyncSession = Depends(get_db),
):
    """Get current subscription for the authenticated tenant."""
    return await get_subscription_out(db, tenant.tenant_id)


@router.post("/trial")
async def start_trial(
    current_user: CurrentUser = None,
    tenant: CurrentTenant = None,
    db: AsyncSession = Depends(get_db),
):
    """Start a 14-day free trial of premium features."""
    sub = await subscription_repository.get_or_create(db, tenant.tenant_id)
    if sub.status == "trialing":
        raise HTTPException(status_code=400, detail="Trial already active")
    if sub.plan_id not in ("start", "free"):
        raise HTTPException(status_code=400, detail="Already on a paid plan")

    trial_end = datetime.now(timezone.utc) + timedelta(days=14)
    await update_subscription(
        db,
        tenant.tenant_id,
        plan_id="premium",
        status="trialing",
        trial_ends_at=trial_end,
    )
    return {"status": "trialing", "trial_ends_at": trial_end.isoformat()}


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    payload: CheckoutRequest,
    current_user: CurrentUser = None,
    tenant: CurrentTenant = None,
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session for plan upgrade."""
    if not STRIPE_CONFIGURED:
        raise HTTPException(status_code=503, detail="Stripe is not configured on the server")

    price_id = STRIPE_PRICE_IDS.get(payload.plan_id)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {payload.plan_id}")

    tid = str(tenant.tenant_id)
    customer_id = await _get_or_create_stripe_customer(
        db, tenant.tenant_id, current_user.email, current_user.full_name,
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
        raise HTTPException(status_code=500, detail="Checkout failed. Please try again.")


@router.post("/create-subscription", response_model=CreateSubscriptionResponse)
async def create_subscription(
    payload: CreateSubscriptionRequest,
    current_user: CurrentUser = None,
    tenant: CurrentTenant = None,
    db: AsyncSession = Depends(get_db),
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
        db, tenant.tenant_id, current_user.email, current_user.full_name,
    )

    try:
        stripe.PaymentMethod.attach(payload.payment_method_id, customer=customer_id)
        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": payload.payment_method_id},
        )

        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            expand=["latest_invoice.payment_intent"],
            metadata={"tenant_id": tid, "plan_id": payload.plan_id},
        )

        sub_status = subscription.status
        client_secret = None

        if sub_status == "active":
            await update_subscription(
                db,
                tenant.tenant_id,
                plan_id=payload.plan_id,
                status="active",
                trial_ends_at=None,
                stripe_subscription_id=subscription.id,
            )
        elif sub_status == "incomplete":
            payment_intent = subscription.latest_invoice.payment_intent
            if payment_intent and payment_intent.status == "requires_action":
                client_secret = payment_intent.client_secret
            else:
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
        raise HTTPException(status_code=500, detail="Subscription creation failed. Please try again.")


@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    current_user: CurrentUser = None,
    tenant: CurrentTenant = None,
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Customer Portal session for managing billing."""
    if not STRIPE_CONFIGURED:
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    sub = await subscription_repository.get_or_create(db, tenant.tenant_id)
    if not sub.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found. Subscribe to a plan first.")

    session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=os.getenv("FRONTEND_URL", "http://localhost:5173") + "/plans",
    )
    return PortalResponse(url=session.url)


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
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
    event_id = event.get("id")
    logger.info(f"[Billing] Webhook: {event_type} ({event_id})")

    if event_id:
        should_process = await stripe_webhook_repository.claim_event(
            db, event_id, event_type
        )
        if not should_process:
            logger.info(f"[Billing] Duplicate webhook ignored: {event_id}")
            return {"status": "duplicate"}

    if event_type == "checkout.session.completed":
        tenant_id = data.get("metadata", {}).get("tenant_id")
        plan_id = data.get("metadata", {}).get("plan_id")
        if tenant_id and plan_id:
            await update_subscription(
                db,
                tenant_id,
                plan_id=plan_id,
                status="active",
                trial_ends_at=None,
            )
            logger.info(f"[Billing] Tenant {tenant_id} upgraded to {plan_id}")

    elif event_type == "customer.subscription.updated":
        tenant_id = data.get("metadata", {}).get("tenant_id")
        sub_status = data.get("status", "active")
        cancel_at = data.get("cancel_at_period_end", False)
        period_end = data.get("current_period_end")
        period_end_dt = (
            datetime.fromtimestamp(period_end, tz=timezone.utc) if period_end else None
        )
        if tenant_id:
            await update_subscription(
                db,
                tenant_id,
                status=sub_status,
                cancel_at_period_end=cancel_at,
                current_period_end=period_end_dt,
                stripe_subscription_id=data.get("id"),
            )

    elif event_type == "customer.subscription.deleted":
        tenant_id = data.get("metadata", {}).get("tenant_id")
        if tenant_id:
            await update_subscription(
                db,
                tenant_id,
                plan_id="start",
                status="active",
                cancel_at_period_end=False,
                current_period_end=None,
                trial_ends_at=None,
                stripe_subscription_id=None,
            )
            logger.info(f"[Billing] Tenant {tenant_id} downgraded to start (subscription deleted)")

    elif event_type == "invoice.payment_failed":
        customer_id = data.get("customer")
        if customer_id:
            sub = await subscription_repository.get_by_stripe_customer_id(db, customer_id)
            if sub:
                await update_subscription(db, sub.company_id, status="past_due")
                logger.warning(
                    f"[Billing] Tenant {sub.company_id} payment failed — marked past_due"
                )

    return {"status": "ok"}
