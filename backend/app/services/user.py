"""User service: CRUD scoped by company."""
import uuid
from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User
from app.repositories.user import user_repository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    async def get_by_id(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        company_id: uuid.UUID,
    ) -> User | None:
        return await user_repository.get_by_id(session, user_id, company_id)

    async def list(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[User]:
        return await user_repository.list_by_company(session, company_id, skip=skip, limit=limit)

    async def create(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        data: UserCreate,
    ) -> User:
        existing = await user_repository.get_by_email(session, data.email, company_id)
        if existing:
            raise ValueError("User with this email already exists in this company")
        return await user_repository.create(
            session,
            company_id=company_id,
            email=data.email,
            hashed_password=get_password_hash(data.password),
            full_name=data.full_name,
            role_id=data.role_id,
        )

    async def update(
        self,
        session: AsyncSession,
        user: User,
        data: UserUpdate,
    ) -> User:
        updates = data.model_dump(exclude_unset=True)
        if "password" in updates and updates["password"]:
            updates["hashed_password"] = get_password_hash(updates.pop("password"))
        if "password" in updates:
            del updates["password"]
        return await user_repository.update(session, user, **updates)

    async def delete(self, session: AsyncSession, user: User) -> None:
        await session.delete(user)
        await session.flush()


user_service = UserService()
