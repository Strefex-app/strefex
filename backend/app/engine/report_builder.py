"""Assemble CTI report payload from normalized macro + indicator engine KPIs."""
from __future__ import annotations

import statistics
from typing import Any

from app.engine.calculations import (
    calculate_real_income,
    demand_index,
    purchasing_power_index,
)
from app.engine.financial_report_engine import build_financial_statement
from app.engine.scenarios import scenario_simulation


def _build_kpi_extras(cpi: list) -> dict[str, Any]:
    """Annual CPI rows, spotlight 2023–2026, YOY change in headline rate (pp). MOM N/A for WB annual series."""
    yearly: list[dict[str, Any]] = []
    for x in cpi or []:
        if not isinstance(x, dict) or x.get("value") is None:
            continue
        y = str(x.get("year", "")).strip()
        try:
            v = float(x["value"])
        except (TypeError, ValueError):
            continue
        yearly.append({"year": y, "annual_inflation_pct": round(v, 3)})
    yearly.sort(key=lambda r: r["year"])

    yoy_pp: float | None = None
    latest_y: str | None = None
    if len(yearly) >= 2:
        last, prev = yearly[-1], yearly[-2]
        yoy_pp = round(last["annual_inflation_pct"] - prev["annual_inflation_pct"], 3)
        latest_y = last["year"]
    elif yearly:
        latest_y = yearly[-1]["year"]

    by_year = {r["year"]: r["annual_inflation_pct"] for r in yearly}
    spotlight_rows: list[dict[str, Any]] = []
    for year in ("2023", "2024", "2025", "2026"):
        pct = by_year.get(year)
        prev_y = str(int(year) - 1)
        prev_pct = by_year.get(prev_y)
        yoy_row: float | None = None
        if pct is not None and prev_pct is not None:
            yoy_row = round(pct - prev_pct, 3)
        spotlight_rows.append(
            {
                "year": year,
                "annual_inflation_pct": pct,
                "yoy_vs_prior_year_pp": yoy_row,
            }
        )

    return {
        "cpi_yearly": yearly,
        "cpi_spotlight_years": [r for r in yearly if r["year"] in {"2023", "2024", "2025", "2026"}],
        "spotlight_rows": spotlight_rows,
        "yoy_inflation_change_pp": yoy_pp,
        "latest_inflation_year": latest_y,
        "mom_inflation_pct": None,
        "mom_note": (
            "Month-over-month inflation is not available in this view: the primary series is annual "
            "(World Bank). MOM requires monthly consumer price indices."
        ),
    }


def build_report(country: str, city: str, data: dict[str, Any]) -> dict[str, Any]:
    """Full `data` is exposed as review; scenarios run on the same dict."""
    cpi = data.get("cpi") or []

    salary = float(data.get("salary", 32000.0))
    cost_index = float(data.get("cost_index", 120.0))

    inflation_values = [x["value"] for x in cpi if isinstance(x, dict) and x.get("value") is not None]
    inflation_pct = statistics.mean(inflation_values) if inflation_values else 2.0
    inflation_dec = inflation_pct / 100.0

    if inflation_dec <= -1.0:
        real_nominal = salary
    else:
        real_nominal = salary / (1.0 + inflation_dec)
    real_income_index_style = calculate_real_income(salary, inflation_dec)
    ppi = purchasing_power_index(salary, cost_index)
    demand = demand_index(real_nominal, cost_index)

    scn = scenario_simulation(data)
    scenario_meta = {
        "salary_input": salary,
        "cost_index_input": cost_index,
        "formula": "demand_stress = salary − (inflation × 100)",
        "description": (
            "Grid over inflation scenarios 2% and 5% and policy-rate labels 2% and 5%. "
            "Demand stress is salary minus the inflation shock term (inflation as decimal × 100). "
            "Compare to indicator KPI demand_index = real_income − cost_index above."
        ),
        "rows": len(scn),
    }

    financial_statement = build_financial_statement(country, city, data)

    return {
        "headline": f"{city}: Cost vs Purchasing Power Imbalance",
        "financial_statement": financial_statement,
        "review": data,
        "scenario_meta": scenario_meta,
        "problems": [
            "Purchasing power decline",
            "Real estate inflation",
            "Demand polarization",
        ],
        "solutions": [
            "Location arbitrage",
            "Automation",
            "Supply chain optimization",
        ],
        "scenarios": scn,
        "outlook": {
            "growth": "low",
            "demand": "fragile",
        },
        "monitoring": [
            "Inflation",
            "Wages",
            "Real estate",
            "Trade",
        ],
        "kpis": {
            "real_income": round(real_nominal, 2),
            "real_income_index": round(real_income_index_style, 2),
            "purchasing_power_index": round(ppi, 2),
            "demand_index": round(demand, 2),
            "inflation_annual_pct": round(inflation_pct, 3),
        },
        "kpi_extras": _build_kpi_extras(cpi),
        "country": country,
    }
