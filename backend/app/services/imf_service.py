"""IMF DataServices — WEO / SDMX JSON (GDP growth and related)."""
from __future__ import annotations

from typing import Any

import httpx


async def get_imf_weo_ngdp_rpch(country: str = "IT") -> dict[str, Any]:
    """
    CompactData WEO: annual NGDP_RPCH (real GDP growth) for country ISO3-style code.
    """
    url = f"https://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData/WEO/A.{country}.NGDP_RPCH"
    async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=5.0)) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()


async def get_imf_data(metric: str = "GDP", country: str = "IT") -> dict[str, Any]:
    """Facade used by architecture — WEO real GDP growth when metric is GDP."""
    if metric.upper() == "GDP":
        return await get_imf_weo_ngdp_rpch(country)
    return {"error": "unsupported_metric", "metric": metric}
