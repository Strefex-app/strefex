/** @typedef {{ id?: string }} HubNotifLike */

export const normalizeEmail = (v) => String(v || '').trim().toLowerCase()

/** Match buyer refs (B-0001, B-0007/01) or legacy SR- ids embedded in title/message */
export function extractRefsFromText(text) {
  const s = String(text || '')
  const refs = []
  const b = s.match(/\bB-\d{4}(?:\/\d{2})?\b/gi)
  if (b) refs.push(...b.map((x) => x.toUpperCase()))
  const sr = s.match(/\bSR-\d{4}-[A-Za-z0-9]+\b/gi)
  if (sr) refs.push(...sr.map((x) => x.toUpperCase()))
  const legacy = s.match(/\bSR-\d{4}-\d+\b/g) // numeric tail
  if (legacy) refs.push(...legacy)
  return [...new Set(refs)]
}

/**
 * Stable ref line for hub row: notification.requestId OR parsed from title/message.
 */
export function getNotificationRefs(notification) {
  const rid = notification?.requestId
  if (rid) return [String(rid)]
  return extractRefsFromText(`${notification?.title || ''}\n${notification?.message || ''}`)
}

const PRI_WEIGHT = { Urgent: 4, High: 3, Normal: 2, Low: 1 }

export function priorityWeight(notification) {
  const p = String(notification?.priority || 'Normal').trim()
  return PRI_WEIGHT[p] ?? PRI_WEIGHT.Normal
}

export function isUnreadForReader(notification, readerEmailNorm) {
  const r = normalizeEmail(readerEmailNorm)
  if (!r) return true
  return !(notification?.readBy || []).includes(r)
}

/**
 * Folder key groups by requestor sender; platform/system notices share one bucket.
 */
export function folderKeyFor(notification) {
  const from = normalizeEmail(notification?.fromEmail)
  if (!from || from === 'platform@strefex.com') return '__platform'
  return from
}

export function folderLabelFor(notification, folderKey, accountRegistryEmails) {
  if (folderKey === '__platform') return 'Platform & system'
  const name =
    notification?.fromName ||
    notification?.fromCompany ||
    (accountRegistryEmails?.[folderKey]?.name ?? null)
  if (name) return `${String(name).trim()}`
  return folderKey
}

/** Group notifications — record folderKey → { notifications, meta } */
export function groupByFolder(notifications, readerEmailNorm, accountLookupByEmail = {}) {
  const map = new Map()
  notifications.forEach((n) => {
    const fk = folderKeyFor(n)
    const label = folderLabelFor(n, fk, accountLookupByEmail)
    const existing = map.get(fk)
    if (!existing) {
      map.set(fk, { key: fk, label, items: [] })
    }
    map.get(fk).items.push(n)
  })

  /** folder stats */
  map.forEach((entry) => {
    let unread = 0
    entry.items.forEach((n) => {
      if (isUnreadForReader(n, readerEmailNorm)) unread += 1
    })
    entry.unreadCount = unread
    entry.totalCount = entry.items.length
    entry.sortScore = unread * 1000 + entry.totalCount
  })

  return Array.from(map.values()).sort((a, b) => b.sortScore - a.sortScore || a.label.localeCompare(b.label))
}

export function matchesSearch(notification, queryLower) {
  if (!queryLower.trim()) return true
  const q = queryLower.trim()
  const refs = getNotificationRefs(notification)
  const blob = `${notification.title || ''} ${notification.message || ''} ${notification.fromCompany || ''} ${notification.fromName || ''} ${notification.fromEmail || ''} ${refs.join(' ')}`.toLowerCase()
  return blob.includes(q)
}

export function passesFilter(notification, readerEmailNorm, filter) {
  const unread = isUnreadForReader(notification, readerEmailNorm)
  if (filter === 'unread') return unread
  if (filter === 'urgent') return String(notification.priority || '') === 'Urgent'
  return true
}

/**
 * Priority (desc), then unread first optionally, then newer first.
 */
export function compareNotificationsForHub(a, b, readerEmailNorm, { unreadPriority = true } = {}) {
  if (unreadPriority) {
    const ua = isUnreadForReader(a, readerEmailNorm) ? 1 : 0
    const ub = isUnreadForReader(b, readerEmailNorm) ? 1 : 0
    if (ua !== ub) return ub - ua
  }
  const pw = priorityWeight(b) - priorityWeight(a)
  if (pw !== 0) return pw
  const ta = new Date(a.createdAt || 0).getTime()
  const tb = new Date(b.createdAt || 0).getTime()
  return tb - ta
}

export function sortNotificationsForHub(notifications, readerEmailNorm, opts) {
  const list = [...notifications]
  return list.sort((a, b) => compareNotificationsForHub(a, b, readerEmailNorm, opts))
}

/**
 * Group inbox rows that share requestId into one thread (sorted oldest→newest in items).
 */
export function partitionNotificationsByRequest(notifications) {
  const threads = new Map()
  const singles = []
  ;(notifications || []).forEach((n) => {
    const rid = n?.requestId ? String(n.requestId) : ''
    if (!rid) {
      singles.push(n)
      return
    }
    if (!threads.has(rid)) threads.set(rid, [])
    threads.get(rid).push(n)
  })

  const threadList = Array.from(threads.entries()).map(([requestId, items]) => ({
    requestId,
    items: [...items].sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    ),
  }))

  return { threads: threadList, singles }
}

export function threadUnreadCount(thread, readerNorm) {
  return thread.items.filter((n) => isUnreadForReader(n, readerNorm)).length
}

/** Latest inbox event in thread — for sort / priority chips */
export function threadLatestNotification(thread) {
  const { items } = thread
  if (!items?.length) return null
  return items[items.length - 1]
}
