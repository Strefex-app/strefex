/**
 * Public www.strefex.pro landing — content lives in public/marketing-site/
 * (ported from STREFEX Website v6.1). Auth CTAs use target=_top to /login,
 * /register, /register?type=buyer, and /register?type=seller.
 *
 * Embed via iframe src (not srcDoc). Production allows SAMEORIGIN framing for
 * /marketing-site/*, and a real document URL loads Design Canvas + local React.
 * The iframe starts immediately; a parallel fetch only flips to the error
 * fallback if the marketing HTML is missing or rewritten to the SPA shell.
 */
import { useEffect, useState } from 'react'

const MARKETING_SRC = '/marketing-site/index.html'

function looksLikeMarketingHtml(html) {
  return (
    html.includes('Manufacturers You Can') ||
    html.includes('Strategic Supplier Intelligence') ||
    html.includes('data-i18n-ui') ||
    html.includes('tForkACta') ||
    html.includes('window.__resources')
  )
}

export default function MarketingHome() {
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    let cancelled = false
    fetch(MARKETING_SRC, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((html) => {
        if (cancelled) return
        if (!looksLikeMarketingHtml(html)) {
          throw new Error('Marketing HTML not served (check vercel marketing-site rewrite)')
        }
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'error') {
    return (
      <div className="mkt-site-fallback" role="alert">
        <h1 className="stx-text-page-title">STREFEX</h1>
        <p className="stx-text-wrap">
          The public landing could not load. Open the site files directly or sign in to the platform.
        </p>
        <p>
          <a href={MARKETING_SRC}>Open landing</a>
          {' · '}
          <a href="/login">Sign in</a>
          {' · '}
          <a href="/register">Sign up</a>
        </p>
      </div>
    )
  }

  return (
    <iframe
      className="mkt-site-frame"
      title="STREFEX"
      src={MARKETING_SRC}
      onLoad={() => setStatus((s) => (s === 'error' ? s : 'ready'))}
    />
  )
}
