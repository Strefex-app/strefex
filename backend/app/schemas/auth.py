"""Auth request/response schemas."""
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)
    tenant_slug: str | None = Field(None, description="Optional tenant slug when user has multiple tenants")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserInResponse"
    tenant: "TenantInResponse | None" = None


class RegisterResponse(BaseModel):
    """Register may complete immediately or wait for email verification."""
    email_verification_pending: bool = False
    access_token: str | None = None
    token_type: str = "bearer"
    user: "UserInResponse"
    tenant: "TenantInResponse | None" = None


# Avoid circular import by using forward refs or defining here
class UserInResponse(BaseModel):
    id: str
    email: str
    full_name: str | None
    role: str
    is_active: bool
    email_verified: bool = False

    class Config:
        from_attributes = True


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=8)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class TenantInResponse(BaseModel):
    id: str
    name: str
    slug: str
    is_active: bool

    class Config:
        from_attributes = True


LoginResponse.model_rebuild()
RegisterResponse.model_rebuild()
