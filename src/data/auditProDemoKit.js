/**
 * STREFEX-seeded Audit Pro sample rows used in product demos / screenshots.
 * Hidden from normal UI unless a superadmin turns on Demo Kit (see Audit Pro layout).
 */

export const AUDIT_PRO_DEMO_SOURCE = 'strefex_demo_kit'

function normEmail(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
}

function normKeyName(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
}

const DEMO_SUPPLIER_EMAILS = new Set([
  'k.weber@nexus.de',
  'a.johnson@biotech.com',
  'p.simmons@skyforge.co.uk',
  'r.torres@petrosys.com',
])

const DEMO_SUPPLIER_NAMES = new Set([
  'nexus precision gmbh',
  'biotech components llc',
  'skyforge aero',
  'petrosystems inc.',
])

const DEMO_AUDITOR_EMAILS = new Set(['s.marchetti@auditpro.com', 'd.chen@auditpro.com'])

const DEMO_AUDITOR_NAMES = new Set(['sofia marchetti', 'david chen'])

export function isAuditProDemoSupplierRow(row) {
  if (!row) return false
  if (row.demoKit === true) return true
  if (row.source === AUDIT_PRO_DEMO_SOURCE) return true
  const email = normEmail(row.email)
  if (email && DEMO_SUPPLIER_EMAILS.has(email)) return true
  const name = normKeyName(row.name)
  if (name && DEMO_SUPPLIER_NAMES.has(name)) return true
  return false
}

export function isAuditProDemoAuditorRow(row) {
  if (!row) return false
  if (row.demoKit === true) return true
  if (row.source === AUDIT_PRO_DEMO_SOURCE) return true
  const email = normEmail(row.email)
  if (email && DEMO_AUDITOR_EMAILS.has(email)) return true
  const name = normKeyName(row.name)
  if (name && DEMO_AUDITOR_NAMES.has(name)) return true
  return false
}

export function auditTouchesDemoParticipants(audit, auditors, suppliers) {
  if (!audit) return false
  const supList = suppliers || []
  const audList = auditors || []
  const sup = supList.find((s) => s.id === audit.supplierId)
  const aud = audList.find((a) => a.id === audit.auditorId)
  const aud2 = audit.secondaryAuditorId ? audList.find((a) => a.id === audit.secondaryAuditorId) : null
  return (
    isAuditProDemoSupplierRow(sup) ||
    isAuditProDemoAuditorRow(aud) ||
    (aud2 && isAuditProDemoAuditorRow(aud2))
  )
}

export function filterAuditProSuppliersForVisibility(suppliers, showDemoKit) {
  if (showDemoKit) return suppliers || []
  return (suppliers || []).filter((r) => !isAuditProDemoSupplierRow(r))
}

export function filterAuditProAuditorsForVisibility(auditors, showDemoKit) {
  if (showDemoKit) return auditors || []
  return (auditors || []).filter((r) => !isAuditProDemoAuditorRow(r))
}

export function filterAuditProAuditsForVisibility(audits, auditors, suppliers, showDemoKit) {
  if (showDemoKit) return audits || []
  return (audits || []).filter((a) => !auditTouchesDemoParticipants(a, auditors, suppliers))
}

/** Open reminder rows tied to demo-backed audits — hide counts/list when Demo Kit is off */
export function auditProReminderTouchesDemoReminder(reminder, audits, auditors, suppliers) {
  if (!reminder?.auditId) return false
  const a = (audits || []).find((x) => x.id === reminder.auditId)
  return a ? auditTouchesDemoParticipants(a, auditors, suppliers) : false
}
