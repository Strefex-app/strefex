import { useMemo } from 'react'
import './PlatformYearCalendar.css'

const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function padDateKey(y, m0, day) {
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function buildMonthCells(year, month0) {
  const firstDow = new Date(year, month0, 1).getDay()
  const mondayBased = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < mondayBased; i += 1) cells.push(null)
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

/**
 * Compact 12-month year grid with small day cells.
 * @param {object} props
 * @param {number} props.year
 * @param {Record<string, import('../utils/platformCalendarEvents').PlatformCalendarEvent[]>} props.eventsByDate
 * @param {string | null} props.selectedDate
 * @param {(d: string) => void} props.onSelectDate
 * @param {() => void} props.onPrevYear
 * @param {() => void} props.onNextYear
 */
export default function PlatformYearCalendar({
  year,
  eventsByDate,
  selectedDate,
  onSelectDate,
  onPrevYear,
  onNextYear,
}) {
  const todayKeyFull = useMemo(() => {
    const n = new Date()
    if (n.getFullYear() !== year) return null
    return padDateKey(year, n.getMonth(), n.getDate())
  }, [year])

  const monthsWeeks = useMemo(() =>
    [...Array(12)].map((_, m) => ({
      label: MONTH_SHORT[m],
      weeks: buildMonthCells(year, m),
    })), [year])

  return (
    <div className="platform-cal-year">
      <div className="platform-cal-year__toolbar">
        <button type="button" className="platform-cal-year__nav" onClick={onPrevYear} aria-label="Previous year">
          ‹
        </button>
        <h3 className="platform-cal-year__title">{year}</h3>
        <button type="button" className="platform-cal-year__nav" onClick={onNextYear} aria-label="Next year">
          ›
        </button>
      </div>
      <p className="platform-cal-year__hint">Click a day to open day view.</p>
      <div className="platform-cal-year__grid-12">
        {monthsWeeks.map((block, mi) => (
          <div key={`m-${year}-${mi}`} className="platform-cal-year__mini">
            <div className="platform-cal-year__mini-title">{block.label}</div>
            <div className="platform-cal-year__week-letters">
              {WEEK_LETTERS.map((letter, i) => (
                <span key={`${letter}-${i}`} className="platform-cal-year__week-letter">{letter}</span>
              ))}
            </div>
            <div className="platform-cal-year__weeks">
              {block.weeks.map((week, wi) => (
                <div key={`w-${wi}`} className="platform-cal-year__week-row">
                  {week.map((day, di) => {
                    if (day == null) {
                      return <div key={`e-${wi}-${di}`} className="platform-cal-year__cell platform-cal-year__cell--ghost" aria-hidden />
                    }
                    const key = padDateKey(year, mi, day)
                    const list = eventsByDate[key] || []
                    const isToday = key === todayKeyFull
                    const isSelected = selectedDate === key
                    return (
                      <button
                        key={key}
                        type="button"
                        title={`${key}${list.length ? ` · ${list.length} items` : ''}`}
                        className={[
                          'platform-cal-year__cell',
                          'platform-cal-year__cell--day',
                          isToday ? 'platform-cal-year__cell--today' : '',
                          isSelected ? 'platform-cal-year__cell--selected' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => onSelectDate(key)}
                      >
                        <span className="platform-cal-year__cell-face">
                          <span className="platform-cal-year__cell-num">{day}</span>
                          {list.length > 0 ? (
                            <span className="platform-cal-year__dots">
                              {list.slice(0, 2).map((ev) => (
                                <span
                                  key={ev.id}
                                  className="platform-cal-year__dot"
                                  style={{ background: ev.color || 'var(--color-primary)' }}
                                />
                              ))}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
