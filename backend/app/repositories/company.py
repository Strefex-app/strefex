"""Company repository: lookup by slug or id."""
import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.role import Role


class CompanyRepository:
    async def get_by_id(self, session: AsyncSession, company_id: uuid.UUID) -> Company | None:
        result = await session.execute(select(Company).where(Company.id == company_id))
        return result.scalar_one_or_none()

    async def get_by_slug(self, session: AsyncSession, slug: str) -> Company | None:
        result = await session.execute(select(Company).where(Company.slug == slug))
        return result.scalar_one_or_none()

    async def get_role_by_code(
        self, session: AsyncSession, company_id: uuid.UUID, code: str
    ) -> Role | None:
        result = await session.execute(
            select(Role).where(Role.company_id == company_id, Role.code == code)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        session: AsyncSession,
        name: str,
        slug: str,
        is_active: bool = True,
    ) -> Company:
        company = Company(name=name, slug=slug, is_active=is_active)
        session.add(company)
        await session.flush()
        for role_code, role_name in (
            ("admin", "Administrator"),
            ("manager", "Manager"),
            ("user", "User"),
        ):
            session.add(
                Role(
                    company_id=company.id,
                    name=role_name,
                    code=role_code,
                )
            )
        await session.flush()
        await session.refresh(company)
        return company

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
