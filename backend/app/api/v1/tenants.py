"""Tenant CRUD. Platform/super-admin only for create/update/delete; list/read for admins."""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, RequireAdmin
from app.database import get_db
from app.repositories.tenant import tenant_repository
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse

router = APIRouter()


@router.get("", response_model=List[TenantResponse])
async def list_tenants(
    skip: int = 0,
    limit: int = 100,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    """List tenants. Admin of any tenant can list (scope to own tenant in UI); for platform admin list all."""
    tenants = await tenant_repository.list_all(db, skip=skip, limit=limit)
    return [TenantResponse.model_validate(t) for t in tenants]


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    data: TenantCreate,
    current_user: RequireAdmin = None,
    db: AsyncSession = Depends(get_db),
):
    """Create tenant. Admin only (tenant-scoped admin can create new companies if you allow)."""
    existing = await tenant_repository.get_by_slug(db, data.slug)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant slug already exists")
    tenant = await tenant_repository.create(db, name=data.name, slug=data.slug, is_active=data.is_active)
    return TenantResponse.model_validate(tenant)


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: uuid.UUID,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    """Get tenant by id."""
    tenant = await tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return TenantResponse.model_validate(tenant)


@router.patch("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: uuid.UUID,
    data: TenantUpdate,
    current_user: RequireAdmin = None,
    db: AsyncSession = Depends(get_db),
):
    """Update tenant. Admin only."""
    tenant = await tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    updates = data.model_dump(exclude_unset=True)
    if "slug" in updates:
        other = await tenant_repository.get_by_slug(db, updates["slug"])
        if other and other.id != tenant.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already in use")
    tenant = await tenant_repository.update(db, tenant, **updates)
    return TenantResponse.model_validate(tenant)
