/**
 * Mirrors backend `financial_report_engine.build_financial_statement` for offline / WB-direct fallbacks.
 * `data` keys: gdp, cpi, trade, industry, export, import, energy — each an array of { year, value }.
 */
function seriesAvg(series) {
  if (!Array.isArray(series) || !series.length) return 0
  const vals = []
  for (const x of series) {
    if (x && x.value != null) {
      const v = Number(x.value)
      if (!Number.isNaN(v)) vals.push(v)
    }
  }
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function calculateIndicators(raw) {
  const gdp = seriesAvg(raw.gdp)
  const inflation = seriesAvg(raw.cpi)
  const industry = seriesAvg(raw.industry)
  const trade = seriesAvg(raw.trade)
  const export_ = seriesAvg(raw.export)
  const import_ = seriesAvg(raw.import)
  const energy = seriesAvg(raw.energy)

  const salary =
    raw.salary != null && Number(raw.salary) > 0 ? Number(raw.salary) : 35000
  const explicitCost = raw.cost_index != null ? Number(raw.cost_index) : null
  const costIndex =
    explicitCost != null && explicitCost > 0 ? explicitCost : 120 + inflation
  const logisticsCost = 100 + energy / 100
  const realIncome = inflation === -100 ? salary : salary / (1 + inflation / 100)
  const purchasingPower = costIndex ? (realIncome / costIndex) * 100 : 0
  const demandIndex = purchasingPower - 100
  const costPressure = inflation + energy / 200

  return {
    gdp,
    inflation,
    industry,
    trade,
    export: export_,
    import: import_,
    energy,
    salary_model: salary,
    cost_index: costIndex,
    logistics_cost: logisticsCost,
    real_income: realIncome,
    purchasing_power: purchasingPower,
    demand_index: demandIndex,
    cost_pressure: costPressure,
    trade_balance: export_ - import_,
  }
}

function industryScores(ind) {
  return {
    automotive: ind.industry - ind.cost_pressure,
    real_estate: ind.purchasing_power - ind.cost_pressure,
    manufacturing: ind.trade + ind.industry - ind.logistics_cost,
    technology: ind.gdp - ind.inflation,
  }
}

function tariffTransport(ind) {
  const tariff = 5 + (ind.trade_balance < 0 ? 2 : -1)
  const transport = ind.logistics_cost
  return {
    tariff_estimate: tariff,
    transport_index: transport,
    risk: transport > 120 ? 'High' : 'Moderate',
  }
}

function strategyEngine(ind) {
  if (ind.gdp > 1.5 && ind.inflation < 3) return { name: 'Expansion', roi_weight: 0.2 }
  if (ind.inflation > 4 || ind.cost_pressure > 7) return { name: 'Cost Optimization', roi_weight: 0.3 }
  if (ind.demand_index < 0) return { name: 'Defensive', roi_weight: -0.1 }
  return { name: 'Selective Growth', roi_weight: 0.12 }
}

function scenarioEngine(ind) {
  const scenarios = []
  for (const inf of [2, 5]) {
    for (const rate of [2, 5]) {
      scenarios.push({
        inflation: inf,
        rate,
        demand: ind.demand_index - inf,
        cost: ind.cost_pressure + rate,
      })
    }
  }
  return scenarios
}

export function buildFinancialStatementFromSeries(country, city, data) {
  const raw = {
    gdp: data?.gdp || [],
    cpi: data?.cpi || [],
    industry: data?.industry || [],
    trade: data?.trade || [],
    export: data?.export || [],
    import: data?.import || [],
    energy: data?.energy || [],
    salary: data?.salary,
    cost_index: data?.cost_index,
  }
  const ind = calculateIndicators(raw)
  const strat = strategyEngine(ind)
  const scores = industryScores(ind)
  const tt = tariffTransport(ind)
  const scenarios = scenarioEngine(ind)

  return {
    entity: { country, city },
    period_note: 'Averages computed over available World Bank annual observations in-series.',
    macro_line_items: ind,
    industry_scores: scores,
    tariffs_and_logistics: tt,
    strategy: { name: strat.name, roi_weight: strat.roi_weight },
    scenario_grid: scenarios,
    generated_at: new Date().toISOString(),
  }
}
