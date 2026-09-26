import {
  AUDIT_INDUSTRY_LABEL_TO_SLUG,
  PLATFORM_HUB_INDUSTRY_SLUGS,
  platformSlugFromAuditIndustryLabel,
} from '../data/platformHubIndustries'

const LABEL_BY_SLUG = Object.fromEntries(
  Object.entries(AUDIT_INDUSTRY_LABEL_TO_SLUG).map(([label, slug]) => [slug, label]),
)

export function normalizeIndustryId(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (PLATFORM_HUB_INDUSTRY_SLUGS.includes(lower) || lower === 'general') return lower
  const fromLabel = platformSlugFromAuditIndustryLabel(raw)
  if (fromLabel) return fromLabel
  const compact = lower.replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (PLATFORM_HUB_INDUSTRY_SLUGS.includes(compact) || compact === 'general') return compact
  return compact
}

export function normalizeIndustryIds(list) {
  return [...new Set((Array.isArray(list) ? list : []).map(normalizeIndustryId).filter(Boolean))]
}

export function industryLabel(id) {
  const slug = normalizeIndustryId(id)
  return LABEL_BY_SLUG[slug] || id
}

/**
 * Superadmin allowlist. Explicit `auditor_visible_industries` wins (including empty).
 * Otherwise fall back to the industries the auditor registered with.
 */
export function readAuditorVisibleIndustries(source) {
  if (!source || typeof source !== 'object') return []
  const md = source.metadata && typeof source.metadata === 'object' ? source.metadata : {}
  const coMd = source.companies?.metadata && typeof source.companies.metadata === 'object'
    ? source.companies.metadata
    : {}
  if (Array.isArray(source.auditorVisibleIndustries)) {
    return normalizeIndustryIds(source.auditorVisibleIndustries)
  }
  if (Array.isArray(md.auditor_visible_industries)) {
    return normalizeIndustryIds(md.auditor_visible_industries)
  }
  if (Array.isArray(coMd.auditor_visible_industries)) {
    return normalizeIndustryIds(coMd.auditor_visible_industries)
  }
  const fallback = [
    ...(Array.isArray(source.industries) ? source.industries : []),
    ...(Array.isArray(md.industries) ? md.industries : []),
    source.industry,
    md.industry,
    ...(Array.isArray(source.companies?.industries) ? source.companies.industries : []),
  ]
  return normalizeIndustryIds(fallback)
}

export function recordIndustryIds(record) {
  if (!record || typeof record !== 'object') return []
  const raw = [
    record.industry,
    record.industry_hub_id,
    record.industryId,
    ...(Array.isArray(record.industries) ? record.industries : []),
  ]
  return normalizeIndustryIds(raw)
}

export function recordInAuditorScope(record, allowedIds) {
  const allowed = normalizeIndustryIds(allowedIds)
  if (!allowed.length) return false
  const ids = recordIndustryIds(record)
  if (!ids.length) return false
  return ids.some((id) => allowed.includes(id))
}

export function scopeAuditorsForViewer(auditors, { role, email } = {}) {
  const list = Array.isArray(auditors) ? auditors : []
  const r = String(role || '').toLowerCase()
  if (r !== 'auditor_external' && r !== 'auditor_internal') return list
  const self = String(email || '').trim().toLowerCase()
  if (!self) return []
  return list.filter((row) => String(row?.email || '').trim().toLowerCase() === self)
}

function auditorIdSet(auditorIds) {
  return auditorIds instanceof Set
    ? auditorIds
    : new Set((auditorIds || []).map(String))
}

/** Company is on this auditor’s job list (assigned visit or assigned email). */
export function supplierAssignedToAuditor(supplier, audits, { email, auditorIds } = {}) {
  const self = String(email || '').trim().toLowerCase()
  const assignedEmail = String(supplier?.externalAuditAssignedAuditorEmail || '').trim().toLowerCase()
  if (self && assignedEmail && assignedEmail === self) return true
  const ids = auditorIdSet(auditorIds)
  if (!ids.size || !supplier?.id) return false
  const sid = String(supplier.id)
  return (audits || []).some((audit) => {
    if (String(audit?.supplierId || '') !== sid) return false
    return ids.has(String(audit.auditorId || '')) || ids.has(String(audit.secondaryAuditorId || ''))
  })
}

export function scopeSuppliersForViewer(suppliers, {
  role,
  email,
  allowedIndustries,
  auditorIds,
  audits,
} = {}) {
  const list = Array.isArray(suppliers) ? suppliers : []
  const r = String(role || '').toLowerCase()
  if (r !== 'auditor_external' && r !== 'auditor_internal') return list
  return list.filter((row) => {
    if (!supplierAssignedToAuditor(row, audits, { email, auditorIds })) return false
    return recordInAuditorScope(row, allowedIndustries)
  })
}

export function scopeAuditsForViewer(audits, suppliers, { role, email, allowedIndustries, auditorIds } = {}) {
  const list = Array.isArray(audits) ? audits : []
  const r = String(role || '').toLowerCase()
  if (r !== 'auditor_external' && r !== 'auditor_internal') return list
  const byId = new Map((suppliers || []).map((s) => [s.id, s]))
  const selfIds = auditorIdSet(auditorIds)
  const self = String(email || '').trim().toLowerCase()
  return list.filter((audit) => {
    const assignedToSelf = selfIds.size
      ? (selfIds.has(String(audit.auditorId || '')) || selfIds.has(String(audit.secondaryAuditorId || '')))
      : false
    const supplier = byId.get(audit.supplierId)
    const assignedByEmail = self && supplier
      && String(supplier.externalAuditAssignedAuditorEmail || '').trim().toLowerCase() === self
    if (!assignedToSelf && !assignedByEmail) return false
    const industrySource = supplier || audit
    return recordInAuditorScope(industrySource, allowedIndustries)
  })
}

/** Superadmin calendar rail: assigned companies only. Auditors: assignment + industry. */
export function suppliersForCalendarWorkspace(suppliers, audits, ctx = {}) {
  const list = Array.isArray(suppliers) ? suppliers : []
  if (isIndustryScopedAuditorRole(ctx.role)) {
    return scopeSuppliersForViewer(list, { ...ctx, audits })
  }
  const assignedIds = new Set()
  for (const audit of audits || []) {
    if (!audit?.supplierId) continue
    if (audit.auditorId || audit.secondaryAuditorId || audit.plannedDate) {
      assignedIds.add(String(audit.supplierId))
    }
  }
  return list.filter((row) => (
    assignedIds.has(String(row.id))
    || String(row.externalAuditAssignedAuditorEmail || '').trim()
  ))
}

export function isIndustryScopedAuditorRole(role) {
  const r = String(role || '').toLowerCase()
  return r === 'auditor_external' || r === 'auditor_internal'
}
