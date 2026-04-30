import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccountRegistry } from '../store/accountRegistry'
import {
  groupByFolder,
  isUnreadForReader,
  matchesSearch,
  passesFilter,
  normalizeEmail,
  folderLabelFor,
  getNotificationRefs,
  partitionNotificationsByRequest,
  threadUnreadCount,
  threadLatestNotification,
  compareNotificationsForHub,
} from '../utils/notificationHub'

const FILTER_OPTS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread only' },
  { id: 'urgent', label: 'Urgent' },
]

/** Status line for a request row from store (optional) */
const REQ_STATUS_BADGE = {
  new: 'New',
  assigned: 'Assigned',
  on_hold: 'On hold',
  in_progress: 'In progress',
  completed: 'Done',
  cancelled: 'Cancelled',
  recalled: 'Recalled',
}

/**
 * Enhanced service / request notifications — folders by sender, refs, filtering,
 * one thread per request (all updates nested), collapsible read section.
 */
export default function NotificationsRequestHub({
  notifications,
  readerEmail,
  markNotificationRead,
  isManager,
  onNavigateToRequests,
  /** Map of request id → request row (optional) for status / assignee chip */
  requestsById = {},
}) {
  const navigate = useNavigate()
  const accounts = useAccountRegistry((s) => s.accounts)

  const accountLookup = useMemo(() => {
    const map = {}
    ;(accounts || []).forEach((a) => {
      const e = normalizeEmail(a?.email)
      if (e) map[e] = { name: a.contactName || a.company || e }
    })
    return map
  }, [accounts])

  const readerNorm = normalizeEmail(readerEmail)

  const [folderKey, setFolderKey] = useState('__all')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [readCollapsed, setReadCollapsed] = useState(true)

  const queryLower = query.toLowerCase()

  /** Base pipeline: filter + folder + query */
  const baseFiltered = useMemo(() => {
    let rows = [...(notifications || [])]
    rows = rows.filter((n) => passesFilter(n, readerNorm, filter))
    rows = rows.filter((n) => matchesSearch(n, queryLower))

    if (folderKey !== '__all') {
      rows = rows.filter((n) => {
        const from = normalizeEmail(n.fromEmail)
        if (folderKey === '__platform') {
          return !from || from === 'platform@strefex.com'
        }
        return from === folderKey
      })
    }

    return rows
  }, [notifications, readerNorm, filter, queryLower, folderKey])

  /** Sort mixed threads + singles — rep = latest event in thread */
  const sortMixedEntries = useCallback(
    (entries, { unreadPriority }) => {
      return [...entries].sort((a, b) => {
        const ra =
          a.kind === 'thread'
            ? threadLatestNotification(a.thread)
            : a.notif
        const rb =
          b.kind === 'thread'
            ? threadLatestNotification(b.thread)
            : b.notif
        if (!ra || !rb) return 0
        return compareNotificationsForHub(ra, rb, readerNorm, { unreadPriority })
      })
    },
    [readerNorm]
  )

  const { unreadEntries, readEntries, unreadItemsFlat } = useMemo(() => {
    const { threads, singles } = partitionNotificationsByRequest(baseFiltered)
    const threadEntries = threads.map((thread) => ({ kind: 'thread', thread }))
    const singleEntries = singles.map((notif) => ({ kind: 'single', notif }))

    const unread = []
    const read = []

    threadEntries.forEach((te) => {
      if (threadUnreadCount(te.thread, readerNorm) > 0) unread.push(te)
      else read.push(te)
    })
    singleEntries.forEach((se) => {
      if (isUnreadForReader(se.notif, readerNorm)) unread.push(se)
      else read.push(se)
    })

    const unreadSorted = sortMixedEntries(unread, { unreadPriority: true })
    const readSorted = sortMixedEntries(read, { unreadPriority: false })

    const flat = []
    unreadSorted.forEach((e) => {
      if (e.kind === 'thread') {
        e.thread.items.forEach((n) => {
          if (isUnreadForReader(n, readerNorm)) flat.push(n)
        })
      } else if (isUnreadForReader(e.notif, readerNorm)) flat.push(e.notif)
    })

    return { unreadEntries: unreadSorted, readEntries: readSorted, unreadItemsFlat: flat }
  }, [baseFiltered, readerNorm, sortMixedEntries])

  const folderGroups = useMemo(
    () => groupByFolder(notifications || [], readerNorm, accountLookup),
    [notifications, readerNorm, accountLookup]
  )

  const activeFolderSummaryLabel = useMemo(() => {
    if (folderKey === '__all') return null
    return (
      folderGroups.find((g) => g.key === folderKey)?.label ||
      folderLabelFor(
        { fromEmail: folderKey === '__platform' ? 'platform@strefex.com' : folderKey },
        folderKey,
        accountLookup
      )
    )
  }, [folderKey, folderGroups, accountLookup])

  const unreadTotal = unreadItemsFlat.length
  const readTotal = useMemo(() => {
    let c = 0
    readEntries.forEach((e) => {
      if (e.kind === 'thread') c += e.thread.items.length
      else c += 1
    })
    return c
  }, [readEntries])

  const handleMarkAllUnreadInViewRead = useCallback(() => {
    unreadItemsFlat.forEach((n) => markNotificationRead(n.id, readerEmail))
  }, [markNotificationRead, readerEmail, unreadItemsFlat])

  const handleNavigate = useCallback(
    (n) => {
      markNotificationRead(n.id, readerEmail)
      if (typeof onNavigateToRequests === 'function') onNavigateToRequests(n)
      else if (isManager) navigate('/service-requests')
    },
    [markNotificationRead, readerEmail, navigate, isManager, onNavigateToRequests]
  )

  const handleThreadOpen = useCallback(
    (thread) => {
      thread.items.forEach((n) => {
        if (isUnreadForReader(n, readerNorm)) markNotificationRead(n.id, readerEmail)
      })
      const last = threadLatestNotification(thread)
      if (typeof onNavigateToRequests === 'function' && last) onNavigateToRequests(last)
      else if (isManager) navigate('/service-requests')
    },
    [markNotificationRead, readerEmail, readerNorm, navigate, isManager, onNavigateToRequests]
  )

  const fmtDate = useCallback(
    (iso) =>
      iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    []
  )

  return (
    <div className="notif-hub">
      <div className="notif-hub-toolbar">
        <input
          type="search"
          className="notif-hub-search"
          placeholder="Search text, sender, or reference (B-0007, SR-…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search notifications"
        />
        <div className="notif-hub-toolbar-inline">
          <div className="notif-hub-filters" role="group" aria-label="Filter notifications">
            {FILTER_OPTS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`notif-hub-chip ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {unreadTotal > 0 && (
            <button type="button" className="notif-hub-text-btn" onClick={handleMarkAllUnreadInViewRead}>
              Mark unread in view as read
            </button>
          )}
        </div>
      </div>

      <div className="notif-hub-folders" role="navigation" aria-label="Folders by sender">
        <button
          type="button"
          className={`notif-folder-pill ${folderKey === '__all' ? 'active' : ''}`}
          onClick={() => setFolderKey('__all')}
        >
          All senders
          <span className="notif-folder-count">{(notifications || []).length}</span>
        </button>
        {folderGroups.map((g) => (
          <button
            key={g.key}
            type="button"
            className={`notif-folder-pill ${folderKey === g.key ? 'active' : ''}`}
            onClick={() => setFolderKey(g.key)}
          >
            <span className="notif-folder-label">{g.label}</span>
            {g.unreadCount > 0 && <span className="notif-folder-unread">{g.unreadCount} new</span>}
            <span className="notif-folder-count subtle">{g.totalCount}</span>
          </button>
        ))}
      </div>

      <div className="notif-hub-summary-strip">
        <span>
          <strong>{unreadTotal}</strong> unread alert{unreadTotal === 1 ? '' : 's'} in view
        </span>
        {folderKey !== '__all' && activeFolderSummaryLabel && (
          <span className="notif-hub-summary-folder">
            Sender:{' '}
            <strong>{activeFolderSummaryLabel}</strong>
          </span>
        )}
      </div>

      <p className="notif-hub-hint">
        Updates for the same reference are grouped — use <strong>History of changes</strong> to expand updates below.
      </p>

      <section className="notif-hub-section">
        <h4 className="notif-hub-h4">New &amp; unread (prioritized)</h4>
        {unreadEntries.length === 0 ? (
          <p className="notif-hub-empty">No unread items for this folder and filters.</p>
        ) : (
          <ul className="notif-hub-list">
            {unreadEntries.map((e) =>
              e.kind === 'thread' ? (
                <li key={`thr-${e.thread.requestId}`}>
                  <NotificationRequestThread
                    thread={e.thread}
                    requestRow={requestsById[e.thread.requestId]}
                    readerNorm={readerNorm}
                    onOpen={() => handleThreadOpen(e.thread)}
                    fmtDate={fmtDate}
                    muted={false}
                    accountLookup={accountLookup}
                  />
                </li>
              ) : (
                <li key={e.notif.id}>
                  <NotificationHubCard
                    n={e.notif}
                    readerNorm={readerNorm}
                    onActivate={() => handleNavigate(e.notif)}
                    fmtDate={fmtDate}
                    muted={false}
                  />
                </li>
              )
            )}
          </ul>
        )}
      </section>

      <section className={`notif-hub-section ${readCollapsed ? 'is-collapsed' : ''}`}>
        <button
          type="button"
          className="notif-hub-fold-trigger"
          onClick={() => setReadCollapsed(!readCollapsed)}
          aria-expanded={!readCollapsed}
        >
          <span className="notif-hub-fold-arrow" aria-hidden>
            {readCollapsed ? '▸' : '▾'}
          </span>
          Read ({readTotal})
          <span className="notif-hub-fold-mini">{readCollapsed ? 'Tap to expand' : 'Tap to collapse'}</span>
        </button>
        {!readCollapsed &&
          (readEntries.length === 0 ? (
            <p className="notif-hub-empty">No read items in view.</p>
          ) : (
            <ul className="notif-hub-list notif-hub-list--muted">
              {readEntries.map((e) =>
                e.kind === 'thread' ? (
                  <li key={`thr-${e.thread.requestId}`}>
                    <NotificationRequestThread
                      thread={e.thread}
                      requestRow={requestsById[e.thread.requestId]}
                      readerNorm={readerNorm}
                      onOpen={() => handleThreadOpen(e.thread)}
                      fmtDate={fmtDate}
                      muted
                      accountLookup={accountLookup}
                    />
                  </li>
                ) : (
                  <li key={e.notif.id}>
                    <NotificationHubCard
                      n={e.notif}
                      readerNorm={readerNorm}
                      onActivate={() => handleNavigate(e.notif)}
                      fmtDate={fmtDate}
                      muted
                    />
                  </li>
                )
              )}
            </ul>
          ))}
      </section>
    </div>
  )
}

function NotificationRequestThread({
  thread,
  requestRow,
  readerNorm,
  onOpen,
  fmtDate,
  muted,
  accountLookup,
}) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const { requestId, items } = thread
  const uc = threadUnreadCount(thread, readerNorm)
  const st = requestRow?.status
  const badge = st ? REQ_STATUS_BADGE[st] || st : null
  const assignee = requestRow?.assignedTo
  const unread = uc > 0

  const safeReqId = String(requestId).replace(/[^a-zA-Z0-9_-]/g, '_')
  const panelId = `notif-thread-history-${safeReqId}-${muted ? 'read' : 'unread'}`
  const triggerId = `${panelId}-trigger`

  return (
    <div
      className={`notif-hub-thread ${unread ? 'notif-hub-thread--unread' : ''} ${muted ? 'notif-hub-thread--muted' : ''} ${historyOpen ? 'notif-hub-thread--history-open' : ''}`}
    >
      <div className="notif-hub-thread-banner">
        <div className="notif-hub-thread-title-row">
          {unread && <span className="notif-hub-dot" aria-hidden />}
          <kbd className="notif-hub-ref notif-hub-ref--inline">{requestId}</kbd>
          {badge && (
            <span className="notif-hub-thread-status" title="Current request status">
              {badge}
            </span>
          )}
          {assignee && (
            <span className="notif-hub-thread-assignee" title="Assigned to">
              → {assignee}
            </span>
          )}
          {uc > 0 && <span className="notif-hub-thread-unread-pill">{uc} new</span>}
        </div>
        <button
          type="button"
          className="notif-hub-thread-history-trigger"
          onClick={() => setHistoryOpen(!historyOpen)}
          aria-expanded={historyOpen}
          aria-controls={panelId}
          id={triggerId}
        >
          <span className="notif-hub-thread-history-arrow" aria-hidden>
            {historyOpen ? '▾' : '▸'}
          </span>
          <span>History of changes</span>
          <span className="notif-hub-thread-history-count">({items.length})</span>
        </button>
      </div>

      {historyOpen && (
        <div className="notif-hub-thread-dropdown" id={panelId} role="region" aria-labelledby={triggerId}>
          <ol className="notif-hub-thread-lines" aria-label="Request update history (inbox copies)">
            {items.map((n) => (
              <li key={n.id} className="notif-hub-thread-line">
                <span className="notif-hub-thread-line-dot" aria-hidden />
                <div className="notif-hub-thread-line-body">
                  <div className="notif-hub-thread-line-meta">
                    {isUnreadForReader(n, readerNorm) && (
                      <span className="notif-mini-unread">New</span>
                    )}
                    <span className="notif-hub-ts">{fmtDate(n.createdAt)}</span>
                  </div>
                  <div className="notif-hub-thread-line-title">{n.title || 'Update'}</div>
                  <div className="notif-hub-thread-line-msg">{n.message}</div>
                  <div className="notif-hub-thread-line-from">
                    {formatActorLine(n, accountLookup)}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <button type="button" className="notif-hub-thread-open-btn" onClick={onOpen}>
        Mark read &amp; open Service requests
      </button>
    </div>
  )
}

function formatActorLine(n, accountLookup) {
  const fe = normalizeEmail(n.fromEmail)
  const name =
    (n.fromName && String(n.fromName)) ||
    (n.fromCompany && String(n.fromCompany)) ||
    (fe && accountLookup[fe]?.name) ||
    null
  const bits = [name, fe].filter(Boolean)
  return bits.length ? bits.join(' · ') : fe || 'Sender unknown'
}

function NotificationHubCard({ n, readerNorm, onActivate, fmtDate, muted }) {
  const unread = isUnreadForReader(n, readerNorm)
  const refs = getNotificationRefs(n)
  const p = String(n.priority || 'Normal')

  const prColor = p === 'Urgent' ? '#c62828' : p === 'High' ? '#e65100' : '#546e7a'

  const fromLine = [
    n.fromName && String(n.fromName),
    n.fromCompany && String(n.fromCompany),
    n.fromEmail && String(n.fromEmail),
  ]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(' · ') || 'Sender unknown'

  return (
    <div
      className={`notif-hub-card ${unread ? 'notif-hub-card--unread' : ''} ${muted ? 'notif-hub-card--dim' : ''}`}
      onClick={onActivate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onActivate()
        }
      }}
    >
      <div className="notif-hub-card-main">
        <div className="notif-hub-card-title-row">
          {unread && <span className="notif-hub-dot" aria-hidden />}
          <span className="notif-hub-title">{n.title || 'Notification'}</span>
          <span className="notif-hub-prio" style={{ color: prColor }}>
            {p}
          </span>
        </div>
        {refs.length > 0 && (
          <div className="notif-hub-refs" aria-label="Request references">
            {refs.map((r) => (
              <kbd key={r} className="notif-hub-ref">
                {r}
              </kbd>
            ))}
          </div>
        )}
        <p className="notif-hub-msg">{n.message}</p>
        <div className="notif-hub-meta">
          <span className="notif-hub-from">Requestor: {fromLine}</span>
          <span className="notif-hub-ts">{fmtDate(n.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}
