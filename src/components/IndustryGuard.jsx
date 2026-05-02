import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useIndustrySubscriptionStore } from '../services/subscriptionService'
import { useAuthStore } from '../store/authStore'

export default function IndustryGuard({ industry, requiredTier = 'free', children }) {
  const location = useLocation()
  const params = useParams()
  const subscriptions = useIndustrySubscriptionStore((s) => s.subscriptions)
  const loading = useIndustrySubscriptionStore((s) => s.loading)
  const role = useAuthStore((s) => s.role)

  const targetIndustry = (industry || params.industryId || '').toLowerCase()
  const sub = subscriptions.find((s) => s.industry?.toLowerCase() === targetIndustry && s.status === 'active')

  const levels = { free: 0, basic: 1, standard: 2, premium: 3, enterprise: 4 }
  const userLevel = levels[sub?.tier] ?? -1
  const requiredLevel = levels[requiredTier] ?? 999

  // Superadmin has full cross-industry access regardless of subscription tier.
  if (role === 'superadmin') {
    return children
  }

  // "free" tier pages (e.g. executive summary from industry hubs) must not require
  // an active row in `subscriptions` for that industry; missing sub used to yield
  // userLevel -1 and redirect everyone to /plans.
  if (requiredTier === 'free') {
    return children
  }

  if (loading) return null

  if (!targetIndustry || userLevel >= requiredLevel) {
    return children
  }

  return <Navigate to="/plans" state={{ from: location.pathname, reason: 'upgrade_required' }} replace />
}
