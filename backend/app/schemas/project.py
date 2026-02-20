"""Project request/response schemas."""
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.common import UuidStr


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str | None = Field(None, max_length=64)
    description: str | None = None
    status: str = Field(default="draft", max_length=32)
    start_date: date | None = None
    end_date: date | None = None


class ProjectCreate(ProjectBase):
    """Client must not send company_id; it is set from JWT (CurrentTenant)."""
    pass


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    code: str | None = Field(None, max_length=64)
    description: str | None = None
    status: str | None = Field(None, max_length=32)
    start_date: date | None = None
    end_date: date | None = None
    created_by: UuidStr | None = None


class ProjectRead(ProjectBase):
    id: UuidStr
    company_id: UuidStr
    created_by: UuidStr | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
