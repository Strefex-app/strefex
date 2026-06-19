import env from '../config/env'

/** Dev-only warnings — no-op in production builds. */
export function devWarn(...args) {
  if (env.IS_DEV) {
    console.warn('[strefex]', ...args)
  }
}

export function devError(...args) {
  if (env.IS_DEV) {
    console.error('[strefex]', ...args)
  }
}
