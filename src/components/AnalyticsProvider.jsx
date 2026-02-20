/**
 * AnalyticsProvider — tracks page views, identifies users,
 * and syncs subscription state from backend on login.
 * Wrap inside <Router> so useLocation is available.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { analytics } from '../services/analytics'
import stripeService from '../services/stripeService'
import { setSentryUser, setSentryContext } from '../config/sentry'

export default function AnalyticsProvider({ children }) {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const planId = useSubscriptionStore((s) => s.planId)
  const setPlan = useSubscriptionStore((s) => s.setPlan)
  const tenant = useAuthStore((s) => s.tenant)

  // Track page views
  useEffect(() => {
    analytics.pageView(location.pathname, {
      plan: planId,
      role,
    })
  }, [location.pathname, planId, role])

  // Sync subscription from backend on login
  useEffect(() => {
    if (isAuthenticated) {
      stripeService.getSubscription().then((sub) => {
        if (sub?.plan_id) {
          setPlan(sub.plan_id, sub.status || 'active', sub.trial_ends_at || null)
        }
      })
    }
  }, [isAuthenticated, setPlan])

  // Identify user when they log in (analytics + Sentry)
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      analytics.identify(user.id, {
        email: user.email,
        fullName: user.fullName,
        role,
        plan: planId,
        tenant: tenant?.slug,
      })
      analytics.setSuperProperties({
        plan: planId,
        role,
        tenant: tenant?.slug,
      })
      // Sentry user context
      setSentryUser(user)
      setSentryContext({ plan: planId, role, tenant: tenant?.slug })
    }
  }, [isAuthenticated, user?.id, role, planId, tenant?.slug])

  // Reset analytics + Sentry on logout
  useEffect(() => {
    if (!isAuthenticated) {
      analytics.reset()
      setSentryUser(null)
    }
  }, [isAuthenticated])

  return children
}
