"""Role request/response schemas."""
from pydantic import BaseModel, Field

from app.schemas.common import UuidStr


class RoleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    code: str = Field(..., min_length=1, max_length=32)
    description: str | None = None


class RoleCreate(RoleBase):
    company_id: UuidStr


class RoleUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=64)
    code: str | None = Field(None, min_length=1, max_length=32)
    description: str | None = None


class RoleRead(RoleBase):
    id: UuidStr
    company_id: UuidStr

    class Config:
        from_attributes = True
