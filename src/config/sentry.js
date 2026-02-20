/**
 * Sentry error tracking — frontend.
 *
 * Initializes Sentry for React with:
 *  - Automatic error boundary integration
 *  - Performance monitoring (traces)
 *  - Session replay for debugging
 *  - Release tracking
 *
 * Set VITE_SENTRY_DSN in .env to enable.
 */
import * as Sentry from '@sentry/react'
import env from './env'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''
const isConfigured = Boolean(SENTRY_DSN)

if (isConfigured) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: env.IS_PROD ? 'production' : 'development',
    release: `strefex-frontend@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

    // Performance monitoring
    tracesSampleRate: env.IS_PROD ? 0.2 : 1.0,

    // Session replay for debugging user issues
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Filter out noisy errors
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection',
      /Loading chunk \d+ failed/,
    ],

    // Don't send PII by default
    sendDefaultPii: false,

    beforeSend(event) {
      // Strip sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => {
          if (bc.category === 'fetch' && bc.data?.url?.includes('/auth/')) {
            bc.data = { ...bc.data, body: '[REDACTED]' }
          }
          return bc
        })
      }
      return event
    },
  })
  if (import.meta.env.DEV) console.log('[Sentry] Initialized for error tracking')
}

export const sentryIsConfigured = isConfigured

/**
 * Identify the current user in Sentry for error context.
 */
export function setSentryUser(user) {
  if (!isConfigured) return
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.fullName,
    })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Set subscription/tenant context as Sentry tags.
 */
export function setSentryContext(context = {}) {
  if (!isConfigured) return
  if (context.plan) Sentry.setTag('plan', context.plan)
  if (context.role) Sentry.setTag('role', context.role)
  if (context.tenant) Sentry.setTag('tenant', context.tenant)
}

/**
 * Manually capture an exception.
 */
export function captureException(error, context = {}) {
  if (!isConfigured) {
    console.error('[Sentry not configured]', error)
    return
  }
  Sentry.captureException(error, { extra: context })
}

/**
 * Capture a message (info/warning level).
 */
export function captureMessage(message, level = 'info') {
  if (!isConfigured) return
  Sentry.captureMessage(message, level)
}

export { Sentry }
export default Sentry
