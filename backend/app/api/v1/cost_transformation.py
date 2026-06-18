"""
Cost Transformation Intelligence API — collectors, normalizer, indicator & scenario engines, reports.
Routes remain under /api/v1/cti for the STREFEX frontend.
"""
from __future__ import annotations

import asyncio
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query

from app.api.deps import CurrentUser

from app.engine.normalizer import trim_timeframe, worldbank_to_series
from app.engine.report_builder import build_report
from app.services import ecb_service, imf_service
from app.services.inflation_momentum_service import inflation_momentum as build_inflation_momentum
from app.services.worldbank_service import get_worldbank_bundle

router = APIRouter()

# IMF + ECB are optional credibility layers — cap wait so the UI never hangs on slow providers.
_EXTENSIONS_TOTAL_S = 8.0


async def _extensions_for_country(country: str) -> dict[str, Any]:
    """Parallel IMF/ECB fetches with a hard deadline (fail-soft)."""

    async def _imf() -> Any:
        try:
            return await imf_service.get_imf_data("GDP", country)
        except Exception as e:  # noqa: BLE001
            return {"error": str(e)}

    async def _ecb() -> Any:
        try:
            return await ecb_service.get_ecb_data()
        except Exception as e:  # noqa: BLE001
            return {"error": str(e)}

    try:
        imf_r, ecb_r = await asyncio.wait_for(
            asyncio.gather(_imf(), _ecb()),
            timeout=_EXTENSIONS_TOTAL_S,
        )
        return {"imf": imf_r, "ecb": ecb_r}
    except asyncio.TimeoutError:
        return {
            "imf": {"error": "timeout", "detail": f">{_EXTENSIONS_TOTAL_S}s"},
            "ecb": {"error": "timeout", "detail": f">{_EXTENSIONS_TOTAL_S}s"},
        }


@router.get("/indicators")
async def indicators(
    _current_user: CurrentUser,
    country: str = Query("IT", min_length=2, max_length=3),
    timeframe: Literal["5y", "10y", "all"] = Query("5y"),
) -> dict[str, Any]:
    bundle = await get_worldbank_bundle(country)
    out: dict[str, Any] = {
        "gdp": trim_timeframe(worldbank_to_series(bundle["gdp"]), timeframe),
        "cpi": trim_timeframe(worldbank_to_series(bundle["cpi"]), timeframe),
        "trade": trim_timeframe(worldbank_to_series(bundle["trade"]), timeframe),
        "industry": trim_timeframe(worldbank_to_series(bundle["industry"]), timeframe),
    }
    out["extensions"] = await _extensions_for_country(country)
    out["meta"] = {"country": country, "timeframe": timeframe, "sources": ["worldbank", "imf", "ecb"]}
    return out


@router.get("/inflation-momentum")
async def inflation_momentum_route(
    _current_user: CurrentUser,
    country: str = Query("IT", min_length=2, max_length=2),
) -> dict[str, Any]:
    """ECB monthly HICP (MoM change in YoY rate, pp) + WB annual GDP growth delta (pp)."""
    return await build_inflation_momentum(country)


@router.get("/report")
async def report(
    _current_user: CurrentUser,
    country: str = Query("IT", min_length=2, max_length=3),
    city: str = Query("Milan", min_length=1, max_length=120),
) -> dict[str, Any]:
    bundle = await get_worldbank_bundle(country)
    data = {
        "gdp": worldbank_to_series(bundle["gdp"]),
        "cpi": worldbank_to_series(bundle["cpi"]),
        "trade": worldbank_to_series(bundle["trade"]),
        "industry": worldbank_to_series(bundle["industry"]),
        "export": worldbank_to_series(bundle["export"]),
        "import": worldbank_to_series(bundle["import"]),
        "energy": worldbank_to_series(bundle["energy"]),
        "salary": 32000.0,
        "cost_index": 120.0,
    }
    rep = build_report(country, city, data)
    rep["extensions"] = await _extensions_for_country(country)
    return rep
