"""Shared schema helpers: UUID coercion and Bubble-friendly pagination."""
from typing import Annotated, Any, Generic, TypeVar

from pydantic import BaseModel, BeforeValidator

T = TypeVar("T")


def _coerce_uuid_str(v: Any) -> str:
    """Coerce UUID to str for JSON responses."""
    return str(v) if v is not None else ""


# Use in response schemas: id: UuidStr
UuidStr = Annotated[str, BeforeValidator(_coerce_uuid_str)]


class PaginatedResponse(BaseModel, Generic[T]):
    """Bubble API Connector–friendly list response: results, count, page, per_page."""

    results: list[T]
    count: int
    page: int = 1
    per_page: int = 20
