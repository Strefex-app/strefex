/**
 * OS notification delivery for installed PWAs (desktop + iOS home screen).
 * Uses the service worker when available; falls back to the Notification API.
 */
import env from '../config/env'
import { getServiceWorkerRegistration } from '../registerSW'

const PUSH_PREF_KEY = 'strefex-push-notifications'
const SHOWN_IDS_KEY = 'strefex-os-notif-delivered'
const PWA_PROMPT_DISMISSED_KEY = 'strefex-pwa-notif-prompt-dismissed'
const PUSH_SUB_KEY = 'strefex-push-subscription'
const MAX_SHOWN_IDS = 400

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true
  )
}

export function isPushSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission() {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

export function isPushNotificationsEnabled() {
  try {
    const raw = localStorage.getItem(PUSH_PREF_KEY)
    if (raw === null) return true
    return raw === 'true'
  } catch {
    return true
  }
}

export function setPushNotificationsEnabled(enabled) {
  try {
    localStorage.setItem(PUSH_PREF_KEY, enabled ? 'true' : 'false')
  } catch { /* ignore */ }
}

export function wasPwaPromptDismissed() {
  try {
    return localStorage.getItem(PWA_PROMPT_DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function dismissPwaPrompt() {
  try {
    localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, 'true')
  } catch { /* ignore */ }
}

function loadShownIds() {
  try {
    const raw = localStorage.getItem(SHOWN_IDS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function saveShownIds(set) {
  try {
    const arr = Array.from(set).slice(-MAX_SHOWN_IDS)
    localStorage.setItem(SHOWN_IDS_KEY, JSON.stringify(arr))
  } catch { /* ignore */ }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i)
  return arr
}

function buildNotificationUrl(notification) {
  if (notification?.requestId) return `/notifications?request=${encodeURIComponent(notification.requestId)}`
  if (notification?.transactionId) return '/notifications'
  return '/notifications'
}

function shouldDeliverToReader(notification, readerEmail, role) {
  const reader = normalizeEmail(readerEmail)
  if (!reader) return false

  const target = normalizeEmail(notification?.targetEmail)
  if (target) return target === reader

  // Pipeline / admin alerts without a specific target → superadmin only
  return role === 'superadmin' || role === 'admin'
}

function isUnreadForReader(notification, readerEmail) {
  const reader = normalizeEmail(readerEmail)
  return !(notification?.readBy || []).map(normalizeEmail).includes(reader)
}

export async function showOsNotification({ title, body, tag, url }) {
  if (!isPushNotificationsEnabled()) return false
  if (!isPushSupported() || Notification.permission !== 'granted') return false

  const payload = {
    title: String(title || 'STREFEX').slice(0, 120),
    body: String(body || '').slice(0, 240),
    tag: String(tag || 'strefex-notification'),
    url: url || '/notifications',
  }

  try {
    const reg = await getServiceWorkerRegistration()
    if (reg?.showNotification) {
      await reg.showNotification(payload.title, {
        body: payload.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: payload.tag,
        data: { url: payload.url },
        renotify: true,
      })
      return true
    }
  } catch { /* fall through */ }

  try {
    // eslint-disable-next-line no-new
    new Notification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192x192.png',
      tag: payload.tag,
    })
    return true
  } catch {
    return false
  }
}

async function subscribeToWebPush(registration) {
  const vapidKey = env.VAPID_PUBLIC_KEY
  if (!vapidKey || !registration?.pushManager) return null

  try {
    let sub = await registration.pushManager.getSubscription()
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
    }
    if (sub) {
      localStorage.setItem(PUSH_SUB_KEY, JSON.stringify(sub.toJSON()))
    }
    return sub
  } catch {
    return null
  }
}

async function unsubscribeWebPush() {
  try {
    const reg = await getServiceWorkerRegistration()
    const sub = await reg?.pushManager?.getSubscription()
    if (sub) await sub.unsubscribe()
    localStorage.removeItem(PUSH_SUB_KEY)
  } catch { /* ignore */ }
}

export async function enablePushNotifications() {
  if (!isPushSupported()) return 'unsupported'
  const perm = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission

  if (perm !== 'granted') {
    setPushNotificationsEnabled(false)
    return perm
  }

  setPushNotificationsEnabled(true)
  const reg = await getServiceWorkerRegistration()
  if (reg) await subscribeToWebPush(reg)
  return 'granted'
}

export async function disablePushNotifications() {
  setPushNotificationsEnabled(false)
  await unsubscribeWebPush()
}

export async function syncPushSubscription() {
  if (!isPushNotificationsEnabled()) return
  if (Notification.permission !== 'granted') return
  const reg = await getServiceWorkerRegistration()
  if (reg) await subscribeToWebPush(reg)
}

/**
 * Deliver OS notifications for newly seen in-app alerts.
 * Shows when the app is backgrounded or running as an installed PWA.
 */
export async function deliverOsNotifications(notifications = [], readerEmail, role, { force = false } = {}) {
  if (!isPushNotificationsEnabled()) return
  if (!isPushSupported() || Notification.permission !== 'granted') return

  const shouldSurface = force
    || (typeof document !== 'undefined' && (document.hidden || isStandalonePwa()))
  if (!shouldSurface) return

  const shown = loadShownIds()
  const reader = normalizeEmail(readerEmail)

  for (const n of notifications) {
    if (!n?.id || shown.has(n.id)) continue
    if (!isUnreadForReader(n, reader)) continue
    if (!shouldDeliverToReader(n, reader, role)) continue

    const delivered = await showOsNotification({
      title: n.title || 'STREFEX',
      body: n.message || '',
      tag: n.id,
      url: buildNotificationUrl(n),
    })

    if (delivered) shown.add(n.id)
  }

  saveShownIds(shown)
}

export async function deliverOsNotificationsForBatch(batch = [], readerEmail, role) {
  if (!Array.isArray(batch) || batch.length === 0) return
  await deliverOsNotifications(batch, readerEmail, role, { force: true })
}

export async function syncOsNotificationsForCurrentUser() {
  try {
    const { useServiceRequestStore } = await import('../store/serviceRequestStore')
    const { getUserId, getUserRole } = await import('../utils/tenantStorage')
    const readerEmail = getUserId()
    const role = getUserRole()
    const summary = useServiceRequestStore.getState().getNotificationSummary(readerEmail)
    await deliverOsNotifications(summary.unread, readerEmail, role)
  } catch {
    // Non-blocking
  }
}

export function shouldOfferPwaNotificationPrompt() {
  return (
    isPushSupported()
    && Notification.permission === 'default'
    && !wasPwaPromptDismissed()
    && isPushNotificationsEnabled()
  )
}
