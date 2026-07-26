"""Processed Stripe webhook events — idempotency ledger."""
from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class StripeWebhookEvent(Base, UUIDMixin, TimestampMixin):
    """One row per Stripe event id; prevents duplicate subscription updates."""

    __tablename__ = "stripe_webhook_events"
    __table_args__ = (UniqueConstraint("stripe_event_id", name="uq_stripe_webhook_events_event_id"),)

    stripe_event_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(128), nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def __repr__(self) -> str:
        return f"<StripeWebhookEvent {self.stripe_event_id} {self.event_type}>"
