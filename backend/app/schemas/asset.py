"""Asset (equipment / machines) request/response schemas."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import UuidStr


class AssetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    asset_type: str = Field(..., max_length=64)
    serial_number: str | None = Field(None, max_length=128)
    location: str | None = Field(None, max_length=255)
    status: str = Field(default="active", max_length=32)
    metadata: dict[str, Any] | None = None


class AssetCreate(AssetBase):
    """company_id is set from JWT. project_id optional for assignment."""
    project_id: UuidStr | None = None


class AssetUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    asset_type: str | None = Field(None, max_length=64)
    serial_number: str | None = Field(None, max_length=128)
    location: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    project_id: UuidStr | None = None
    metadata: dict[str, Any] | None = None


class AssetRead(AssetBase):
    id: UuidStr
    company_id: UuidStr
    project_id: UuidStr | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
    # ORM uses metadata_ column; map to "metadata" in JSON
    metadata: dict[str, Any] | None = Field(None, validation_alias="metadata_")
