import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  buildDemoSessions,
  CATEGORIES,
  formatPrice,
  getWeekDates,
  TABS,
} from '../data/pitchbookDemo'
import './PitchBookDemo.css'

function SessionCard({ session, compact, onSelect }) {
  return (
    <button
      type="button"
      className={`pb-session-card${compact ? ' pb-session-card--compact' : ''}`}
      onClick={() => onSelect(session)}
    >
      <div className="pb-session-card__header">
        <span className="pb-session-card__title stx-text-wrap">{session.title}</span>
        <span className="pb-tag">{session.level}</span>
      </div>
      <p className="pb-session-card__meta stx-text-small">
        {session.coach_name} · {session.venue_name}
      </p>
      <div className="pb-session-card__footer">
        <span className="stx-text-small">
          {session.date} {session.start_time} · {session.duration_minutes} min
        </span>
        <span className="pb-price">¥{formatPrice(session.price_cents)}</span>
      </div>
      {session.spots_left > 0 && session.spots_left <= 3 && (
        <p className="pb-session-card__urgent stx-text-caption">Only {session.spots_left} spots left</p>
      )}
      {session.spots_left === 0 && (
        <p className="pb-session-card__full stx-text-caption">Fully booked</p>
      )}
    </button>
  )
}

function PaymentSheet({ amountYuan, onClose, onPay }) {
  const [method, setMethod] = useState('wechat')

  return (
    <div className="pb-payment-mask" role="presentation" onClick={onClose}>
      <div
        className="pb-payment-sheet"
        role="dialog"
        aria-label="Choose payment method"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pb-payment-sheet__handle" />
        <h3 className="pb-payment-sheet__title">Choose payment method</h3>
        <p className="pb-payment-sheet__amount">¥{amountYuan}</p>

        <button
          type="button"
          className={`pb-payment-option${method === 'wechat' ? ' pb-payment-option--active' : ''}`}
          onClick={() => setMethod('wechat')}
        >
          <span className="pb-payment-option__left">
            <span className="pb-pay-icon pb-pay-icon--wechat">微</span>
            <span>
              <strong>WeChat Pay</strong>
              <span className="stx-text-caption">Recommended in WeChat</span>
            </span>
          </span>
          <span className={`pb-radio${method === 'wechat' ? ' pb-radio--on' : ''}`} />
        </button>

        <button
          type="button"
          className={`pb-payment-option${method === 'alipay' ? ' pb-payment-option--active' : ''}`}
          onClick={() => setMethod('alipay')}
        >
          <span className="pb-payment-option__left">
            <span className="pb-pay-icon pb-pay-icon--alipay">支</span>
            <span>
              <strong>Alipay</strong>
              <span className="stx-text-caption">Pay with Alipay account</span>
            </span>
          </span>
          <span className={`pb-radio${method === 'alipay' ? ' pb-radio--on' : ''}`} />
        </button>

        <button type="button" className="pb-btn-primary pb-payment-sheet__cta" onClick={() => onPay(method)}>
          Pay ¥{amountYuan}
        </button>
      </div>
    </div>
  )
}

export default function PitchBookDemo() {
  const allSessions = useMemo(() => buildDemoSessions(), [])
  const weekDates = useMemo(() => getWeekDates(), [])

  const [tab, setTab] = useState('home')
  const [screen, setScreen] = useState('main')
  const [selectedDate, setSelectedDate] = useState(weekDates.find((d) => d.isToday)?.date || weekDates[0].date)
  const [selectedSession, setSelectedSession] = useState(null)
  const [notes, setNotes] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [bookings, setBookings] = useState([])
  const [pendingBooking, setPendingBooking] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [toast, setToast] = useState('')

  const sessionsForDate = allSessions.filter((s) => s.date === selectedDate)
  const featured = allSessions.slice(0, 3)
  const sessionCounts = useMemo(() => {
    const counts = {}
    allSessions.forEach((s) => {
      counts[s.date] = (counts[s.date] || 0) + 1
    })
    return counts
  }, [allSessions])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const openSession = (session) => {
    setSelectedSession(session)
    setScreen('detail')
  }

  const startBooking = () => {
    if (!loggedIn) {
      setLoggedIn(true)
      showToast('Signed in with WeChat (demo)')
    }
    setScreen('booking')
  }

  const confirmBooking = () => {
    const booking = {
      id: `booking-${Date.now()}`,
      session: selectedSession,
      notes,
      status: 'pending_payment',
      amount_cents: selectedSession.price_cents,
    }
    setPendingBooking(booking)
    setScreen('payment')
  }

  const completePayment = (provider) => {
    const confirmed = {
      ...pendingBooking,
      status: 'confirmed',
      payment_provider: provider,
    }
    setBookings((prev) => [confirmed, ...prev])
    setPendingBooking(null)
    setShowPayment(false)
    setScreen('main')
    setTab('bookings')
    setNotes('')
    showToast(`Paid via ${provider === 'wechat' ? 'WeChat Pay' : 'Alipay'}`)
  }

  const cancelBooking = (id) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)),
    )
    showToast('Booking cancelled')
  }

  const renderPhoneContent = () => {
    if (screen === 'detail' && selectedSession) {
      return (
        <div className="pb-phone-scroll">
          <button type="button" className="pb-back" onClick={() => setScreen('main')}>
            ← Back
          </button>
          <span className="pb-tag">{selectedSession.category}</span>
          <h2 className="pb-phone-title">{selectedSession.title}</h2>
          <p className="pb-phone-sub">
            {selectedSession.level} · {selectedSession.duration_minutes} min
          </p>
          <div className="pb-card">
            <dl className="pb-dl">
              <div><dt>Coach</dt><dd>{selectedSession.coach_name}</dd></div>
              <div><dt>Venue</dt><dd>{selectedSession.venue_name}</dd></div>
              <div><dt>Date</dt><dd>{selectedSession.date} {selectedSession.start_time}</dd></div>
              <div><dt>Spots</dt><dd>{selectedSession.spots_left} of {selectedSession.capacity}</dd></div>
            </dl>
          </div>
          <div className="pb-card">
            <h3 className="stx-text-heading">About</h3>
            <p className="stx-text-body">{selectedSession.description}</p>
          </div>
          <div className="pb-detail-footer">
            <div>
              <span className="stx-text-caption">Price per player</span>
              <strong className="pb-price-lg">¥{formatPrice(selectedSession.price_cents)}</strong>
            </div>
            <button
              type="button"
              className="pb-btn-primary"
              disabled={selectedSession.spots_left === 0}
              onClick={startBooking}
            >
              {selectedSession.spots_left === 0 ? 'Fully booked' : 'Book now'}
            </button>
          </div>
        </div>
      )
    }

    if (screen === 'booking' && selectedSession) {
      return (
        <div className="pb-phone-scroll">
          <button type="button" className="pb-back" onClick={() => setScreen('detail')}>
            ← Back
          </button>
          <h2 className="pb-phone-title">Confirm booking</h2>
          <div className="pb-card">
            <strong>{selectedSession.title}</strong>
            <p className="stx-text-small">{selectedSession.date} {selectedSession.start_time}</p>
            <p className="stx-text-small">{selectedSession.venue_name}</p>
            <p className="pb-price">¥{formatPrice(selectedSession.price_cents)}</p>
          </div>
          <label className="pb-notes-label stx-text-small">
            Notes (optional)
            <textarea
              className="pb-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Injuries, position preference…"
              rows={3}
            />
          </label>
          <button type="button" className="pb-btn-primary pb-btn-block" onClick={confirmBooking}>
            Continue to payment
          </button>
        </div>
      )
    }

    if (screen === 'payment' && pendingBooking) {
      return (
        <div className="pb-phone-scroll">
          <button type="button" className="pb-back" onClick={() => setScreen('booking')}>
            ← Back
          </button>
          <h2 className="pb-phone-title">Payment</h2>
          <div className="pb-card pb-payment-summary">
            <span className="stx-text-caption">Amount due</span>
            <strong className="pb-price-xl">¥{formatPrice(pendingBooking.amount_cents)}</strong>
            <p className="stx-text-small">{pendingBooking.session.title}</p>
          </div>
          <button type="button" className="pb-card pb-pay-trigger" onClick={() => setShowPayment(true)}>
            <span className="pb-pay-trigger__icons">
              <span className="pb-pay-icon pb-pay-icon--wechat">微</span>
              <span className="pb-pay-icon pb-pay-icon--alipay">支</span>
            </span>
            <span>
              <strong>WeChat Pay or Alipay</strong>
              <span className="stx-text-caption">Secure mobile payment</span>
            </span>
            <span className="pb-chevron">›</span>
          </button>
        </div>
      )
    }

    if (tab === 'home') {
      return (
        <div className="pb-phone-scroll">
          <div className="pb-hero">
            <h2>Train smarter. Play harder.</h2>
            <p>Book football training with pro coaches</p>
            <button type="button" className="pb-btn-hero" onClick={() => setTab('schedule')}>
              View weekly schedule
            </button>
          </div>
          <div className="pb-categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className="pb-category"
                onClick={() => setTab('schedule')}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
          <h3 className="pb-section-title">Featured sessions</h3>
          {featured.map((s) => (
            <SessionCard key={s.id} session={s} onSelect={openSession} />
          ))}
        </div>
      )
    }

    if (tab === 'schedule') {
      return (
        <div className="pb-phone-scroll">
          <h2 className="pb-phone-title">Training schedule</h2>
          <p className="pb-phone-sub">Pick a day to see sessions</p>
          <div className="pb-week">
            {weekDates.map((d) => (
              <button
                key={d.date}
                type="button"
                className={`pb-week__day${selectedDate === d.date ? ' pb-week__day--active' : ''}${d.isToday ? ' pb-week__day--today' : ''}`}
                onClick={() => setSelectedDate(d.date)}
              >
                <span className="stx-text-caption">{d.dayLabel}</span>
                <strong>{d.dayNum}</strong>
                {sessionCounts[d.date] > 0 && (
                  <span className="pb-week__dot">{sessionCounts[d.date]}</span>
                )}
              </button>
            ))}
          </div>
          <p className="pb-date-label stx-text-small">{selectedDate}</p>
          {sessionsForDate.length === 0 ? (
            <p className="pb-empty">No sessions on this day</p>
          ) : (
            sessionsForDate.map((s) => (
              <SessionCard key={s.id} session={s} compact onSelect={openSession} />
            ))
          )}
        </div>
      )
    }

    if (tab === 'bookings') {
      const active = bookings.filter((b) => b.status !== 'cancelled')
      return (
        <div className="pb-phone-scroll">
          <h2 className="pb-phone-title">My bookings</h2>
          {active.length === 0 ? (
            <div className="pb-empty">
              <span aria-hidden>📋</span>
              <p>No bookings yet — try the schedule tab</p>
            </div>
          ) : (
            active.map((b) => (
              <div key={b.id} className="pb-card pb-booking-card">
                <div className="pb-booking-card__head">
                  <strong className="stx-text-wrap">{b.session.title}</strong>
                  <span className={`pb-tag pb-tag--${b.status}`}>
                    {b.status === 'confirmed' ? 'Confirmed' : 'Awaiting payment'}
                  </span>
                </div>
                <p className="stx-text-small">{b.session.date} {b.session.start_time}</p>
                <p className="stx-text-small">{b.session.venue_name}</p>
                <div className="pb-booking-card__foot">
                  <span className="pb-price">¥{formatPrice(b.amount_cents)}</span>
                  {b.status === 'pending_payment' && (
                    <button
                      type="button"
                      className="pb-btn-primary pb-btn-sm"
                      onClick={() => {
                        setPendingBooking(b)
                        setScreen('payment')
                      }}
                    >
                      Pay now
                    </button>
                  )}
                  {b.status !== 'cancelled' && (
                    <button
                      type="button"
                      className="pb-btn-secondary pb-btn-sm"
                      onClick={() => cancelBooking(b.id)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )
    }

    return (
      <div className="pb-phone-scroll">
        {loggedIn ? (
          <div className="pb-card pb-profile">
            <div className="pb-avatar">P</div>
            <div>
              <strong>Demo Player</strong>
              <p className="stx-text-caption">Football training member</p>
            </div>
          </div>
        ) : (
          <div className="pb-card">
            <h3>Sign in with WeChat</h3>
            <p className="stx-text-small">Book sessions and manage your schedule</p>
            <button type="button" className="pb-btn-primary pb-btn-block" onClick={() => setLoggedIn(true)}>
              WeChat login
            </button>
          </div>
        )}
        <button type="button" className="pb-menu-item" onClick={() => setTab('schedule')}>
          Weekly schedule <span>›</span>
        </button>
        <button type="button" className="pb-menu-item" onClick={() => setTab('bookings')}>
          My bookings <span>›</span>
        </button>
        {loggedIn && (
          <button type="button" className="pb-btn-secondary pb-btn-block" onClick={() => setLoggedIn(false)}>
            Sign out
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="pitchbook-demo">
      <header className="pitchbook-demo__header">
        <div className="pitchbook-demo__brand">
          <span className="pitchbook-demo__logo">⚽</span>
          <div>
            <h1 className="app-page-title">PitchBook</h1>
            <p className="stx-text-lead">Football training scheduling — WeChat mini program demo</p>
          </div>
        </div>
        <Link to="/login" className="pitchbook-demo__back stx-text-small">
          ← STREFEX platform
        </Link>
      </header>

      <div className="pitchbook-demo__layout">
        <section className="pitchbook-demo__info">
          <h2 className="stx-text-section">Interactive web preview</h2>
          <p className="stx-text-body">
            This page simulates the WeChat mini program in your browser. Tap through schedule,
            booking, and payment flows — including <strong>WeChat Pay</strong> and <strong>Alipay</strong>.
          </p>
          <ul className="pitchbook-demo__features stx-text-body">
            <li>Weekly training calendar with session availability</li>
            <li>Book football sessions by coach, venue, and skill level</li>
            <li>Payment sheet with WeChat Pay and Alipay options</li>
            <li>My bookings with pay / cancel actions</li>
          </ul>
          <p className="stx-text-caption pitchbook-demo__note">
            Production mini program source: <code>miniprogram/</code> · API: <code>/api/v1/football</code>
          </p>
        </section>

        <section className="pitchbook-demo__device" aria-label="PitchBook phone preview">
          <div className="pb-phone">
            <div className="pb-phone__status">
              <span>PitchBook</span>
              <span className="pb-phone__signal">●●●</span>
            </div>
            <div className="pb-phone__body">
              {renderPhoneContent()}
              {toast && <div className="pb-toast" role="status">{toast}</div>}
            </div>
            {screen === 'main' && (
              <nav className="pb-tabbar" aria-label="Mini program tabs">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`pb-tabbar__item${tab === t.id ? ' pb-tabbar__item--active' : ''}`}
                    onClick={() => setTab(t.id)}
                  >
                    <span className="pb-tabbar__icon" aria-hidden>
                      {t.id === 'home' && '⌂'}
                      {t.id === 'schedule' && '📅'}
                      {t.id === 'bookings' && '📋'}
                      {t.id === 'profile' && '👤'}
                    </span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>
        </section>
      </div>

      {showPayment && pendingBooking && (
        <PaymentSheet
          amountYuan={formatPrice(pendingBooking.amount_cents)}
          onClose={() => setShowPayment(false)}
          onPay={completePayment}
        />
      )}
    </div>
  )
}
