import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import {
  fetchCtiIndicators,
  fetchCtiReport,
  latestValue,
} from '../services/costTransformationIntelligenceService'
import {
  MARKET_TABS,
  getCountriesFiltered,
  getCountryByCode,
  getDefaultCityForCountry,
} from '../data/worldMarkets'
import './CostTransformationIntelligence.css'

const GlobeMarketPicker = lazy(() => import('./GlobeMarketPicker'))
const CtiHomeCalendarPanel = lazy(() => import('./CtiHomeCalendarPanel'))
import CtiDemandKpiSection, { CtiDemandKpiMiniGrid } from './CtiDemandKpiSection'
const CtiInflationMomentumPanel = lazy(() => import('./CtiInflationMomentumPanel'))

/** Globe height; sized so the home row aligns with the calendar strip. */
const CTI_GLOBE_PX = 240

const KPI_DEFS = [
  {
    key: 'gdp',
    title: 'GDP growth',
    unit: '%',
    subtitle: 'Annual, constant prices',
  },
  {
    key: 'cpi',
    title: 'CPI inflation',
    unit: '%',
    subtitle: 'Consumer prices, annual',
  },
  {
    key: 'trade',
    title: 'Trade',
    unit: '% GDP',
    subtitle: 'Goods & services trade',
  },
  {
    key: 'industry',
    title: 'Industry',
    unit: '% GDP',
    subtitle: 'Manufacturing value added',
  },
]

function MiniSparkline({ series, accent }) {
  if (!series?.length) {
    return <div className="cti-spark-empty">—</div>
  }
  const vals = series.map((p) => Number(p.value))
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const w = 120
  const h = 36
  const pad = 2
  const span = max - min || 1
  const pts = vals
    .map((v, i) => {
      const x = pad + (i / Math.max(vals.length - 1, 1)) * (w - pad * 2)
      const y = h - pad - ((v - min) / span) * (h - pad * 2)
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg className="cti-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  )
}

/**
 * @param {{ variant?: 'home' | 'dashboard' }} props
 * Home: globe + global indicators only. Dashboard: full analytics, MoM, cost/demand KPIs.
 */
export default function CostTransformationIntelligence({ variant = 'home' }) {
  const navigate = useNavigate()
  const isHome = variant === 'home'

  const [marketTab, setMarketTab] = useState('all')
  const [country, setCountry] = useState('IT')
  const [city, setCity] = useState('Milan')
  const [timeframe, setTimeframe] = useState('5y')
  const [indicators, setIndicators] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  const countriesInMarket = useMemo(() => getCountriesFiltered(marketTab), [marketTab])
  const cityOptions = useMemo(() => getCountryByCode(country)?.cities ?? [], [country])

  const handleCountryChange = useCallback((code) => {
    setCountry(code)
    setCity(getDefaultCityForCountry(code))
  }, [])

  useEffect(() => {
    const ok = countriesInMarket.some((c) => c.code === country)
    if (!ok && countriesInMarket.length) {
      const next = countriesInMarket[0].code
      setCountry(next)
      setCity(getDefaultCityForCountry(next))
    }
  }, [marketTab, country, countriesInMarket])

  const loadIndicators = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await fetchCtiIndicators(country, timeframe)
      setIndicators(data)
    } catch (e) {
      setErr(e?.message || 'Failed to load indicators')
      setIndicators(null)
    } finally {
      setLoading(false)
    }
  }, [country, timeframe])

  const loadReport = useCallback(async () => {
    if (isHome) return
    try {
      const data = await fetchCtiReport(country, city)
      setReport(data)
    } catch {
      setReport(null)
    }
  }, [country, city, isHome])

  useEffect(() => {
    loadIndicators()
  }, [loadIndicators])

  useEffect(() => {
    if (isHome) {
      setReport(null)
      return
    }
    loadReport()
  }, [loadReport, isHome])

  const accent = 'var(--color-primary, #000888)'

  const indicatorsGrid = (
    <>
      {err && (
        <p className="cti-error" role="alert">
          {err}
        </p>
      )}
      {loading && !indicators && <p className="cti-loading">Loading indicators…</p>}
      <div className={`cti-kpi-grid cti-kpi-grid--two-col`}>
        {KPI_DEFS.map((def) => {
          const series = indicators?.[def.key] || []
          const { value, year } = latestValue(series)
          return (
            <div key={def.key} className={`cti-kpi-card cti-kpi-card--two-col`}>
              <div className="cti-kpi-head">
                <span className="cti-kpi-title">{def.title}</span>
                <span className="cti-kpi-sub">{def.subtitle}</span>
              </div>
              <div className="cti-kpi-value-row">
                <span className="cti-kpi-value">
                  {value != null ? (
                    <>
                      {typeof value === 'number' ? value.toFixed(2) : value}
                      <span className="cti-kpi-unit">{def.unit}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                {year && <span className="cti-kpi-year">{year}</span>}
              </div>
              <MiniSparkline series={series} accent={accent} />
            </div>
          )
        })}
      </div>
    </>
  )

  const indicatorsBlock = isHome ? <div className="cti-home-indicators-inner">{indicatorsGrid}</div> : indicatorsGrid

  const topNav = (
    <nav className="cti-topnav" aria-label="Intelligence navigation">
      <div className="cti-brand">
        <span className="cti-logo">CTI</span>
        <span className="cti-brand-muted">Strefex</span>
      </div>
      <div className="cti-topnav-links">
        <button type="button" className="cti-nav-item" onClick={() => navigate('/intelligence/markets')}>
          Markets
        </button>
        <button type="button" className="cti-nav-item" onClick={() => navigate('/intelligence/reports')}>
          Reports
        </button>
        <button type="button" className="cti-nav-item" onClick={() => navigate('/intelligence/dashboard')}>
          Dashboard
        </button>
        <button type="button" className="cti-nav-item cti-nav-item--primary" onClick={() => navigate('/profile')}>
          <Icon name="profile" size={16} />
          Profile
        </button>
      </div>
    </nav>
  )

  const marketSelect = (
    <div className="cti-filter cti-filter--inline">
      <label htmlFor="cti-market-select">Market</label>
      <select
        id="cti-market-select"
        className="cti-select"
        value={marketTab}
        onChange={(e) => setMarketTab(e.target.value)}
      >
        {MARKET_TABS.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {tab.name}
          </option>
        ))}
      </select>
    </div>
  )

  const countrySelect = (
    <div className="cti-filter cti-filter--inline">
      <label htmlFor="cti-country">Country</label>
      <select
        id="cti-country"
        value={country}
        onChange={(e) => handleCountryChange(e.target.value)}
        className="cti-select"
      >
        {countriesInMarket.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )

  const timeframeSelect = (
    <div className="cti-filter cti-filter--inline">
      <label htmlFor="cti-timeframe">Timeframe</label>
      <select
        id="cti-timeframe"
        value={timeframe}
        onChange={(e) => setTimeframe(e.target.value)}
        className="cti-select"
      >
        <option value="5y">5 years</option>
        <option value="10y">10 years</option>
        <option value="all">All available</option>
      </select>
    </div>
  )

  const globeBlock = (
    <div className="cti-globe-block">
      <span className="cti-filter-label">Map</span>
      <p className="cti-globe-hint">Click a country on the globe or use the country control.</p>
      <div className={`cti-globe-wrap ${isHome ? 'cti-globe-wrap--gray' : ''}`}>
        <Suspense fallback={<div className="cti-globe-fallback">Loading globe…</div>}>
          <GlobeMarketPicker
            selectedIso2={country}
            marketTabId={marketTab}
            onCountrySelect={handleCountryChange}
            height={CTI_GLOBE_PX}
          />
        </Suspense>
      </div>
    </div>
  )

  if (isHome) {
    return (
      <section className="cti-shell home-card cti-shell--home" aria-labelledby="cti-heading">
        <h2 id="cti-heading" className="cti-title">
          Cost Transformation Intelligence
        </h2>
        <p className="cti-subtitle">
          Pick a market and country, explore the globe, and review headline macro indicators. Detailed demand KPIs,
          CPI tables, and month-on-month momentum live on the{' '}
          <button type="button" className="cti-inline-link" onClick={() => navigate('/intelligence/dashboard')}>
            dashboard
          </button>{' '}
          or{' '}
          <button type="button" className="cti-inline-link" onClick={() => navigate('/intelligence/reports')}>
            report
          </button>
          .
        </p>
        {topNav}

        <div className="cti-home-body">
          <div className="cti-home-toolbar">
            {marketSelect}
            {countrySelect}
            {timeframeSelect}
          </div>
          <div
            className="cti-home-top"
            style={{ '--cti-globe-h': `${CTI_GLOBE_PX}px` }}
          >
            <div className="cti-home-globe-cell">{globeBlock}</div>
            <div className="cti-home-schedule-cell">
              <Suspense fallback={<div className="cti-cal-fallback">Loading calendar…</div>}>
                <CtiHomeCalendarPanel />
              </Suspense>
            </div>
            <div className="cti-home-indicators-cell">
              <div className="cti-main-header cti-main-header--home">
                <h3 className="cti-main-title">Global indicators</h3>
                <p className="cti-main-blurb">World Bank series for the selected country and timeframe.</p>
              </div>
              {indicatorsBlock}
            </div>
          </div>
        </div>
      </section>
    )
  }

  /* ——— Dashboard (full) ——— */
  return (
    <section className="cti-shell cti-shell--dashboard" aria-labelledby="cti-dash-heading">
      <h2 id="cti-dash-heading" className="cti-title">
        Cost Transformation Intelligence
      </h2>
      <p className="cti-subtitle">
        Full macro context: map, city-level report inputs, high-frequency inflation momentum, and indicator-engine KPIs.
      </p>
      {topNav}

      <div
        className="cti-layout cti-layout--markets cti-layout--dash"
        style={{ '--cti-globe-h': `${CTI_GLOBE_PX}px` }}
      >
        <aside className="cti-sidebar" aria-label="Filters">
          {marketSelect}
          {countrySelect}
          <div className="cti-filter">
            <label htmlFor="cti-city">City</label>
            {cityOptions.length > 0 ? (
              <select
                id="cti-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="cti-select"
              >
                {cityOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="cti-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="cti-input"
                placeholder="City"
                autoComplete="off"
              />
            )}
          </div>
          {timeframeSelect}
        </aside>

        <div className="cti-main cti-main--dashboard">
          <div className="cti-dash-top">
            <div className="cti-dash-globe-col">
              {globeBlock}
            </div>
            <div className="cti-dash-right">
              <div className="cti-dash-panel">
                <div className="cti-main-header">
                  <h3 className="cti-main-title">Global indicators</h3>
                  {report?.headline && <p className="cti-headline">{report.headline}</p>}
                </div>
                {indicatorsBlock}
              </div>
              <div className="cti-dash-panel">
                <div className="cti-main-header">
                  <h3 className="cti-main-title">Cost / demand</h3>
                  <p className="cti-main-blurb">Model salary &amp; cost index vs. real income and purchasing power.</p>
                </div>
                <CtiDemandKpiMiniGrid report={report} />
              </div>
            </div>
          </div>
          <Suspense fallback={<p className="cti-loading">Loading analytics panels…</p>}>
            <CtiInflationMomentumPanel country={country} />
            <CtiDemandKpiSection report={report} hideExplainerCards />
          </Suspense>
        </div>
      </div>
    </section>
  )
}
