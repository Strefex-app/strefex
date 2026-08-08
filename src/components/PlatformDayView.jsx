import { formatDayLong } from '../utils/calendarViewUtils'
import './PlatformDayView.css'

/**
 * @param {object} props
 * @param {string} props.dateKey YYYY-MM-DD
 * @param {import('../utils/platformCalendarEvents').PlatformCalendarEvent[]} props.events
 * @param {(ev: import('../utils/platformCalendarEvents').PlatformCalendarEvent) => void} [props.onEventClick]
 */
export default function PlatformDayView({ dateKey, events, onEventClick }) {
  const timed = events.filter((ev) => ev.meta && /\d/.test(ev.meta))
  const allDay = events.filter((ev) => !timed.includes(ev))

  return (
    <div className="platform-cal-day">
      <header className="platform-cal-day__head">
        <h3 className="platform-cal-day__title">{formatDayLong(dateKey)}</h3>
        <p className="platform-cal-day__count">
          {events.length} item{events.length === 1 ? '' : 's'}
        </p>
      </header>

      {events.length === 0 ? (
        <p className="platform-cal-day__empty">Nothing scheduled for this day. Click &ldquo;New event&rdquo; to add one.</p>
      ) : (
        <div className="platform-cal-day__sections">
          {allDay.length > 0 ? (
            <section className="platform-cal-day__section">
              <h4 className="platform-cal-day__section-label">All day</h4>
              <ul className="platform-cal-day__list">
                {allDay.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      className="platform-cal-day__event"
                      style={{ borderLeftColor: ev.color || 'var(--accent)' }}
                      onClick={() => onEventClick?.(ev)}
                    >
                      <span className="platform-cal-day__event-title">{ev.title}</span>
                      {ev.detail ? <span className="platform-cal-day__event-detail">{ev.detail}</span> : null}
                      {ev.meta ? <span className="platform-cal-day__event-meta">{ev.meta}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {timed.length > 0 ? (
            <section className="platform-cal-day__section">
              <h4 className="platform-cal-day__section-label">Scheduled</h4>
              <ul className="platform-cal-day__list">
                {timed.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      className="platform-cal-day__event platform-cal-day__event--timed"
                      style={{ borderLeftColor: ev.color || 'var(--accent)' }}
                      onClick={() => onEventClick?.(ev)}
                    >
                      <span className="platform-cal-day__event-time">{ev.meta}</span>
                      <span className="platform-cal-day__event-title">{ev.title}</span>
                      {ev.detail ? <span className="platform-cal-day__event-detail">{ev.detail}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
