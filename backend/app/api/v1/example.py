"""Example protected endpoints: JWT + RBAC usage."""
from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, CurrentTenant, RequireAdmin, RequireManager

router = APIRouter()


@router.get("/protected")
async def example_protected(current_user: CurrentUser):
    """
    Example: any authenticated user (valid JWT).
    Use CurrentUser dependency to require login.
    """
    return {
        "message": "You are authenticated",
        "user_id": str(current_user.id),
        "email": current_user.email,
    }


@router.get("/manager-only")
async def example_manager_only(current_user: RequireManager, tenant: CurrentTenant):
    """
    Example: Admin or Manager role required.
    Use RequireManager dependency for role-based access.
    """
    return {
        "message": "Manager or Admin access granted",
        "user_id": str(current_user.id),
        "role": tenant.role,
        "tenant_id": str(tenant.tenant_id),
    }


@router.get("/admin-only")
async def example_admin_only(current_user: RequireAdmin):
    """
    Example: Admin role only.
    Use RequireAdmin dependency for admin-only endpoints.
    """
    return {
        "message": "Admin access granted",
        "user_id": str(current_user.id),
    }
