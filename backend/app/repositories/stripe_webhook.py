"""Stripe webhook idempotency — one processed event id per row."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.stripe_webhook_event import StripeWebhookEvent


class StripeWebhookRepository:
    async def claim_event(
        self,
        session: AsyncSession,
        stripe_event_id: str,
        event_type: str,
    ) -> bool:
        """
        Insert event id if new. Returns True when this caller should process the event,
        False when the event was already recorded (duplicate delivery).
        """
        existing = await session.execute(
            select(StripeWebhookEvent.id).where(
                StripeWebhookEvent.stripe_event_id == stripe_event_id
            )
        )
        if existing.scalar_one_or_none():
            return False

        row = StripeWebhookEvent(
            id=uuid.uuid4(),
            stripe_event_id=stripe_event_id,
            event_type=event_type,
            processed_at=datetime.now(timezone.utc),
        )
        session.add(row)
        try:
            await session.flush()
            return True
        except IntegrityError:
            await session.rollback()
            return False


stripe_webhook_repository = StripeWebhookRepository()
