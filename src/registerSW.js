/**
 * Service Worker registration with update detection.
 *
 * - Registers the SW on page load
 * - Checks for updates periodically (every 60 min)
 * - Notifies the app when a new version is available
 */

const SW_URL = '/sw.js'
const UPDATE_INTERVAL_MS = 60 * 60 * 1000

let _registration = null
let _onUpdate = null

export function onSWUpdate(callback) {
  _onUpdate = callback
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null

  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' })
    _registration = reg

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          if (_onUpdate) _onUpdate(reg)
        }
      })
    })

    // Periodic update checks
    setInterval(() => {
      reg.update().catch(() => {})
    }, UPDATE_INTERVAL_MS)

    return reg
  } catch (err) {
    console.warn('[SW] Registration failed:', err)
    return null
  }
}

export function skipWaitingAndReload() {
  if (_registration?.waiting) {
    _registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }
  window.location.reload()
}
