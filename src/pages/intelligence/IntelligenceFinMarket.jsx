import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import Icon from '../../components/Icon'
import { fetchFinMarketBoard } from '../../services/finMarketDataService'
import './IntelligencePages.css'

function fmtPct(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const x = Number(n)
  const sign = x > 0 ? '+' : ''
  return `${sign}${x.toFixed(2)}%`
}

function fmtPrice(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export default function IntelligenceFinMarket() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const abortRef = useRef(null)

  const load = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setErr(null)
    try {
      const board = await fetchFinMarketBoard({ signal: ctrl.signal })
      if (!ctrl.signal.aborted) setData(board)
    } catch (e) {
      if (e?.name === 'AbortError') return
      setErr(e?.message || 'Failed to load market data')
      setData(null)
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    return () => abortRef.current?.abort()
  }, [load])

  const byGroup = data?.entries?.reduce((acc, row) => {
    const g = row.group || 'Other'
    if (!acc[g]) acc[g] = []
    acc[g].push(row)
    return acc
  }, {})

  return (
    <AppLayout>
      <div className="intel-page intel-page--dashboard">
        <header className="intel-page__header intel-page__header--reports">
          <h1 className="intel-page__title">Fin Market</h1>
          <p className="intel-page__lead">
            Finviz-style benchmark board: indices, volatility, rates, commodities, and FX. Figures are delayed month-end
            closes with <strong>MoM</strong> and <strong>YoY</strong> % changes (same performance pattern as macro quote
            tables). Data is sourced from the{' '}
            <a href="https://finance.yahoo.com/" target="_blank" rel="noreferrer">
              Yahoo Finance
            </a>{' '}
            chart API — not scraped from Finviz or Investing.com (see terms on those sites).
          </p>
        </header>

        <div className="intel-report-controls">
          <button type="button" className="intel-btn" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {err && (
          <p className="intel-error" role="alert">
            {err}
          </p>
        )}

        {loading && !data && !err && (
          <p className="intel-muted" aria-busy="true">
            Loading benchmarks…
          </p>
        )}

        {data?.source_note && <p className="intel-muted intel-fin-source">{data.source_note}</p>}
        {data?.fetched_at && (
          <p className="intel-muted intel-fin-meta">
            Snapshot UTC: {new Date(data.fetched_at).toLocaleString()}
            {!import.meta.env.DEV && (
              <>
                {' '}
                · Production builds may need a reverse proxy to Yahoo or a backend mirror if quotes fail in the browser.
              </>
            )}
          </p>
        )}

        {byGroup &&
          Object.entries(byGroup).map(([group, rows]) => (
            <section key={group} className="intel-fin-group" aria-labelledby={`fin-g-${group}`}>
              <h2 id={`fin-g-${group}`} className="intel-fin-group__title">
                {group}
              </h2>
              <div className="intel-table-wrap">
                <table className="intel-table intel-fin-table">
                  <thead>
                    <tr>
                      <th>Instrument</th>
                      <th className="intel-fs__num">Last close</th>
                      <th className="intel-fs__num">MoM %</th>
                      <th className="intel-fs__num">YoY %</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key}>
                        <td>
                          <strong>{row.label}</strong>
                          <div className="intel-fin-sym">{row.symbol}</div>
                        </td>
                        <td className="intel-fs__num">{fmtPrice(row.lastClose)}</td>
                        <td className="intel-fs__num">{fmtPct(row.mom_pct)}</td>
                        <td className="intel-fs__num">{fmtPct(row.yoy_pct)}</td>
                        <td className="intel-fin-err">{row.error || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

        <p className="intel-page__nav">
          <Link to="/intelligence/reports" className="intel-link">
            <Icon name="arrow-left" size={16} /> Intelligence reports
          </Link>
          <Link to="/main-menu" className="intel-link">
            Home <Icon name="arrow-right" size={16} />
          </Link>
        </p>
      </div>
    </AppLayout>
  )
}
