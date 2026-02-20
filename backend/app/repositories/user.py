"""User repository: company-scoped queries."""
import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User


class UserRepository:
    async def get_by_id(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        company_id: uuid.UUID,
    ) -> User | None:
        result = await session.execute(
            select(User)
            .options(selectinload(User.company), selectinload(User.role))
            .where(
                User.id == user_id,
                User.company_id == company_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_email(
        self,
        session: AsyncSession,
        email: str,
        company_id: uuid.UUID,
    ) -> User | None:
        result = await session.execute(
            select(User)
            .options(selectinload(User.company), selectinload(User.role))
            .where(
                User.email == email,
                User.company_id == company_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_email_any_company(
        self,
        session: AsyncSession,
        email: str,
    ) -> User | None:
        """First user with this email (any company). Used when no company_slug on login."""
        result = await session.execute(
            select(User)
            .options(selectinload(User.company), selectinload(User.role))
            .where(User.email == email)
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_by_company(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[User]:
        result = await session.execute(
            select(User)
            .where(User.company_id == company_id)
            .offset(skip)
            .limit(limit)
            .order_by(User.email)
        )
        return result.scalars().all()

    async def create(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        email: str,
        hashed_password: str,
        full_name: str | None = None,
        role_id: uuid.UUID | None = None,
    ) -> User:
        user = User(
            company_id=company_id,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            role_id=role_id,
        )
        session.add(user)
        await session.flush()
        await session.refresh(user)
        return user

    async def update(
        self,
        session: AsyncSession,
        user: User,
        **kwargs: str | bool | uuid.UUID | None,
    ) -> User:
        for key, value in kwargs.items():
            if hasattr(user, key) and value is not None:
                setattr(user, key, value)
        await session.flush()
        await session.refresh(user)
        return user


user_repository = UserRepository()
