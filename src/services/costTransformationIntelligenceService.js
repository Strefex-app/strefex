import env from '../config/env'
import { buildFinancialStatementFromSeries } from '../utils/ctiFinancialStatement'
import { computeKpiExtrasFromCpi } from '../utils/ctiKpiExtras'

const WB_BASE = 'https://api.worldbank.org/v2'
const INDICATORS = {
  gdp: 'NY.GDP.MKTP.KD.ZG',
  cpi: 'FP.CPI.TOTL.ZG',
  trade: 'NE.TRD.GNFS.ZS',
  industry: 'NV.IND.TOTL.ZS',
  export: 'NE.EXP.GNFS.ZS',
  import: 'NE.IMP.GNFS.ZS',
  energy: 'EG.USE.PCAP.KG.OE',
}

/** Abort slow requests so the UI never spins forever (dead proxy, hung upstream API). */
const API_TIMEOUT_MS = 14_000
const WB_TIMEOUT_MS = 12_000

async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = API_TIMEOUT_MS, ...rest } = options
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...rest, signal: ctrl.signal })
    return res
  } finally {
    clearTimeout(t)
  }
}

function extractYearData(rows) {
  if (!Array.isArray(rows)) return []
  const out = rows.filter((d) => d && d.value != null).map((d) => ({ year: d.date, value: d.value }))
  return out.slice().reverse()
}

async function fetchWorldBankDirect(country, indicator, perPage = 50) {
  const url = `${WB_BASE}/country/${country}/indicator/${indicator}?format=json&per_page=${perPage}`
  const r = await fetchWithTimeout(url, { timeoutMs: WB_TIMEOUT_MS })
  if (!r.ok) throw new Error(`World Bank ${r.status}`)
  const data = await r.json()
  if (!data || !Array.isArray(data) || data.length < 2 || data[1] == null) return []
  return data[1]
}

function trimTimeframe(series, timeframe) {
  if (!series?.length || timeframe === 'all') return series || []
  const n = timeframe === '10y' ? 10 : 5
  return series.length > n ? series.slice(-n) : series
}

function mean(arr) {
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function apiUrl(pathAndQuery) {
  const base = env.API_BASE_URL.replace(/\/$/, '')
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}${pathAndQuery.startsWith('/') ? '' : '/'}${pathAndQuery}`
  }
  const root = base.startsWith('/') ? base : `/${base}`
  const q = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`
  return `${root}${q}`
}

/**
 * Prefer FastAPI `/api/v1/cti/*` (same-origin in dev via Vite proxy → :8000).
 * On timeout / failure → World Bank direct → mock (WB often blocks CORS in browsers).
 */
/**
 * ECB monthly HICP momentum (MoM change in YoY rate, pp) + WB GDP annual growth delta.
 */
export async function fetchCtiInflationMomentum(country) {
  try {
    const q = `/cti/inflation-momentum?country=${encodeURIComponent(country)}`
    const res = await fetchWithTimeout(apiUrl(q), { timeoutMs: API_TIMEOUT_MS })
    if (res.ok) {
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) return await res.json()
    }
  } catch {
    /* fall through */
  }
  return {
    country,
    cpi_monthly: {
      available: false,
      note:
        'API unavailable — start the backend for ECB monthly HICP (MoM) and annual GDP momentum. Non-EUR countries may not have ECB national series.',
    },
    gdp_annual: {},
  }
}

export async function fetchCtiIndicators(country, timeframe) {
  try {
    const q = `/cti/indicators?country=${encodeURIComponent(country)}&timeframe=${encodeURIComponent(timeframe)}`
    const res = await fetchWithTimeout(apiUrl(q), { timeoutMs: API_TIMEOUT_MS })
    if (res.ok) {
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) return await res.json()
    }
  } catch {
    /* timeout, network, CORS on absolute API URL, etc. */
  }

  try {
    const out = {}
    for (const [key, code] of Object.entries(INDICATORS)) {
      const rows = await fetchWorldBankDirect(country, code)
      out[key] = trimTimeframe(extractYearData(rows), timeframe)
    }
    return out
  } catch {
    return mockIndicators()
  }
}

export async function fetchCtiReport(country, city) {
  try {
    const q = `/cti/report?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`
    const res = await fetchWithTimeout(apiUrl(q), { timeoutMs: API_TIMEOUT_MS })
    if (res.ok) {
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) return await res.json()
    }
  } catch {
    /* fall through */
  }

  try {
    const keys = Object.keys(INDICATORS)
    const fetched = await Promise.all(keys.map((k) => fetchWorldBankDirect(country, INDICATORS[k])))
    const rowsByKey = {}
    keys.forEach((k, i) => {
      rowsByKey[k] = extractYearData(fetched[i])
    })
    const gdp = rowsByKey.gdp
    const cpi = rowsByKey.cpi
    const inflationPct = mean(cpi.map((x) => x.value).filter((v) => v != null)) ?? 2
    const salary = 32000
    const costIndex = 120
    const dec = inflationPct / 100
    const realIncome = dec > -0.99 ? salary / (1 + dec) : salary
    const demand = realIncome - costIndex
    const realIncomeIndex = (salary / (1 + dec)) * 100
    const ppi = (salary / costIndex) * 100
    const dataPayload = {
      gdp,
      cpi,
      trade: rowsByKey.trade,
      industry: rowsByKey.industry,
      export: rowsByKey.export,
      import: rowsByKey.import,
      energy: rowsByKey.energy,
      salary,
      cost_index: costIndex,
    }
    const financialStatement = buildFinancialStatementFromSeries(country, city, dataPayload)
    const scenarios = []
    for (const inflation of [0.02, 0.05]) {
      for (const rate of [0.02, 0.05]) {
        const shock = inflation * 100
        const demand = salary - shock
        scenarios.push({
          inflation,
          inflation_pct: inflation * 100,
          rate,
          rate_pct: rate * 100,
          demand: Math.round(demand * 100) / 100,
          shock_term: Math.round(shock * 100) / 100,
          calculation: `${salary} − (${inflation} × 100) = ${salary} − ${shock.toFixed(2)} = ${demand.toFixed(2)}`,
        })
      }
    }
    const scenarioMeta = {
      salary_input: salary,
      cost_index_input: costIndex,
      formula: 'demand_stress = salary − (inflation × 100)',
      description:
        'Grid over inflation 2%/5% and policy-rate labels 2%/5%. Demand stress is salary minus the inflation shock term.',
      rows: scenarios.length,
    }
    return {
      headline: `${city}: Cost vs Purchasing Power Imbalance`,
      financial_statement: financialStatement,
      review: dataPayload,
      scenario_meta: scenarioMeta,
      problems: ['Purchasing power decline', 'Real estate inflation', 'Demand polarization'],
      solutions: ['Location arbitrage', 'Automation', 'Supply chain optimization'],
      scenarios,
      outlook: { growth: 'low', demand: 'fragile' },
      monitoring: ['Inflation', 'Wages', 'Real estate', 'Trade'],
      kpis: {
        real_income: Math.round(realIncome * 100) / 100,
        real_income_index: Math.round(realIncomeIndex * 100) / 100,
        purchasing_power_index: Math.round(ppi * 100) / 100,
        demand_index: Math.round(demand * 100) / 100,
        inflation_annual_pct: Math.round(inflationPct * 1000) / 1000,
      },
      kpi_extras: computeKpiExtrasFromCpi(cpi),
    }
  } catch {
    return mockReport(city)
  }
}

function mockIndicators() {
  const mk = (base, vol) =>
    [2020, 2021, 2022, 2023, 2024].map((y, i) => ({
      year: String(y),
      value: Math.round((base + Math.sin(i) * vol) * 100) / 100,
    }))
  return {
    gdp: mk(1.2, 0.4),
    cpi: mk(2.1, 0.5),
    trade: mk(58, 2),
    industry: mk(24, 1),
    export: mk(32, 1.5),
    import: mk(30, 1.5),
    energy: mk(3200, 80),
  }
}

function mockReport(city) {
  const salary = 32000
  const costIndex = 120
  const dataPayload = {
    gdp: [],
    cpi: [],
    trade: [],
    industry: [],
    export: [],
    import: [],
    energy: [],
    salary,
    cost_index: costIndex,
  }
  const financialStatement = buildFinancialStatementFromSeries('US', city, dataPayload)
  const scenarios = []
  for (const inflation of [0.02, 0.05]) {
    for (const rate of [0.02, 0.05]) {
      const shock = inflation * 100
      const demand = salary - shock
      scenarios.push({
        inflation,
        inflation_pct: inflation * 100,
        rate,
        rate_pct: rate * 100,
        demand: Math.round(demand * 100) / 100,
        calculation: `${salary} − (${inflation} × 100) = ${demand.toFixed(2)}`,
      })
    }
  }
  return {
    headline: `${city}: Cost vs Purchasing Power Imbalance (demo data)`,
    financial_statement: financialStatement,
    review: dataPayload,
    scenario_meta: {
      salary_input: salary,
      cost_index_input: costIndex,
      formula: 'demand_stress = salary − (inflation × 100)',
      description: 'Offline demo — connect API for live macro series.',
      rows: scenarios.length,
    },
    problems: ['Purchasing power decline', 'Real estate inflation', 'Demand polarization'],
    solutions: ['Location arbitrage', 'Automation', 'Supply chain optimization'],
    scenarios,
    outlook: { growth: 'low', demand: 'fragile' },
    monitoring: ['Inflation', 'Wages', 'Real estate', 'Trade'],
    kpis: {
      real_income: 30188,
      real_income_index: 313725,
      purchasing_power_index: 26667,
      demand_index: 30068,
      inflation_annual_pct: 2,
    },
    kpi_extras: computeKpiExtrasFromCpi(dataPayload.cpi),
  }
}

export function latestValue(series) {
  if (!series?.length) return { value: null, year: null }
  const last = series[series.length - 1]
  return { value: last.value, year: last.year }
}
