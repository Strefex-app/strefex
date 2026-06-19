"""Subscription repository — billing state keyed by company_id."""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import CompanySubscription


class SubscriptionRepository:
    async def get_by_company_id(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
    ) -> CompanySubscription | None:
        result = await session.execute(
            select(CompanySubscription).where(CompanySubscription.company_id == company_id)
        )
        return result.scalar_one_or_none()

    async def get_by_stripe_customer_id(
        self,
        session: AsyncSession,
        stripe_customer_id: str,
    ) -> CompanySubscription | None:
        result = await session.execute(
            select(CompanySubscription).where(
                CompanySubscription.stripe_customer_id == stripe_customer_id
            )
        )
        return result.scalar_one_or_none()

    async def get_or_create(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
    ) -> CompanySubscription:
        existing = await self.get_by_company_id(session, company_id)
        if existing:
            return existing
        sub = CompanySubscription(company_id=company_id)
        session.add(sub)
        await session.flush()
        await session.refresh(sub)
        return sub

    async def update(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        **kwargs,
    ) -> CompanySubscription:
        sub = await self.get_or_create(session, company_id)
        for key, value in kwargs.items():
            setattr(sub, key, value)
        await session.flush()
        await session.refresh(sub)
        return sub


subscription_repository = SubscriptionRepository()
