"""Project CRUD: RESTful, company-scoped, pagination, filtering, Bubble-friendly JSON."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CompanyId, CurrentUser, get_db
from app.core.multitenant import assert_same_company
from app.schemas.common import PaginatedResponse
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services.project import project_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ProjectRead])
async def list_projects(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    status: str | None = Query(None, description="Filter by status (e.g. draft, active)"),
    search: str | None = Query(None, alias="q", description="Search by name or code"),
    current_user: CurrentUser = None,
    company_id: CompanyId = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List projects for the current company. Bubble-friendly: results, count, page, per_page.
    """
    skip = (page - 1) * per_page
    items = await project_service.list(
        db, company_id, skip=skip, limit=per_page, status=status, search=search
    )
    total = await project_service.count(db, company_id, status=status, search=search)
    return PaginatedResponse(
        results=[ProjectRead.model_validate(p) for p in items],
        count=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID,
    current_user: CurrentUser = None,
    company_id: CompanyId = None,
    db: AsyncSession = Depends(get_db),
):
    """Get one project by id. 404 if not found or different company."""
    project = await project_service.get_by_id(db, project_id, company_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    assert_same_company(project.company_id, company_id, "Project")
    return ProjectRead.model_validate(project)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    current_user: CurrentUser = None,
    company_id: CompanyId = None,
    db: AsyncSession = Depends(get_db),
):
    """Create project in the current company. company_id from JWT."""
    project = await project_service.create(
        db,
        company_id=company_id,
        created_by=current_user.id,
        name=data.name,
        code=data.code,
        description=data.description,
        status=data.status,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    return ProjectRead.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    current_user: CurrentUser = None,
    company_id: CompanyId = None,
    db: AsyncSession = Depends(get_db),
):
    """Update project. 404 if not found or different company. company_id never updated."""
    project = await project_service.get_by_id(db, project_id, company_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    assert_same_company(project.company_id, company_id, "Project")
    updates = data.model_dump(exclude_unset=True)
    project = await project_service.update(db, project, **updates)
    return ProjectRead.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    current_user: CurrentUser = None,
    company_id: CompanyId = None,
    db: AsyncSession = Depends(get_db),
):
    """Delete project. 404 if not found or different company."""
    project = await project_service.get_by_id(db, project_id, company_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    assert_same_company(project.company_id, company_id, "Project")
    await project_service.delete(db, project)
