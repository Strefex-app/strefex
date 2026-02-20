"""Tenant request/response schemas."""
from typing import Annotated, Any

from pydantic import BaseModel, Field, BeforeValidator


def _coerce_str(v: Any) -> str:
    return str(v) if v is not None else ""


class TenantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=64)
    is_active: bool = True


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    slug: str | None = Field(None, min_length=1, max_length=64)
    is_active: bool | None = None


class TenantResponse(TenantBase):
    id: Annotated[str, BeforeValidator(_coerce_str)]

    class Config:
        from_attributes = True
