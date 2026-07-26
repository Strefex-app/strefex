import { useState } from 'react'
import { PLANS, getBillingLabel } from '../../services/stripeService'

const STATUS_LABELS = {
  requested: 'Requested',
  company_approved: 'Approved',
  pending_platform_approval: 'Pending',
  pending_approval: 'Pending',
  paid: 'Done',
  rejected: 'Rejected',
}

const METHOD_LABELS = {
  stripe: 'Stripe',
  platform: 'Admin',
  card: 'Card',
  bank: 'Bank',
  paypal: 'PayPal',
  free: 'Free',
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

function planLabel(planId) {
  return PLANS.find((p) => p.id === planId)?.name || planId || '—'
}

function formatAmount(amount) {
  if (typeof amount !== 'number') return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

export default function PlansHistoryButton({ transactions = [] }) {
  const [open, setOpen] = useState(false)
  const planChanges = transactions
    .filter((tx) => tx.type === 'plan_upgrade' || tx.type === 'plan_downgrade')
    .sort((a, b) => new Date(b.date || b.paidAt || 0) - new Date(a.date || a.paidAt || 0))

  return (
    <>
      <button
        type="button"
        className="sp-history-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        Plan history
        {planChanges.length > 0 && <span className="sp-history-btn__count">{planChanges.length}</span>}
      </button>

      {open && (
        <div className="sp-modal-overlay" onClick={() => setOpen(false)} role="presentation">
          <div
            className="sp-history-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="sp-history-modal-title"
          >
            <div className="sp-history-modal__head">
              <h3 id="sp-history-modal-title" className="sp-history-modal__title">Plan history</h3>
              <button type="button" className="sp-history-modal__close" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            {planChanges.length === 0 ? (
              <p className="sp-history-modal__empty">No plan changes yet.</p>
            ) : (
              <ul className="sp-history-compact-list">
                {planChanges.map((tx) => (
                  <li key={tx.id} className="sp-history-compact-item">
                    <div className="sp-history-compact-item__main">
                      <span className="sp-history-compact-item__change">
                        {planLabel(tx.planFrom)} → {planLabel(tx.planTo)}
                      </span>
                      <span className={`sp-history-compact-item__status sp-history-compact-item__status--${tx.status || 'paid'}`}>
                        {STATUS_LABELS[tx.status] || tx.status || 'Done'}
                      </span>
                    </div>
                    <div className="sp-history-compact-item__meta stx-text-wrap">
                      <span>{formatDate(tx.date || tx.paidAt)}</span>
                      <span>·</span>
                      <span>{tx.billingPeriod ? getBillingLabel(tx.billingPeriod) : '—'}</span>
                      <span>·</span>
                      <span>{METHOD_LABELS[tx.method] || tx.method || '—'}</span>
                      <span>·</span>
                      <span>{formatAmount(tx.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  )
}
