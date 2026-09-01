/**
 * Public www.strefex.pro landing — content lives in public/marketing-site/
 * (ported from the STREFEX Website.html design). Auth CTAs use target=_top
 * to /login and /register.
 *
 * Loaded via srcDoc (not iframe src) so global X-Frame-Options / frame-ancestors
 * cannot blank the landing page while still keeping the URL at `/`.
 */
import { useEffect, useState } from 'react'

export default function MarketingHome() {
  const [srcDoc, setSrcDoc] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/marketing-site/index.html')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((html) => {
        if (cancelled) return
        // Relative CSS/JS/assets must resolve under /marketing-site/
        const withBase = html.replace(
          /<head([^>]*)>/i,
          '<head$1><base href="/marketing-site/">',
        )
        setSrcDoc(withBase)
      })
      .catch(() => {
        if (!cancelled) setSrcDoc('')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <iframe
      className="mkt-site-frame"
      title="STREFEX"
      srcDoc={srcDoc || undefined}
    />
  )
}
