import { useMemo } from 'react'
import './PlatformMonthCalendar.css'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function padDateKey(y, m0, day) {
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * @param {object} props
 * @param {number} props.year
 * @param {number} props.month 0-11
 * @param {Record<string, import('../utils/platformCalendarEvents').PlatformCalendarEvent[]>} props.eventsByDate
 * @param {string | null} props.selectedDate
 * @param {(d: string) => void} props.onSelectDate
 * @param {() => void} props.onPrevMonth
 * @param {() => void} props.onNextMonth
 * @param {(d: string) => void} [props.onDoubleClickDate]
 * @param {boolean} [props.compact]
 */
export default function PlatformMonthCalendar({
  year,
  month,
  eventsByDate,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onDoubleClickDate,
  compact = false,
}) {
  const { gridWeeks, todayKey } = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay()
    const mondayBased = firstDow === 0 ? 6 : firstDow - 1
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const now = new Date()
    const tk =
      now.getFullYear() === year && now.getMonth() === month ? padDateKey(year, month, now.getDate()) : null

    const cells = []
    for (let i = 0; i < mondayBased; i += 1) cells.push(null)
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const weeks = []
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }
    return { gridWeeks: weeks, todayKey: tk }
  }, [year, month])

  return (
    <div className={`platform-cal ${compact ? 'platform-cal--compact' : ''}`}>
      <div className="platform-cal__toolbar">
        <button type="button" className="platform-cal__nav" onClick={onPrevMonth} aria-label="Previous month">
          ‹
        </button>
        <h3 className="platform-cal__title">
          {MONTH_NAMES[month]} {year}
        </h3>
        <button type="button" className="platform-cal__nav" onClick={onNextMonth} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="platform-cal__grid" role="grid" aria-label="Calendar">
        <div className="platform-cal__row platform-cal__row--head">
          {WEEKDAYS.map((w) => (
            <div key={w} className="platform-cal__cell platform-cal__cell--head" role="columnheader">
              {w}
            </div>
          ))}
        </div>
        {gridWeeks.map((week, wi) => (
          <div key={wi} className="platform-cal__row">
            {week.map((day, di) => {
              if (day == null) {
                return <div key={`e-${wi}-${di}`} className="platform-cal__cell platform-cal__cell--empty" />
              }
              const key = padDateKey(year, month, day)
              const list = eventsByDate[key] || []
              const isToday = key === todayKey
              const isSelected = selectedDate === key
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  className={`platform-cal__cell platform-cal__cell--day ${isToday ? 'platform-cal__cell--today' : ''} ${isSelected ? 'platform-cal__cell--selected' : ''}`}
                  onClick={(e) => {
                    if (e.detail === 2) return
                    onSelectDate(key)
                  }}
                  onDoubleClick={() => onDoubleClickDate?.(key)}
                >
                  <span className="platform-cal__daynum">{day}</span>
                  {list.length > 0 && (
                    <span className="platform-cal__events" aria-hidden={compact}>
                      {(compact ? list.slice(0, 4) : list.slice(0, 3)).map((ev) => (
                        compact ? (
                          <span
                            key={ev.id}
                            className="platform-cal__dot"
                            style={{ background: ev.color || 'var(--color-primary)' }}
                          />
                        ) : (
                          <span
                            key={ev.id}
                            className="platform-cal__chip"
                            style={{ background: ev.color || 'var(--color-primary)' }}
                            title={ev.title}
                          >
                            {ev.title}
                          </span>
                        )
                      ))}
                      {!compact && list.length > 3 ? (
                        <span className="platform-cal__more">+{list.length - 3} more</span>
                      ) : null}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
