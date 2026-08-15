"""Auth endpoints: login, register, me, refresh, logout."""
import re

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.config import get_settings
from app.core.auth_cookies import (
    clear_auth_cookies,
    read_refresh_cookie,
    set_auth_cookies,
)
from app.core.rate_limit import check_auth_rate_limit, check_email_rate_limit
from app.core.security import get_password_hash
from app.database import get_db
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterResponse,
    ResendVerificationRequest,
    UserInResponse,
    VerifyEmailRequest,
)
from app.services.auth import auth_service
from app.services.email_verification import (
    is_email_verified,
    issue_verification_token,
    verify_email_token,
)
from app.repositories.user import user_repository
from app.repositories.company import company_repository

router = APIRouter()


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    company_name: str | None = None
    selected_plan: str | None = "start"


def _login_response(
    response: Response,
    user,
    company,
    access_token: str,
    refresh_token: str,
) -> LoginResponse:
    set_auth_cookies(response, access_token, refresh_token)
    settings = get_settings()
    body_token = access_token
    if settings.auth_use_cookies and not settings.debug:
        body_token = None
    return LoginResponse(
        access_token=body_token,
        token_type="bearer",
        user=auth_service.user_to_response(user),
        tenant=auth_service.tenant_to_response(company) if company else None,
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email and password. Returns JWT access token.
    Optional tenant_slug (company slug) for multi-tenant; omit for single-company UX.
    When cookie auth is enabled, tokens are also set as httpOnly cookies.
    """
    await check_auth_rate_limit(request, "login")
    user, error = await auth_service.authenticate(
        db, payload.email, payload.password, payload.tenant_slug
    )
    if error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if get_settings().require_email_verification and not is_email_verified(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before signing in.",
        )

    company = user.company
    company_slug = company.slug if company else None
    access_token, refresh_token, refresh_jti = auth_service.create_tokens_for_user(user, company_slug)
    await auth_service.persist_refresh_jti(db, user, refresh_jti)
    return _login_response(response, user, company, access_token, refresh_token)


@router.post("/register", response_model=RegisterResponse)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user. Creates company if company_name is provided.
    When REQUIRE_EMAIL_VERIFICATION=true, returns pending state without session cookies.
    Default tier: 'start' (free).
    """
    await check_auth_rate_limit(request, "register")

    if not payload.email or not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', payload.email):
        raise HTTPException(status_code=400, detail="Invalid email address")
    if not payload.password or len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(c.isupper() for c in payload.password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not any(c.isdigit() for c in payload.password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")
    if not payload.company_name or not payload.company_name.strip():
        raise HTTPException(status_code=400, detail="Company name is required")

    existing = await user_repository.get_by_email_any_company(db, payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    company_name = payload.company_name.strip()
    slug = re.sub(r'[^a-z0-9]+', '-', company_name.lower()).strip('-')
    if not slug:
        raise HTTPException(status_code=400, detail="Company name must contain at least one letter or number")

    company = await company_repository.get_by_slug(db, slug)
    is_new_company = company is None
    if is_new_company:
        company = await company_repository.create(db, name=company_name, slug=slug)

    admin_role = await company_repository.get_role_by_code(db, company.id, "admin")

    from app.models.user import User
    user = User(
        company_id=company.id,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        is_active=True,
        role_id=admin_role.id if is_new_company and admin_role else None,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user, ["company", "role"])

    await issue_verification_token(db, user)

    user_response = auth_service.user_to_response(user)
    tenant_response = auth_service.tenant_to_response(company) if company else None

    if get_settings().require_email_verification:
        return RegisterResponse(
            email_verification_pending=True,
            access_token=None,
            user=user_response,
            tenant=tenant_response,
        )

    access_token, refresh_token, refresh_jti = auth_service.create_tokens_for_user(user, company.slug)
    await auth_service.persist_refresh_jti(db, user, refresh_jti)
    set_auth_cookies(response, access_token, refresh_token)
    return RegisterResponse(
        email_verification_pending=False,
        access_token=access_token if get_settings().debug or not get_settings().auth_use_cookies else None,
        user=user_response,
        tenant=tenant_response,
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_session(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Issue new access + refresh tokens from httpOnly refresh cookie (rotation)."""
    await check_auth_rate_limit(request, "refresh")
    refresh_token = read_refresh_cookie(request)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required")

    user = await auth_service.get_user_from_refresh_token(db, refresh_token)
    if not user:
        clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    if get_settings().require_email_verification and not is_email_verified(user):
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before signing in.",
        )

    company = user.company
    company_slug = company.slug if company else None
    access_token, new_refresh, refresh_jti = auth_service.create_tokens_for_user(user, company_slug)
    await auth_service.persist_refresh_jti(db, user, refresh_jti)
    return _login_response(response, user, company, access_token, new_refresh)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Clear httpOnly auth cookies and revoke the refresh token."""
    refresh_token = read_refresh_cookie(request)
    if refresh_token:
        await auth_service.revoke_refresh_token(db, refresh_token)
    clear_auth_cookies(response)
    return None


@router.get("/me", response_model=UserInResponse)
async def me(current_user: CurrentUser):
    """Protected: return current authenticated user (requires valid JWT)."""
    return auth_service.user_to_response(current_user)


@router.post("/verify-email", response_model=UserInResponse)
async def verify_email(
    payload: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Confirm email ownership using the token from the verification link."""
    user = await verify_email_token(db, payload.token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    return auth_service.user_to_response(user)


@router.post("/resend-verification")
async def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Resend verification email (always returns generic success to avoid email enumeration)."""
    await check_auth_rate_limit(request, "verify_resend")
    await check_email_rate_limit(payload.email, "verify_resend")

    user = await user_repository.get_by_email_any_company(db, payload.email)
    if user and not is_email_verified(user):
        await issue_verification_token(db, user)

    return {"status": "ok", "message": "If an unverified account exists, a verification link was sent."}
