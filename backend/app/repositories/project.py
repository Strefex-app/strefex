"""Project repository: all queries scoped by company_id to enforce multi-tenant isolation."""
import uuid
from datetime import date
from typing import Sequence

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project


class ProjectRepository:
    """Every method requires company_id; never query without it."""

    def _list_filters(self, company_id: uuid.UUID, status: str | None, search: str | None):
        stmt = select(Project).where(Project.company_id == company_id)
        if status:
            stmt = stmt.where(Project.status == status)
        if search and search.strip():
            q = f"%{search.strip()}%"
            stmt = stmt.where(or_(Project.name.ilike(q), Project.code.ilike(q)))
        return stmt

    async def count_by_company(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        status: str | None = None,
        search: str | None = None,
    ) -> int:
        stmt = select(func.count(Project.id)).where(Project.company_id == company_id)
        if status:
            stmt = stmt.where(Project.status == status)
        if search and search.strip():
            q = f"%{search.strip()}%"
            stmt = stmt.where(or_(Project.name.ilike(q), Project.code.ilike(q)))
        result = await session.execute(stmt)
        return result.scalar() or 0

    async def list_by_company(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        search: str | None = None,
    ) -> Sequence[Project]:
        stmt = (
            self._list_filters(company_id, status, search)
            .order_by(Project.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await session.execute(stmt)
        return result.scalars().all()

    async def get_by_id(
        self,
        session: AsyncSession,
        project_id: uuid.UUID,
        company_id: uuid.UUID,
    ) -> Project | None:
        result = await session.execute(
            select(Project).where(
                Project.id == project_id,
                Project.company_id == company_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        name: str,
        code: str | None = None,
        description: str | None = None,
        status: str = "draft",
        start_date: date | None = None,
        end_date: date | None = None,
        created_by: uuid.UUID | None = None,
    ) -> Project:
        project = Project(
            company_id=company_id,
            name=name,
            code=code,
            description=description,
            status=status,
            start_date=start_date,
            end_date=end_date,
            created_by=created_by,
        )
        session.add(project)
        await session.flush()
        await session.refresh(project)
        return project

    async def update(
        self,
        session: AsyncSession,
        project: Project,
        **kwargs,
    ) -> Project:
        for key, value in kwargs.items():
            if hasattr(project, key):
                setattr(project, key, value)
        await session.flush()
        await session.refresh(project)
        return project

    async def delete(self, session: AsyncSession, project: Project) -> None:
        await session.delete(project)
        await session.flush()


project_repository = ProjectRepository()
