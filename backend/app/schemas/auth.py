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


# Avoid circular import by using forward refs or defining here
class UserInResponse(BaseModel):
    id: str
    email: str
    full_name: str | None
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class TenantInResponse(BaseModel):
    id: str
    name: str
    slug: str
    is_active: bool

    class Config:
        from_attributes = True


LoginResponse.model_rebuild()
