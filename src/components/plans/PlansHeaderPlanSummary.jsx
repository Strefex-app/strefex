import { PLANS, getPlanPrice, getBillingLabel } from '../../services/stripeService'
import { isStripeConfigured } from '../../config/stripe'

const STATUS_LABELS = {
  active: 'Active',
  trialing: 'Trial',
  trial_expired: 'Expired',
  past_due: 'Past due',
  canceled: 'Canceled',
}

export default function PlansHeaderPlanSummary({
  currentPlanId,
  status,
  billingPeriod,
  accountType,
  stripeLive = isStripeConfigured,
}) {
  const plan = PLANS.find((p) => p.id === currentPlanId) || PLANS[0]
  const price = getPlanPrice(plan, accountType, billingPeriod)
  const priceLabel = price === 0 ? 'Free' : `$${price % 1 === 0 ? price : price.toFixed(2)}/mo`
  const statusLabel = STATUS_LABELS[status] || status || 'Active'

  return (
    <aside className="sp-header-plan-chip" aria-label="Current subscription plan">
      <div className="sp-header-plan-chip__row">
        <span className="sp-header-plan-chip__label">Your plan</span>
        {stripeLive && <span className="sp-header-plan-chip__stripe">Stripe</span>}
      </div>
      <div className="sp-header-plan-chip__name">{plan.name}</div>
      <div className="sp-header-plan-chip__meta">
        <span className={`sp-header-plan-chip__status sp-header-plan-chip__status--${status || 'active'}`}>
          {statusLabel}
        </span>
        <span className="sp-header-plan-chip__dot">·</span>
        <span>{getBillingLabel(billingPeriod)}</span>
        <span className="sp-header-plan-chip__dot">·</span>
        <span>{priceLabel}</span>
      </div>
    </aside>
  )
}
