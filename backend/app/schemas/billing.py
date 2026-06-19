"""Billing request/response schemas."""
from pydantic import BaseModel


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
