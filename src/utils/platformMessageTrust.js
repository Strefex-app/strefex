/**
 * Same-origin postMessage gate for the Intelligent Sourcing iframe bridge.
 */

export function platformMessageTargetOrigin() {
  try {
    const origin = window.location.origin
    if (origin && origin !== 'null') return origin
  } catch { /* */ }
  return '*'
}

export function isSameOriginMessage(event) {
  if (!event) return false
  const origin = String(event.origin || '')
  if (!origin || origin === 'null') return true
  try {
    return origin === window.location.origin
  } catch {
    return false
  }
}

export function isTrustedIframeMessage(event, iframeWindow) {
  if (!isSameOriginMessage(event)) return false
  if (iframeWindow && event.source && event.source !== iframeWindow) return false
  return true
}
