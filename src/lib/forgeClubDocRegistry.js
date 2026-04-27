import { STORE_VER } from './forgeMembershipLogic'

/** @type {Record<string, string>} docId → filename under /public/forge-club-docs/ */
export const CLUB_DOC_FILES = {
  'founder-pact': 'founder-pact.html',
  'first-meeting-agenda': 'first-meeting-agenda.html',
  'pre-screening-pack': 'pre-screening-pack.html',
  'nomination-form': 'nomination-form.html',
  'invitation-letter': 'invitation-letter.html',
  'decline-letter': 'decline-letter.html',
}

/** Short labels for hub list and page chrome (match HTML title). */
export const CLUB_DOC_LABELS = {
  'founder-pact': 'Founder Pact',
  'first-meeting-agenda': 'First Meeting Agenda',
  'pre-screening-pack': 'Pre-Screening Pack',
  'nomination-form': 'Member Nomination Form',
  'invitation-letter': 'Member Invitation Letter',
  'decline-letter': 'Application Decline Letter',
}

export const CLUB_DOC_ORDER = Object.keys(CLUB_DOC_FILES)

export function isValidClubDocId(id) {
  return id != null && Object.prototype.hasOwnProperty.call(CLUB_DOC_FILES, id)
}

export function clubDocStorageKey(docId) {
  return `${STORE_VER}-club-doc-html-${docId}`
}

export function clubDocAssetUrl(docId) {
  const file = CLUB_DOC_FILES[docId]
  if (!file) return null
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${base}/forge-club-docs/${file}`
}
