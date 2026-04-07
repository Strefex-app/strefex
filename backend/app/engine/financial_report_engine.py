"""
Financial statement model — macro averages (World Bank), derived KPIs, industry scores,
tariff/transport heuristic, strategy, and 2×2 scenario grid (matches reference architecture).
"""
from __future__ import annotations

import statistics
from datetime import datetime, timezone
from typing import Any


def _series_avg(series: list[dict[str, Any]] | None) -> float:
    if not series:
        return 0.0
    vals: list[float] = []
    for x in series:
        if isinstance(x, dict) and x.get("value") is not None:
            try:
                vals.append(float(x["value"]))
            except (TypeError, ValueError):
                continue
    return float(statistics.mean(vals)) if vals else 0.0


def calculate_indicators(raw: dict[str, list[dict[str, Any]]]) -> dict[str, float]:
    """Average recent observations per series; salary/cost per reference script."""
    gdp = _series_avg(raw.get("gdp"))
    inflation = _series_avg(raw.get("cpi"))
    industry = _series_avg(raw.get("industry"))
    trade = _series_avg(raw.get("trade"))
    export = _series_avg(raw.get("export"))
    import_ = _series_avg(raw.get("import"))
    energy = _series_avg(raw.get("energy"))

    salary = 35000.0
    cost_index = 120.0 + inflation
    logistics_cost = 100.0 + (energy / 100.0)

    real_income = salary / (1.0 + inflation / 100.0) if inflation != -100.0 else salary
    purchasing_power = (real_income / cost_index) * 100.0 if cost_index else 0.0
    demand_index = purchasing_power - 100.0
    cost_pressure = inflation + (energy / 200.0)

    return {
        "gdp": gdp,
        "inflation": inflation,
        "industry": industry,
        "trade": trade,
        "export": export,
        "import": import_,
        "energy": energy,
        "salary_model": salary,
        "cost_index": cost_index,
        "logistics_cost": logistics_cost,
        "real_income": real_income,
        "purchasing_power": purchasing_power,
        "demand_index": demand_index,
        "cost_pressure": cost_pressure,
        "trade_balance": export - import_,
    }


def industry_scores(ind: dict[str, float]) -> dict[str, float]:
    return {
        "automotive": ind["industry"] - ind["cost_pressure"],
        "real_estate": ind["purchasing_power"] - ind["cost_pressure"],
        "manufacturing": ind["trade"] + ind["industry"] - ind["logistics_cost"],
        "technology": ind["gdp"] - ind["inflation"],
    }


def tariff_transport(ind: dict[str, float]) -> dict[str, Any]:
    tariff = 5.0 + (2.0 if ind["trade_balance"] < 0 else -1.0)
    transport = ind["logistics_cost"]
    return {
        "tariff_estimate": tariff,
        "transport_index": transport,
        "risk": "High" if transport > 120.0 else "Moderate",
    }


def strategy_engine(ind: dict[str, float]) -> tuple[str, float]:
    if ind["gdp"] > 1.5 and ind["inflation"] < 3.0:
        return "Expansion", 0.20
    if ind["inflation"] > 4.0 or ind["cost_pressure"] > 7.0:
        return "Cost Optimization", 0.30
    if ind["demand_index"] < 0.0:
        return "Defensive", -0.10
    return "Selective Growth", 0.12


def scenario_engine(ind: dict[str, float]) -> list[dict[str, float]]:
    scenarios: list[dict[str, float]] = []
    for inf in (2.0, 5.0):
        for rate in (2.0, 5.0):
            scenarios.append(
                {
                    "inflation": inf,
                    "rate": rate,
                    "demand": ind["demand_index"] - inf,
                    "cost": ind["cost_pressure"] + rate,
                }
            )
    return scenarios


def build_financial_statement(
    country: str,
    city: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Build presentation-ready financial statement block from normalized WB series."""
    raw = {
        "gdp": data.get("gdp") or [],
        "cpi": data.get("cpi") or [],
        "industry": data.get("industry") or [],
        "trade": data.get("trade") or [],
        "export": data.get("export") or [],
        "import": data.get("import") or [],
        "energy": data.get("energy") or [],
    }
    ind = calculate_indicators(raw)
    strat_name, roi = strategy_engine(ind)
    scores = industry_scores(ind)
    tt = tariff_transport(ind)
    scenarios = scenario_engine(ind)

    return {
        "entity": {"country": country, "city": city},
        "period_note": "Averages computed over available World Bank annual observations in-series.",
        "macro_line_items": ind,
        "industry_scores": scores,
        "tariffs_and_logistics": tt,
        "strategy": {"name": strat_name, "roi_weight": roi},
        "scenario_grid": scenarios,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
