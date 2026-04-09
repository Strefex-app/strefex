/**
 * Data-driven manufacturing strategy scenarios + action plans from CTI macro / KPI context.
 * Copy is deterministic from inputs (no LLM) so results stay auditable for executives.
 */

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n))
}

/**
 * @param {object} report CTI report payload (financial_statement, kpis, national_income optional)
 * @returns {Array<{ id: string, title: string, summary: string, horizon: string, actions: string[], kpi_focus: string[] }>}
 */
export function buildManufacturerStrategicScenarios(report) {
  const macro = report?.financial_statement?.macro_line_items || {}
  const kpis = report?.kpis || {}
  const gdp = Number(macro.gdp)
  const infl = Number(macro.inflation)
  const demand = Number(macro.demand_index ?? kpis.demand_index)
  const costP = Number(macro.cost_pressure)
  const trade = Number(macro.trade)
  const ind = Number(macro.industry)

  const scenarios = []

  const push = (s) => scenarios.push(s)

  if (Number.isFinite(infl) && infl > 4) {
    push({
      id: 'margin-defense',
      title: 'Margin defense & price–cost pass-through',
      summary:
        'Elevated CPI pressure usually tightens customer budgets and input costs simultaneously. Manufacturers should re-baseline standard costs, refresh transfer prices, and negotiate indexed clauses with large suppliers.',
      horizon: '0–6 months',
      actions: [
        'Run a rolling 13-week cash and commodity exposure review; hedge or fix where volatility breaks budgets.',
        'Segment customers by elasticity; protect strategic accounts with service bundles instead of list-price cuts.',
        'Accelerate value engineering (BOM swaps, tolerances, packaging) with cross-functional kaizen events.',
      ],
      kpi_focus: ['Gross margin %', 'Purchase price variance', 'Inventory turns'],
    })
  }

  if (Number.isFinite(demand) && demand < 0) {
    push({
      id: 'demand-rebuild',
      title: 'Demand rebuild through mix and channel',
      summary:
        'When modeled demand pressure is negative, plants risk under-absorption. Prioritise SKU rationalisation, aftermarket and spares, and regional distributors that still show pull-through.',
      horizon: '3–9 months',
      actions: [
        'Re-score SKU contribution (margin × volume × service cost); cut tail SKUs or move them to make-to-order.',
        'Launch targeted bundles (hardware + consumables + service) to lift revenue per shipment.',
        'Align production cadence to confirmed orders; reduce finished-goods speculation.',
      ],
      kpi_focus: ['Order backlog', 'On-time delivery', 'Revenue per employee'],
    })
  }

  if (Number.isFinite(gdp) && gdp > 1.5 && Number.isFinite(infl) && infl < 3.5) {
    push({
      id: 'capacity-expansion',
      title: 'Selective capacity & automation uplift',
      summary:
        'Stable inflation with solid growth supports capex for bottleneck equipment, digital MES layers, and labour productivity programmes — provided logistics and energy risks stay visible.',
      horizon: '6–18 months',
      actions: [
        'Model OEE uplift vs. capex payback; fund projects that remove the top three downtime causes first.',
        'Standardise work instructions and poka-yoke on the constraint operation before adding shifts.',
        'Pilot predictive maintenance on high-value assets; tie savings to P&L line items.',
      ],
      kpi_focus: ['OEE', 'CapEx ROI', 'Scrap & rework %'],
    })
  }

  if (Number.isFinite(trade) && trade > 55) {
    push({
      id: 'footprint-resilience',
      title: 'Trade-heavy footprint resilience',
      summary:
        'High trade openness amplifies currency, tariff, and lane risk. Dual-source critical commodities, regionalise sub-assemblies, and stress-test landed cost under FX shocks.',
      horizon: '6–12 months',
      actions: [
        'Map single-source items >4 weeks of supply; qualify alternates and safety stock policies.',
        'Renegotiate Incoterms and consolidation centres to cut linehaul volatility.',
        'Align working capital (payment terms, consignment) with supplier reliability tiers.',
      ],
      kpi_focus: ['Landed cost variance', 'Supplier OTIF', 'Days inventory outstanding'],
    })
  }

  if (Number.isFinite(ind) && ind > 22) {
    push({
      id: 'industrial-core',
      title: 'Industrial core efficiency',
      summary:
        'A large industry share of GDP signals competitive manufacturing depth — double down on lean flow, energy intensity, and workforce multi-skilling to defend cost position.',
      horizon: '3–12 months',
      actions: [
        'Run SMED and cell balancing on top volume families; target <10% internal logistics waste.',
        'Energy dashboards per cost centre; tie kWh/unit to daily production meetings.',
        'Cross-train crews to flex headcount with mix changes without overtime spikes.',
      ],
      kpi_focus: ['Cost per unit', 'kWh per unit', 'Labour productivity'],
    })
  }

  if (Number.isFinite(costP) && costP > 7) {
    push({
      id: 'cost-reset',
      title: 'Operating cost reset programme',
      summary:
        'High cost-pressure composites (inflation + energy) require a formal zero-based review of indirect spend, logistics, and overtime.',
      horizon: '1–4 months',
      actions: [
        'Freeze non-critical hires; redeploy to bottleneck areas with temp flex only where ROI is proven.',
        'Re-bid logistics and utilities; challenge maintenance contracts with usage-based models.',
        'Implement weekly purchase steering on A-items; escalate exceptions to CFO staff.',
      ],
      kpi_focus: ['Conversion cost', 'Overtime %', 'Indirect spend / revenue'],
    })
  }

  /* Always include a balanced baseline if list is thin */
  if (scenarios.length < 2) {
    push({
      id: 'operational-excellence',
      title: 'Operational excellence baseline',
      summary:
        'Regardless of cycle point, manufacturers improve financials by tightening the plan–do–check–act loop on quality cost, schedule attainment, and inventory health.',
      horizon: 'Rolling 90 days',
      actions: [
        'Daily tiered meetings on safety, quality, delivery, cost with standard problem-solving templates.',
        'Track internal PPM and external complaints as % of revenue; tie to supplier development.',
        'Rightsize inventory policies (raw/WIP/FG) against forecast error, not static weeks-of-cover.',
      ],
      kpi_focus: ['OTIF', 'First-pass yield', 'Inventory turns'],
    })
  }

  return scenarios.slice(0, 6).map((s, i) => ({
    ...s,
    priority: clamp(100 - i * 12, 40, 100),
  }))
}
