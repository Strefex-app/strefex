/**
 * Supabase persistence for Audit Management (Management → Auditors workspace).
 * Tables: management_audits, management_audit_events, management_audit_reminders.
 */
import { isSupabaseConfigured, supabase } from '../config/supabase'
import { accountDirectoryEntriesService, profilesService } from './supabaseService'

export function isLikelyUuid(id) {
  return (
    typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  )
}

export async function getActorCompanyId() {
  try {
    const { useAuthStore } = await import('../store/authStore')
    const tid = useAuthStore.getState().tenant?.id
    return isLikelyUuid(tid) ? tid : null
  } catch {
    return null
  }
}

export function rowToAudit(row) {
  return {
    id: row.id,
    title: row.title,
    industry: row.industry || '',
    auditType: row.audit_type || '',
    standard: row.standard,
    supplierId: row.supplier_ref || '',
    auditorId: row.auditor_ref || '',
    status: row.status,
    plannedDate: row.planned_date || '',
    completedDate: row.completed_date || null,
    nextAuditDate: row.next_audit_date || null,
    scope: row.scope || '',
    findings: Array.isArray(row.findings) ? row.findings : [],
    responses: row.responses && typeof row.responses === 'object' ? row.responses : {},
    auditDays: row.audit_days ?? 1,
    language: row.language || 'English',
    createdAt:
      typeof row.created_at === 'string'
        ? row.created_at.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    parentAuditId: row.parent_audit_id || null,
    isAutoPlanned: !!row.is_auto_planned,
    /** Server row timestamp — used client-side to merge with local drafts after reconnect. Not sent back on upsert. */
    serverUpdatedAt: row.updated_at ? String(row.updated_at) : null,
  }
}

export function auditToUpsertRow(audit, companyId) {
  return {
    id: audit.id,
    company_id: companyId,
    title: audit.title,
    industry: audit.industry || null,
    audit_type: audit.auditType || null,
    standard: audit.standard,
    supplier_ref: audit.supplierId || null,
    auditor_ref: audit.auditorId || null,
    status: audit.status,
    planned_date: audit.plannedDate || null,
    completed_date: audit.completedDate || null,
    next_audit_date: audit.nextAuditDate || null,
    scope: audit.scope || null,
    responses: audit.responses || {},
    findings: audit.findings || [],
    audit_days: Number(audit.auditDays) || 1,
    language: audit.language || 'English',
    parent_audit_id: audit.parentAuditId || null,
    is_auto_planned: !!audit.isAutoPlanned,
    updated_at: new Date().toISOString(),
  }
}

export function rowToReminder(row) {
  return {
    id: row.id,
    auditId: row.audit_id || null,
    findingId: row.finding_id || null,
    title: row.title,
    dueDate: row.due_date,
    status: row.status,
    type: row.reminder_type || 'finding_due',
  }
}

export function reminderToRow(r, companyId) {
  return {
    id: r.id,
    company_id: companyId,
    audit_id: r.auditId || null,
    finding_id: r.findingId || null,
    title: r.title,
    due_date: r.dueDate,
    status: r.status || 'Open',
    reminder_type: r.type || 'finding_due',
  }
}

export function rowToAuditLog(row) {
  return {
    id: row.id,
    timestamp: row.created_at,
    auditId: row.audit_id,
    action: row.action,
    user: row.actor_name || '',
    detail: row.detail || '',
  }
}

/** Load full program for company (canonical server state). */
export async function fetchAuditProgramForCompany(companyId) {
  if (!isSupabaseConfigured || !supabase || !companyId) {
    return { audits: [], auditLogs: [], reminders: [] }
  }

  const [auditsRes, eventsRes, remsRes] = await Promise.all([
    supabase.from('management_audits').select('*').eq('company_id', companyId).order('planned_date'),
    supabase.from('management_audit_events').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(2000),
    supabase.from('management_audit_reminders').select('*').eq('company_id', companyId).order('due_date'),
  ])

  const audits = (auditsRes.data || []).map(rowToAudit)
  const auditLogs = (eventsRes.data || []).map(rowToAuditLog)
  const reminders = (remsRes.data || []).map(rowToReminder)

  return { audits, auditLogs, reminders }
}

/** Upsert one audit row. */
export async function upsertAudit(audit, companyId) {
  if (!isSupabaseConfigured || !supabase || !companyId || !audit?.id) return
  const row = auditToUpsertRow(audit, companyId)
  await supabase.from('management_audits').upsert(row, { onConflict: 'id' })
}

/** Delete audit and dependent rows (FK cascade handles events). */
export async function deleteAudit(auditId, companyId) {
  if (!isSupabaseConfigured || !supabase || !companyId || !auditId) return
  await supabase.from('management_audits').delete().eq('id', auditId).eq('company_id', companyId)
}

/** Append activity log row (auditLogs in UI). */
export async function insertAuditEvent({ id, auditId, companyId, action, actorName, detail }) {
  if (!isSupabaseConfigured || !supabase || !companyId || !auditId || !id) return
  await supabase.from('management_audit_events').upsert({
    id,
    company_id: companyId,
    audit_id: auditId,
    action,
    actor_name: actorName || null,
    detail: detail || null,
    created_at: new Date().toISOString(),
  })
}

/** Replace all reminders for company (derived from live Zustand list). */
export async function replaceReminders(companyId, remindersList) {
  if (!isSupabaseConfigured || !supabase || !companyId) return
  await supabase.from('management_audit_reminders').delete().eq('company_id', companyId)
  if (!Array.isArray(remindersList) || remindersList.length === 0) return
  const rows = remindersList.map((r) => reminderToRow(r, companyId))
  const chunk = 100
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk)
    const { error } = await supabase.from('management_audit_reminders').insert(slice)
    if (error && process.env.NODE_ENV === 'development') {
      console.warn('[auditManagementDb] reminders insert:', error.message)
    }
  }
}

export async function syncAuditProgramSnapshots(companyId, audits, reminders) {
  if (!companyId || !Array.isArray(audits)) return
  await Promise.all(audits.map((a) => upsertAudit(a, companyId)))
  await replaceReminders(companyId, reminders)
}

export function directoryRowToEntry(row) {
  const data = row.data && typeof row.data === 'object' ? row.data : {}
  return { ...data, id: row.id }
}

export async function fetchAuditDirectoryForCompany(companyId) {
  if (!isSupabaseConfigured || !supabase || !companyId) {
    return { auditors: [], suppliers: [] }
  }
  const { data, error } = await supabase
    .from('management_audit_directory')
    .select('id, entry_kind, data')
    .eq('company_id', companyId)
    .order('id')
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[auditManagementDb] fetchAuditDirectory:', error.message)
    }
    return { auditors: [], suppliers: [] }
  }
  const auditors = []
  const suppliers = []
  for (const row of data || []) {
    const entry = directoryRowToEntry(row)
    if (row.entry_kind === 'auditor') auditors.push(entry)
    else if (row.entry_kind === 'supplier') suppliers.push(entry)
  }
  return { auditors, suppliers }
}

/**
 * Full replace of directory rows (same pattern as reminders).
 * @param {string} companyId
 * @param {object[]} auditors
 * @param {object[]} suppliers
 */
export async function replaceAuditDirectory(companyId, auditors, suppliers) {
  if (!isSupabaseConfigured || !supabase || !companyId) return
  await supabase.from('management_audit_directory').delete().eq('company_id', companyId)
  const rows = []
  for (const a of auditors || []) {
    if (!a?.id) continue
    rows.push({
      id: a.id,
      company_id: companyId,
      entry_kind: 'auditor',
      data: { ...a, id: a.id },
    })
  }
  for (const s of suppliers || []) {
    if (!s?.id) continue
    rows.push({
      id: s.id,
      company_id: companyId,
      entry_kind: 'supplier',
      data: { ...s, id: s.id },
    })
  }
  const chunk = 100
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk)
    const { error } = await supabase.from('management_audit_directory').insert(slice)
    if (error && process.env.NODE_ENV === 'development') {
      console.warn('[auditManagementDb] directory insert:', error.message)
    }
  }
}

/**
 * Superadmin / RLS: full profile directory with companies — maps to Audit Pro registry rows.
 * @returns {Promise<{ auditors: object[], suppliers: object[] }>}
 */
function profileRoleToAuditorSeat(role) {
  const r = String(role || '').toLowerCase()
  if (r.includes('auditor')) return 'Auditor'
  if (r === 'admin') return 'Admin'
  if (r === 'manager') return 'Manager'
  return 'Team member'
}

/**
 * Profiles linked to the tenant company (Supabase / RLS). Real platform users — not local demo slices.
 */
export async function fetchCompanyProfilesAsAuditAuditors(companyId) {
  if (!isSupabaseConfigured || !companyId || !isLikelyUuid(companyId)) return []
  try {
    const rows = await profilesService.listForCompany(companyId)
    return (rows || [])
      .map((row) => {
        const email = String(row.email || '').trim().toLowerCase()
        if (!email) return null
        return {
          id: `company_profile_${row.id}`,
          name: String(row.full_name || email.split('@')[0] || 'User').trim(),
          role: profileRoleToAuditorSeat(row.role),
          email,
          phone: String(row.phone || '').trim(),
          certifications: [],
          notes: `Company workspace profile (${row.role || 'member'})`,
          registeredAt: (row.created_at || new Date().toISOString()).slice(0, 10),
          platformProfileId: row.id,
          source: 'supabase_profiles',
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Tenant B2B directory rows (registered suppliers / contacts). RLS restricts to company_id.
 */
export async function fetchAccountDirectoryRowsAsAuditSuppliers(companyId) {
  if (!isSupabaseConfigured || !companyId || !isLikelyUuid(companyId)) return []
  try {
    const rows = await accountDirectoryEntriesService.list(companyId)
    return (rows || [])
      .map((e) => {
        const email = String(e.email || '').trim().toLowerCase()
        const name = String(e.company_name || '').trim()
        if (!name && !email) return null
        return {
          id: `account_directory_${e.id}`,
          name: name || (email ? email.split('@')[0] : 'Contact'),
          country: String(e.country || '').trim(),
          industry: String(e.industry_label || e.industry_hub_id || '').trim(),
          contact: String(e.contact_name || '').trim(),
          email,
          address: '',
          notes: `${String(e.entry_type || 'contact').replace(/_/g, ' ')} · Directory entry`,
          registeredAt: (e.created_at || new Date().toISOString()).slice(0, 10),
          accountDirectoryEntryId: e.id,
          vendorMasterId: null,
          source: 'supabase_directory',
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Map a SUPPLIER_DATABASE (+ registry mergers) row into Audit Pro supplier directory shape.
 */
export function supplierUniverseRecordToAuditSupplier(record) {
  if (!record || record.id === undefined || record.id === null || String(record.id).trim() === '') {
    return null
  }
  const pid = String(record.id).trim()
  const email = String(record.email || '').trim().toLowerCase()
  const industries = Array.isArray(record.industries) ? record.industries : []
  const primaryIndustry = industries.length > 0 ? String(industries[0]) : ''
  const regSlice =
    typeof record.registeredAt === 'string' && record.registeredAt.length >= 10
      ? record.registeredAt.slice(0, 10)
      : typeof record.established === 'number' && record.established > 1900
        ? `${String(record.established).slice(0, 4)}-01-01`
        : new Date().toISOString().slice(0, 10)
  const at = String(record.accountType || '').toLowerCase()
  const segment =
    at === 'service_provider'
      ? 'service_provider'
      : at === 'seller'
        ? 'seller'
        : record.source === 'registered'
          ? 'registered'
          : 'directory_seed'
  const segmentLabel =
    segment === 'service_provider'
      ? 'Service provider (registry)'
      : segment === 'seller'
        ? 'Seller (registry)'
        : segment === 'registered'
          ? 'Registered account'
          : 'Marketplace supplier database'
  const src = record.source === 'registered' ? 'registry' : String(record.source || 'database')

  return {
    id: `supplier_db_${pid}`,
    supplierDbId: pid,
    name: String(record.name || '').trim() || (email ? email.split('@')[0] : 'Supplier'),
    country: String(record.country || '').trim(),
    industry: primaryIndustry,
    contact: String(record.contactName || '').trim(),
    email,
    address: [record.city].filter(Boolean).join(', ') || '',
    notes: `${segmentLabel} · source: ${src}`,
    registeredAt: regSlice,
    vendorMasterId: null,
    source: 'supplier_universe',
    supplySegment: segment,
    universeSource: record.source || '',
  }
}

export async function fetchPlatformDirectoryProfilesForSuperadmin() {
  const out = { auditors: [], suppliers: [] }
  try {
    const { useAuthStore } = await import('../store/authStore')
    if (!useAuthStore.getState().isSuperAdmin?.()) return out
    const { profilesService } = await import('./supabaseService')
    const seenAuditor = new Set()
    const seenSupplier = new Set()
    let offset = 0
    const page = 400
    for (;;) {
      const { rows, hasMore } = await profilesService.listAllWithCompanies({ limit: page, offset })
      for (const row of rows || []) {
        const c = row.companies
        const at = c?.account_type
        const email = String(row.email || '').trim().toLowerCase()
        if (!email) continue

        if (at === 'auditor') {
          const key = `a:${email}`
          if (seenAuditor.has(key)) continue
          seenAuditor.add(key)
          out.auditors.push({
            id: `platform_profile_${row.id}`,
            name: row.full_name || email.split('@')[0] || 'Auditor',
            role: 'Auditor',
            email,
            phone: row.phone || '',
            certifications: [],
            notes: c?.name ? `Platform auditor — ${c.name}` : 'Registered on platform',
            registeredAt: (row.created_at || new Date().toISOString()).slice(0, 10),
            platformProfileId: row.id,
            platformCompanyId: c?.id ?? null,
            source: 'supabase_profiles',
          })
        }

        if (at === 'seller' || at === 'service_provider') {
          const companyId = c?.id
          const sid =
            typeof companyId === 'string' && isLikelyUuid(companyId)
              ? `platform_company_${companyId}`
              : `platform_profile_${row.id}`
          const key = `s:${sid}`
          if (seenSupplier.has(key)) continue
          seenSupplier.add(key)
          let industry = ''
          const ind = c?.industries
          if (Array.isArray(ind) && ind.length > 0) {
            industry = String(ind[0] ?? '')
          }
          out.suppliers.push({
            id: sid,
            name: c?.name || email.split('@')[0] || 'Supplier',
            country: c?.country || '',
            industry,
            contact: row.full_name || '',
            email,
            address: '',
            notes: '',
            registeredAt: (row.created_at || new Date().toISOString()).slice(0, 10),
            platformProfileId: row.id,
            platformCompanyId: companyId ?? null,
            vendorMasterId: null,
            source: 'supabase_profiles',
          })
        }
      }
      if (!hasMore || !rows?.length) break
      offset += page
    }
  } catch {
    /* offline / denied */
  }
  return out
}
