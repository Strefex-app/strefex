"""Company repository: lookup by slug or id."""
import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company


class CompanyRepository:
    async def get_by_id(self, session: AsyncSession, company_id: uuid.UUID) -> Company | None:
        result = await session.execute(select(Company).where(Company.id == company_id))
        return result.scalar_one_or_none()

    async def get_by_slug(self, session: AsyncSession, slug: str) -> Company | None:
        result = await session.execute(select(Company).where(Company.slug == slug))
        return result.scalar_one_or_none()

    async def list_all(
        self,
        session: AsyncSession,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[Company]:
        result = await session.execute(
            select(Company).offset(skip).limit(limit).order_by(Company.slug)
        )
        return result.scalars().all()


company_repository = CompanyRepository()
