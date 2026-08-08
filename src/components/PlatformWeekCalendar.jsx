import { useMemo } from 'react'
import { weekDateKeys, formatWeekdayShort, formatShortDate, isoTodayLocal } from '../utils/calendarViewUtils'
import './PlatformWeekCalendar.css'

/**
 * @param {object} props
 * @param {string} props.focusDate YYYY-MM-DD (any day in the week)
 * @param {Record<string, import('../utils/platformCalendarEvents').PlatformCalendarEvent[]>} props.eventsByDate
 * @param {string | null} props.selectedDate
 * @param {(d: string) => void} props.onSelectDate
 * @param {(ev: import('../utils/platformCalendarEvents').PlatformCalendarEvent, dateKey: string) => void} [props.onEventClick]
 */
export default function PlatformWeekCalendar({
  focusDate,
  eventsByDate,
  selectedDate,
  onSelectDate,
  onEventClick,
}) {
  const todayKey = isoTodayLocal()
  const weekKeys = useMemo(() => weekDateKeys(focusDate), [focusDate])

  return (
    <div className="platform-cal-week" role="grid" aria-label="Week calendar">
      <div className="platform-cal-week__head">
        {weekKeys.map((key) => {
          const d = new Date(`${key}T12:00:00`)
          const isToday = key === todayKey
          const isSelected = key === selectedDate
          return (
            <button
              key={key}
              type="button"
              className={[
                'platform-cal-week__day-head',
                isToday ? 'platform-cal-week__day-head--today' : '',
                isSelected ? 'platform-cal-week__day-head--selected' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectDate(key)}
            >
              <span className="platform-cal-week__dow">{formatWeekdayShort(key)}</span>
              <span className="platform-cal-week__dom">{d.getDate()}</span>
              <span className="platform-cal-week__month-hint">{formatShortDate(key)}</span>
            </button>
          )
        })}
      </div>
      <div className="platform-cal-week__body">
        {weekKeys.map((key) => {
          const list = eventsByDate[key] || []
          const isSelected = key === selectedDate
          return (
            <div
              key={key}
              className={[
                'platform-cal-week__col',
                isSelected ? 'platform-cal-week__col--selected' : '',
              ].filter(Boolean).join(' ')}
            >
              {list.length === 0 ? (
                <p className="platform-cal-week__empty">No items</p>
              ) : (
                <ul className="platform-cal-week__list">
                  {list.map((ev) => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        className="platform-cal-week__event"
                        style={{ borderLeftColor: ev.color || 'var(--accent)' }}
                        onClick={() => onEventClick?.(ev, key)}
                      >
                        <span className="platform-cal-week__event-title">{ev.title}</span>
                        {ev.meta ? <span className="platform-cal-week__event-meta">{ev.meta}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
