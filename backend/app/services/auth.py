"""Auth service: login, token, current user resolution."""
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password, create_access_token, decode_token
from app.core.tenant import TenantContext, get_tenant_context
from app.models.user import User
from app.repositories.company import company_repository
from app.repositories.user import user_repository
from app.schemas.auth import UserInResponse, TenantInResponse


def _effective_role(user: User) -> str:
    """Role code for JWT and RBAC (Role.code or fallback 'user')."""
    if user.role is not None:
        return user.role.code
    return "user"


class AuthService:
    async def resolve_company_id(
        self,
        session: AsyncSession,
        company_slug: str | None,
        user: User | None,
    ) -> uuid.UUID | None:
        """Resolve company_id for login: from slug or from user's company."""
        if company_slug:
            company = await company_repository.get_by_slug(session, company_slug)
            return company.id if company else None
        if user:
            return user.company_id
        return None

    async def authenticate(
        self,
        session: AsyncSession,
        email: str,
        password: str,
        company_slug: str | None = None,
    ) -> tuple[User | None, str | None]:
        """
        Authenticate by email/password. If company_slug given, look up user in that company.
        Otherwise use first user with this email (single-tenant UX).
        Returns (user, error_message).
        """
        if company_slug:
            company = await company_repository.get_by_slug(session, company_slug)
            if not company:
                return None, "Company not found"
            user = await user_repository.get_by_email(session, email, company.id)
        else:
            user = await user_repository.get_by_email_any_company(session, email)
        if not user:
            return None, "Invalid credentials"
        if not user.is_active:
            return None, "User is disabled"
        if not verify_password(password, user.hashed_password):
            return None, "Invalid credentials"
        return user, None

    def build_token_payload(self, user: User, company_slug: str | None = None) -> dict[str, Any]:
        return {
            "sub": str(user.id),
            "tenant_id": str(user.company_id),
            "role": _effective_role(user),
            "tenant_slug": company_slug or (user.company.slug if user.company else None),
        }

    def create_token_for_user(self, user: User, company_slug: str | None = None) -> str:
        payload = self.build_token_payload(user, company_slug)
        return create_access_token(
            subject=payload["sub"],
            tenant_id=payload["tenant_id"],
            role=payload["role"],
            extra={"tenant_slug": payload.get("tenant_slug")},
        )

    def token_to_context(self, token: str) -> TenantContext | None:
        payload = decode_token(token)
        return get_tenant_context(payload)

    async def get_user_from_token(
        self,
        session: AsyncSession,
        token: str,
    ) -> User | None:
        """Load current user from JWT; ensure user exists and belongs to token company."""
        payload = decode_token(token)
        if not payload or "sub" not in payload or "tenant_id" not in payload:
            return None
        try:
            user_id = uuid.UUID(payload["sub"])
            company_id = uuid.UUID(payload["tenant_id"])
        except (TypeError, ValueError):
            return None
        user = await user_repository.get_by_id(session, user_id, company_id)
        return user if user and user.is_active else None

    @staticmethod
    def user_to_response(user: User) -> UserInResponse:
        return UserInResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=_effective_role(user),
            is_active=user.is_active,
        )

    @staticmethod
    def tenant_to_response(company_or_tenant: Any) -> TenantInResponse:
        """Build tenant/company response (id, name, slug, is_active)."""
        return TenantInResponse(
            id=str(company_or_tenant.id),
            name=company_or_tenant.name,
            slug=company_or_tenant.slug,
            is_active=company_or_tenant.is_active,
        )


auth_service = AuthService()
