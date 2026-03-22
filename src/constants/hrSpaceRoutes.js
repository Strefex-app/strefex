/**
 * Canonical routes for HR Space (Management hub).
 * Legacy `/production/headcount/*` redirects to these paths in App.jsx.
 */
export const HR_SPACE_BASE = '/hr-space'

/** @param {string} [suffix] e.g. "goals" or "/goals" → /hr-space/goals */
export function hrSpacePath(suffix = '') {
  if (!suffix) return HR_SPACE_BASE
  const s = suffix.startsWith('/') ? suffix : `/${suffix}`
  return `${HR_SPACE_BASE}${s}`
}
