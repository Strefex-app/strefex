import { Component } from 'react'
import { captureException } from '../config/sentry'

const CHUNK_RELOAD_KEY = 'strefex-chunk-reload-at'

function isChunkLoadError(error) {
  const msg = String(error?.message || error || '')
  const name = String(error?.name || '')
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /CSS_CHUNK_LOAD_FAILED/i.test(msg)
  )
}

async function hardReloadForStaleChunks() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href)
  url.searchParams.set('_sw', String(Date.now()))
  window.location.replace(url.toString())
}

/**
 * Catches rendering errors anywhere in the child tree.
 * Reports to Sentry and shows a friendly fallback UI.
 * Auto-recovers once from stale lazy-chunk failures after deploys.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, chunkReload: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, chunkReload: isChunkLoadError(error) }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)

    if (isChunkLoadError(error)) {
      try {
        const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
        const now = Date.now()
        // One automatic recovery per 45s — covers post-deploy hash mismatches.
        if (!last || now - last > 45000) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
          void hardReloadForStaleChunks()
          return
        }
      } catch {
        /* sessionStorage blocked */
      }
    }

    captureException(error, { componentStack: errorInfo?.componentStack })
  }

  handleRetry = () => {
    if (isChunkLoadError(this.state.error)) {
      void hardReloadForStaleChunks()
      return
    }
    this.setState({ hasError: false, error: null, chunkReload: false })
  }

  render() {
    if (this.state.hasError) {
      const chunk = this.state.chunkReload
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '50vh', padding: 32, textAlign: 'center',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ color: '#e74c3c', marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h2 style={{ margin: '0 0 8px', color: 'var(--color-primary)', fontSize: 20 }}>
            {chunk ? 'Updating platform modules…' : 'Something went wrong'}
          </h2>
          <p style={{ margin: '0 0 20px', color: 'var(--color-secondary)', fontSize: 14, maxWidth: 400 }}>
            {chunk
              ? 'A platform page failed to load after an update. Reloading a fresh copy.'
              : 'An unexpected error occurred. Please try again or contact support if the problem persists.'}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: '10px 24px', border: 'none', borderRadius: 8,
              background: 'linear-gradient(135deg, #13151a, #00d4ff)', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {chunk ? 'Reload now' : 'Try Again'}
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{
              marginTop: 24, padding: 16, background: 'var(--bg-surface)', borderRadius: 8,
              fontSize: 12, color: '#c0392b', maxWidth: '100%', overflow: 'auto', textAlign: 'left',
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
