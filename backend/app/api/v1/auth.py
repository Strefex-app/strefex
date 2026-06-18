"""Auth endpoints: login, register, me."""
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.rate_limit import check_auth_rate_limit
from app.core.security import get_password_hash
from app.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse, UserInResponse
from app.services.auth import auth_service
from app.repositories.user import user_repository
from app.repositories.company import company_repository

router = APIRouter()


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    company_name: str | None = None
    selected_plan: str | None = "start"


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email and password. Returns JWT access token.
    Optional tenant_slug (company slug) for multi-tenant; omit for single-company UX.
    """
    check_auth_rate_limit(request, "login")
    user, error = await auth_service.authenticate(
        db, payload.email, payload.password, payload.tenant_slug
    )
    if error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    company = user.company
    company_slug = company.slug if company else None
    access_token = auth_service.create_token_for_user(user, company_slug)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=auth_service.user_to_response(user),
        tenant=auth_service.tenant_to_response(company) if company else None,
    )


@router.post("/register", response_model=LoginResponse)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user. Creates company if company_name is provided.
    Returns JWT access token (auto-login).
    Default tier: 'start' (free).
    """
    check_auth_rate_limit(request, "register")
    import re

    # Validation
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

    # Check if email already exists
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

    # Create user
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

    # Generate JWT
    access_token = auth_service.create_token_for_user(user, company.slug)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=auth_service.user_to_response(user),
        tenant=auth_service.tenant_to_response(company),
    )


@router.get("/me", response_model=UserInResponse)
async def me(current_user: CurrentUser):
    """Protected: return current authenticated user (requires valid JWT)."""
    return auth_service.user_to_response(current_user)
