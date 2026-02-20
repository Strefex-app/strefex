"""Project service: CRUD scoped by company_id (multi-tenant isolation)."""
import uuid
from datetime import date
from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.repositories.project import project_repository


class ProjectService:
    """All operations use company_id from tenant context; never from request body."""

    async def list(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        search: str | None = None,
    ) -> Sequence[Project]:
        return await project_repository.list_by_company(
            session, company_id, skip=skip, limit=limit, status=status, search=search
        )

    async def count(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        status: str | None = None,
        search: str | None = None,
    ) -> int:
        return await project_repository.count_by_company(
            session, company_id, status=status, search=search
        )

    async def get_by_id(
        self,
        session: AsyncSession,
        project_id: uuid.UUID,
        company_id: uuid.UUID,
    ) -> Project | None:
        return await project_repository.get_by_id(
            session, project_id, company_id
        )

    async def create(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        created_by: uuid.UUID | None,
        name: str,
        code: str | None = None,
        description: str | None = None,
        status: str = "draft",
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> Project:
        return await project_repository.create(
            session,
            company_id=company_id,
            name=name,
            code=code,
            description=description,
            status=status,
            start_date=start_date,
            end_date=end_date,
            created_by=created_by,
        )

    async def update(
        self,
        session: AsyncSession,
        project: Project,
        **kwargs,
    ) -> Project:
        # Never allow updating company_id (cross-tenant move)
        kwargs.pop("company_id", None)
        return await project_repository.update(session, project, **kwargs)

    async def delete(self, session: AsyncSession, project: Project) -> None:
        await project_repository.delete(session, project)


project_service = ProjectService()
