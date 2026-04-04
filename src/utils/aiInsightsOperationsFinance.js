/**
 * Deterministic, client-side "simulations" and recommendations for AI Insights:
 * production scenarios, cost/price deltas, enterprise margins, procurement concentration.
 * No external APIs — same privacy model as the rest of AI Insights.
 */

const fmtCurrency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v || 0)

const fmtPct = (v) => `${Number.isFinite(v) ? v.toFixed(1) : '0'}%`

/**
 * @typedef {{
 *   id: string,
 *   domain: 'production' | 'cost' | 'enterprise' | 'spend',
 *   title: string,
 *   simulation: string,
 *   recommendation: string,
 *   activities: string[],
 *   priority: 'high' | 'medium' | 'low',
 *   href: string,
 * }} OpsInsight
 */

/**
 * @param {object} p
 * @returns {OpsInsight[]}
 */
export function deriveProductionInsights(p) {
  const {
    getAverageOEE,
    getProductionSummary,
    oeeData = [],
    downtimeRecords = [],
    scrapRecords = [],
    workCenters = [],
    fiveSAudits = [],
  } = p

  /** @type {OpsInsight[]} */
  const out = []
  const avgOee = typeof getAverageOEE === 'function' ? getAverageOEE() : 0
  const summary = typeof getProductionSummary === 'function' ? getProductionSummary() : {}

  if (oeeData.length > 0 && avgOee > 0 && avgOee < 85) {
    const uplift = (85 / avgOee - 1) * 100
    out.push({
      id: 'prod-oee-target',
      domain: 'production',
      title: 'OEE gap vs world-class (85%)',
      simulation: `Average OEE is ${avgOee.toFixed(1)}%. A rule-of-thumb simulation: closing the gap to 85% could add ~${uplift.toFixed(0)}% effective throughput before other bottlenecks (availability × performance × quality).`,
      recommendation: 'Prioritize the lowest OEE pillar (availability, performance, or quality) on the worst lines; run a focused loss tree and short-interval control.',
      activities: [
        'Review latest OEE breakdown by equipment in Production → OEE.',
        'Pick one pilot line; implement top 3 downtime reductions.',
        'Re-check cycle standards and quality sampling.',
      ],
      priority: avgOee < 60 ? 'high' : 'medium',
      href: '/production/oee',
    })
  }

  const totalDowntimeMin = downtimeRecords.reduce((s, r) => s + (r.duration || 0), 0)
  if (totalDowntimeMin > 8 * 60) {
    out.push({
      id: 'prod-downtime',
      domain: 'production',
      title: 'Cumulative recorded downtime',
      simulation: `Recorded downtime sums to ${Math.round(totalDowntimeMin / 60)}h (${totalDowntimeMin} min). If 25% could be eliminated via setup reduction and planning, you recover ~${Math.round(totalDowntimeMin * 0.25)} min/month of runtime (illustrative).`,
      recommendation: 'Apply SMED (quick changeover), align maintenance windows, and reduce wait-for-material events.',
      activities: ['List top 5 downtime reasons from Downtime log.', 'Schedule SMED workshop for highest-changeover cell.', 'Track MTTR/MTBF trends weekly.'],
      priority: 'high',
      href: '/production/downtime',
    })
  }

  const scrapCost = summary.totalScrapCost || 0
  if (scrapCost > 500) {
    out.push({
      id: 'prod-scrap',
      domain: 'production',
      title: 'Scrap cost exposure',
      simulation: `Tracked scrap cost is ${fmtCurrency(scrapCost)}. Cutting scrap cost by 20% would free ~${fmtCurrency(scrapCost * 0.2)} for reinvestment (illustrative).`,
      recommendation: 'Tighten in-process controls and feed back root causes to suppliers and tooling.',
      activities: ['Pareto scrap by part and station.', 'Add poka-yoke or inspection at highest-defect step.', 'Review supplier change notifications.'],
      priority: scrapCost > 5000 ? 'high' : 'medium',
      href: '/production/scrap',
    })
  }

  if (workCenters.length) {
    let worst = null
    let worstScore = Infinity
    workCenters.forEach((wc) => {
      const a = wc.availability ?? 0
      const perf = wc.performance ?? 0
      const q = wc.quality ?? 0
      const score = (a * perf * q) / 10000
      if (score < worstScore) {
        worstScore = score
        worst = wc
      }
    })
    if (worst) {
      out.push({
        id: `prod-wc-${worst.id}`,
        domain: 'production',
        title: `Work center bottleneck — ${worst.name}`,
        simulation: `Composite score (A×P×Q normalized) is lowest here. If availability +3 pts and performance +2 pts, effective output index improves roughly ~${((1.03 * 1.02 - 1) * 100).toFixed(0)}% before rework (simplified).`,
        recommendation: 'Balance load vs other cells; address changeovers and unplanned stops on this asset first.',
        activities: ['Open work center output view and validate cycle vs actual.', 'Confirm staffing and tooling readiness for next week’s mix.'],
        priority: 'medium',
        href: '/production/workcenter-output',
      })
    }
  }

  fiveSAudits.filter((a) => a.status === 'in_progress').forEach((a) => {
    out.push({
      id: `prod-5s-${a.id}`,
      domain: 'production',
      title: `5S audit open — ${a.area}`,
      simulation: `Audit score ${a.totalScore}/${a.maxScore}. Closing to ≥20/25 typically correlates with fewer search losses and safety incidents (qualitative).`,
      recommendation: 'Close outstanding actions: label storage, sustain cleaning cadence, and verify standards on the floor.',
      activities: [(a.actions && a.actions[0]) || 'Assign owners and due dates for each finding.', 'Re-audit in 30 days.'],
      priority: 'low',
      href: '/production/5s',
    })
  })

  const fpy = summary.fpy
  if (fpy != null && fpy < 95 && fpy > 0) {
    out.push({
      id: 'prod-fpy',
      domain: 'production',
      title: 'First-pass yield below target band',
      simulation: `FPY ~${fmtPct(fpy)}. Moving toward 97% FPY typically cuts rework and stabilizes line throughput (qualitative simulation).`,
      recommendation: 'Focus on top defect codes and measurement system repeatability.',
      activities: ['Quality KPIs drill-down.', 'Calibration check on critical gauges.'],
      priority: fpy < 90 ? 'high' : 'medium',
      href: '/production/quality-kpis',
    })
  }

  return out
}

/**
 * @param {object} p
 * @param {object[]} p.products
 * @param {object[]} p.scenarios
 * @param {() => object} p.getCostSummary
 * @param {(id: string) => object | null} p.calculateScenarioCost
 */
export function deriveCostPriceInsights(p) {
  const { products = [], scenarios = [], getCostSummary, calculateScenarioCost } = p
  /** @type {OpsInsight[]} */
  const out = []

  const summary = typeof getCostSummary === 'function' ? getCostSummary() : {}
  if (summary.overBudget > 0) {
    out.push({
      id: 'cost-summary',
      domain: 'cost',
      title: `${summary.overBudget} product(s) above target cost`,
      simulation: `Aggregate gap vs target: ${fmtCurrency(summary.variance)} (${summary.variancePercent}% vs target roll-up).`,
      recommendation: 'Re-run BOM costing, challenge material quotes, and rebalance labor/overhead assumptions.',
      activities: ['Open Cost management → Targets.', 'Recalculate BOM for worst offenders.', 'Document top 3 drivers per SKU.'],
      priority: 'high',
      href: '/cost-management/targets',
    })
  }

  products.forEach((prod) => {
    if (prod.currentCost > prod.targetCost) {
      const gap = prod.currentCost - prod.targetCost
      const marginAtTarget = prod.sellingPrice > 0 ? ((prod.sellingPrice - prod.targetCost) / prod.sellingPrice) * 100 : 0
      const marginNow = prod.sellingPrice > 0 ? ((prod.sellingPrice - prod.currentCost) / prod.sellingPrice) * 100 : 0
      out.push({
        id: `cost-prod-${prod.id}`,
        domain: 'cost',
        title: `Price/cost gap — ${prod.name}`,
        simulation: `Current ${fmtCurrency(prod.currentCost)} vs target ${fmtCurrency(prod.targetCost)} (${fmtCurrency(gap)}/unit). Gross margin moves from ~${marginNow.toFixed(1)}% to ~${marginAtTarget.toFixed(1)}% if target is achieved.`,
        recommendation: 'Prioritize highest-gap buckets in the cost breakdown (materials, labor, overhead, logistics).',
        activities: ['Open cost breakdown for this SKU.', 'Run a what-if scenario with +10% materials in Scenarios to stress-test.'],
        priority: gap > prod.targetCost * 0.1 ? 'high' : 'medium',
        href: '/cost-management/breakdown',
      })
    }
  })

  const baselineByProduct = {}
  scenarios.forEach((s) => {
    if (s.isBaseline && s.productId) baselineByProduct[s.productId] = s.id
  })
  scenarios.forEach((s) => {
    if (s.isBaseline || !s.productId) return
    const calc = typeof calculateScenarioCost === 'function' ? calculateScenarioCost(s.id) : null
    const baseId = baselineByProduct[s.productId]
    const baseCalc = baseId && typeof calculateScenarioCost === 'function' ? calculateScenarioCost(baseId) : null
    if (calc?.total != null && baseCalc?.total != null && calc.total !== baseCalc.total) {
      const delta = calc.total - baseCalc.total
      out.push({
        id: `cost-scen-${s.id}`,
        domain: 'cost',
        title: `Scenario "${s.name}"`,
        simulation: `Simulated unit cost ${fmtCurrency(calc.total)} vs baseline ${fmtCurrency(baseCalc.total)} (${delta >= 0 ? '+' : ''}${fmtCurrency(delta)}).`,
        recommendation: delta > 0 ? 'Mitigate drivers behind the increase (e.g. logistics offsetting material savings).' : 'Validate assumptions before locking supplier changes.',
        activities: ['Review adjustment factors in Cost → Scenarios.', 'Export comparison for finance sign-off.'],
        priority: Math.abs(delta) > baseCalc.total * 0.05 ? 'medium' : 'low',
        href: '/cost-management/scenarios',
      })
    }
  })

  return out
}

/**
 * @param {object} p
 * @param {() => object} p.getEnterpriseSummary
 * @param {object[]} p.products
 * @param {(id: string) => object | null} p.calculateProductCost
 */
export function deriveEnterpriseInsights(p) {
  const { getEnterpriseSummary, products = [], calculateProductCost, exceptionalCosts = [] } = p
  /** @type {OpsInsight[]} */
  const out = []

  const es = typeof getEnterpriseSummary === 'function' ? getEnterpriseSummary() : null
  if (es && es.totalRevenue > 0) {
    if (es.overallMargin < 12) {
      out.push({
        id: 'ent-margin-low',
        domain: 'enterprise',
        title: 'Portfolio margin pressure',
        simulation: `Blended margin ~${es.overallMargin.toFixed(1)}% on ${fmtCurrency(es.totalRevenue)} revenue. A +2 pts margin simulation adds ~${fmtCurrency(es.totalRevenue * 0.02)} monthly profit at flat revenue (illustrative).`,
        recommendation: 'Mix, pricing, and variable cost levers — align with Enterprise product calculation and OPEX review.',
        activities: ['Enterprise → Product calculation: rank SKUs by margin.', 'Trim tail SKUs or raise prices where elasticity allows.'],
        priority: es.overallMargin < 8 ? 'high' : 'medium',
        href: '/enterprise/product-calculation',
      })
    }
  }

  products.forEach((prod) => {
    const calc = typeof calculateProductCost === 'function' ? calculateProductCost(prod.id) : null
    if (calc && calc.grossMarginPercent < 18 && calc.grossMarginPercent > -100) {
      out.push({
        id: `ent-prod-${prod.id}`,
        domain: 'enterprise',
        title: `Low margin product — ${calc.productName || prod.name}`,
        simulation: `Gross margin ~${calc.grossMarginPercent.toFixed(1)}% (${fmtCurrency(calc.grossMargin)}/unit). Breakeven volume shifts materially if direct costs rise 5%.`,
        recommendation: 'Consider price increase, design-to-cost, or volume scale on this runner.',
        activities: ['Validate machine and labor hours assumptions.', 'Compare with Cost management BOM for the same SKU family.'],
        priority: calc.grossMarginPercent < 10 ? 'high' : 'medium',
        href: '/enterprise/product-calculation',
      })
    }
  })

  const openExceptional = exceptionalCosts.filter((e) => e.status && e.status !== 'resolved')
  openExceptional.forEach((e) => {
    out.push({
      id: `ent-exc-${e.id}`,
      domain: 'enterprise',
      title: `Exceptional cost — ${e.name}`,
      simulation: `Amount ${fmtCurrency(e.amount || 0)} (${e.status}). Include in rolling forecast to avoid margin surprises.`,
      recommendation: 'Capture root cause and preventive action; update risk provisions if needed.',
      activities: ['Document in Enterprise → Exceptional.', 'Link to corrective action owner.'],
      priority: (e.amount || 0) > 25000 ? 'high' : 'medium',
      href: '/enterprise/exceptional',
    })
  })

  return out
}

/**
 * @param {object} p
 * @param {object[]} p.purchaseOrders
 * @param {object[]} p.vendors
 * @param {object[]} p.contracts
 * @param {number} [p.pendingRequisitionCount]
 */
export function deriveSpendProcurementInsights(p) {
  const { purchaseOrders = [], vendors = [], contracts = [], pendingRequisitionCount = 0 } = p
  /** @type {OpsInsight[]} */
  const out = []

  const pos = purchaseOrders.filter((o) => o.status === 'approved' || o.status === 'completed')
  const totalSpend = pos.reduce((s, o) => s + (o.totalAmount || 0), 0)
  const byVendor = {}
  pos.forEach((o) => {
    const v = o.vendorName || 'Unknown'
    byVendor[v] = (byVendor[v] || 0) + (o.totalAmount || 0)
  })
  vendors.forEach((v) => {
    const vendorSpend = (v.connections || [])
      .filter((c) => c.type === 'payment' && c.status === 'paid')
      .reduce((s, c) => s + (c.amount || 0), 0)
    if (vendorSpend > 0) {
      const name = v.general?.companyName || `Vendor ${v.vendorNumber}`
      byVendor[name] = (byVendor[name] || 0) + vendorSpend
    }
  })

  if (totalSpend > 0) {
    const sorted = Object.entries(byVendor).sort((a, b) => b[1] - a[1])
    const [topName, topVal] = sorted[0] || []
    const pct = topVal ? (topVal / totalSpend) * 100 : 0
    if (pct > 42) {
      out.push({
        id: 'spend-concentration',
        domain: 'spend',
        title: 'Spend concentration risk',
        simulation: `~${pct.toFixed(0)}% of analyzed spend sits with "${topName}". Diversifying 15% of that spend could reduce disruption risk (scenario; savings depend on quotes).`,
        recommendation: 'Qualify alternate sources for the same category; negotiate dual sourcing on critical items.',
        activities: ['Spend Analysis → By vendor.', 'Issue RFQ to second source.', 'Update vendor evaluation scores.'],
        priority: pct > 55 ? 'high' : 'medium',
        href: '/spend-analysis',
      })
    }
  }

  if (pendingRequisitionCount > 3) {
    out.push({
      id: 'proc-pr-backlog',
      domain: 'spend',
      title: 'Requisition approval backlog',
      simulation: `${pendingRequisitionCount} requisitions in pending states — delays add schedule risk and may force expedited freight (cost simulation: 5–15% premium typical for rush orders).`,
      recommendation: 'Clear oldest PRs first; delegate approvers; split technical vs commercial approval.',
      activities: ['Procurement dashboard: review queue.', 'Set SLA alerts for PR age.', 'Convert approved PRs to POs promptly.'],
      priority: pendingRequisitionCount > 8 ? 'high' : 'medium',
      href: '/procurement',
    })
  }

  const contractValue = contracts
    .filter((c) => c.status === 'active' || c.status === 'expiring_soon')
    .reduce((s, c) => s + (c.value || 0), 0)
  if (contractValue > totalSpend * 3 && totalSpend > 0) {
    out.push({
      id: 'spend-contracts',
      domain: 'spend',
      title: 'Contract coverage vs PO spend',
      simulation: `Active contract value ${fmtCurrency(contractValue)} vs recent PO throughput ${fmtCurrency(totalSpend)} — ensure procurement follows contracted terms and pricing.`,
      recommendation: 'Reconcile catalog/contract prices with actual POs; close maverick spend.',
      activities: ['Compare top categories in Spend vs contract price lists.', 'Procurement dashboard: enforce preferred vendors.'],
      priority: 'medium',
      href: '/procurement',
    })
  }

  return out
}
