import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useRfqStore from '../../store/rfqStore'

const STATUS_TONE = {
  pending: { label: 'Needs response', color: '#e65100' },
  responded: { label: 'Awaiting award', color: '#2e7d32' },
  awarded: { label: 'Awarded', color: '#0088a8' },
  declined: { label: 'Declined', color: '#c62828' },
}

function formatDeadline(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(value)
  }
}

function RfqRow({ rfq, cta }) {
  const navigate = useNavigate()
  const tone = STATUS_TONE[rfq.status] || STATUS_TONE.pending
  const title = rfq.title || rfq.rfqTitle || 'RFQ'
  const buyer = rfq.buyerCompany || rfq.buyerEmail || 'Buyer'

  return (
    <button
      type="button"
      className="home-mfg-desk__row stx-click-feedback"
      onClick={() => navigate(`/dashboard/supplier?open=${encodeURIComponent(rfq.id)}`)}
    >
      <div className="home-mfg-desk__row-main min-width-0">
        <div className="home-mfg-desk__row-title stx-text-wrap">{title}</div>
        <div className="home-mfg-desk__row-meta stx-text-caption stx-text-wrap">
          {buyer}
          {' · '}
          Due {formatDeadline(rfq.deadline || rfq.dueDate)}
        </div>
      </div>
      <span className="home-mfg-desk__status" style={{ color: tone.color }}>
        {cta || tone.label}
      </span>
    </button>
  )
}

function Section({ title, hint, rows, empty, cta }) {
  return (
    <section className="home-mfg-desk__section">
      <div className="home-mfg-desk__section-head">
        <h3 className="stx-text-heading">{title}</h3>
        {hint ? <p className="stx-text-caption stx-text-wrap">{hint}</p> : null}
      </div>
      {rows.length === 0 ? (
        <p className="home-mfg-desk__empty stx-text-caption">{empty}</p>
      ) : (
        <div className="home-mfg-desk__list">
          {rows.map((rfq) => (
            <RfqRow key={rfq.id} rfq={rfq} cta={cta} />
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * Manufacturer daily desk on Home — status of incoming RFQs / bids / awards.
 * Responding happens in the inbox; creating buyer RFQs happens only on Sourcing.
 */
export default function ManufacturerHomeDesk() {
  const receivedRfqs = useRfqStore((s) => s.receivedRfqs)
  const received = useMemo(
    () => useRfqStore.getState().getSafeReceivedRfqs(),
    [receivedRfqs],
  )

  const buckets = useMemo(() => {
    const list = Array.isArray(received) ? [...received] : []
    const byDate = (a, b) => String(b.receivedAt || b.createdAt || '').localeCompare(String(a.receivedAt || a.createdAt || ''))
    list.sort(byDate)
    return {
      pending: list.filter((r) => r.status === 'pending'),
      responded: list.filter((r) => r.status === 'responded'),
      feedback: list.filter((r) => r.status === 'awarded' || r.status === 'declined'),
      stats: {
        total: list.length,
        pending: list.filter((r) => r.status === 'pending').length,
        responded: list.filter((r) => r.status === 'responded').length,
        awarded: list.filter((r) => r.status === 'awarded').length,
      },
    }
  }, [received])

  return (
    <div className="home-mfg-desk app-page-card">
      <div className="home-mfg-desk__header">
        <div className="min-width-0">
          <h2 className="stx-text-section">Incoming quotations</h2>
          <p className="app-page-subtitle stx-text-wrap">
            Status of invitations and awards. Open a row to respond in the inbox — buyer RFQs are created only on Sourcing.
          </p>
        </div>
        <Link to="/dashboard/supplier" className="app-page-btn-outline app-page-btn-sm">
          Full inbox
        </Link>
      </div>

      <div className="home-mfg-desk__kpis">
        <div className="home-mfg-desk__kpi">
          <strong>{buckets.stats.pending}</strong>
          <span className="stx-text-caption">Incoming</span>
        </div>
        <div className="home-mfg-desk__kpi">
          <strong>{buckets.stats.responded}</strong>
          <span className="stx-text-caption">Awaiting award</span>
        </div>
        <div className="home-mfg-desk__kpi">
          <strong>{buckets.stats.awarded}</strong>
          <span className="stx-text-caption">Awarded</span>
        </div>
        <div className="home-mfg-desk__kpi">
          <strong>{buckets.stats.total}</strong>
          <span className="stx-text-caption">All RFQs</span>
        </div>
      </div>

      <Section
        title="Incoming RFQs"
        hint="Needs your bid"
        rows={buckets.pending.slice(0, 6)}
        empty="No pending invitations right now."
        cta="Respond →"
      />
      <Section
        title="Sent responses"
        hint="Waiting on buyer decision"
        rows={buckets.responded.slice(0, 5)}
        empty="No open bids awaiting award."
      />
      <Section
        title="Feedback & awards"
        hint="Won or closed invitations"
        rows={buckets.feedback.slice(0, 5)}
        empty="No awards or declines yet."
      />
    </div>
  )
}
