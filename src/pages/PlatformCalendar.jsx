import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import PlatformYearCalendar from '../components/PlatformYearCalendar'
import PlatformMonthCalendar from '../components/PlatformMonthCalendar'
import PlatformWeekCalendar from '../components/PlatformWeekCalendar'
import PlatformDayView from '../components/PlatformDayView'
import { usePlatformCalendarYearEvents } from '../hooks/usePlatformCalendarEvents'
import { useMyCalendarStore } from '../store/myCalendarStore'
import { isPersonalCalendarEvent, normalizeDateStr } from '../utils/platformCalendarEvents'
import {
  isoTodayLocal,
  addDaysIso,
  addMonthsIso,
  isoYear,
  isoMonth0,
  formatDayLong,
  formatMonthYear,
  formatWeekRange,
  formatShortDate,
  weekDateKeys,
} from '../utils/calendarViewUtils'
import './PlatformCalendar.css'

const VIEW_MODES = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'year', label: 'Year' },
]

const LEGEND = [
  { type: 'task', label: 'Project task', color: '#00d4ff' },
  { type: 'rfq_deadline', label: 'RFQ deadline', color: '#2e7d32' },
  { type: 'rfq_incoming', label: 'RFQ to respond', color: '#c62828' },
  { type: 'service_request', label: 'Service request', color: '#e65100' },
  { type: 'onboarding', label: 'HR onboarding', color: '#6a1b9a' },
  { type: 'exhibition', label: 'Trade fair / expo', color: '#e67e22' },
  { type: 'personal_event', label: 'Your event', color: '#1565c0' },
  { type: 'personal_reminder', label: 'Your reminder', color: '#ef6c00' },
  { type: 'personal_meeting', label: 'Your meeting', color: '#5d4037' },
]

export default function PlatformCalendar() {
  const navigate = useNavigate()
  const location = useLocation()
  const todayIso = isoTodayLocal()

  const [viewMode, setViewMode] = useState('month')
  const [focusDate, setFocusDate] = useState(() => todayIso)
  const [selectedDate, setSelectedDate] = useState(() => todayIso)

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

  const year = isoYear(focusDate)
  const month0 = isoMonth0(focusDate)

  const weekCrossYear = useMemo(() => {
    if (viewMode !== 'week') return null
    const years = new Set(weekDateKeys(focusDate).map(isoYear))
    if (years.size <= 1) return null
    return [...years].find((y) => y !== year) ?? null
  }, [viewMode, focusDate, year])

  const { eventsByDate: primaryEventsByDate, flatEvents: primaryFlatEvents } = usePlatformCalendarYearEvents(year)
  const { eventsByDate: crossYearEventsByDate } = usePlatformCalendarYearEvents(weekCrossYear ?? year)

  const eventsByDate = useMemo(() => {
    if (!weekCrossYear) return primaryEventsByDate
    const merged = { ...primaryEventsByDate }
    Object.entries(crossYearEventsByDate).forEach(([k, list]) => {
      merged[k] = [...(merged[k] || []), ...list]
    })
    return merged
  }, [weekCrossYear, primaryEventsByDate, crossYearEventsByDate])

  const flatEvents = primaryFlatEvents

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
    setFocusDate(d)
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
    const d = normalizeDateStr(entry.date) || todayIso
    setFocusDate(d)
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
  }, [todayIso])

  const handleSelectDate = useCallback((dateKey) => {
    const d = normalizeDateStr(dateKey) || dateKey
    setFocusDate(d)
    setSelectedDate(d)
  }, [])

  useEffect(() => {
    const fd = location.state?.focusDate
    if (typeof fd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fd)) return
    setFocusDate(fd)
    setSelectedDate(fd)
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

  const selectedDayEvents = useMemo(
    () => eventsByDate[selectedDate] || [],
    [eventsByDate, selectedDate],
  )

  const upcomingList = useMemo(() => {
    const yearEnd = `${year}-12-31`
    const yearStart = `${year}-01-01`
    const from = todayIso > yearStart ? todayIso : yearStart
    const keys = Object.keys(eventsByDate).filter((k) => k >= from && k <= yearEnd).sort()
    const rows = []
    keys.forEach((k) => {
      ;(eventsByDate[k] || []).forEach((ev) => {
        rows.push({ dateKey: k, ev })
      })
    })
    return rows.slice(0, 40)
  }, [eventsByDate, year, todayIso])

  const periodLabel = useMemo(() => {
    if (viewMode === 'year') return String(year)
    if (viewMode === 'month') return formatMonthYear(focusDate)
    if (viewMode === 'week') return formatWeekRange(focusDate)
    return formatDayLong(focusDate)
  }, [viewMode, year, focusDate])

  const goToday = () => {
    setFocusDate(todayIso)
    setSelectedDate(todayIso)
  }

  const goPrev = () => {
    if (viewMode === 'year') {
      const d = `${year - 1}-06-15`
      setFocusDate(d)
      setSelectedDate(d)
      return
    }
    if (viewMode === 'month') {
      const d = addMonthsIso(focusDate, -1)
      setFocusDate(d)
      setSelectedDate(d)
      return
    }
    if (viewMode === 'week') {
      const d = addDaysIso(focusDate, -7)
      setFocusDate(d)
      setSelectedDate(d)
      return
    }
    const d = addDaysIso(focusDate, -1)
    setFocusDate(d)
    setSelectedDate(d)
  }

  const goNext = () => {
    if (viewMode === 'year') {
      const d = `${year + 1}-06-15`
      setFocusDate(d)
      setSelectedDate(d)
      return
    }
    if (viewMode === 'month') {
      const d = addMonthsIso(focusDate, 1)
      setFocusDate(d)
      setSelectedDate(d)
      return
    }
    if (viewMode === 'week') {
      const d = addDaysIso(focusDate, 7)
      setFocusDate(d)
      setSelectedDate(d)
      return
    }
    const d = addDaysIso(focusDate, 1)
    setFocusDate(d)
    setSelectedDate(d)
  }

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
    setFocusDate(d)
    setSelectedDate(d)
  }

  const handleEventAction = useCallback((ev, dateKey) => {
    if (dateKey) handleSelectDate(dateKey)
    const personal = isPersonalCalendarEvent(ev)
    if (personal) {
      const entry = calendarEntries.find((en) => en.id === ev.id)
      if (entry) openEditPersonalModal(entry)
      return
    }
    if (ev.href) navigate(ev.href)
  }, [calendarEntries, handleSelectDate, navigate, openEditPersonalModal])

  const renderAgendaItem = ({ dateKey, ev }) => {
    const personal = isPersonalCalendarEvent(ev)
    const entry = personal ? calendarEntries.find((en) => en.id === ev.id) : null
    return (
      <li key={`${dateKey}-${ev.id}`} className="platform-calendar-page__li">
        <span className="platform-calendar-page__li-dot" style={{ background: ev.color }} />
        <div className="platform-calendar-page__li-body">
          <div className="platform-calendar-page__upcoming-when">
            {formatShortDate(dateKey)}
            {dateKey === todayIso ? <span className="platform-calendar-page__badge-today">Today</span> : null}
          </div>
          <button
            type="button"
            className="platform-calendar-page__li-title platform-calendar-page__li-title--btn"
            onClick={() => handleEventAction(ev, dateKey)}
          >
            {ev.title}
          </button>
          {ev.detail ? <div className="platform-calendar-page__li-detail">{ev.detail}</div> : null}
          {ev.meta ? <div className="platform-calendar-page__li-meta">{ev.meta}</div> : null}
          <div className="platform-calendar-page__li-actions platform-calendar-page__li-actions--tight">
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
          <div className="platform-calendar-page__head-row">
            <div>
              <h1 className="platform-calendar-page__title">Calendar</h1>
              <p className="platform-calendar-page__sub">
                Platform deadlines, HR dates, trade fairs, contracts, and your personal events in one place.
              </p>
            </div>
            <button type="button" className="platform-calendar-page__btn-primary" onClick={() => openNewPersonalModal(selectedDate)}>
              + New event
            </button>
          </div>

          <div className="platform-calendar-page__toolbar">
            <div className="platform-calendar-page__toolbar-nav">
              <button type="button" className="platform-calendar-page__today-btn" onClick={goToday}>
                Today
              </button>
              <button type="button" className="platform-calendar-page__nav-btn" onClick={goPrev} aria-label="Previous period">
                ‹
              </button>
              <button type="button" className="platform-calendar-page__nav-btn" onClick={goNext} aria-label="Next period">
                ›
              </button>
              <h2 className="platform-calendar-page__period">{periodLabel}</h2>
            </div>
            <div className="platform-calendar-page__view-tabs" role="tablist" aria-label="Calendar view">
              {VIEW_MODES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === v.id}
                  className={`platform-calendar-page__view-tab${viewMode === v.id ? ' platform-calendar-page__view-tab--active' : ''}`}
                  onClick={() => setViewMode(v.id)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="platform-calendar-page__layout">
          <div className="platform-calendar-page__main">
            <div className="platform-calendar-page__calendar-surface">
              <div className="platform-calendar-page__calendar-row">
                <div className="platform-calendar-page__view-wrap">
                  {viewMode === 'month' && (
                    <PlatformMonthCalendar
                      year={year}
                      month={month0}
                      eventsByDate={eventsByDate}
                      selectedDate={selectedDate}
                      onSelectDate={handleSelectDate}
                      onDoubleClickDate={openNewPersonalModal}
                      onPrevMonth={() => {
                        const d = addMonthsIso(focusDate, -1)
                        setFocusDate(d)
                        setSelectedDate(d)
                      }}
                      onNextMonth={() => {
                        const d = addMonthsIso(focusDate, 1)
                        setFocusDate(d)
                        setSelectedDate(d)
                      }}
                    />
                  )}
                  {viewMode === 'week' && (
                    <PlatformWeekCalendar
                      focusDate={focusDate}
                      eventsByDate={eventsByDate}
                      selectedDate={selectedDate}
                      onSelectDate={handleSelectDate}
                      onEventClick={(ev, key) => handleEventAction(ev, key)}
                    />
                  )}
                  {viewMode === 'day' && (
                    <PlatformDayView
                      dateKey={selectedDate}
                      events={selectedDayEvents}
                      onEventClick={(ev) => handleEventAction(ev, selectedDate)}
                    />
                  )}
                  {viewMode === 'year' && (
                    <PlatformYearCalendar
                      year={year}
                      eventsByDate={eventsByDate}
                      selectedDate={selectedDate}
                      onSelectDate={(d) => {
                        handleSelectDate(d)
                        setViewMode('day')
                      }}
                      onPrevYear={() => {
                        const d = `${year - 1}-06-15`
                        setFocusDate(d)
                        setSelectedDate(d)
                      }}
                      onNextYear={() => {
                        const d = `${year + 1}-06-15`
                        setFocusDate(d)
                        setSelectedDate(d)
                      }}
                    />
                  )}
                </div>

                <aside className="platform-calendar-page__side">
                  <div className="platform-calendar-page__side-head">
                    <h2 className="platform-calendar-page__side-title">Agenda</h2>
                    <button
                      type="button"
                      className="platform-calendar-page__side-add"
                      onClick={() => openNewPersonalModal(selectedDate)}
                    >
                      + Add
                    </button>
                  </div>
                  <p className="platform-calendar-page__selected-line">{formatDayLong(selectedDate)}</p>

                  <div className="platform-calendar-page__side-scroll">
                    {selectedDayEvents.length === 0 ? (
                      <p className="platform-calendar-page__empty">No items on this day.</p>
                    ) : (
                      <ul className="platform-calendar-page__list">
                        {selectedDayEvents.map((ev) => renderAgendaItem({ dateKey: selectedDate, ev }))}
                      </ul>
                    )}

                    <h3 className="platform-calendar-page__side-subheading">Upcoming</h3>
                    {upcomingList.length === 0 ? (
                      <p className="platform-calendar-page__empty">Nothing upcoming in {year}.</p>
                    ) : (
                      <ul className="platform-calendar-page__list platform-calendar-page__list--upcoming">
                        {upcomingList.map(renderAgendaItem)}
                      </ul>
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
                  Double-click a day in month view to add an event quickly.
                  {' · '}
                  <Link to="/profile/calendar">Trade fairs</Link>
                  {' · '}
                  <Link to="/project-management">Projects</Link>
                  {' · '}
                  <Link to="/contracts">Contracts</Link>
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
                  <label htmlFor="pcal-modal-name">Title</label>
                  <input
                    ref={titleInputRef}
                    id="pcal-modal-name"
                    type="text"
                    className="platform-calendar-page__input"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Meeting, deadline, reminder…"
                    autoComplete="off"
                  />
                </div>
                <div className="platform-calendar-page__field-row">
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
                    <label htmlFor="pcal-modal-time">Time (optional)</label>
                    <input
                      id="pcal-modal-time"
                      type="time"
                      className="platform-calendar-page__input"
                      value={draftTime}
                      onChange={(e) => setDraftTime(e.target.value)}
                    />
                  </div>
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
                  <label htmlFor="pcal-modal-notes">Notes (optional)</label>
                  <textarea
                    id="pcal-modal-notes"
                    className="platform-calendar-page__textarea"
                    value={draftDetail}
                    onChange={(e) => setDraftDetail(e.target.value)}
                    rows={4}
                    placeholder="Location, attendees, links…"
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
