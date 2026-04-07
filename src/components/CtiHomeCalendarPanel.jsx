import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PlatformMonthCalendar from './PlatformMonthCalendar'
import { usePlatformCalendarEvents } from '../hooks/usePlatformCalendarEvents'
import './CtiHomeCalendarPanel.css'

/**
 * Compact month calendar + selected day list for CTI home strip (right column).
 */
export default function CtiHomeCalendarPanel() {
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

  return (
    <div className="cti-home-cal" aria-label="Schedule">
      <div className="cti-home-cal__head">
        <span className="cti-home-cal__title">Calendar</span>
        <Link to="/calendar" className="cti-home-cal__link">
          Full view
        </Link>
      </div>
      <div className="cti-home-cal__split">
        <div className="cti-home-cal__month" aria-label="Month view">
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
        </div>
        <div className="cti-home-cal__day" aria-label="Selected day tasks">
          <div className="cti-home-cal__day-label">{selectedDate}</div>
          {selectedList.length === 0 ? (
            <p className="cti-home-cal__empty">Nothing scheduled this day.</p>
          ) : (
            <ul className="cti-home-cal__ul">
              {selectedList.map((ev) => (
                <li key={ev.id} className="cti-home-cal__li">
                  <span className="cti-home-cal__dot" style={{ background: ev.color }} />
                  <span className="cti-home-cal__li-text">{ev.title}</span>
                </li>
              ))}
            </ul>
          )}
          {selectedList.length > 8 ? (
            <button type="button" className="cti-home-cal__more" onClick={() => navigate('/calendar')}>
              View all ({selectedList.length})
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
