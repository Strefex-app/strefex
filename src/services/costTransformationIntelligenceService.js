import env from '../config/env'
import { buildFinancialStatementFromSeries } from '../utils/ctiFinancialStatement'
import { computeKpiExtrasFromCpi } from '../utils/ctiKpiExtras'
import { buildManufacturerStrategicScenarios } from '../utils/ctiManufacturerStrategies'

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
  const { timeoutMs = API_TIMEOUT_MS, signal: externalSignal, ...rest } = options
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  const abort = () => ctrl.abort()
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(t)
      throw new DOMException('Aborted', 'AbortError')
    }
    externalSignal.addEventListener('abort', abort, { once: true })
  }
  try {
    const res = await fetch(url, { ...rest, signal: ctrl.signal })
    return res
  } finally {
    clearTimeout(t)
    if (externalSignal) externalSignal.removeEventListener('abort', abort)
  }
}

function extractYearData(rows) {
  if (!Array.isArray(rows)) return []
  const out = rows.filter((d) => d && d.value != null).map((d) => ({ year: d.date, value: d.value }))
  return out.slice().reverse()
}

async function fetchWorldBankDirect(country, indicator, perPage = 50, signal) {
  const url = `${WB_BASE}/country/${country}/indicator/${indicator}?format=json&per_page=${perPage}`
  const r = await fetchWithTimeout(url, { timeoutMs: WB_TIMEOUT_MS, signal })
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
const INCOME_WB_CODES = [
  ['NY.GNP.PCAP.CD', 'gni_per_capita_usd', 'gni_year'],
  ['NY.GDP.PCAP.PP.CD', 'gdp_per_capita_ppp', 'gdp_ppp_year'],
  ['NY.GDP.PCAP.CD', 'gdp_per_capita_usd', 'gdp_nominal_year'],
  ['SI.POV.GINI', 'gini_index', 'gini_year'],
]

/**
 * Latest World Bank national accounts / inequality points for the jurisdiction.
 * GNI per capita is a national-accounts mean (not a household survey median).
 * @param {string} country ISO2
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function fetchNationalIncomeContext(country, opts = {}) {
  const { signal } = opts
  const out = {
    country,
    source: 'World Bank Open Data',
    gni_per_capita_usd: null,
    gni_year: null,
    gdp_per_capita_ppp: null,
    gdp_ppp_year: null,
    gdp_per_capita_usd: null,
    gdp_nominal_year: null,
    gini_index: null,
    gini_year: null,
    note:
      'GNI and GDP per capita are national-accounts means (per person), not household survey medians. Pair with EU-SILC, US CPS, or national statistics for true medians.',
  }
  try {
    for (const [code, valKey, yearKey] of INCOME_WB_CODES) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const rows = await fetchWorldBankDirect(country, code, 10, signal)
      const series = extractYearData(rows)
      const last = series[series.length - 1]
      if (last && last.value != null) {
        out[valKey] = Number(last.value)
        out[yearKey] = last.year
      }
    }
    return out
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    return { ...out, error: e?.message || 'Income context unavailable' }
  }
}

async function attachReportEnrichment(report, country, signal) {
  if (!report || typeof report !== 'object') return report
  if (!report.national_income) {
    try {
      report.national_income = await fetchNationalIncomeContext(country, { signal })
    } catch (e) {
      if (e?.name === 'AbortError') throw e
      report.national_income = { country, error: e?.message || 'Failed to load income context' }
    }
  }
  if (!Array.isArray(report.manufacturer_strategies) || report.manufacturer_strategies.length === 0) {
    report.manufacturer_strategies = buildManufacturerStrategicScenarios(report)
  }
  return report
}

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

/**
 * @param {string} country ISO2
 * @param {string} timeframe
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function fetchCtiIndicators(country, timeframe, opts = {}) {
  const { signal } = opts
  try {
    const q = `/cti/indicators?country=${encodeURIComponent(country)}&timeframe=${encodeURIComponent(timeframe)}`
    const res = await fetchWithTimeout(apiUrl(q), { timeoutMs: API_TIMEOUT_MS, signal })
    if (res.ok) {
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const data = await res.json()
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
        return data
      }
    }
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    /* timeout, network, CORS on absolute API URL, etc. */
  }

  try {
    const entries = Object.entries(INDICATORS)
    const rowsList = await Promise.all(
      entries.map(async ([, code]) => {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
        return fetchWorldBankDirect(country, code, 50, signal)
      }),
    )
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const out = {}
    entries.forEach(([key], i) => {
      out[key] = trimTimeframe(extractYearData(rowsList[i]), timeframe)
    })
    return out
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    return mockIndicators()
  }
}

/**
 * @param {string} country
 * @param {string} city
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function fetchCtiReport(country, city, opts = {}) {
  const { signal } = opts
  try {
    const q = `/cti/report?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`
    const res = await fetchWithTimeout(apiUrl(q), { timeoutMs: API_TIMEOUT_MS, signal })
    if (res.ok) {
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const data = await res.json()
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
        return attachReportEnrichment(data, country, signal)
      }
    }
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    /* fall through */
  }

  try {
    const ni = await fetchNationalIncomeContext(country, { signal }).catch((err) => ({
      country,
      error: err?.message,
    }))
    const keys = Object.keys(INDICATORS)
    const fetched = await Promise.all(keys.map((k) => fetchWorldBankDirect(country, INDICATORS[k], 50, signal)))
    const rowsByKey = {}
    keys.forEach((k, i) => {
      rowsByKey[k] = extractYearData(fetched[i])
    })
    const gdp = rowsByKey.gdp
    const cpi = rowsByKey.cpi
    const inflationPct = mean(cpi.map((x) => x.value).filter((v) => v != null)) ?? 2
    const salary =
      ni?.gni_per_capita_usd != null && ni.gni_per_capita_usd > 0
        ? Math.round(ni.gni_per_capita_usd)
        : 32000
    const costIndex = 120 + inflationPct
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
    const baseReport = {
      headline: `${city}: Cost vs Purchasing Power Imbalance`,
      financial_statement: financialStatement,
      review: dataPayload,
      national_income: ni,
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
    baseReport.manufacturer_strategies = buildManufacturerStrategicScenarios(baseReport)
    return baseReport
  } catch (e) {
    if (e?.name === 'AbortError') throw e
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
  const demo = {
    headline: `${city}: Cost vs Purchasing Power Imbalance (demo data)`,
    financial_statement: financialStatement,
    review: dataPayload,
    national_income: { country: 'US', note: 'Demo — no live World Bank income fetch.' },
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
  demo.manufacturer_strategies = buildManufacturerStrategicScenarios(demo)
  return demo
}

export function latestValue(series) {
  if (!series?.length) return { value: null, year: null }
  const last = series[series.length - 1]
  return { value: last.value, year: last.year }
}
