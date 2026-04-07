"""Pydantic models for intelligence API envelopes (optional validation)."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class SeriesPoint(BaseModel):
    year: str
    value: float | None = None


class IndicatorsEnvelope(BaseModel):
    """Normalized macro bundle returned to the frontend."""

    gdp: list[dict[str, Any]] = Field(default_factory=list)
    cpi: list[dict[str, Any]] = Field(default_factory=list)
    trade: list[dict[str, Any]] = Field(default_factory=list)
    industry: list[dict[str, Any]] = Field(default_factory=list)
    extensions: dict[str, Any] = Field(default_factory=dict)
