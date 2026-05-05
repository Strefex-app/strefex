import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import PlatformYearCalendar from '../components/PlatformYearCalendar'
import { usePlatformCalendarYearEvents } from '../hooks/usePlatformCalendarEvents'
import { useMyCalendarStore } from '../store/myCalendarStore'
import { isPersonalCalendarEvent, normalizeDateStr } from '../utils/platformCalendarEvents'
import './PlatformCalendar.css'

const LEGEND = [
  { type: 'task', label: 'Project task', color: '#00d4ff' },
  { type: 'rfq_deadline', label: 'RFQ deadline', color: '#2e7d32' },
  { type: 'rfq_incoming', label: 'RFQ to respond', color: '#c62828' },
  { type: 'service_request', label: 'Service request', color: '#e65100' },
  { type: 'onboarding', label: 'HR onboarding', color: '#6a1b9a' },
  { type: 'exhibition', label: 'Trade fair / expo', color: '#e67e22' },
  { type: 'ai_contract', label: 'Contract end (AI Insights)', color: '#4527a0' },
  { type: 'nda_contract', label: 'NDA — review / re-sign', color: '#ad1457' },
  { type: 'contract_renewal', label: 'Contract renewal', color: '#7e57c2' },
  { type: 'contract_milestone', label: 'Contract milestone', color: '#283593' },
  { type: 'hr_doc_expiry', label: 'HR document expiry', color: '#7b1fa2' },
  { type: 'nda_hr_doc', label: 'NDA / policy (HR doc)', color: '#c2185b' },
  { type: 'training_expiry', label: 'Training / cert expiry', color: '#00838f' },
  { type: 'hr_goal', label: 'HR goal due', color: '#5e35b1' },
  { type: 'personal_event', label: 'Your event', color: '#1565c0' },
  { type: 'personal_reminder', label: 'Your reminder', color: '#ef6c00' },
  { type: 'personal_meeting', label: 'Your meeting', color: '#5d4037' },
]

function isoTodayLocal() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function shortListDate(iso) {
  try {
    const d = new Date(`${iso}T12:00:00`)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export default function PlatformCalendar() {
  const navigate = useNavigate()
  const location = useLocation()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [selectedDate, setSelectedDate] = useState(() => isoTodayLocal())

  const titleInputRef = useRef(null)

  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draftKind, setDraftKind] = useState('event')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDetail, setDraftDetail] = useState('')
  const [draftTime, setDraftTime] = useState('')
  const [draftDate, setDraftDate] = useState(selectedDate)

  const addEntry = useMyCalendarStore((s) => s.addEntry)
  const updateEntry = useMyCalendarStore((s) => s.updateEntry)
  const removeEntry = useMyCalendarStore((s) => s.removeEntry)
  const calendarEntries = useMyCalendarStore((s) => s.entries)

  const closePersonalModal = useCallback(() => {
    setEntryModalOpen(false)
    setEditingId(null)
    setDraftKind('event')
    setDraftTitle('')
    setDraftDetail('')
    setDraftTime('')
    setDraftDate(selectedDate)
  }, [selectedDate])

  const openNewPersonalModal = useCallback((dateKey) => {
    const d = normalizeDateStr(dateKey) || dateKey
    setSelectedDate(d)
    setEditingId(null)
    setDraftKind('event')
    setDraftTitle('')
    setDraftDetail('')
    setDraftTime('')
    setDraftDate(d)
    setEntryModalOpen(true)
    requestAnimationFrame(() => titleInputRef.current?.focus())
  }, [])

  const openEditPersonalModal = useCallback((entry) => {
    const d = normalizeDateStr(entry.date) || isoTodayLocal()
    setSelectedDate(d)
    setEditingId(entry.id)
    const k = entry.kind === 'reminder' || entry.kind === 'meeting' ? entry.kind : 'event'
    setDraftKind(k)
    setDraftTitle(entry.title || '')
    setDraftDetail(entry.detail || '')
    setDraftTime(entry.timeLabel || '')
    setDraftDate(d)
    setEntryModalOpen(true)
    requestAnimationFrame(() => titleInputRef.current?.focus())
  }, [])

  useEffect(() => {
    const fd = location.state?.focusDate
    if (typeof fd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fd)) return
    const yFocus = Number(fd.slice(0, 4))
    if (!Number.isNaN(yFocus)) setYear(yFocus)
    openNewPersonalModal(fd)
    navigate('.', { replace: true, state: null })
  }, [location.state, navigate, openNewPersonalModal])

  useEffect(() => {
    if (!entryModalOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closePersonalModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entryModalOpen, closePersonalModal])

  const { eventsByDate, flatEvents } = usePlatformCalendarYearEvents(year)

  const todayIso = isoTodayLocal()
  const upcomingList = useMemo(() => {
    const yearEnd = `${year}-12-31`
    const yearStart = `${year}-01-01`
    const from = todayIso > yearStart ? todayIso : yearStart
    const keys = Object.keys(eventsByDate).filter((k) => k >= from && k <= yearEnd).sort()
    /** @type {Array<{ dateKey: string, ev: import('../utils/platformCalendarEvents').PlatformCalendarEvent }>} */
    const rows = []
    keys.forEach((k) => {
      ;(eventsByDate[k] || []).forEach((ev) => {
        rows.push({ dateKey: k, ev })
      })
    })
    return rows
  }, [eventsByDate, year, todayIso])

  const handleSavePersonal = (e) => {
    e.preventDefault()
    const d = normalizeDateStr(draftDate) || normalizeDateStr(selectedDate)
    if (!d) return
    const titleSaved = String(draftTitle || '').trim() || 'Untitled'
    if (editingId) {
      updateEntry(editingId, {
        date: d,
        kind: draftKind,
        title: titleSaved,
        detail: draftDetail,
        timeLabel: draftTime,
      })
    } else {
      addEntry({
        date: d,
        kind: draftKind,
        title: titleSaved,
        detail: draftDetail,
        timeLabel: draftTime,
      })
    }
    setEntryModalOpen(false)
    setEditingId(null)
    setDraftTitle('')
    setDraftDetail('')
    setDraftTime('')
    setDraftKind('event')
    setDraftDate(d)
    setSelectedDate(d)
  }

  const goPrevYear = () => setYear((y) => y - 1)
  const goNextYear = () => setYear((y) => y + 1)

  const renderEventRow = ({ dateKey, ev }) => {
    const personal = isPersonalCalendarEvent(ev)
    const entry = personal ? calendarEntries.find((en) => en.id === ev.id) : null
    return (
      <li key={`${dateKey}-${ev.id}`} className="platform-calendar-page__li platform-calendar-page__li--upcoming">
        <span className="platform-calendar-page__li-dot" style={{ background: ev.color }} />
        <div>
          <div className="platform-calendar-page__upcoming-when">
            {shortListDate(dateKey)}
            {dateKey === todayIso ? <span className="platform-calendar-page__badge-today">Today</span> : null}
          </div>
          <div className="platform-calendar-page__li-title">{ev.title}</div>
          {ev.detail ? <div className="platform-calendar-page__li-detail">{ev.detail}</div> : null}
          {ev.meta ? <div className="platform-calendar-page__li-meta">{ev.meta}</div> : null}
          <div className="platform-calendar-page__li-actions platform-calendar-page__li-actions--tight">
            <button
              type="button"
              className="platform-calendar-page__li-go platform-calendar-page__li-go--small"
              onClick={() => setSelectedDate(dateKey)}
            >
              Day
            </button>
            {personal && entry ? (
              <>
                <button type="button" className="platform-calendar-page__li-go platform-calendar-page__li-go--small" onClick={() => openEditPersonalModal(entry)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="platform-calendar-page__li-go platform-calendar-page__li-go--small platform-calendar-page__li-go--danger"
                  onClick={() => {
                    removeEntry(entry.id)
                    if (editingId === entry.id) closePersonalModal()
                  }}
                >
                  Remove
                </button>
              </>
            ) : null}
            {!personal && ev.href ? (
              <button type="button" className="platform-calendar-page__li-go platform-calendar-page__li-go--small" onClick={() => navigate(ev.href)}>
                Open
              </button>
            ) : null}
          </div>
        </div>
      </li>
    )
  }

  return (
    <AppLayout>
      <div className="platform-calendar-page">
        <header className="platform-calendar-page__head">
          <h1 className="platform-calendar-page__title">Calendar</h1>
          <p className="platform-calendar-page__sub">
            <strong>What it shows:</strong> one calendar year of platform items (tasks, RFQs, HR, trade fairs, contracts, NDAs, and similar) plus your own events, reminders, and meetings.
            {' '}
            <strong>How to use:</strong> click a day to add or edit an entry; use ‹ › to change year; colored dots are explained in the legend under the grid; the right column lists today through year-end (scroll the list if needed). Trade fairs follow industries you set in{' '}
            <Link to="/settings">settings</Link>.
          </p>
        </header>

        <div className="platform-calendar-page__layout">
          <div className="platform-calendar-page__main">
            <div className="platform-calendar-page__calendar-surface">
              <div className="platform-calendar-page__calendar-row">
                <div className="platform-calendar-page__year-wrap">
                  <PlatformYearCalendar
                    year={year}
                    eventsByDate={eventsByDate}
                    selectedDate={selectedDate}
                    onSelectDate={openNewPersonalModal}
                    onPrevYear={goPrevYear}
                    onNextYear={goNextYear}
                  />
                </div>

                <aside className="platform-calendar-page__side">
                  <h2 className="platform-calendar-page__side-title">Today &amp; upcoming</h2>
                  <p className="platform-calendar-page__side-sub">In {year}, from today through year-end.</p>
                  <p className="platform-calendar-page__selected-line">
                    Selected: <strong>{selectedDate}</strong>
                  </p>

                  <div className="platform-calendar-page__side-scroll">
                    {upcomingList.length === 0 ? (
                      <p className="platform-calendar-page__empty">No items from today onward in this year.</p>
                    ) : (
                      <ul className="platform-calendar-page__list platform-calendar-page__list--upcoming">{upcomingList.map(renderEventRow)}</ul>
                    )}
                  </div>

                  <p className="platform-calendar-page__count">
                    {flatEvents.length} marker{flatEvents.length === 1 ? '' : 's'} in {year}
                  </p>
                </aside>
              </div>

              <div className="platform-calendar-page__calendar-scope" aria-label="Calendar marker legend">
                <div className="platform-calendar-page__legend">
                  {LEGEND.map((L) => (
                    <span key={L.type} className="platform-calendar-page__legend-item">
                      <span className="platform-calendar-page__legend-dot" style={{ background: L.color }} />
                      {L.label}
                    </span>
                  ))}
                </div>
                <p className="platform-calendar-page__hint">
                  <Link to="/profile/calendar">Trade fair directory</Link>
                  {' · '}
                  <Link to="/ai-insights">AI Insights</Link>
                  {' · '}
                  <button type="button" className="platform-calendar-page__linkish" onClick={() => navigate('/contracts')}>
                    Contracts
                  </button>
                  {' · '}
                  <button type="button" className="platform-calendar-page__linkish" onClick={() => navigate('/project-management')}>
                    Project management
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>

        {entryModalOpen ? (
          <div
            className="platform-cal-modal-overlay"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closePersonalModal()
            }}
          >
            <div
              className="platform-cal-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="platform-cal-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="platform-cal-modal__head">
                <h2 id="platform-cal-modal-title" className="platform-cal-modal__title">
                  {editingId ? 'Edit entry' : 'New entry'} · {draftDate}
                </h2>
                <button type="button" className="platform-cal-modal__close" onClick={closePersonalModal} aria-label="Close">
                  ×
                </button>
              </div>
              <form className="platform-cal-modal__form" onSubmit={handleSavePersonal}>
                <div className="platform-calendar-page__field">
                  <label htmlFor="pcal-modal-name">Name</label>
                  <input
                    ref={titleInputRef}
                    id="pcal-modal-name"
                    type="text"
                    className="platform-calendar-page__input"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Title or short name"
                    autoComplete="off"
                  />
                </div>
                <div className="platform-calendar-page__field">
                  <label htmlFor="pcal-modal-time">Time (optional)</label>
                  <input
                    id="pcal-modal-time"
                    type="text"
                    className="platform-calendar-page__input"
                    value={draftTime}
                    onChange={(e) => setDraftTime(e.target.value)}
                    placeholder="e.g. 14:00 or Morning"
                  />
                </div>
                <div className="platform-calendar-page__field">
                  <label htmlFor="pcal-modal-kind">Type</label>
                  <select
                    id="pcal-modal-kind"
                    className="platform-calendar-page__input"
                    value={draftKind}
                    onChange={(e) => setDraftKind(e.target.value)}
                  >
                    <option value="event">Event</option>
                    <option value="reminder">Reminder</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>
                <div className="platform-calendar-page__field">
                  <label htmlFor="pcal-modal-date">Date</label>
                  <input
                    id="pcal-modal-date"
                    type="date"
                    className="platform-calendar-page__input"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                  />
                </div>
                <div className="platform-calendar-page__field">
                  <label htmlFor="pcal-modal-notes">Notes (optional)</label>
                  <textarea
                    id="pcal-modal-notes"
                    className="platform-calendar-page__textarea"
                    value={draftDetail}
                    onChange={(e) => setDraftDetail(e.target.value)}
                    rows={4}
                    placeholder="Extra details, links, or reminders…"
                  />
                </div>
                <div className="platform-cal-modal__actions">
                  <button type="submit" className="platform-calendar-page__btn-primary">
                    Save
                  </button>
                  <button type="button" className="platform-calendar-page__btn-secondary" onClick={closePersonalModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
