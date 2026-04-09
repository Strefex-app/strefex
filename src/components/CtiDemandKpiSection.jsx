import { CTI_DEMAND_KPI_DEFS, CTI_SALARY_CURRENCY } from '../data/ctiDemandKpiContent'
import { mergeKpiExtras } from '../utils/ctiKpiExtras'
import './CtiDemandKpiSection.css'

const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const numFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export function formatKpiValue(format, value) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  switch (format) {
    case 'usd':
      return usdFmt.format(n)
    case 'pct':
      return `${numFmt.format(n)}%`
    case 'index':
      return `${numFmt.format(n)} pts`
    case 'score':
      return numFmt.format(n)
    default:
      return numFmt.format(n)
  }
}

const MINI_GRID_KEYS = new Set(['real_income', 'real_income_index', 'purchasing_power_index', 'demand_index'])

/** Compact 2×2 for dashboard — aligned with macro indicator cards. */
export function CtiDemandKpiMiniGrid({ report }) {
  if (!report?.kpis) return null
  const defs = CTI_DEMAND_KPI_DEFS.filter((d) => MINI_GRID_KEYS.has(d.key))
  return (
    <div className="cti-dash-demand-grid">
      {defs.map((def) => {
        const raw = report.kpis[def.key]
        if (raw === undefined || raw === null) return null
        return (
          <div key={def.key} className="cti-kpi-card cti-kpi-card--dash-demand">
            <div className="cti-kpi-head">
              <span className="cti-kpi-title">{def.title}</span>
              <span className="cti-kpi-sub">{def.unitLabel}</span>
            </div>
            <div className="cti-kpi-value-row">
              <span className="cti-kpi-value">{formatKpiValue(def.format, raw)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function CtiDemandKpiSection({ report, hideExplainerCards = false }) {
  if (!report?.kpis) return null

  const extras = mergeKpiExtras(report)
  const salary = report.review?.salary ?? 32000
  const gni = report.national_income?.gni_per_capita_usd
  const spotlight = extras.spotlight_rows || []

  return (
    <div className="cti-derived cti-derived--rich">
      {!hideExplainerCards && (
        <>
          <div className="cti-derived-head">
            <h4 className="cti-derived-title">Cost / demand KPIs (indicator engine)</h4>
            <p className="cti-derived-lead">
              Numbers below use a <strong>model salary</strong> of{' '}
              {usdFmt.format(Number(salary))} {CTI_SALARY_CURRENCY}
              {gni != null && Math.abs(Number(salary) - Number(gni)) < 2 && (
                <> (aligned to latest World Bank GNI per capita for the selected country)</>
              )}
              {' '}and a <strong>cost index</strong> of {report.review?.cost_index ?? 120} (benchmark for relative costs).
              They explain purchasing power and demand pressure in simple terms — not a bank forecast.
            </p>
          </div>

          <div className="cti-derived-grid cti-derived-grid--cards">
            {CTI_DEMAND_KPI_DEFS.map((def) => {
              const raw = report.kpis[def.key]
              if (raw === undefined || raw === null) return null

              return (
                <div key={def.key} className="cti-kpi-explainer">
                  <div className="cti-kpi-explainer__top">
                    <span className="cti-kpi-explainer__title">{def.title}</span>
                    <span className="cti-kpi-explainer__unit-badge">{def.unitLabel}</span>
                  </div>
                  <p className="cti-kpi-explainer__what">
                    <strong>What it is:</strong> {def.what}
                  </p>
                  <p className="cti-kpi-explainer__why">
                    <strong>Why watch it:</strong> {def.why}
                  </p>
                  <div className="cti-kpi-explainer__value-block">
                    <span className="cti-kpi-explainer__value">{formatKpiValue(def.format, raw)}</span>
                    {def.format === 'usd' && (
                      <span className="cti-kpi-explainer__suffix" aria-hidden>
                        {' '}
                        USD
                      </span>
                    )}
                    {def.format === 'pct' && (
                      <span className="cti-kpi-explainer__suffix" aria-hidden>
                        {' '}
                        (average of years in series)
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="cti-inflation-panel">
        <h5 className="cti-inflation-panel__title">Annual inflation (CPI) — latest years (incl. 2025 &amp; 2026)</h5>
        <p className="cti-inflation-panel__note">
          Each cell is the <strong>annual</strong> inflation rate for that year (World Bank series).{' '}
          <strong>YOY Δ (pp)</strong> is the change versus the <em>previous calendar year’s rate</em> (percentage
          points), not month-over-month.
        </p>
        <div className="cti-inflation-table-wrap">
          <table className="cti-inflation-table">
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Annual inflation</th>
                <th scope="col">YOY Δ vs prior year (pp)</th>
              </tr>
            </thead>
            <tbody>
              {spotlight.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td>
                    {row.annual_inflation_pct != null ? (
                      <>
                        {numFmt.format(row.annual_inflation_pct)}
                        <span className="cti-pct-sign">%</span>
                      </>
                    ) : (
                      <span className="cti-missing">Not yet in data</span>
                    )}
                  </td>
                  <td>
                    {row.yoy_vs_prior_year_pp != null ? (
                      <>
                        {row.yoy_vs_prior_year_pp > 0 ? '+' : ''}
                        {numFmt.format(row.yoy_vs_prior_year_pp)} pp
                      </>
                    ) : (
                      <span className="cti-muted-cell">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cti-yoymom-summary">
          <p>
            <strong>Latest full year in series:</strong>{' '}
            {extras.latest_inflation_year ?? '—'}
            {extras.yoy_inflation_change_pp != null && (
              <>
                {' '}
                · <strong>Latest vs prior year (headline CPI rate):</strong>{' '}
                {extras.yoy_inflation_change_pp > 0 ? '+' : ''}
                {numFmt.format(extras.yoy_inflation_change_pp)} pp
              </>
            )}
          </p>
          <p className="cti-mom-line">
            <strong>MOM (month-over-month):</strong> {extras.mom_inflation_pct != null ? `${extras.mom_inflation_pct}%` : 'Not available'}{' '}
            — {extras.mom_note}
          </p>
        </div>
      </div>
    </div>
  )
}
