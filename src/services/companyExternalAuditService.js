import { isSupabaseConfigured, supabase } from '../config/supabase'
import { companiesService, profilesService } from './supabaseService'
import { useAccountRegistry } from '../store/accountRegistry'
import { useAuthStore } from '../store/authStore'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import {
  buildAuditScheduleMessages,
  companyAuditPatch,
  isCompanyUuid,
  normalizeAuditEmail,
  PRE_ASSESSMENT_RETURN_MARK,
  registryAuditPatch,
  validateAuditSchedule,
} from '../utils/companyExternalAudit'
import { sellerCompanyName } from '../utils/auditSellerLabel'

async function resolveSellerCompanyId(companyId, sellerEmail) {
  if (isCompanyUuid(companyId)) return companyId
  const email = normalizeAuditEmail(sellerEmail)
  if (!email || !isSupabaseConfigured) return null
  try {
    const row = await profilesService.getByEmailWithCompany(email)
    const cid = row?.companies?.id || row?.company_id
    return isCompanyUuid(cid) ? cid : null
  } catch {
    return null
  }
}

function persistRegistryByEmail(email, patch) {
  const key = normalizeAuditEmail(email)
  if (!key) return null
  const { updateAccount, registerAccount, accounts } = useAccountRegistry.getState()
  const existing = (accounts || []).find((a) => normalizeAuditEmail(a.email) === key)
  if (existing) return updateAccount(existing.email || existing.id, patch)
  return registerAccount({
    email: key,
    company: patch.company || 'Business Account',
    accountType: 'seller',
    ...patch,
  })
}

async function persistCloudAudit(companyId, fields) {
  if (!isSupabaseConfigured || !isCompanyUuid(companyId) || !supabase) return null
  const patch = companyAuditPatch(fields)
  const { data, error } = await supabase.rpc('set_company_external_audit', {
    p_company_id: companyId,
    p_status: patch.external_audit_status,
    p_notes: patch.external_audit_notes,
    p_planned_at: patch.external_audit_planned_at,
    p_deadline_at: patch.external_audit_deadline_at,
    p_auditor_email: patch.external_audit_assigned_auditor_email,
    p_auditor_name: patch.external_audit_assigned_auditor_name,
    p_strefex_verified: fields?.strefexVerified === true,
    p_complete_onsite: Boolean(fields?.completeOnsite) || patch.external_audit_status === 'passed',
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

export function notifyAuditScheduleParties({
  sellerEmail,
  sellerCompanyId,
  sellerName,
  auditorEmail,
  auditorName,
  status,
  plannedAt,
  deadlineAt,
} = {}) {
  const pushGlobal = useServiceRequestStore.getState().pushGlobalPlatformNotification
  const copy = buildAuditScheduleMessages({
    companyName: sellerName,
    status,
    plannedAt,
    deadlineAt,
    auditorName,
    auditorEmail,
  })
  const seller = normalizeAuditEmail(sellerEmail)
  const auditor = normalizeAuditEmail(auditorEmail)
  if (seller) {
    pushGlobal?.({
      targetEmail: seller,
      title: copy.sellerTitle,
      message: copy.sellerMessage,
      type: 'audit_plan_seller',
      companyId: sellerCompanyId,
    })
  }
  if (auditor && auditor !== seller) {
    pushGlobal?.({
      targetEmail: auditor,
      title: copy.auditorTitle,
      message: copy.auditorMessage,
      type: 'audit_plan_assigned',
      companyId: sellerCompanyId,
    })
  }
  if (isSupabaseConfigured && supabase && isCompanyUuid(sellerCompanyId)) {
    void supabase.rpc('notify_company_audit_plan', {
      p_company_id: sellerCompanyId,
      p_seller_email: seller || '',
      p_auditor_email: auditor || '',
      p_seller_title: copy.sellerTitle,
      p_seller_message: copy.sellerMessage,
      p_auditor_title: copy.auditorTitle,
      p_auditor_message: copy.auditorMessage,
    }).then(({ error }) => {
      if (error && process.env.NODE_ENV === 'development') {
        console.warn('[audit notify]', error.message)
      }
    })
  }
}

export async function saveCompanyExternalAudit({
  companyId,
  sellerEmail,
  sellerName,
  status,
  notes,
  plannedAt,
  deadlineAt,
  auditorEmail,
  auditorName,
  strefexVerified = false,
  completeOnsite = false,
  notify = true,
} = {}) {
  const role = useAuthStore.getState()?.role
  const error = validateAuditSchedule({
    status,
    plannedAt,
    deadlineAt,
    auditorEmail,
    role,
  })
  if (error) throw new Error(error)

  const fields = {
    status,
    notes,
    plannedAt,
    deadlineAt,
    auditorEmail,
    auditorName,
    strefexVerified,
    completeOnsite,
  }
  const resolvedCompanyId = await resolveSellerCompanyId(companyId, sellerEmail)
  let company = null
  if (isCompanyUuid(resolvedCompanyId)) {
    company = await persistCloudAudit(resolvedCompanyId, fields)
  }
  persistRegistryByEmail(sellerEmail, {
    ...registryAuditPatch(fields),
    company: sellerName,
  })

  if (notify && String(status || 'none').toLowerCase() !== 'none') {
    notifyAuditScheduleParties({
      sellerEmail,
      sellerCompanyId: resolvedCompanyId || companyId,
      sellerName,
      auditorEmail,
      auditorName,
      status,
      plannedAt,
      deadlineAt,
    })
  }
  return company || (isCompanyUuid(resolvedCompanyId) ? { id: resolvedCompanyId } : null)
}

export async function listCompanyExternalAudits() {
  if (!isSupabaseConfigured) return []
  const data = await companiesService.list({ limit: 5000 })
  return (data || []).map((c) => ({
    id: c.id,
    email: normalizeAuditEmail(c.email),
    name: sellerCompanyName({
      name: c.name,
      company_name: c.metadata?.company_name,
      companyName: c.metadata?.companyName,
      email: c.email,
    }),
    accountType: c.account_type,
    ...companyAuditPatch({
      status: c.external_audit_status,
      notes: c.external_audit_notes,
      plannedAt: c.external_audit_planned_at,
      deadlineAt: c.external_audit_deadline_at,
      passedAt: c.external_audit_passed_at,
      auditorEmail: c.external_audit_assigned_auditor_email,
      auditorName: c.external_audit_assigned_auditor_name,
      strefexVerified: c.strefex_verified,
      completeOnsite: c.onsite_audit_completed,
    }),
  }))
}

export async function submitSellerPreAssessmentReturn({ notes, fileName } = {}) {
  const tenant = useAuthStore.getState()?.tenant
  const user = useAuthStore.getState()?.user
  const body = [
    PRE_ASSESSMENT_RETURN_MARK,
    new Date().toISOString().slice(0, 10),
    String(notes || '').trim(),
    fileName ? `File: ${fileName}` : '',
  ].filter(Boolean).join('\n')

  let company = null
  if (isSupabaseConfigured && supabase && isCompanyUuid(tenant?.id)) {
    const { data, error } = await supabase.rpc('submit_seller_pre_assessment', { p_notes: body })
    if (error) throw error
    company = Array.isArray(data) ? data[0] : data
  }

  const email = normalizeAuditEmail(user?.email || tenant?.email)
  persistRegistryByEmail(email, {
    ...registryAuditPatch({
      status: tenant?.external_audit_status || tenant?.externalAuditStatus || 'pending',
      notes: body,
      plannedAt: tenant?.external_audit_planned_at || tenant?.externalAuditPlannedAt,
      deadlineAt: tenant?.external_audit_deadline_at || tenant?.externalAuditDeadlineAt,
      auditorEmail: tenant?.external_audit_assigned_auditor_email || tenant?.externalAuditAssignedAuditorEmail,
      auditorName: tenant?.external_audit_assigned_auditor_name || tenant?.externalAuditAssignedAuditorName,
    }),
    company: tenant?.name || user?.companyName,
  })

  const auditor = normalizeAuditEmail(
    tenant?.external_audit_assigned_auditor_email || tenant?.externalAuditAssignedAuditorEmail,
  )
  if (auditor) {
    useServiceRequestStore.getState().pushGlobalPlatformNotification?.({
      targetEmail: auditor,
      title: 'Pre-assessment returned',
      message: `${tenant?.name || 'A seller'} returned the pre-assessment checklist.`,
      type: 'audit_pre_assessment_return',
      companyId: tenant?.id,
    })
  }

  return company || { external_audit_notes: body }
}
