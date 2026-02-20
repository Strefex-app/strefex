"""Company (tenant) request/response schemas."""
from pydantic import BaseModel, Field

from app.schemas.common import UuidStr


class CompanyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=64)
    is_active: bool = True


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    slug: str | None = Field(None, min_length=1, max_length=64)
    is_active: bool | None = None


class CompanyRead(CompanyBase):
    id: UuidStr

    class Config:
        from_attributes = True
