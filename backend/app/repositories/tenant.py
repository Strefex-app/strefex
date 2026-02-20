"""Tenant repository."""
import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant import Tenant


class TenantRepository:
    async def get_by_id(self, session: AsyncSession, tenant_id: uuid.UUID) -> Tenant | None:
        result = await session.execute(select(Tenant).where(Tenant.id == tenant_id))
        return result.scalar_one_or_none()

    async def get_by_slug(self, session: AsyncSession, slug: str) -> Tenant | None:
        result = await session.execute(select(Tenant).where(Tenant.slug == slug))
        return result.scalar_one_or_none()

    async def list_all(
        self,
        session: AsyncSession,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[Tenant]:
        result = await session.execute(
            select(Tenant).offset(skip).limit(limit).order_by(Tenant.slug)
        )
        return result.scalars().all()

    async def create(
        self,
        session: AsyncSession,
        name: str,
        slug: str,
        is_active: bool = True,
    ) -> Tenant:
        tenant = Tenant(name=name, slug=slug, is_active=is_active)
        session.add(tenant)
        await session.flush()
        await session.refresh(tenant)
        return tenant

    async def update(
        self,
        session: AsyncSession,
        tenant: Tenant,
        **kwargs: str | bool | None,
    ) -> Tenant:
        for key, value in kwargs.items():
            if hasattr(tenant, key) and value is not None:
                setattr(tenant, key, value)
        await session.flush()
        await session.refresh(tenant)
        return tenant


tenant_repository = TenantRepository()
