"""World Bank Open Data — trade, industry, CPI, GDP (annual series)."""
from __future__ import annotations

import asyncio
from typing import Any, List

import httpx

WB_BASE = "https://api.worldbank.org/v2"

WB_GDP_GROWTH = "NY.GDP.MKTP.KD.ZG"
WB_CPI = "FP.CPI.TOTL.ZG"
WB_INDUSTRY_VA = "NV.IND.TOTL.ZS"
WB_TRADE_GDP = "NE.TRD.GNFS.ZS"
WB_EXPORT_GDP = "NE.EXP.GNFS.ZS"
WB_IMPORT_GDP = "NE.IMP.GNFS.ZS"
WB_ENERGY_PC = "EG.USE.PCAP.KG.OE"


async def fetch_indicator_rows(country: str, indicator: str, per_page: int = 50) -> List[dict[str, Any]]:
    url = f"{WB_BASE}/country/{country}/indicator/{indicator}"
    async with httpx.AsyncClient(timeout=25.0) as client:
        r = await client.get(url, params={"format": "json", "per_page": per_page})
        r.raise_for_status()
        data = r.json()
    if not isinstance(data, list) or len(data) < 2 or data[1] is None:
        return []
    return data[1]


async def get_worldbank_bundle(country: str, per_page: int = 50) -> dict[str, List[dict[str, Any]]]:
    """Fetch four series in parallel to avoid long sequential waits."""
    timeout = httpx.Timeout(20.0, connect=8.0)
    async with httpx.AsyncClient(timeout=timeout) as client:

        async def one(code: str) -> List[dict[str, Any]]:
            url = f"{WB_BASE}/country/{country}/indicator/{code}"
            r = await client.get(url, params={"format": "json", "per_page": per_page})
            r.raise_for_status()
            data = r.json()
            if not isinstance(data, list) or len(data) < 2 or data[1] is None:
                return []
            return data[1]

        gdp, cpi, trade, industry, export, import_, energy = await asyncio.gather(
            one(WB_GDP_GROWTH),
            one(WB_CPI),
            one(WB_TRADE_GDP),
            one(WB_INDUSTRY_VA),
            one(WB_EXPORT_GDP),
            one(WB_IMPORT_GDP),
            one(WB_ENERGY_PC),
        )
    return {
        "gdp": gdp,
        "cpi": cpi,
        "trade": trade,
        "industry": industry,
        "export": export,
        "import": import_,
        "energy": energy,
    }
