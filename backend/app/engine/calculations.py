"""Indicator engine — purchasing power, trade balance, demand (architecture formulas)."""
from __future__ import annotations


def calculate_real_income(salary: float, inflation: float) -> float:
    """
    inflation: annual rate as decimal (e.g. 0.025 for 2.5%).
    Architecture sample used (salary / (1 + inflation)) * 100 — applied here for an index-style scale.
    """
    if inflation is None:
        return salary
    if inflation <= -1.0:
        return salary
    return (salary / (1.0 + inflation)) * 100.0


def purchasing_power_index(salary: float, cost_index: float) -> float:
    if not cost_index:
        return 0.0
    return (salary / cost_index) * 100.0


def trade_balance(export: float, import_: float) -> float:
    return export - import_


def demand_index(real_income: float, cost_index: float) -> float:
    return real_income - cost_index
