"""Scenario engine — grid over inflation and policy rate."""
from __future__ import annotations

from typing import Any


def scenario_simulation(data: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Stress grid: demand_stress = salary − (inflation × 100).
    inflation is a decimal (e.g. 0.02 = 2%); the ×100 term scales the shock to the same units as nominal salary.
    policy_rate is carried for reporting (second axis); demand does not vary with rate in this minimal model.
    """
    salary = float(data.get("income", data.get("salary", 0)))
    scenarios: list[dict[str, Any]] = []
    for inflation in (0.02, 0.05):
        for rate in (0.02, 0.05):
            shock = inflation * 100
            demand = salary - shock
            scenarios.append(
                {
                    "inflation": inflation,
                    "inflation_pct": round(inflation * 100, 1),
                    "rate": rate,
                    "rate_pct": round(rate * 100, 1),
                    "demand": round(demand, 2),
                    "shock_term": round(shock, 2),
                    "calculation": f"{salary:.0f} − ({inflation} × 100) = {salary:.0f} − {shock:.2f} = {demand:.2f}",
                }
            )
    return scenarios


def legacy_scenario_grid() -> list[dict[str, Any]]:
    """Backward-compatible simple grid (demand = 100 - inflation*100)."""
    scenarios = []
    for inflation in (0.02, 0.05):
        for rate in (0.02, 0.05):
            demand = 100 - (inflation * 100)
            scenarios.append({"inflation": inflation, "rate": rate, "demand": demand})
    return scenarios
