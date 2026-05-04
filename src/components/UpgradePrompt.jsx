/**
 * UpgradePrompt — shown when a user tries to access a gated feature.
 * Directs them to the billing/plans page.
 */
import { useNavigate } from 'react-router-dom'
import { useSubscriptionStore } from '../services/featureFlags'
import { getPlanById } from '../services/stripeService'
import './UpgradePrompt.css'

export default function UpgradePrompt({
  feature = 'This feature',
  requiredPlan = 'a higher',
}) {
  const navigate = useNavigate()
  const planId = useSubscriptionStore((s) => s.planId)
  const currentPlan = getPlanById(planId)

  return (
    <div className="upgrade-prompt">
      <div className="upgrade-prompt-icon-ring">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="16" r="1" fill="currentColor" />
        </svg>
      </div>

      <h2 className="upgrade-prompt-title">Upgrade Required</h2>
      <p className="upgrade-prompt-lead">
        <strong>{feature}</strong> is available on the <strong>{requiredPlan}</strong> plan and above.
      </p>
      <p className="upgrade-prompt-meta">
        You are currently on the{' '}
        <span className="upgrade-prompt-plan-name">{currentPlan.name}</span> plan.
      </p>

      <div className="upgrade-prompt-actions">
        <button type="button" className="upgrade-prompt-primary" onClick={() => navigate('/plans')}>
          View Plans & Upgrade
        </button>
        <button type="button" className="upgrade-prompt-secondary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    </div>
  )
}
