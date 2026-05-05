import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PlatformMonthCalendar from './PlatformMonthCalendar'
import { usePlatformCalendarEvents } from '../hooks/usePlatformCalendarEvents'
import { tenantKey } from '../utils/tenantStorage'
import './HomeCalendarSection.css'

const STORAGE_KEY = () => tenantKey('strefex-home-calendar-hidden')

export default function HomeCalendarSection() {
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
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY())
      setHidden(v === '1')
    } catch {
      setHidden(false)
    }
  }, [])

  const setHiddenPersist = (next) => {
    setHidden(next)
    try {
      localStorage.setItem(STORAGE_KEY(), next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  const { eventsByDate } = usePlatformCalendarEvents(year, month)

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

  if (hidden) {
    return (
      <div className="home-cal-reveal">
        <button type="button" className="home-cal-reveal__btn" onClick={() => setHiddenPersist(false)}>
          Show calendar
        </button>
      </div>
    )
  }

  return (
    <section className="home-calendar-section" aria-label="Month calendar">
      <div className="home-calendar-section__bar">
        <h2 className="home-calendar-section__title">This month</h2>
        <div className="home-calendar-section__actions">
          <button
            type="button"
            className="home-calendar-section__hide"
            onClick={() => navigate('/calendar', { state: { focusDate: selectedDate } })}
          >
            Add entry
          </button>
          <Link to="/calendar" className="home-calendar-section__link">
            Full calendar
          </Link>
          <button type="button" className="home-calendar-section__hide" onClick={() => setHiddenPersist(true)}>
            Hide
          </button>
        </div>
      </div>
      <div className="home-calendar-section__grid">
        <PlatformMonthCalendar
          compact
          year={year}
          month={month}
          eventsByDate={eventsByDate}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onPrevMonth={goPrev}
          onNextMonth={goNext}
        />
        <div className="home-calendar-section__detail">
          <div className="home-calendar-section__detail-head">{selectedDate}</div>
          {selectedList.length === 0 ? (
            <p className="home-calendar-section__empty">Nothing scheduled.</p>
          ) : (
            <ul className="home-calendar-section__ul">
              {selectedList.slice(0, 6).map((ev) => (
                <li key={ev.id} className="home-calendar-section__li">
                  <span className="home-calendar-section__dot" style={{ background: ev.color }} />
                  <span className="home-calendar-section__li-text">{ev.title}</span>
                </li>
              ))}
            </ul>
          )}
          {selectedList.length > 6 ? (
            <button type="button" className="home-calendar-section__more" onClick={() => navigate('/calendar')}>
              View all ({selectedList.length})
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
