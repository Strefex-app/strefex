/**
 * Service Worker registration with update detection.
 *
 * - Registers the SW on page load
 * - Checks for updates on load, focus, and periodically
 * - Notifies the app when a new version is available
 */

const SW_URL = '/sw.js'
const UPDATE_INTERVAL_MS = 30 * 60 * 1000

let _registration = null
let _onUpdate = null
let _readyPromise = null

export function onSWUpdate(callback) {
  _onUpdate = callback
}

export async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) return null
  if (_registration?.active) return _registration
  if (_readyPromise) return _readyPromise
  _readyPromise = navigator.serviceWorker.ready.catch(() => null)
  _registration = await _readyPromise
  return _registration
}

function checkForUpdates(reg) {
  if (!reg) return
  reg.update().catch(() => {})
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

    // Immediate + frequent checks so deploys reach users before stale lazy chunks break.
    checkForUpdates(reg)
    setInterval(() => checkForUpdates(reg), UPDATE_INTERVAL_MS)
    window.addEventListener('focus', () => checkForUpdates(reg))
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdates(reg)
    })

    // New SW took control (after skipWaiting) — reload once so lazy imports match index.html.
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

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
