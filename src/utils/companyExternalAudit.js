export const EXTERNAL_AUDIT_STATUSES = [
  'none',
  'pending',
  'planned',
  'confirmed',
  'passed',
  'failed',
]

export const AUDITOR_PLAN_STATUSES = ['pending', 'planned', 'confirmed']

export const EXTERNAL_AUDIT_STATUS_LABELS = {
  none: 'None',
  pending: 'Pending',
  planned: 'Planned',
  confirmed: 'Confirmed',
  passed: 'On-site completed',
  failed: 'Failed',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isCompanyUuid(id) {
  return UUID_RE.test(String(id || ''))
}

export function normalizeAuditEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function toAuditDateInput(value) {
  if (!value) return ''
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export function formatAuditDateLabel(value) {
  const iso = toAuditDateInput(value)
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map((n) => Number(n))
  if (!y || !m || !d) return iso
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function auditStatusLabel(status) {
  const key = String(status || 'none').toLowerCase()
  return EXTERNAL_AUDIT_STATUS_LABELS[key] || EXTERNAL_AUDIT_STATUS_LABELS.none
}

export function sellerNeedsAuditDate(status) {
  const key = String(status || '').toLowerCase()
  return key === 'planned' || key === 'confirmed'
}

export function plannedDateWithinDeadline(plannedAt, deadlineAt) {
  const planned = toAuditDateInput(plannedAt)
  const deadline = toAuditDateInput(deadlineAt)
  if (!planned) return false
  if (!deadline) return true
  return planned <= deadline
}

export function isStrefexVerified(company) {
  const c = company && typeof company === 'object' ? company : {}
  return c.strefex_verified === true || c.strefexVerified === true
}

export function isOnsiteAudited(company) {
  const c = company && typeof company === 'object' ? company : {}
  if (c.onsite_audit_completed === true || c.onsiteAuditCompleted === true) return true
  return String(c.external_audit_status || c.externalAuditStatus || '').toLowerCase() === 'passed'
}

/** Public badges: join = none; STREFEX manager = Verified; completed visit = On-site audited. */
export function companyTrustBadges(company) {
  const badges = []
  if (isStrefexVerified(company)) badges.push({ id: 'verified', label: 'Verified' })
  if (isOnsiteAudited(company)) badges.push({ id: 'onsite', label: 'On-site audited' })
  return badges
}

export function readExternalAuditFromCompany(company) {
  const c = company && typeof company === 'object' ? company : {}
  return {
    status: String(c.external_audit_status || c.externalAuditStatus || 'none').toLowerCase() || 'none',
    notes: String(c.external_audit_notes || c.externalAuditNotes || ''),
    plannedAt: toAuditDateInput(c.external_audit_planned_at || c.externalAuditPlannedAt || ''),
    deadlineAt: toAuditDateInput(c.external_audit_deadline_at || c.externalAuditDeadlineAt || ''),
    passedAt: c.external_audit_passed_at || c.externalAuditPassedAt || null,
    auditorEmail: normalizeAuditEmail(
      c.external_audit_assigned_auditor_email || c.externalAuditAssignedAuditorEmail || '',
    ),
    auditorName: String(
      c.external_audit_assigned_auditor_name || c.externalAuditAssignedAuditorName || '',
    ).trim(),
    strefexVerified: isStrefexVerified(c),
    onsiteAudited: isOnsiteAudited(c),
  }
}

export function sellerFacingAuditView(company) {
  const audit = readExternalAuditFromCompany(company)
  return {
    status: audit.status,
    plannedAt: audit.plannedAt,
    deadlineAt: audit.deadlineAt,
    strefexVerified: audit.strefexVerified,
    onsiteAudited: audit.onsiteAudited,
  }
}

export function companyAuditPatch(fields) {
  const status = String(fields?.status || 'none').toLowerCase()
  const plannedAt = toAuditDateInput(fields?.plannedAt)
  const deadlineAt = toAuditDateInput(fields?.deadlineAt)
  const auditorEmail = normalizeAuditEmail(fields?.auditorEmail)
  const auditorName = String(fields?.auditorName || '').trim()
  const notes = String(fields?.notes || '').trim()
  const completeOnsite = Boolean(fields?.completeOnsite) || status === 'passed'
  return {
    external_audit_status: EXTERNAL_AUDIT_STATUSES.includes(status) ? status : 'none',
    external_audit_notes: notes || null,
    external_audit_planned_at: plannedAt || null,
    external_audit_deadline_at: deadlineAt || null,
    external_audit_passed_at: completeOnsite ? (fields?.passedAt || new Date().toISOString()) : null,
    external_audit_assigned_auditor_email: auditorEmail || null,
    external_audit_assigned_auditor_name: auditorName || null,
    strefex_verified: fields?.strefexVerified === true,
    onsite_audit_completed: completeOnsite,
  }
}

export function registryAuditPatch(fields) {
  const cloud = companyAuditPatch(fields)
  return {
    externalAuditStatus: cloud.external_audit_status,
    externalAuditNotes: cloud.external_audit_notes || '',
    externalAuditPlannedAt: cloud.external_audit_planned_at,
    externalAuditDeadlineAt: cloud.external_audit_deadline_at,
    externalAuditPassedAt: cloud.external_audit_passed_at,
    externalAuditAssignedAuditorEmail: cloud.external_audit_assigned_auditor_email || '',
    externalAuditAssignedAuditorName: cloud.external_audit_assigned_auditor_name || '',
    strefexVerified: cloud.strefex_verified,
    onsiteAuditCompleted: cloud.onsite_audit_completed,
    visibilityTier: cloud.strefex_verified ? 'verified' : undefined,
  }
}

export function buildAuditScheduleMessages({
  companyName,
  status,
  plannedAt,
  deadlineAt,
  auditorName,
  auditorEmail,
} = {}) {
  const name = String(companyName || 'your company').trim() || 'your company'
  const label = auditStatusLabel(status)
  const dateLabel = formatAuditDateLabel(plannedAt)
  const deadlineLabel = formatAuditDateLabel(deadlineAt)
  const dateBit = dateLabel ? ` on ${dateLabel}` : ''
  const sellerTitle = dateLabel
    ? `STREFEX audit planned${dateBit}`
    : `STREFEX audit update: ${label}`
  const sellerMessage = dateLabel
    ? `STREFEX has planned an on-site audit for ${name}${dateBit}. The visiting auditor is not disclosed. Open Profile for the scheduled date.`
    : `STREFEX updated the audit file for ${name} (${label}). You will be notified when a visit date is planned.`
  const auditorTitle = dateLabel
    ? `Audit assignment: ${name}${dateBit}`
    : `Audit assignment: ${name}`
  const deadlineBit = deadlineLabel ? ` Deadline: ${deadlineLabel}.` : ''
  const auditorMessage = dateLabel
    ? `You are assigned to audit ${name}${dateBit} (${label}).${deadlineBit} You may move the visit date up to the deadline. The seller is not told your name.`
    : `You are assigned to the audit of ${name}. Status: ${label}.${deadlineBit}`
  return { sellerTitle, sellerMessage, auditorTitle, auditorMessage, auditorName, auditorEmail }
}

export function validateAuditSchedule({
  status,
  plannedAt,
  deadlineAt,
  auditorEmail,
  role,
} = {}) {
  const next = String(status || 'none').toLowerCase()
  const isAuditor = role === 'auditor_external'
  if (!EXTERNAL_AUDIT_STATUSES.includes(next)) {
    return 'Choose a valid audit status.'
  }
  if (isAuditor && !AUDITOR_PLAN_STATUSES.includes(next) && next !== 'passed') {
    return 'Auditors can plan the visit date only.'
  }
  if (sellerNeedsAuditDate(next) && !toAuditDateInput(plannedAt)) {
    return 'Select the planned audit date.'
  }
  if (sellerNeedsAuditDate(next) && !normalizeAuditEmail(auditorEmail)) {
    return 'Assign an auditor for a planned visit.'
  }
  if (toAuditDateInput(plannedAt) && toAuditDateInput(deadlineAt) && !plannedDateWithinDeadline(plannedAt, deadlineAt)) {
    return 'The visit date must be on or before the STREFEX deadline.'
  }
  return ''
}

/** Overlay `companies.external_audit_*` onto Audit Pro seller rows (email or company UUID). */
export function applyCompanyAuditCloudToSuppliers(suppliers, cloudRows) {
  const byEmail = new Map()
  const byId = new Map()
  for (const row of cloudRows || []) {
    if (!row) continue
    const email = normalizeAuditEmail(row.email)
    if (email) byEmail.set(email, row)
    if (row.id) byId.set(String(row.id), row)
  }
  return (suppliers || []).map((s) => {
    const cloud = byId.get(String(s.platformCompanyId || ''))
      || byEmail.get(normalizeAuditEmail(s.email))
    if (!cloud) return s
    return {
      ...s,
      platformCompanyId: s.platformCompanyId || cloud.id || null,
      externalAuditStatus: cloud.external_audit_status || s.externalAuditStatus,
      externalAuditPlannedAt: cloud.external_audit_planned_at || s.externalAuditPlannedAt,
      externalAuditDeadlineAt: cloud.external_audit_deadline_at || s.externalAuditDeadlineAt,
      externalAuditAssignedAuditorEmail:
        cloud.external_audit_assigned_auditor_email || s.externalAuditAssignedAuditorEmail,
      externalAuditAssignedAuditorName:
        cloud.external_audit_assigned_auditor_name || s.externalAuditAssignedAuditorName,
    }
  })
}
