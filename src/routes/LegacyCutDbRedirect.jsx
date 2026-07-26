import { useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'

const CUTDB_TARGET = '/profile/machine-intelligence/cutdb'

function isCutDbProfilePath(pathname = '') {
  return pathname === CUTDB_TARGET || pathname.startsWith(`${CUTDB_TARGET}/`)
}

/**
 * Old CutDB used an iframe at /cutdb/index.html. Redirect only when the top
 * window is not already on native CutDB — otherwise we reload in a loop.
 */
export default function LegacyCutDbRedirect() {
  const inIframe = useMemo(() => {
    try {
      return window.top !== window.self
    } catch {
      return false
    }
  }, [])

  const topAlreadyOnCutDb = useMemo(() => {
    if (!inIframe) return false
    try {
      return isCutDbProfilePath(window.top.location.pathname)
    } catch {
      return false
    }
  }, [inIframe])

  useEffect(() => {
    if (!inIframe || topAlreadyOnCutDb) return undefined
    try {
      window.top.location.replace(CUTDB_TARGET)
    } catch {
      // Ignore cross-origin iframe access errors.
    }
    return undefined
  }, [inIframe, topAlreadyOnCutDb])

  if (inIframe) {
    if (topAlreadyOnCutDb) return null
    return <p className="stx-text-body">Redirecting to CutDB…</p>
  }

  return <Navigate to={CUTDB_TARGET} replace />
}
