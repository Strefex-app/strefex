import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import PlatformMonthCalendar from '../components/PlatformMonthCalendar'
import { usePlatformCalendarEvents } from '../hooks/usePlatformCalendarEvents'
import './PlatformCalendar.css'

const LEGEND = [
  { type: 'task', label: 'Project task', color: '#000888' },
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
]

export default function PlatformCalendar() {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(() => {
    const y = now.getFullYear()
    const m = now.getMonth()
    const d = now.getDate()
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  })

  const { eventsByDate, flatEvents } = usePlatformCalendarEvents(year, month)

  const selectedList = useMemo(() => {
    if (!selectedDate) return []
    return eventsByDate[selectedDate] || []
  }, [eventsByDate, selectedDate])

  const goPrev = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const goNext = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  return (
    <AppLayout>
      <div className="platform-calendar-page">
        <header className="platform-calendar-page__head">
          <h1 className="platform-calendar-page__title">Calendar</h1>
          <p className="platform-calendar-page__sub">
            Deadlines, project tasks, RFQs, service requests, HR onboarding, trade fairs, contract end dates, renewals, and
            milestones (aligned with <Link to="/ai-insights">AI Insights</Link>), NDAs to review, HR documents and training or
            certification expiry dates, and HR goal targets for this month.
            Expo list is filtered by your selected industries when set in{' '}
            <Link to="/settings">settings</Link> / industry preferences; otherwise all fairs in the month are shown.
          </p>
        </header>

        <div className="platform-calendar-page__layout">
          <div className="platform-calendar-page__main">
            <PlatformMonthCalendar
              year={year}
              month={month}
              eventsByDate={eventsByDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPrevMonth={goPrev}
              onNextMonth={goNext}
            />

            <div className="platform-calendar-page__legend">
              {LEGEND.map((L) => (
                <span key={L.type} className="platform-calendar-page__legend-item">
                  <span className="platform-calendar-page__legend-dot" style={{ background: L.color }} />
                  {L.label}
                </span>
              ))}
            </div>

            <p className="platform-calendar-page__hint">
              <Link to="/profile/calendar">Open trade fair directory &amp; filters</Link>
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

          <aside className="platform-calendar-page__side">
            <h2 className="platform-calendar-page__side-title">
              {selectedDate || 'Select a day'}
            </h2>
            {selectedList.length === 0 ? (
              <p className="platform-calendar-page__empty">No items on this date.</p>
            ) : (
              <ul className="platform-calendar-page__list">
                {selectedList.map((ev) => (
                  <li key={ev.id} className="platform-calendar-page__li">
                    <span className="platform-calendar-page__li-dot" style={{ background: ev.color }} />
                    <div>
                      <div className="platform-calendar-page__li-title">{ev.title}</div>
                      {ev.detail ? <div className="platform-calendar-page__li-detail">{ev.detail}</div> : null}
                      {ev.meta ? <div className="platform-calendar-page__li-meta">{ev.meta}</div> : null}
                      {ev.href ? (
                        <button
                          type="button"
                          className="platform-calendar-page__li-go"
                          onClick={() => navigate(ev.href)}
                        >
                          Open
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="platform-calendar-page__count">
              {flatEvents.length} marker{flatEvents.length === 1 ? '' : 's'} this month
            </p>
          </aside>
        </div>
      </div>
    </AppLayout>
  )
}
