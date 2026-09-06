/**
 * Public www.strefex.pro landing — content lives in public/marketing-site/
 * (ported from STREFEX Website v6.1). Auth CTAs use target=_top to /login,
 * /register, /register?type=buyer, and /register?type=seller.
 *
 * Loaded via srcDoc (not iframe src) so X-Frame-Options / frame-ancestors
 * cannot blank the landing. Requires vercel rewrite exclusion for
 * /marketing-site/* so fetch() receives the real HTML (not the SPA shell).
 */
import { useEffect, useState } from 'react'

export default function MarketingHome() {
  const [srcDoc, setSrcDoc] = useState('')
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    fetch('/marketing-site/index.html', { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((html) => {
        if (cancelled) return
        // Guard: SPA rewrite misconfig returns the React shell instead of marketing HTML.
        const looksLikeMarketing =
          html.includes('Manufacturers You Can') ||
          html.includes('Strategic Supplier Intelligence') ||
          html.includes('data-i18n-ui') ||
          html.includes('tForkACta')
        if (!looksLikeMarketing) {
          throw new Error('Marketing HTML not served (check vercel marketing-site rewrite)')
        }
        const withBase = html.replace(
          /<head([^>]*)>/i,
          '<head$1><base href="/marketing-site/">',
        )
        setSrcDoc(withBase)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setSrcDoc('')
          setStatus('error')
        }
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
          <a href="/marketing-site/index.html">Open landing</a>
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
      srcDoc={status === 'ready' ? srcDoc : undefined}
    />
  )
}
