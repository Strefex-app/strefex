import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import AppListSelect from '../../components/AppListSelect'
import useAuditProStore from '../../store/auditProStore'
import { useMyCalendarStore } from '../../store/myCalendarStore'
import { useServiceRequestStore } from '../../store/serviceRequestStore'
import { scheduleEventsFromPersonalCalendar } from '../../utils/auditCalendarBridge'
import { sellerCategoryLabel, AUDITORS_DIRECTORY_ALIAS } from '../../utils/auditorsDirectory'
import { normalizeLabelKey } from '../../utils/displayLabel'
import { isOpenAuditRequest, sellerSiteCode, utcTodayIso } from '../../utils/auditorsAssignmentPool'
import { formatAuditDateLabel } from '../../utils/companyExternalAudit'
import { sellerCompanyName } from '../../utils/auditSellerLabel'
import { buildCalendarQueue, CALENDAR_QUEUE } from '../../utils/auditJourney'
import { planSellerAudit } from './auditJourneyActions'
import {
  buildScheduleEvents,
  nextCommitments,
} from '../../utils/auditProgrammeViews'
import { useAuditorsHubScopedData } from '../../hooks/useAuditorsHubScopedData'
import { isIndustryScopedAuditorRole, suppliersForCalendarWorkspace } from '../../utils/auditorIndustryScope'

function useProgrammeData() {
  const reminders = useAuditProStore((s) => s.reminders)
  const { audits, auditors, suppliers, email: authEmail, role } = useAuditorsHubScopedData()
  return { audits, auditors, suppliers, reminders, authEmail, role }
}

function CalendarBoard({ events, month, year, onPrev, onNext, onOpen, onPickDay, selectedIso, onDropSeller }) {
  const first = new Date(year, month, 1)
  const dim = new Date(year, month + 1, 0).getDate()
  const mondayPad = (first.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < mondayPad; i += 1) cells.push(null)
  for (let d = 1; d <= dim; d += 1) cells.push(d)
  const today = new Date()
  const monthEvents = events.filter((e) => {
    const [y, m] = String(e.date || '').split('-').map(Number)
    return y === year && m === month + 1
  })
  const mName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="ap-sched-cal">
      <div className="ap-sched-cal-head">
        <button type="button" className="app-page-btn-outline stx-click-feedback ap-sched-nav" onClick={onPrev} aria-label="Previous month">←</button>
        <h3 className="ap-sched-month">{mName}</h3>
        <button type="button" className="app-page-btn-outline stx-click-feedback ap-sched-nav" onClick={onNext} aria-label="Next month">→</button>
        <span className="ap-sched-count">{monthEvents.length} entries this month</span>
      </div>
      <div className="ap-sched-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="ap-sched-dow">{d}</div>
        ))}
        {cells.map((day, i) => {
          const iso = day
            ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            : ''
          const dayEvents = day ? events.filter((e) => e.date === iso) : []
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const isPick = iso && iso === selectedIso
          return (
            <div
              key={i}
              className={`ap-sched-cell${isToday ? ' is-today' : ''}${isPick ? ' is-pick' : ''}${day ? ' is-day' : ''}`}
              onClick={() => { if (iso) onPickDay?.(iso) }}
              onDragOver={iso ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } : undefined}
              onDrop={iso ? (e) => {
                e.preventDefault()
                const sellerId = e.dataTransfer.getData('text/seller-id')
                if (sellerId) onDropSeller?.(iso, sellerId)
              } : undefined}
            >
              {day ? <div className="ap-sched-daynum">{day}</div> : null}
              {dayEvents.slice(0, 3).map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className={`ap-sched-chip ap-tone--${eventTone(ev.type)}`}
                  onClick={(e) => { e.stopPropagation(); onOpen(ev) }}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          )
        })}
      </div>
      <div className="ap-sched-legend">
        <span><i className="ap-sched-dot ap-tone--upcoming" /> Audit performed</span>
        <span><i className="ap-sched-dot ap-tone--planned" /> Audit planned</span>
        <span><i className="ap-sched-dot ap-tone--new_registered" /> Questionnaire due</span>
        <span><i className="ap-sched-dot ap-tone--reevaluation" /> CAPA due</span>
        <span><i className="ap-sched-dot ap-tone--personal" /> Auditor calendar</span>
      </div>
    </div>
  )
}

const SIDE_FILTERS = [
  { id: 'assigned', label: 'Assigned' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'new_registered', label: 'New suppliers' },
  { id: 'to_plan', label: 'To plan' },
  { id: 'planned', label: 'Planned' },
  { id: 'reevaluation', label: 'Re-evaluation' },
  { id: 'buyer_request', label: 'Buyer request' },
]

function queueRowTone(tags = []) {
  if (tags.includes('buyer_request')) return 'buyer_request'
  if (tags.includes('reevaluation')) return 'reevaluation'
  if (tags.includes('new_registered')) return 'new_registered'
  if (tags.includes('planned')) return 'planned'
  if (tags.includes('to_plan')) return 'to_plan'
  return 'assigned'
}

function eventTone(type) {
  if (type === 'planned') return 'planned'
  if (type === 'questionnaire') return 'new_registered'
  if (type === 'capa') return 'reevaluation'
  if (type === 'personal') return 'personal'
  if (type === 'performed') return 'upcoming'
  return 'assigned'
}

export default function AuditProCalendar() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { audits, auditors, suppliers, reminders, authEmail, role } = useProgrammeData()
  const personalEntries = useMyCalendarStore((s) => s.entries)
  const allRequests = useServiceRequestStore((s) => s.requests)
  const getSafeRequests = useServiceRequestStore((s) => s.getSafeRequests)
  const todayIso = utcTodayIso()
  const requests = useMemo(
    () => (typeof getSafeRequests === 'function' ? getSafeRequests() : allRequests || []).filter((row) => isOpenAuditRequest(row)),
    [getSafeRequests, allRequests],
  )
  const rawView = searchParams.get('view')
  const sendToRecords = ['actions', 'findings', 'capa'].includes(rawView)
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [queueFilter, setQueueFilter] = useState('assigned')
  const [pickIso, setPickIso] = useState('')
  const [schedBusy, setSchedBusy] = useState(false)

  const calendarSuppliers = useMemo(
    () => suppliersForCalendarWorkspace(suppliers, audits, {
      role,
      email: authEmail,
      auditorIds: new Set((auditors || []).map((a) => a.id)),
    }),
    [suppliers, audits, role, authEmail, auditors],
  )
  const isAuditorWorkspace = isIndustryScopedAuditorRole(role)

  const industry = searchParams.get('industry') || ''
  const scopedAudits = useMemo(() => {
    if (!industry) return audits
    const byId = new Map((calendarSuppliers || []).map((s) => [s.id, s]))
    return audits.filter(
      (a) => normalizeLabelKey(sellerCategoryLabel(byId.get(a.supplierId) || { industry: a.industry })) === normalizeLabelKey(industry),
    )
  }, [audits, calendarSuppliers, industry])

  const events = useMemo(() => {
    const programme = buildScheduleEvents({ audits: scopedAudits, suppliers: calendarSuppliers, auditors, reminders, todayIso })
    const personal = scheduleEventsFromPersonalCalendar(personalEntries)
      .filter((ev) => !programme.some((p) => p.date === ev.date && String(ev.id).includes(String(p.auditId || ''))))
    return [...programme, ...personal]
  }, [scopedAudits, calendarSuppliers, auditors, reminders, todayIso, personalEntries])
  const upcoming = useMemo(() => nextCommitments(events, todayIso, 8), [events, todayIso])

  const queue = useMemo(
    () => buildCalendarQueue({
      suppliers: calendarSuppliers,
      audits,
      requests: isAuditorWorkspace ? [] : requests,
      todayIso,
      includeUnmatchedRequests: !isAuditorWorkspace,
    }),
    [calendarSuppliers, audits, requests, todayIso, isAuditorWorkspace],
  )
  const queueCounts = useMemo(() => {
    const c = { assigned: queue.length, upcoming: upcoming.length }
    CALENDAR_QUEUE.forEach((q) => { c[q.id] = queue.filter((row) => row.tags.includes(q.id)).length })
    return c
  }, [queue, upcoming])
  const sideFilters = useMemo(
    () => (isAuditorWorkspace
      ? SIDE_FILTERS.filter((q) => !['reevaluation', 'buyer_request'].includes(q.id))
      : SIDE_FILTERS),
    [isAuditorWorkspace],
  )
  const shownQueue = useMemo(
    () => {
      if (queueFilter === 'assigned' || queueFilter === 'all') return queue
      if (queueFilter === 'upcoming') return []
      return queue.filter((row) => row.tags.includes(queueFilter))
    },
    [queue, queueFilter],
  )
  const selfAuditor = useMemo(
    () => (auditors || []).find((a) => String(a.email || '').toLowerCase() === authEmail) || null,
    [auditors, authEmail],
  )
  const showToast = useAuditProStore((s) => s.showToast)

  const openEvent = (ev) => {
    if (ev.type === 'capa' && ev.supplierId) {
      navigate(`${AUDITORS_DIRECTORY_ALIAS}/record/${encodeURIComponent(ev.supplierId)}`)
      return
    }
    if (ev.type === 'performed' && ev.auditId) {
      navigate(`${AUDITORS_DIRECTORY_ALIAS}/findings/${encodeURIComponent(ev.auditId)}`)
      return
    }
    if (ev.auditId) navigate(`${AUDITORS_DIRECTORY_ALIAS}/conduct/${encodeURIComponent(ev.auditId)}`)
  }

  const pickDay = (iso) => {
    setPickIso(iso)
  }

  const dropSellerOnDay = async (iso, sellerId) => {
    const seller = (calendarSuppliers || []).find((s) => s.id === sellerId)
    if (!seller || !iso) return
    if (!selfAuditor) {
      showToast('Your auditor profile is not on the panel yet.', 'error')
      return
    }
    setSchedBusy(true)
    try {
      await planSellerAudit({ supplier: seller, date: iso, auditor: selfAuditor })
      setPickIso(iso)
    } catch (err) {
      showToast(err?.message || 'Could not plan this visit.', 'error')
    } finally {
      setSchedBusy(false)
    }
  }

  return sendToRecords
    ? <Navigate to={`${AUDITORS_DIRECTORY_ALIAS}/suppliers?view=records`} replace />
    : (
    <div className="ap-prog">
      <div className="app-page-toolbar ap-sched-toolbar">
        <AppListSelect
          className="ap-sched-cat"
          value={industry}
          ariaLabel="Filter by seller category"
          placeholder="All seller categories"
          options={[{ value: '', label: 'All seller categories' }, ...[...new Set((calendarSuppliers || []).map((s) => sellerCategoryLabel(s)))].sort().map((cat) => ({ value: cat, label: cat }))]}
          onChange={(next) => {
            const nextParams = new URLSearchParams(searchParams)
            if (!next) nextParams.delete('industry')
            else nextParams.set('industry', next)
            setSearchParams(nextParams)
          }}
        />
        <div className="app-page-btn-row ap-sched-filters" role="group" aria-label="Supplier list">
          {sideFilters.map((q) => (
            <button
              key={q.id}
              type="button"
              className={`ap-sched-q ap-tone--${q.id} stx-click-feedback${queueFilter === q.id ? ' is-on' : ''}`}
              onClick={() => setQueueFilter(q.id)}
              aria-pressed={queueFilter === q.id}
            >
              {q.label}
              {queueCounts[q.id] != null ? ` · ${queueCounts[q.id]}` : ''}
            </button>
          ))}
        </div>
      </div>
      <div className="ap-sched">
        <CalendarBoard
          events={events}
          month={month}
          year={year}
          onPrev={() => {
            if (month === 0) { setMonth(11); setYear((y) => y - 1) }
            else setMonth((m) => m - 1)
          }}
          onNext={() => {
            if (month === 11) { setMonth(0); setYear((y) => y + 1) }
            else setMonth((m) => m + 1)
          }}
          onOpen={openEvent}
          onPickDay={pickDay}
          selectedIso={pickIso}
          onDropSeller={dropSellerOnDay}
        />
        <aside className="ap-sched-side">
          <div className="ap-sched-side-list">
          {queueFilter === 'upcoming' ? (
            upcoming.length === 0 ? (
              <p className="ap-dir-empty">No upcoming visit dates.</p>
            ) : upcoming.map((ev) => (
              <button key={ev.id} type="button" className={`ap-commit ap-sched-card ap-tone--${eventTone(ev.type)}`} onClick={() => openEvent(ev)}>
                <div className="ap-sched-seller-row">
                  <span className="ap-pool-seller stx-text-wrap">{ev.label}</span>
                  <span className="ap-pool-sub">{ev.date}</span>
                </div>
              </button>
            ))
          ) : shownQueue.length === 0 ? (
            <p className="ap-dir-empty">
              {isAuditorWorkspace
                ? 'No companies assigned to you yet.'
                : 'Assign companies on Supplier pool. They appear here once an auditor is set.'}
            </p>
          ) : shownQueue.map((row) => {
            const canDrag = Boolean(row.supplier?.id) && !String(row.supplier.id).startsWith('req-')
            return (
              <button
                key={row.id}
                type="button"
                className={`ap-commit ap-sched-card ap-sched-drag ap-tone--${queueRowTone(row.tags)}`}
                draggable={canDrag}
                onDragStart={canDrag ? (e) => {
                  e.dataTransfer.setData('text/seller-id', row.supplier.id)
                  e.dataTransfer.effectAllowed = 'copy'
                } : undefined}
                onClick={() => {
                  if (canDrag && pickIso && selfAuditor) void dropSellerOnDay(pickIso, row.supplier.id)
                }}
              >
                <div className="ap-sched-seller-row">
                  <span className="ap-pool-seller">{sellerCompanyName(row.supplier)}</span>
                  <span className="ap-pool-code">{sellerSiteCode(row.supplier)}</span>
                </div>
              </button>
            )
          })}
          {pickIso ? (
            <p className="ap-dir-empty">Selected day {formatAuditDateLabel(pickIso)}. Drop a supplier here or click one in the list.</p>
          ) : null}
          {schedBusy ? <p className="ap-dir-empty">Planning…</p> : null}
          </div>
        </aside>
      </div>
    </div>
    )
}
