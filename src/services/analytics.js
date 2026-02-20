/**
 * Analytics service — Mixpanel integration for usage tracking.
 *
 * When VITE_MIXPANEL_TOKEN is not set, all calls become no-ops.
 * This ensures the app works identically in development without Mixpanel.
 *
 * Tracked events (per-tier):
 *   - user_login / user_logout
 *   - page_view (with page name)
 *   - feature_used (with feature name + tier)
 *   - checkout_started / checkout_completed / checkout_error
 *   - project_created / project_deleted
 *   - export_pdf
 *   - search_performed
 *   - error_occurred
 */
import mixpanel from 'mixpanel-browser'
import env from '../config/env'

const isConfigured = Boolean(env.MIXPANEL_TOKEN)
let initialised = false

/* ── Initialisation ──────────────────────────────────────── */

function init() {
  if (!isConfigured || initialised) return
  try {
    mixpanel.init(env.MIXPANEL_TOKEN, {
      debug: env.IS_DEV,
      track_pageview: false, // we track manually for more control
      persistence: 'localStorage',
      ignore_dnt: false, // respect Do Not Track
    })
    initialised = true
    if (env.IS_DEV) console.log('[Analytics] Mixpanel initialised')
  } catch (err) {
    console.warn('[Analytics] Mixpanel init failed:', err.message)
  }
}

// Auto-init on import
init()

/* ── Public API ──────────────────────────────────────────── */

export const analytics = {
  /** Whether analytics is configured and available. */
  isAvailable: isConfigured,

  /**
   * Identify a user (call after login).
   * @param {string} userId - unique user ID
   * @param {object} traits - user properties { email, role, plan, tenant, ... }
   */
  identify(userId, traits = {}) {
    if (!initialised) return
    try {
      mixpanel.identify(userId)
      mixpanel.people.set({
        $email: traits.email,
        $name: traits.fullName || traits.name,
        role: traits.role,
        plan: traits.plan,
        tenant: traits.tenant,
        ...traits,
      })
    } catch (err) {
      if (env.IS_DEV) console.warn('[Analytics] identify failed:', err.message)
    }
  },

  /**
   * Track an event.
   * @param {string} event - event name
   * @param {object} properties - event properties
   */
  track(event, properties = {}) {
    if (!initialised) {
      if (env.IS_DEV) console.log(`[Analytics] (mock) ${event}`, properties)
      return
    }
    try {
      mixpanel.track(event, {
        ...properties,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      if (env.IS_DEV) console.warn('[Analytics] track failed:', err.message)
    }
  },

  /**
   * Track a page view.
   * @param {string} pageName - name or path of the page
   * @param {object} properties - extra properties
   */
  pageView(pageName, properties = {}) {
    this.track('page_view', { page: pageName, ...properties })
  },

  /**
   * Track feature usage (for per-tier analytics).
   * @param {string} featureName - e.g. 'costManagement', 'auditManagement'
   * @param {object} properties - extra properties
   */
  featureUsed(featureName, properties = {}) {
    this.track('feature_used', { feature: featureName, ...properties })
  },

  /**
   * Reset tracking (call on logout).
   */
  reset() {
    if (!initialised) return
    try {
      mixpanel.reset()
    } catch (err) {
      if (env.IS_DEV) console.warn('[Analytics] reset failed:', err.message)
    }
  },

  /**
   * Set super properties (sent with every event).
   * Useful for setting the current plan tier.
   * @param {object} properties
   */
  setSuperProperties(properties) {
    if (!initialised) return
    try {
      mixpanel.register(properties)
    } catch (err) {
      if (env.IS_DEV) console.warn('[Analytics] setSuperProperties failed:', err.message)
    }
  },
}

export default analytics
