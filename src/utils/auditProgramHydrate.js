import { mergeAuditorLists } from './auditorRegistry'
import { applyCompanyAuditCloudToSuppliers, normalizeAuditEmail } from './companyExternalAudit'
import { buildScheduleEvents } from './auditProgrammeViews'
import { pickSellerCompanyName, sellerCompanyName } from './auditSellerLabel'

const SELLER_ACCOUNT_TYPES = new Set(['seller', 'service_provider'])

/** Keep local-only directory ids that the server has not stored yet. */
export function keepUnsyncedLocalRows(serverList, localList) {
  const ids = new Set((serverList || []).map((x) => x?.id).filter(Boolean))
  const extras = (localList || []).filter((x) => x?.id && !ids.has(x.id))
  return [...(serverList || []), ...extras]
}

export function mergeSupplierLists(existing, incoming) {
  const list = [...(existing || [])].filter(Boolean)
  const byEmail = new Map()
  const byCompany = new Map()
  const byDirectory = new Map()
  const indexRow = (row, i) => {
    const email = normalizeAuditEmail(row?.email)
    if (email) byEmail.set(email, i)
    if (row?.platformCompanyId) byCompany.set(String(row.platformCompanyId), i)
    if (row?.accountDirectoryEntryId) byDirectory.set(String(row.accountDirectoryEntryId), i)
  }
  list.forEach(indexRow)
  for (const row of incoming || []) {
    if (!row?.id) continue
    const email = normalizeAuditEmail(row.email)
    let idx
    if (row.platformCompanyId != null && byCompany.has(String(row.platformCompanyId))) {
      idx = byCompany.get(String(row.platformCompanyId))
    } else if (row.accountDirectoryEntryId != null && byDirectory.has(String(row.accountDirectoryEntryId))) {
      idx = byDirectory.get(String(row.accountDirectoryEntryId))
    } else if (email && byEmail.has(email)) {
      idx = byEmail.get(email)
    }
    if (idx == null) {
      list.push({ ...row })
      indexRow(row, list.length - 1)
      continue
    }
    const prev = list[idx]
    list[idx] = {
      ...row,
      ...prev,
      name: pickSellerCompanyName(prev, row),
      contact: prev.contact || row.contact || '',
      email: prev.email || row.email,
      country: prev.country || row.country || '',
      city: prev.city || row.city || '',
      industry: prev.industry || row.industry || '',
      platformCompanyId: prev.platformCompanyId || row.platformCompanyId || null,
      platformProfileId: prev.platformProfileId || row.platformProfileId,
      accountDirectoryEntryId: prev.accountDirectoryEntryId || row.accountDirectoryEntryId,
      source: prev.source && !['companies', 'supabase_directory', 'supabase_profiles'].includes(prev.source)
        ? prev.source
        : (prev.source || row.source),
    }
  }
  return list
}

/** Seller companies the caller can read (superadmin all; auditor = assigned). */
export function sellersFromCompanyAuditRows(cloudRows = []) {
  return (cloudRows || [])
    .filter((row) => {
      if (!row?.id) return false
      const accountType = String(row.accountType || row.account_type || '').toLowerCase()
      if (SELLER_ACCOUNT_TYPES.has(accountType)) return true
      return Boolean(
        row.external_audit_assigned_auditor_email
        || row.external_audit_planned_at
        || row.externalAuditAssignedAuditorEmail
        || row.externalAuditPlannedAt,
      )
    })
    .map((row) => ({
      id: `platform_company_${row.id}`,
      name: sellerCompanyName(row),
      email: normalizeAuditEmail(row.email),
      country: row.country || '',
      industry: row.industry || '',
      platformCompanyId: row.id,
      source: 'companies',
      externalAuditStatus: row.external_audit_status || row.externalAuditStatus || 'none',
      externalAuditPlannedAt: row.external_audit_planned_at || row.externalAuditPlannedAt || '',
      externalAuditDeadlineAt: row.external_audit_deadline_at || row.externalAuditDeadlineAt || '',
      externalAuditAssignedAuditorEmail:
        row.external_audit_assigned_auditor_email || row.externalAuditAssignedAuditorEmail || '',
      externalAuditAssignedAuditorName:
        row.external_audit_assigned_auditor_name || row.externalAuditAssignedAuditorName || '',
      externalAuditNotes: row.external_audit_notes || row.externalAuditNotes || '',
    }))
}

/**
 * Merge every database source the Auditors hub reads on load.
 * Calendar visits stay on management_audits ids (`supplier_ref` / `auditor_ref`).
 */
export function assembleAuditWorkspaceFromServer({
  directoryAuditors = [],
  directorySuppliers = [],
  platformAuditors = [],
  accountSuppliers = [],
  platformSuppliers = [],
  companyAuditRows = [],
  localAuditors = [],
  localSuppliers = [],
} = {}) {
  const auditors = mergeAuditorLists(
    keepUnsyncedLocalRows(directoryAuditors, localAuditors),
    platformAuditors,
  )
  const suppliers = applyCompanyAuditCloudToSuppliers(
    mergeSupplierLists(
      mergeSupplierLists(
        mergeSupplierLists(
          keepUnsyncedLocalRows(directorySuppliers, localSuppliers),
          accountSuppliers,
        ),
        platformSuppliers,
      ),
      sellersFromCompanyAuditRows(companyAuditRows),
    ),
    companyAuditRows,
  )
  return { auditors, suppliers }
}

export function calendarLinksFromWorkspace({
  audits = [],
  auditors = [],
  suppliers = [],
  reminders = [],
  todayIso = '',
} = {}) {
  const auditorIds = new Set((auditors || []).map((a) => a.id))
  const supplierIds = new Set((suppliers || []).map((s) => s.id))
  const events = buildScheduleEvents({ audits, suppliers, auditors, reminders, todayIso })
  const missingSeller = (audits || []).filter((a) => a.supplierId && !supplierIds.has(a.supplierId))
  const missingAuditor = (audits || []).filter((a) => a.auditorId && !auditorIds.has(a.auditorId))
  return {
    events,
    linkedVisits: (audits || []).filter((a) => (
      (!a.supplierId || supplierIds.has(a.supplierId))
      && (!a.auditorId || auditorIds.has(a.auditorId))
    )),
    missingSeller,
    missingAuditor,
  }
}
