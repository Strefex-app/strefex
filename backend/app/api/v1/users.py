"""User CRUD scoped by tenant."""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, CurrentTenant, RequireAdmin
from app.database import get_db
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.user import user_service

router = APIRouter()


@router.get("", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: RequireAdmin = None,
    tenant: CurrentTenant = None,
    db: AsyncSession = Depends(get_db),
):
    """Example protected endpoint: list users in current company. Admin role required."""
    users = await user_service.list(db, tenant.tenant_id, skip=skip, limit=limit)
    return [UserResponse.model_validate(u) for u in users]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    current_user: RequireAdmin = None,
    tenant: CurrentTenant = None,
    db: AsyncSession = Depends(get_db),
):
    """Create user in current tenant. Admin only."""
    try:
        user = await user_service.create(db, tenant.tenant_id, data)
        return UserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    current_user: CurrentUser = None,
    tenant: CurrentTenant = None,
    db: AsyncSession = Depends(get_db),
):
    """Get user by id in current tenant."""
    user = await user_service.get_by_id(db, user_id, tenant.tenant_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    current_user: RequireAdmin = None,
    tenant: CurrentTenant = None,
    db: AsyncSession = Depends(get_db),
):
    """Update user. Admin only."""
    user = await user_service.get_by_id(db, user_id, tenant.tenant_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        user = await user_service.update(db, user, data)
        return UserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    current_user: RequireAdmin = None,
    tenant: CurrentTenant = None,
    db: AsyncSession = Depends(get_db),
):
    """Delete user. Admin only."""
    user = await user_service.get_by_id(db, user_id, tenant.tenant_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await user_service.delete(db, user)
