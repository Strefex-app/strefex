"""Billing subscription service — DB-backed plan state for each company."""
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.billing import SubscriptionOut
from app.models.subscription import CompanySubscription
from app.repositories.subscription import subscription_repository


def subscription_to_out(sub: CompanySubscription) -> SubscriptionOut:
    return SubscriptionOut(
        plan_id=sub.plan_id,
        status=sub.status,
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
        cancel_at_period_end=sub.cancel_at_period_end,
        trial_ends_at=sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
    )


async def apply_trial_expiry_if_needed(
    session: AsyncSession,
    sub: CompanySubscription,
) -> CompanySubscription:
    if sub.status != "trialing" or not sub.trial_ends_at:
        return sub
    trial_end = sub.trial_ends_at
    if trial_end.tzinfo is None:
        trial_end = trial_end.replace(tzinfo=timezone.utc)
    if trial_end >= datetime.now(timezone.utc):
        return sub
    return await subscription_repository.update(
        session,
        sub.company_id,
        plan_id="start",
        status="active",
        trial_ends_at=None,
    )


async def get_subscription_out(
    session: AsyncSession,
    company_id: uuid.UUID,
) -> SubscriptionOut:
    sub = await subscription_repository.get_or_create(session, company_id)
    sub = await apply_trial_expiry_if_needed(session, sub)
    return subscription_to_out(sub)


async def update_subscription(
    session: AsyncSession,
    company_id: uuid.UUID | str,
    **kwargs,
) -> CompanySubscription:
    cid = company_id if isinstance(company_id, uuid.UUID) else uuid.UUID(str(company_id))
    return await subscription_repository.update(session, cid, **kwargs)
