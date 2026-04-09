/**
 * Market benchmark quotes (MoM / YoY style) via Yahoo Finance chart JSON.
 * Finviz / Investing.com are not scraped here (ToS); this feed is a common retail-grade alternative
 * with similar headline symbols. In dev, Vite proxies `/yf` → query1.finance.yahoo.com.
 * Production static hosts should expose the same proxy or a backend mirror.
 */

const YF_TIMEOUT_MS = 12_000

/** Finviz-style headline board (symbol → Yahoo ticker). */
export const FIN_MARKET_BOARD = [
  { key: 'spx', label: 'S&P 500', symbol: '^GSPC', group: 'Indices' },
  { key: 'dji', label: 'Dow Jones', symbol: '^DJI', group: 'Indices' },
  { key: 'ixic', label: 'Nasdaq', symbol: '^IXIC', group: 'Indices' },
  { key: 'rut', label: 'Russell 2000', symbol: '^RUT', group: 'Indices' },
  { key: 'vix', label: 'VIX', symbol: '^VIX', group: 'Volatility' },
  { key: 'tnx', label: 'US 10Y yield', symbol: '^TNX', group: 'Rates' },
  { key: 'gold', label: 'Gold', symbol: 'GC=F', group: 'Commodities' },
  { key: 'oil', label: 'WTI crude', symbol: 'CL=F', group: 'Commodities' },
  { key: 'eurusd', label: 'EUR/USD', symbol: 'EURUSD=X', group: 'FX' },
]

function yahooChartBaseUrl() {
  if (import.meta.env.DEV) return '/yf/v8/finance/chart'
  return 'https://query1.finance.yahoo.com/v8/finance/chart'
}

async function fetchWithTimeout(url, signal) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), YF_TIMEOUT_MS)
  const onAbort = () => ctrl.abort()
  if (signal) {
    if (signal.aborted) {
      clearTimeout(t)
      throw new DOMException('Aborted', 'AbortError')
    }
    signal.addEventListener('abort', onAbort, { once: true })
  }
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(t)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

function lastDefined(arr) {
  if (!Array.isArray(arr)) return null
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i]
    if (v != null && !Number.isNaN(Number(v))) return Number(v)
  }
  return null
}

function closeAtOffset(closes, offFromEnd) {
  if (!Array.isArray(closes) || closes.length < offFromEnd + 1) return null
  const idx = closes.length - 1 - offFromEnd
  const v = closes[idx]
  if (v == null || Number.isNaN(Number(v))) return null
  return Number(v)
}

/**
 * @param {string} symbol Yahoo symbol
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function fetchYahooMonthlyMomentum(symbol, opts = {}) {
  const { signal } = opts
  const enc = encodeURIComponent(symbol)
  const url = `${yahooChartBaseUrl()}/${enc}?interval=1mo&range=2y`
  const res = await fetchWithTimeout(url, signal)
  if (!res.ok) throw new Error(`Yahoo chart ${res.status}`)
  const json = await res.json()
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const result = json?.chart?.result?.[0]
  if (!result) throw new Error('Malformed Yahoo chart')

  const quote = result.indicators?.quote?.[0]
  const closes = quote?.close || []
  const last = lastDefined(closes)
  const prevM = closeAtOffset(closes, 1)
  const y1 = closeAtOffset(closes, 12)

  const momPct = last != null && prevM != null && prevM !== 0 ? ((last / prevM - 1) * 100) : null
  const yoyPct = last != null && y1 != null && y1 !== 0 ? ((last / y1 - 1) * 100) : null

  const meta = result.meta || {}
  return {
    symbol,
    label: meta.longName || meta.shortName || symbol,
    currency: meta.currency,
    lastClose: last,
    mom_pct: momPct != null ? Math.round(momPct * 100) / 100 : null,
    yoy_pct: yoyPct != null ? Math.round(yoyPct * 100) / 100 : null,
    as_of: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
  }
}

/**
 * Full board for Fin Market page (parallel fetch).
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function fetchFinMarketBoard(opts = {}) {
  const { signal } = opts
  const entries = await Promise.all(
    FIN_MARKET_BOARD.map(async (row) => {
      try {
        const m = await fetchYahooMonthlyMomentum(row.symbol, { signal })
        return { ...row, ...m, error: null }
      } catch (e) {
        if (e?.name === 'AbortError') throw e
        return {
          ...row,
          lastClose: null,
          mom_pct: null,
          yoy_pct: null,
          error: e?.message || 'Unavailable',
        }
      }
    }),
  )
  return {
    fetched_at: new Date().toISOString(),
    source_note:
      'Delayed benchmark data via Yahoo Finance chart API (MoM / YoY on monthly closes). Not Finviz or Investing.com.',
    entries,
  }
}
