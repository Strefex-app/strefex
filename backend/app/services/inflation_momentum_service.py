"""High-frequency inflation momentum (ECB monthly HICP) + GDP growth delta from WB annual series."""
from __future__ import annotations

from typing import Any

import httpx

from app.services.worldbank_service import WB_GDP_GROWTH, fetch_indicator_rows

ECB_BASE = "https://sdw.ecb.europa.eu/service/data/"

# ECB monthly HICP annual rate of change (YoY % for each month) — national where available.
ECB_HICP_ANR: dict[str, str] = {
    "AT": "ICP.M.AT.N.000000.4.ANR",
    "BE": "ICP.M.BE.N.000000.4.ANR",
    "DE": "ICP.M.DE.N.000000.4.ANR",
    "EE": "ICP.M.EE.N.000000.4.ANR",
    "ES": "ICP.M.ES.N.000000.4.ANR",
    "FI": "ICP.M.FI.N.000000.4.ANR",
    "FR": "ICP.M.FR.N.000000.4.ANR",
    "EL": "ICP.M.EL.N.000000.4.ANR",  # Greece (ECB uses EL, not GR)
    "IE": "ICP.M.IE.N.000000.4.ANR",
    "IT": "ICP.M.IT.N.000000.4.ANR",
    "LT": "ICP.M.LT.N.000000.4.ANR",
    "LU": "ICP.M.LU.N.000000.4.ANR",
    "LV": "ICP.M.LV.N.000000.4.ANR",
    "MT": "ICP.M.MT.N.000000.4.ANR",
    "NL": "ICP.M.NL.N.000000.4.ANR",
    "PT": "ICP.M.PT.N.000000.4.ANR",
    "SI": "ICP.M.SI.N.000000.4.ANR",
    "SK": "ICP.M.SK.N.000000.4.ANR",
    "CY": "ICP.M.CY.N.000000.4.ANR",
}
EURO_AREA_FALLBACK = "ICP.M.U2.N.000000.4.ANR"


def _ecb_country_code(iso2: str) -> str:
    """ECB uses EL for Greece; ISO 3166-1 uses GR."""
    u = iso2.upper()
    return "EL" if u == "GR" else u


def _ecb_series_for_country(iso2: str) -> str | None:
    u = _ecb_country_code(iso2)
    if u in ECB_HICP_ANR:
        return ECB_HICP_ANR[u]
    # Euro-area aggregate for other EUR members not listed (e.g. HR) — still useful regional context
    euro_use_u2 = {"HR", "AD", "MC", "SM", "VA", "XK"}
    if iso2.upper() in euro_use_u2:
        return EURO_AREA_FALLBACK
    return None


def _parse_ecb_jsonstat_points(payload: dict[str, Any]) -> list[tuple[str, float]]:
    """Extract (period_id, value) sorted by period from ECB JSON-stat jsondata."""
    out: list[tuple[str, float]] = []
    try:
        ds0 = payload["dataSets"][0]
        struct = payload["structure"]
        time_vals = struct["dimensions"]["observation"][0]["values"]
        series0 = next(iter(ds0["series"].values()))
        obs = series0["observations"]
        for i, tv in enumerate(time_vals):
            tid = str(tv.get("id") or tv.get("name") or "")
            key = str(i)
            if key not in obs or not obs[key]:
                continue
            val = obs[key][0]
            if val is None:
                continue
            out.append((tid, float(val)))
    except (KeyError, IndexError, ValueError, TypeError, StopIteration):
        return []
    out.sort(key=lambda x: x[0])
    return out


async def _fetch_ecb_series(series: str) -> dict[str, Any] | None:
    url = f"{ECB_BASE}{series}"
    async with httpx.AsyncClient(timeout=httpx.Timeout(18.0, connect=6.0)) as client:
        r = await client.get(url, params={"format": "jsondata", "lastNObservations": 24})
        r.raise_for_status()
        return r.json()


async def inflation_momentum(country_iso2: str) -> dict[str, Any]:
    """
    Monthly HICP annual rate of change (ECB): latest YoY %, MoM change in that rate (pp vs prior month).
    GDP: annual growth % — delta between last two years (pp).
    """
    iso = country_iso2.upper()
    u = _ecb_country_code(iso)
    series = _ecb_series_for_country(iso)
    scope = "national" if u in ECB_HICP_ANR else ("euro_area" if series else None)

    cpi_block: dict[str, Any] = {
        "available": False,
        "latest_period": None,
        "yoy_hicp_pct": None,
        "mom_change_pp": None,
        "source": None,
        "scope": scope,
        "note": None,
    }

    if series:
        try:
            raw = await _fetch_ecb_series(series)
            if raw:
                pts = _parse_ecb_jsonstat_points(raw)
                if len(pts) >= 2:
                    last_p, last_v = pts[-1]
                    prev_v = pts[-2][1]
                    cpi_block["available"] = True
                    cpi_block["latest_period"] = last_p
                    cpi_block["yoy_hicp_pct"] = round(last_v, 2)
                    cpi_block["mom_change_pp"] = round(last_v - prev_v, 3)
                    cpi_block["source"] = f"ECB {series}"
                    if scope == "euro_area":
                        cpi_block["note"] = (
                            "Euro-area aggregate HICP (national monthly series not mapped for this ISO code)."
                        )
                else:
                    cpi_block["note"] = "ECB returned insufficient monthly observations."
        except Exception as e:  # noqa: BLE001
            cpi_block["note"] = f"ECB fetch failed: {e!s}"
    else:
        cpi_block["note"] = (
            "No ECB monthly HICP series for this country. Use national statistics for month-on-month CPI; "
            "World Bank indicators on this dashboard remain annual."
        )

    gdp_block: dict[str, Any] = {
        "annual_growth_last_pct": None,
        "annual_growth_prior_pct": None,
        "yoy_delta_pp": None,
        "last_year": None,
        "prior_year": None,
        "note": None,
    }
    try:
        rows = await fetch_indicator_rows(iso, WB_GDP_GROWTH, per_page=80)
        annual: list[tuple[str, float]] = []
        for d in rows or []:
            if d.get("value") is None or not d.get("date"):
                continue
            annual.append((str(d["date"]), float(d["value"])))
        annual.sort(key=lambda x: x[0])
        if len(annual) >= 2:
            y1, v1 = annual[-1]
            y0, v0 = annual[-2]
            gdp_block["annual_growth_last_pct"] = round(v1, 2)
            gdp_block["annual_growth_prior_pct"] = round(v0, 2)
            gdp_block["yoy_delta_pp"] = round(v1 - v0, 3)
            gdp_block["last_year"] = y1
            gdp_block["prior_year"] = y0
        elif len(annual) == 1:
            gdp_block["annual_growth_last_pct"] = round(annual[0][1], 2)
            gdp_block["last_year"] = annual[0][0]
    except Exception as e:  # noqa: BLE001
        gdp_block["note"] = f"GDP series error: {e!s}"

    return {
        "country": iso,
        "cpi_monthly": cpi_block,
        "gdp_annual": gdp_block,
    }
