/** Canonical routes for Forge (Management hub). Keep in sync with `lazyPages` + `App.jsx` routes (`FORGE_PATH_CLUB_DOC` for club templates). */

export const FORGE_BASE = '/forge'

/** URL segment for the membership onboarding module (must match `<Route path={...}>`). */
export const FORGE_SEGMENT_MEMBERSHIP_ONBOARDING = 'membership-assessment'

/** Forge projects (local) — must match `<Route path={...}>`). */
export const FORGE_SEGMENT_PROJECTS = 'projects'

/** Club document viewer: `/forge/club-doc/:docId` — must match `<Route path={...}>`). */
export const FORGE_PATH_CLUB_DOC = `${FORGE_BASE}/club-doc/:docId`

/** @param {string} docId e.g. `founder-pact` */
export function forgeClubDocPath(docId) {
  return `${FORGE_BASE}/club-doc/${encodeURIComponent(docId)}`
}

/** Absolute paths — use these for links and router registration. */
export const FORGE_PATHS = {
  hub: FORGE_BASE,
  membershipOnboarding: `${FORGE_BASE}/${FORGE_SEGMENT_MEMBERSHIP_ONBOARDING}`,
  projects: `${FORGE_BASE}/${FORGE_SEGMENT_PROJECTS}`,
}

/**
 * @param {string} [suffix] slug without leading slash, e.g. FORGE_SEGMENT_MEMBERSHIP_ONBOARDING
 */
export function forgeSpacePath(suffix = '') {
  if (!suffix) return FORGE_BASE
  const s = suffix.startsWith('/') ? suffix : `/${suffix}`
  return `${FORGE_BASE}${s}`
}
