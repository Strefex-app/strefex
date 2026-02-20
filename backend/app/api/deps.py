"""API dependencies: JWT extraction, current user, company/tenant context, role-based access."""
import uuid
from typing import Annotated, List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant import TenantContext
from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth import auth_service


def _effective_role_code(user: User) -> str:
    """Role code for RBAC (Role.code or fallback 'user')."""
    if user.role is not None:
        return user.role.code
    return "user"


# Prefer Bearer token (clients send Authorization: Bearer <token>)
security = HTTPBearer(auto_error=False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    token: Annotated[str | None, Depends(oauth2_scheme)],
) -> str | None:
    """Extract JWT from Authorization: Bearer or OAuth2 form."""
    if credentials and credentials.scheme == "Bearer":
        return credentials.credentials
    return token


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Annotated[str | None, Depends(get_token)],
) -> User:
    """Validate JWT and load current user; 401 if missing or invalid."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await auth_service.get_user_from_token(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_tenant(
    current_user: Annotated[User, Depends(get_current_user)],
) -> TenantContext:
    """Build tenant/company context from current user (for scoped queries)."""
    return TenantContext(
        tenant_id=current_user.company_id,
        tenant_slug=getattr(current_user.company, "slug", None),
        role=_effective_role_code(current_user),
    )


async def get_company_id(
    tenant: Annotated[TenantContext, Depends(get_current_tenant)],
) -> uuid.UUID:
    """
    Dependency that returns the current company_id (tenant_id) from JWT.
    Use this so every query is explicitly scoped: list(company_id), get(id, company_id), etc.
    Never accept company_id from request body for create/update; always use this.
    """
    return tenant.tenant_id


def require_roles(allowed_roles: List[UserRole]):
    """Dependency factory: require current user to have one of the given roles (by Role.code)."""

    async def _require(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        role_code = _effective_role_code(current_user)
        allowed_codes = [r.value for r in allowed_roles]
        if role_code not in allowed_codes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return _require


# Type aliases for secure dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentTenant = Annotated[TenantContext, Depends(get_current_tenant)]
CompanyId = Annotated[uuid.UUID, Depends(get_company_id)]
RequireAdmin = Annotated[User, Depends(require_roles([UserRole.ADMIN]))]
RequireManager = Annotated[User, Depends(require_roles([UserRole.ADMIN, UserRole.MANAGER]))]
