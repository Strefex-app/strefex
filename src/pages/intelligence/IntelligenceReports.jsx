import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import Icon from '../../components/Icon'
import { fetchCtiReport } from '../../services/costTransformationIntelligenceService'
import CtiDemandKpiSection, { formatKpiValue } from '../../components/CtiDemandKpiSection'
import { CTI_DEMAND_KPI_DEFS } from '../../data/ctiDemandKpiContent'
import { ALL_COUNTRIES, getCountryByCode, getDefaultCityForCountry } from '../../data/worldMarkets'
import './IntelligencePages.css'

const DEFAULT_REPORT_COUNTRY = 'DE'

function fmtNum(n, decimals = 2) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toFixed(decimals)
}

const MACRO_ROWS = [
  { key: 'gdp', label: 'GDP growth (avg., annual %)' },
  { key: 'inflation', label: 'CPI inflation (avg., annual %)' },
  { key: 'industry', label: 'Industry value added (% of GDP)' },
  { key: 'trade', label: 'Trade (% of GDP)' },
  { key: 'export', label: 'Exports (% of GDP)' },
  { key: 'import', label: 'Imports (% of GDP)' },
  { key: 'energy', label: 'Energy use (kg oil eq. per capita)' },
  { key: 'trade_balance', label: 'Trade balance (export − import, pp GDP)' },
  { key: 'real_income', label: 'Modeled real income (salary / (1+π))' },
  { key: 'purchasing_power', label: 'Purchasing power index' },
  { key: 'demand_index', label: 'Demand index (PP − 100)' },
  { key: 'cost_pressure', label: 'Cost pressure (π + energy/200)' },
  { key: 'logistics_cost', label: 'Logistics cost index' },
]

const INDUSTRY_LABELS = {
  automotive: 'Automotive exposure score',
  real_estate: 'Real estate exposure score',
  manufacturing: 'Manufacturing exposure score',
  technology: 'Technology exposure score',
}

function ReportSkeleton() {
  return (
    <div className="intel-report-skeleton" aria-busy="true" aria-label="Loading report">
      <div className="intel-report-skeleton__hero" />
      <div className="intel-report-skeleton__grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="intel-report-skeleton__card" />
        ))}
      </div>
      <div className="intel-report-skeleton__block" />
      <div className="intel-report-skeleton__block intel-report-skeleton__block--short" />
    </div>
  )
}

/**
 * At-a-glance KPIs for executives: macro + engine outputs in plain language.
 */
function ReportExecutiveStrip({ report, countryName, cityName }) {
  if (!report) return null
  const macro = report.financial_statement?.macro_line_items || {}
  const strat = report.financial_statement?.strategy || {}
  const kpis = report.kpis || {}
  const kpiByKey = Object.fromEntries(CTI_DEMAND_KPI_DEFS.map((d) => [d.key, d]))

  const tiles = [
    {
      id: 'scope',
      label: 'Scope',
      value: `${cityName || '—'} · ${countryName || '—'}`,
      hint: 'Jurisdiction for this run',
      wide: true,
    },
    {
      id: 'gdp',
      label: 'Economic growth',
      value: fmtNum(macro.gdp),
      hint: 'Average GDP growth (annual %)',
    },
    {
      id: 'infl',
      label: 'Price inflation',
      value: fmtNum(macro.inflation),
      hint: 'Average CPI inflation (annual %)',
    },
    {
      id: 'trade',
      label: 'Trade openness',
      value: fmtNum(macro.trade),
      hint: 'Trade as % of GDP',
    },
    {
      id: 'ppi',
      label: kpiByKey.purchasing_power_index?.title || 'Purchasing power',
      value: formatKpiValue('index', kpis.purchasing_power_index),
      hint: kpiByKey.purchasing_power_index?.what?.slice(0, 90) || 'Versus cost benchmark',
    },
    {
      id: 'demand',
      label: kpiByKey.demand_index?.title || 'Demand signal',
      value: formatKpiValue('score', kpis.demand_index),
      hint: 'Model score vs. cost hurdle',
    },
    {
      id: 'posture',
      label: 'Strategy posture',
      value: strat.name || '—',
      hint:
        strat.roi_weight != null
          ? `Model weight on ROI ≈ ${(Number(strat.roi_weight) * 100).toFixed(0)}%`
          : 'From macro & industry tilt',
      wide: true,
    },
  ]

  return (
    <section className="intel-exec" aria-labelledby="intel-exec-heading">
      <div className="intel-exec__head">
        <h2 id="intel-exec-heading" className="intel-exec__title">
          Executive snapshot
        </h2>
        <p className="intel-exec__lead">
          Headline numbers from the same data as the detailed tables below — readable at a glance, without replacing
          professional judgement.
        </p>
      </div>
      <ul className="intel-exec__grid">
        {tiles.map((t) => (
          <li
            key={t.id}
            className={`intel-exec__tile${t.wide ? ' intel-exec__tile--wide' : ''}`}
          >
            <span className="intel-exec__label">{t.label}</span>
            <span className="intel-exec__value">{t.value}</span>
            <span className="intel-exec__hint">{t.hint}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function FinancialStatementSection({ fs }) {
  if (!fs || typeof fs !== 'object') return null
  const macro = fs.macro_line_items || {}
  const scores = fs.industry_scores || {}
  const tt = fs.tariffs_and_logistics || {}
  const strat = fs.strategy || {}
  const grid = Array.isArray(fs.scenario_grid) ? fs.scenario_grid : []
  const entity = fs.entity || {}
  const generated = fs.generated_at

  return (
    <section className="intel-fs" aria-labelledby="intel-fs-heading">
      <header className="intel-fs__header">
        <h3 id="intel-fs-heading">Macro &amp; strategy statement</h3>
        <p className="intel-fs__tagline">
          Consolidated view derived from World Bank series (in-sample averages) and the CTI indicator engine — comparable
          to a management discussion &amp; analysis supplement.
        </p>
      </header>

      <div className="intel-fs__cover">
        <div>
          <span className="intel-fs__cover-label">Jurisdiction</span>
          <p className="intel-fs__cover-value">
            {entity.city || '—'}
            {entity.country ? ` · ${entity.country}` : ''}
          </p>
        </div>
        <div>
          <span className="intel-fs__cover-label">Statement date (UTC)</span>
          <p className="intel-fs__cover-value">{generated ? new Date(generated).toLocaleString() : '—'}</p>
        </div>
        <div>
          <span className="intel-fs__cover-label">Basis</span>
          <p className="intel-fs__cover-meta">{fs.period_note || '—'}</p>
        </div>
      </div>

      <div className="intel-fs__section">
        <h4 className="intel-fs__h4">1. Macro line items &amp; derived measures</h4>
        <div className="intel-table-wrap intel-fs__table-wrap">
          <table className="intel-table intel-fs__table">
            <thead>
              <tr>
                <th>Line item</th>
                <th className="intel-fs__num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {MACRO_ROWS.map(({ key, label }) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td className="intel-fs__num">{fmtNum(macro[key], key === 'energy' ? 1 : 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="intel-fs__two-col">
        <div className="intel-fs__section">
          <h4 className="intel-fs__h4">2. Industry tilt scores</h4>
          <div className="intel-table-wrap intel-fs__table-wrap">
            <table className="intel-table intel-fs__table">
              <thead>
                <tr>
                  <th>Segment</th>
                  <th className="intel-fs__num">Score</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(INDUSTRY_LABELS).map(([k, label]) => (
                  <tr key={k}>
                    <td>{label}</td>
                    <td className="intel-fs__num">{fmtNum(scores[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="intel-fs__section">
          <h4 className="intel-fs__h4">3. Tariffs &amp; logistics</h4>
          <div className="intel-table-wrap intel-fs__table-wrap">
            <table className="intel-table intel-fs__table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="intel-fs__num">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Tariff estimate (heuristic)</td>
                  <td className="intel-fs__num">{fmtNum(tt.tariff_estimate)}</td>
                </tr>
                <tr>
                  <td>Transport / logistics index</td>
                  <td className="intel-fs__num">{fmtNum(tt.transport_index)}</td>
                </tr>
                <tr>
                  <td>Risk band</td>
                  <td className="intel-fs__num">{tt.risk || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="intel-fs__section intel-fs__strategy">
        <h4 className="intel-fs__h4">4. Strategy posture &amp; ROI weight</h4>
        <div className="intel-fs__strategy-row">
          <div>
            <span className="intel-fs__cover-label">Recommended posture</span>
            <p className="intel-fs__strategy-name">{strat.name || '—'}</p>
          </div>
          <div>
            <span className="intel-fs__cover-label">Model ROI weight</span>
            <p className="intel-fs__strategy-roi">
              {strat.roi_weight != null ? `${(Number(strat.roi_weight) * 100).toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="intel-fs__section">
        <h4 className="intel-fs__h4">5. Scenario grid (inflation × policy rate)</h4>
        <p className="intel-fs__grid-note">
          Demand and cost shocks are expressed in the same units as the engine&apos;s demand index and cost-pressure
          composite.
        </p>
        {grid.length === 0 ? (
          <p className="intel-muted">No scenario rows.</p>
        ) : (
          <div className="intel-table-wrap intel-fs__table-wrap">
            <table className="intel-table intel-fs__table">
              <thead>
                <tr>
                  <th className="intel-fs__num">Inflation shock (%)</th>
                  <th className="intel-fs__num">Rate label (%)</th>
                  <th className="intel-fs__num">Demand impact</th>
                  <th className="intel-fs__num">Cost impact</th>
                </tr>
              </thead>
              <tbody>
                {grid.map((row, i) => (
                  <tr key={i}>
                    <td className="intel-fs__num">{fmtNum(row.inflation, 0)}</td>
                    <td className="intel-fs__num">{fmtNum(row.rate, 0)}</td>
                    <td className="intel-fs__num">{fmtNum(row.demand)}</td>
                    <td className="intel-fs__num">{fmtNum(row.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function SeriesTable({ title, series, unit = '' }) {
  if (!Array.isArray(series) || series.length === 0) {
    return (
      <div className="intel-series">
        <h4 className="intel-series__title">{title}</h4>
        <p className="intel-muted">No points in this series.</p>
      </div>
    )
  }
  const rows = series.slice(-10)
  return (
    <div className="intel-series">
      <h4 className="intel-series__title">{title}</h4>
      <div className="intel-table-wrap">
        <table className="intel-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Value{unit ? ` (${unit})` : ''}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={`${p.year}-${i}`}>
                <td>{p.year}</td>
                <td>{p.value != null ? Number(p.value).toFixed(2) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="intel-series__note">Showing last {rows.length} observations (newest at bottom).</p>
    </div>
  )
}

function ReviewDataSection({ review }) {
  if (review == null) return null
  const salary = review.salary
  const costIndex = review.cost_index
  const gdp = review.gdp
  const cpi = review.cpi

  return (
    <section className="intel-report__section">
      <h3>Review — model inputs &amp; macro series</h3>
      <p className="intel-review__intro">
        Values passed into <span className="intel-em">build_report</span> as <span className="intel-em">data</span>: salary and cost index feed the indicator engine;
        GDP and CPI series come from normalized World Bank observations.
      </p>

      <div className="intel-input-grid">
        <div className="intel-input-card">
          <span className="intel-input-card__label">Salary (model)</span>
          <strong className="intel-input-card__val">{salary != null ? `${Number(salary).toLocaleString()} (units/year)` : '—'}</strong>
        </div>
        <div className="intel-input-card">
          <span className="intel-input-card__label">Cost index</span>
          <strong className="intel-input-card__val">{costIndex != null ? String(costIndex) : '—'}</strong>
        </div>
      </div>

      <div className="intel-series-grid">
        <SeriesTable title="GDP growth (annual %)" series={gdp} unit="%" />
        <SeriesTable title="CPI inflation (annual %)" series={cpi} unit="%" />
        <SeriesTable title="Trade (% of GDP)" series={review.trade} unit="%" />
        <SeriesTable title="Industry (% of GDP)" series={review.industry} unit="%" />
        <SeriesTable title="Exports (% of GDP)" series={review.export} unit="%" />
        <SeriesTable title="Imports (% of GDP)" series={review.import} unit="%" />
        <SeriesTable title="Energy use (per capita)" series={review.energy} unit="kg" />
      </div>
    </section>
  )
}

function ScenarioSection({ report }) {
  const rows = report.scenarios?.length ? report.scenarios : report.simulation
  const meta = report.scenario_meta || report.scenarioMeta

  return (
    <section className="intel-report__section">
      <h3>Salary-based stress simulation</h3>
      <p className="intel-muted intel-report__section-lead">
        Parallel grid using nominal salary minus an inflation shock — distinct from the macro demand/cost scenario block
        above.
      </p>
      {meta && (
        <div className="intel-scenario-meta">
          <p>
            <strong>Formula:</strong> <code className="intel-code">{meta.formula}</code>
          </p>
          {meta.salary_input != null && (
            <p>
              <strong>Salary used:</strong> {Number(meta.salary_input).toLocaleString()}
              {meta.cost_index_input != null && (
                <>
                  {' '}
                  · <strong>Cost index:</strong> {meta.cost_index_input}
                </>
              )}
            </p>
          )}
          {meta.description && <p className="intel-muted">{meta.description}</p>}
        </div>
      )}

      {!rows?.length && <p className="intel-muted">No scenario rows returned.</p>}

      {rows?.length > 0 && (
        <div className="intel-table-wrap">
          <table className="intel-table intel-table--scenarios">
            <thead>
              <tr>
                <th>Inflation scenario</th>
                <th>Policy rate (label)</th>
                <th>Demand stress</th>
                <th>Calculation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>
                    {row.inflation_pct != null
                      ? `${row.inflation_pct}%`
                      : row.inflation != null
                        ? `${(Number(row.inflation) * 100).toFixed(1)}%`
                        : '—'}
                  </td>
                  <td>
                    {row.rate_pct != null
                      ? `${row.rate_pct}%`
                      : row.rate != null
                        ? `${(Number(row.rate) * 100).toFixed(1)}%`
                        : '—'}
                  </td>
                  <td>
                    <strong>{row.demand != null ? Number(row.demand).toFixed(2) : '—'}</strong>
                  </td>
                  <td className="intel-table__calc">{row.calculation || `salary − (inflation×100)`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function IntelligenceReports() {
  const [country, setCountry] = useState(DEFAULT_REPORT_COUNTRY)
  const [city, setCity] = useState(() => getDefaultCityForCountry(DEFAULT_REPORT_COUNTRY))
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [showRaw, setShowRaw] = useState(false)
  const loadAbortRef = useRef(null)

  const citiesForCountry = getCountryByCode(country)?.cities || []
  const cityControl =
    citiesForCountry.length > 0 ? (
      <select value={city} onChange={(e) => setCity(e.target.value)} className="intel-select">
        {citiesForCountry.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    ) : (
      <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="intel-input" />
    )

  const load = useCallback(async () => {
    loadAbortRef.current?.abort()
    const ctrl = new AbortController()
    loadAbortRef.current = ctrl
    setLoading(true)
    setErr(null)
    setReport(null)
    try {
      const data = await fetchCtiReport(country, city, { signal: ctrl.signal })
      if (ctrl.signal.aborted) return
      setReport(data)
    } catch (e) {
      if (e?.name === 'AbortError') return
      setErr(e?.message || 'Failed to load report')
      setReport(null)
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [country, city])

  useEffect(() => {
    load()
    return () => loadAbortRef.current?.abort()
  }, [load])

  useEffect(() => {
    const opts = getCountryByCode(country)?.cities
    if (opts?.length && !opts.includes(city)) {
      setCity(opts[0])
    }
  }, [country, city])

  const countryMeta = getCountryByCode(country)
  const countryName = countryMeta?.name || country

  return (
    <AppLayout>
      <div className="intel-page intel-page--dashboard">
        <header className="intel-page__header intel-page__header--reports">
          <h1 className="intel-page__title">Intelligence reports</h1>
          <p className="intel-page__lead">
            Analytical dashboard: macro context, cost and demand indicators, and scenario views — built from World Bank
            series and the CTI engine. Use the executive snapshot for a quick read; tables retain full detail.
          </p>
        </header>

        <div className="intel-report-controls">
          <label className="intel-field">
            <span>Country</span>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="intel-select">
              {ALL_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="intel-field">
            <span>City</span>
            {cityControl}
          </label>
          <button type="button" className="intel-btn" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Regenerate'}
          </button>
        </div>

        {err && (
          <p className="intel-error" role="alert">
            {err}
          </p>
        )}

        {loading && !report && !err && <ReportSkeleton />}

        {report && (
          <article className="intel-report intel-report--statement">
            <h2 className="intel-report__headline">{report.headline}</h2>

            <ReportExecutiveStrip report={report} countryName={countryName} cityName={city} />

            <FinancialStatementSection fs={report.financial_statement} />

            {report.kpis && (
              <section className="intel-report__section intel-report__section--cti-kpis">
                <h3 className="intel-report__section-title">Demand &amp; purchasing power (indicator engine)</h3>
                <CtiDemandKpiSection report={report} />
              </section>
            )}

            <ReviewDataSection review={report.review} />

            <ScenarioSection report={report} />

            {report.problems?.length > 0 && (
              <section className="intel-report__section">
                <h3>Problems</h3>
                <ul>
                  {report.problems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </section>
            )}

            {report.solutions?.length > 0 && (
              <section className="intel-report__section">
                <h3>Solutions</h3>
                <ul>
                  {report.solutions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </section>
            )}

            {report.outlook && typeof report.outlook === 'object' && !Array.isArray(report.outlook) && (
              <section className="intel-report__section">
                <h3>Outlook</h3>
                <ul className="intel-outlook">
                  {Object.entries(report.outlook).map(([k, v]) => (
                    <li key={k}>
                      <strong>{k}</strong>: {String(v)}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {report.monitoring?.length > 0 && (
              <section className="intel-report__section">
                <h3>Monitoring</h3>
                <ul className="intel-report__tags">
                  {report.monitoring.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </section>
            )}

            {report.extensions && (
              <section className="intel-report__section">
                <h3>Optional sources (IMF / ECB)</h3>
                <p className="intel-muted">Summary only — full payloads are large.</p>
                <ul className="intel-extensions">
                  <li>
                    <strong>IMF:</strong>{' '}
                    {report.extensions.imf?.error
                      ? `Error: ${report.extensions.imf.error}`
                      : 'Payload received (see raw JSON if needed).'}
                  </li>
                  <li>
                    <strong>ECB:</strong>{' '}
                    {report.extensions.ecb?.error
                      ? `Error: ${report.extensions.ecb.error}`
                      : 'Payload received (see raw JSON if needed).'}
                  </li>
                </ul>
              </section>
            )}

            <section className="intel-report__section intel-raw-toggle">
              <button type="button" className="intel-btn intel-btn--ghost" onClick={() => setShowRaw((s) => !s)}>
                {showRaw ? 'Hide' : 'Show'} raw API JSON
              </button>
              {showRaw && (
                <pre className="intel-pre intel-pre--raw">{JSON.stringify(report, null, 2)}</pre>
              )}
            </section>
          </article>
        )}

        <p className="intel-page__nav">
          <Link to="/intelligence/markets" className="intel-link">
            <Icon name="arrow-left" size={16} /> Architecture
          </Link>
          <Link to="/intelligence/dashboard" className="intel-link">
            Dashboard <Icon name="arrow-right" size={16} />
          </Link>
        </p>
      </div>
    </AppLayout>
  )
}
