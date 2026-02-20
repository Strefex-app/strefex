"""User request/response schemas."""
from typing import Annotated, Any

from pydantic import BaseModel, EmailStr, Field, BeforeValidator

from app.schemas.common import UuidStr


def _coerce_str(v: Any) -> str:
    return str(v) if v is not None else ""


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    is_active: bool = True


class UserCreate(UserBase):
    company_id: UuidStr
    role_id: UuidStr | None = None
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    full_name: str | None = None
    role_id: UuidStr | None = None
    is_active: bool | None = None
    password: str | None = Field(None, min_length=8)


class UserRead(UserBase):
    id: UuidStr
    company_id: UuidStr
    role_id: UuidStr | None = None

    class Config:
        from_attributes = True


# Backward compatibility aliases
class UserInDB(UserRead):
    pass


class UserResponse(UserRead):
    pass
