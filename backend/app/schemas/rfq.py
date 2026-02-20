"""RFQ and RFQ line item request/response schemas."""
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import UuidStr


# ----- RFQ -----
class RfqBase(BaseModel):
    rfq_number: str | None = Field(None, max_length=64)
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    status: str = Field(default="draft", max_length=32)
    due_date: date | None = None
    issued_at: datetime | None = None


class RfqCreate(RfqBase):
    company_id: UuidStr
    project_id: UuidStr | None = None
    created_by: UuidStr | None = None


class RfqUpdate(BaseModel):
    rfq_number: str | None = Field(None, max_length=64)
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = Field(None, max_length=32)
    due_date: date | None = None
    issued_at: datetime | None = None
    project_id: UuidStr | None = None
    created_by: UuidStr | None = None


class RfqRead(RfqBase):
    id: UuidStr
    company_id: UuidStr
    project_id: UuidStr | None = None
    created_by: UuidStr | None = None

    class Config:
        from_attributes = True


# ----- RFQ Line Item -----
class RfqLineItemBase(BaseModel):
    line_number: int
    description: str | None = None
    quantity: Decimal | None = None
    unit: str | None = Field(None, max_length=32)


class RfqLineItemCreate(RfqLineItemBase):
    rfq_id: UuidStr
    company_id: UuidStr


class RfqLineItemUpdate(BaseModel):
    line_number: int | None = None
    description: str | None = None
    quantity: Decimal | None = None
    unit: str | None = Field(None, max_length=32)


class RfqLineItemRead(RfqLineItemBase):
    id: UuidStr
    rfq_id: UuidStr
    company_id: UuidStr

    class Config:
        from_attributes = True
