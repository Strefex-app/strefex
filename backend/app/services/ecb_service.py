"""ECB Statistical Data Warehouse (JSON-TS) — inflation / rates (Euro area series)."""
from __future__ import annotations

from typing import Any

import httpx

ECB_BASE = "https://sdw.ecb.europa.eu/service/data/"
# Euro area HICP annual rate (example series; may be revised by ECB)
DEFAULT_HICP_SERIES = "ICP.M.U2.N.000000.4.ANR"


async def get_ecb_data(series: str = DEFAULT_HICP_SERIES) -> dict[str, Any]:
    """
    Return ECB JSON-stat payload for a dataflow key.
    Used for headline inflation credibility alongside national CPI (World Bank).
    """
    url = f"{ECB_BASE}{series}"
    async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=5.0)) as client:
        r = await client.get(url, params={"format": "jsondata"})
        r.raise_for_status()
        return r.json()
