"""Normalize provider-specific rows to {year, value} series."""
from __future__ import annotations

from typing import Any, List


def worldbank_to_series(rows: List[dict[str, Any]]) -> list[dict[str, Any]]:
    out = [{"year": d["date"], "value": d["value"]} for d in rows if d.get("value") is not None]
    return list(reversed(out))


def trim_timeframe(series: list[dict[str, Any]], timeframe: str) -> list[dict[str, Any]]:
    if not series or timeframe == "all":
        return series
    n = {"5y": 5, "10y": 10}.get(timeframe, 5)
    return series[-n:] if len(series) > n else series
