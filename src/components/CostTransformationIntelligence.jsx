import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Icon from './Icon'
import { fetchCtiIndicators, latestValue } from '../services/costTransformationIntelligenceService'
import { MARKET_TABS, getCountriesFiltered } from '../data/worldMarkets'
import './CostTransformationIntelligence.css'

const GlobeMarketPicker = lazy(() => import('./GlobeMarketPicker'))
const CtiHomeCalendarPanel = lazy(() => import('./CtiHomeCalendarPanel'))

/** Globe height; sized so the home row aligns with the calendar strip. */
const CTI_GLOBE_PX = 240

const DEFAULT_COUNTRY = 'DE'

/** Debounce globe taps so rapid touches do not queue conflicting fetches (mobile). */
const GLOBE_COUNTRY_DEBOUNCE_MS = 140
/** Avoid hammering World Bank when tab focus flips on phones. */
const CTI_REFETCH_THROTTLE_MS = 2200

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

function selectValueUpper(e) {
  return String(e.target.value || '').toUpperCase()
}

/** Home CTI strip: globe, calendar, macro KPIs. Full analytics live under Intelligence → Reports (superadmin). */
export default function CostTransformationIntelligence() {
  const navigate = useNavigate()
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const showIntelNavLinks = isSuperAdmin

  const [marketTab, setMarketTab] = useState('all')
  const [country, setCountry] = useState(DEFAULT_COUNTRY)
  const [timeframe, setTimeframe] = useState('5y')
  /** Only commit indicator JSON when it matches this country+timeframe (avoids stale UI on slow mobile networks). */
  const [indicatorBundle, setIndicatorBundle] = useState({
    country: null,
    timeframe: null,
    data: null,
  })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const indicatorsAbortRef = useRef(null)
  const indicatorsGenRef = useRef(0)
  const globeCountryTimerRef = useRef(null)
  const lastCtiRefetchRef = useRef(0)

  const countriesInMarket = useMemo(() => getCountriesFiltered(marketTab), [marketTab])

  const setCountryFromDropdown = useCallback((code) => {
    setCountry(String(code || '').toUpperCase())
  }, [])

  const handleGlobeCountrySelect = useCallback((code) => {
    const upper = String(code || '').toUpperCase()
    if (globeCountryTimerRef.current) clearTimeout(globeCountryTimerRef.current)
    globeCountryTimerRef.current = setTimeout(() => {
      globeCountryTimerRef.current = null
      setCountry(upper)
    }, GLOBE_COUNTRY_DEBOUNCE_MS)
  }, [])

  useEffect(
    () => () => {
      if (globeCountryTimerRef.current) clearTimeout(globeCountryTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    const ok = countriesInMarket.some((c) => c.code === country)
    if (!ok && countriesInMarket.length) {
      setCountry(countriesInMarket[0].code)
    }
  }, [marketTab, country, countriesInMarket])

  const loadIndicators = useCallback(async () => {
    const gen = ++indicatorsGenRef.current
    indicatorsAbortRef.current?.abort()
    const ctrl = new AbortController()
    indicatorsAbortRef.current = ctrl
    const myCountry = country
    const myTimeframe = timeframe
    setLoading(true)
    setErr(null)
    try {
      const data = await fetchCtiIndicators(myCountry, myTimeframe, { signal: ctrl.signal })
      if (gen !== indicatorsGenRef.current) return
      setIndicatorBundle({ country: myCountry, timeframe: myTimeframe, data })
    } catch (e) {
      if (e?.name === 'AbortError') return
      if (gen !== indicatorsGenRef.current) return
      setErr(e?.message || 'Failed to load indicators')
    } finally {
      if (gen === indicatorsGenRef.current) setLoading(false)
    }
  }, [country, timeframe])

  useEffect(() => {
    loadIndicators()
    return () => {
      indicatorsGenRef.current += 1
      indicatorsAbortRef.current?.abort()
    }
  }, [loadIndicators])

  const maybeRefetchIndicators = useCallback(() => {
    const now = Date.now()
    if (now - lastCtiRefetchRef.current < CTI_REFETCH_THROTTLE_MS) return
    lastCtiRefetchRef.current = now
    loadIndicators()
  }, [loadIndicators])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') maybeRefetchIndicators()
    }
    const onOnline = () => maybeRefetchIndicators()
    const onPageShow = (e) => {
      if (e.persisted) maybeRefetchIndicators()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onOnline)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [maybeRefetchIndicators])

  const indicatorsInSync =
    indicatorBundle.country === country && indicatorBundle.timeframe === timeframe && indicatorBundle.data != null
  const indicators = indicatorsInSync ? indicatorBundle.data : null

  const accent = 'var(--color-primary, #000888)'
  const kpiGridClass = `cti-kpi-grid cti-kpi-grid--home-row${loading ? ' cti-kpi-grid--loading' : ''}`
  const kpiCardClass = 'cti-kpi-card cti-kpi-card--home-row'

  const indicatorsGrid = (
    <>
      {err && (
        <p className="cti-error" role="alert">
          {err}
        </p>
      )}
      {loading && <p className="cti-loading">Loading indicators…</p>}
      {!loading && !err && !indicatorsInSync && indicatorBundle.data != null && (
        <p className="cti-muted cti-indicators-wait" role="status">
          Switching country…
        </p>
      )}
      <div className={kpiGridClass} aria-busy={loading}>
        {KPI_DEFS.map((def) => {
          const series = indicators?.[def.key] || []
          const { value, year } = latestValue(series)
          return (
            <div key={def.key} className={kpiCardClass}>
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

  const topNav = (
    <nav className="cti-topnav" aria-label="Intelligence navigation">
      <div className="cti-brand">
        <span className="cti-logo">CTI</span>
        <span className="cti-brand-muted">Strefex</span>
      </div>
      <div className="cti-topnav-links">
        {showIntelNavLinks && (
          <>
            <button type="button" className="cti-nav-item" onClick={() => navigate('/intelligence/reports')}>
              Reports
            </button>
          </>
        )}
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
        className="cti-select"
        value={country}
        autoComplete="off"
        onChange={(e) => setCountryFromDropdown(selectValueUpper(e))}
        onInput={(e) => setCountryFromDropdown(selectValueUpper(e))}
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
        className="cti-select"
        value={timeframe}
        onChange={(e) => setTimeframe(e.target.value)}
        onInput={(e) => setTimeframe(e.target.value)}
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
      <p className="cti-globe-hint">Tap a country on the globe or use the country control.</p>
      <div
        className="cti-globe-wrap cti-globe-wrap--gray"
        style={{ minHeight: CTI_GLOBE_PX, height: CTI_GLOBE_PX }}
      >
        <Suspense fallback={<div className="cti-globe-fallback">Loading globe…</div>}>
          <GlobeMarketPicker
            selectedIso2={country}
            marketTabId={marketTab}
            onCountrySelect={handleGlobeCountrySelect}
            height={CTI_GLOBE_PX}
          />
        </Suspense>
      </div>
    </div>
  )

  return (
    <section className="cti-shell home-card cti-shell--home" aria-labelledby="cti-heading">
      <h2 id="cti-heading" className="cti-title">
        Cost Transformation Intelligence
      </h2>
      <p className="cti-subtitle">
        Pick a market and country, explore the globe, and review headline macro indicators.
        {isSuperAdmin ? (
          <>
            {' '}
            Open the{' '}
            <button type="button" className="cti-inline-link" onClick={() => navigate('/intelligence/reports')}>
              intelligence report
            </button>{' '}
            for cost/demand KPIs, scenarios, and national income context.
          </>
        ) : (
          <>
            {' '}
            Deeper analytics workspaces are limited to platform superadmin accounts.
          </>
        )}
      </p>
      {topNav}

      <div className="cti-home-body">
        <div className="cti-home-toolbar">
          {marketSelect}
          {countrySelect}
          {timeframeSelect}
        </div>
        <div className="cti-home-top" style={{ '--cti-globe-h': `${CTI_GLOBE_PX}px` }}>
          <div className="cti-home-globe-cell">{globeBlock}</div>
          <div className="cti-home-schedule-cell">
            <Suspense fallback={<div className="cti-cal-fallback">Loading calendar…</div>}>
              <CtiHomeCalendarPanel />
            </Suspense>
          </div>
        </div>
        <div className="cti-home-indicators-row">
          <div className="cti-main-header cti-main-header--home">
            <h3 className="cti-main-title">Global indicators</h3>
            <p className="cti-main-blurb">World Bank series for the selected country and timeframe.</p>
          </div>
          <div className="cti-home-indicators-inner">{indicatorsGrid}</div>
        </div>
      </div>
    </section>
  )
}
