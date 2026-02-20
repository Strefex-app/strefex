"""Audit request/response schemas."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import UuidStr


class AuditBase(BaseModel):
    audit_type: str = Field(..., max_length=64)
    status: str = Field(default="scheduled", max_length=32)
    scheduled_at: datetime | None = None
    completed_at: datetime | None = None
    findings: dict[str, Any] | None = None


class AuditCreate(AuditBase):
    company_id: UuidStr
    project_id: UuidStr | None = None
    asset_id: UuidStr | None = None
    auditor_id: UuidStr | None = None


class AuditUpdate(BaseModel):
    audit_type: str | None = Field(None, max_length=64)
    status: str | None = Field(None, max_length=32)
    scheduled_at: datetime | None = None
    completed_at: datetime | None = None
    project_id: UuidStr | None = None
    asset_id: UuidStr | None = None
    auditor_id: UuidStr | None = None
    findings: dict[str, Any] | None = None


class AuditRead(AuditBase):
    id: UuidStr
    company_id: UuidStr
    project_id: UuidStr | None = None
    asset_id: UuidStr | None = None
    auditor_id: UuidStr | None = None

    class Config:
        from_attributes = True
