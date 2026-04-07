/**
 * Derive CPI year table + YOY (in pp) from World Bank-style annual series.
 * Used when API does not send kpi_extras (browser fallback).
 */
export function computeKpiExtrasFromCpi(cpi) {
  const yearly = []
  if (Array.isArray(cpi)) {
    for (const x of cpi) {
      if (!x || x.value == null) continue
      const y = String(x.year ?? '').trim()
      const v = Number(x.value)
      if (!y || Number.isNaN(v)) continue
      yearly.push({ year: y, annual_inflation_pct: Math.round(v * 1000) / 1000 })
    }
  }
  yearly.sort((a, b) => a.year.localeCompare(b.year))

  let yoy_inflation_change_pp = null
  let latest_inflation_year = null
  if (yearly.length >= 2) {
    const last = yearly[yearly.length - 1]
    const prev = yearly[yearly.length - 2]
    yoy_inflation_change_pp = Math.round((last.annual_inflation_pct - prev.annual_inflation_pct) * 1000) / 1000
    latest_inflation_year = last.year
  } else if (yearly.length === 1) {
    latest_inflation_year = yearly[0].year
  }

  const want = new Set(['2023', '2024', '2025', '2026'])
  const cpi_spotlight_years = yearly.filter((r) => want.has(r.year))

  const byYear = new Map(yearly.map((r) => [r.year, r.annual_inflation_pct]))
  const spotlight_rows = ['2023', '2024', '2025', '2026'].map((year) => {
    const pct = byYear.has(year) ? byYear.get(year) : null
    const prevYear = String(Number(year) - 1)
    const prevPct = byYear.has(prevYear) ? byYear.get(prevYear) : null
    let yoy_pp = null
    if (pct != null && prevPct != null) {
      yoy_pp = Math.round((pct - prevPct) * 1000) / 1000
    }
    return { year, annual_inflation_pct: pct, yoy_vs_prior_year_pp: yoy_pp }
  })

  return {
    cpi_yearly: yearly,
    cpi_spotlight_years,
    spotlight_rows,
    yoy_inflation_change_pp,
    latest_inflation_year,
    mom_inflation_pct: null,
    mom_note:
      'Month-over-month change is not shown here because this feed uses annual inflation rates (World Bank). MOM needs monthly price indices.',
  }
}

export function mergeKpiExtras(report) {
  const computed = computeKpiExtrasFromCpi(report?.review?.cpi || [])
  const api = report?.kpi_extras
  if (!api || typeof api !== 'object') return computed
  return {
    ...computed,
    ...api,
    spotlight_rows:
      Array.isArray(api.spotlight_rows) && api.spotlight_rows.length > 0
        ? api.spotlight_rows
        : computed.spotlight_rows,
  }
}
