import { tenantKey } from './tenantStorage'
import { devWarn } from './devLog'

export const FORUM_STORAGE_KEY = 'strefex-forum-hub'

export function emptyForumPayload() {
  return { announcements: [], lessons: [] }
}

export function readForumPayload() {
  try {
    const raw = localStorage.getItem(tenantKey(FORUM_STORAGE_KEY))
    if (!raw) return emptyForumPayload()
    const p = JSON.parse(raw)
    return {
      announcements: Array.isArray(p.announcements) ? p.announcements : [],
      lessons: Array.isArray(p.lessons) ? p.lessons : [],
    }
  } catch {
    return emptyForumPayload()
  }
}

export function applyForumPayload(payload) {
  const next = {
    announcements: Array.isArray(payload?.announcements) ? payload.announcements : [],
    lessons: Array.isArray(payload?.lessons) ? payload.lessons : [],
  }
  try {
    localStorage.setItem(tenantKey(FORUM_STORAGE_KEY), JSON.stringify(next))
  } catch { /* quota */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('strefex-forum-hub-sync', { detail: next }))
  }
  return next
}

export function isForumSnapshotEmpty(p) {
  return (
    !p ||
    ((!Array.isArray(p.announcements) || p.announcements.length === 0) &&
      (!Array.isArray(p.lessons) || p.lessons.length === 0))
  )
}

export function writeForumPayload(payload) {
  const next = applyForumPayload(payload)
  if (typeof window === 'undefined') return next
  import('../services/workspaceCloudSync')
    .then((m) => {
      if (typeof m.notifyWorkspaceKeyDirty === 'function') {
        m.notifyWorkspaceKeyDirty('forum', true)
      }
    })
    .catch((err) => devWarn('forum sync skipped', err))
  return next
}
