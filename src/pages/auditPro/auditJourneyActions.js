import useAuditProStore from '../../store/auditProStore'
import { auditProUid } from '../../utils/auditProUid'
import { notifyWorkspaceKeyDirty } from '../../services/workspaceCloudSync'
import { saveCompanyExternalAudit } from '../../services/companyExternalAuditService'
import { PRE_ASSESSMENT_ISSUED_MARK } from '../../utils/companyExternalAudit'
import { getActorCompanyId } from '../../services/auditManagementDb'
import { utcTodayIso } from '../../utils/auditorsAssignmentPool'
import { addDaysIso } from '../../utils/auditProgrammeViews'
import { auditDaysForStandard, defaultSellerStandard, openAuditForSeller } from '../../utils/auditJourney'

function defaultStandard(supplier) {
  return defaultSellerStandard(supplier)
}

async function persistSellerPlan(supplier, auditor, patch) {
  if (!supplier?.email) return
  try {
    await saveCompanyExternalAudit({
      companyId: supplier.platformCompanyId || null,
      sellerEmail: supplier.email,
      sellerName: supplier.name,
      auditorEmail: auditor?.email || '',
      auditorName: auditor?.name || '',
      notify: true,
      ...patch,
    })
  } catch {
    /* assignment already local */
  }
}

export function ensureSellerAudit(supplier, auditor, extras = {}) {
  const store = useAuditProStore.getState()
  const existing = openAuditForSeller(store.audits, supplier.id)
  if (existing) {
    if (auditor && existing.auditorId !== auditor.id) {
      store.patchAudit(existing.id, { auditorId: auditor.id, status: existing.status === 'Draft' ? 'Assigned' : existing.status })
    }
    return store.audits.find((a) => a.id === existing.id) || existing
  }
  const audit = {
    id: auditProUid(),
    title: `On-site audit – ${supplier?.name || 'Seller'}`,
    industry: supplier?.industry || '',
    auditType: 'Manufacturing / Quality',
    standard: defaultStandard(supplier),
    supplierId: supplier.id,
    auditorId: auditor?.id || '',
    plannedDate: '',
    status: auditor ? 'Assigned' : 'Draft',
    preAssessmentStatus: 'none',
    findings: [],
    responses: {},
    createdAt: utcTodayIso(),
    ...extras,
  }
  store.setAudits([...(store.audits || []), audit])
  void store.upsertAuditRemote(audit)
  store.addAuditLog(audit.id, 'Audit opened', auditor?.name || 'System', `File opened for ${supplier?.name || 'seller'}.`)
  notifyWorkspaceKeyDirty('audit_pro', true)
  return audit
}

export async function assignAuditorToSeller(supplier, auditor) {
  const audit = ensureSellerAudit(supplier, auditor)
  useAuditProStore.getState().patchAudit(audit.id, { auditorId: auditor.id, status: audit.status === 'Completed' ? audit.status : 'Assigned' })
  useAuditProStore.getState().addAuditLog(audit.id, 'Auditor assigned', auditor.name || 'System', `${auditor.name} assigned.`)
  await persistSellerPlan(supplier, auditor, { status: 'pending' })
  notifyWorkspaceKeyDirty('audit_pro', true)
  return audit.id
}

export async function issuePreAssessment(supplier, auditor) {
  const audit = ensureSellerAudit(supplier, auditor)
  const today = utcTodayIso()
  useAuditProStore.getState().patchAudit(audit.id, {
    preAssessmentStatus: 'issued',
    preAssessmentIssuedAt: today,
    preAssessmentDueAt: addDaysIso(today, 14),
  })
  useAuditProStore.getState().addAuditLog(audit.id, 'Pre-assessment issued', auditor?.name || 'System', 'Checklist sent to the seller.')
  const live = useAuditProStore.getState().audits.find((a) => a.id === audit.id) || audit
  await persistSellerPlan(supplier, auditor, {
    status: live.plannedDate ? 'planned' : 'pending',
    plannedAt: live.plannedDate || undefined,
    notes: `${PRE_ASSESSMENT_ISSUED_MARK} Return answers in Profile.`,
  })
  notifyWorkspaceKeyDirty('audit_pro', true)
  return audit.id
}

export async function markPreAssessmentFilled(auditId, by = 'auditor') {
  const status = by === 'seller' ? 'seller_returned' : 'auditor_filled'
  useAuditProStore.getState().patchAudit(auditId, {
    preAssessmentStatus: status,
    preAssessmentReturnedAt: utcTodayIso(),
  })
  notifyWorkspaceKeyDirty('audit_pro', true)
}

export async function scheduleSellerVisit(supplier, date, auditor, extras = {}) {
  const audit = ensureSellerAudit(supplier, auditor, extras)
  const standard = extras.standard || audit.standard || defaultStandard(supplier)
  const days = extras.auditDays || auditDaysForStandard(standard)
  useAuditProStore.getState().patchAudit(audit.id, {
    auditorId: auditor?.id || audit.auditorId,
    plannedDate: date,
    status: 'Planned',
    standard,
    auditDays: String(days),
    title: extras.title || `${standard} – ${supplier?.name || 'Seller'}`,
    ...extras.patch,
  })
  useAuditProStore.getState().addAuditLog(audit.id, 'Visit scheduled', auditor?.name || 'System', `Visit planned for ${date} (${days} day${days === 1 ? '' : 's'}).`)
  await persistSellerPlan(supplier, auditor, { status: 'planned', plannedAt: date })
  notifyWorkspaceKeyDirty('audit_pro', true)
  return audit.id
}

/** Take the seller, set date + standard, send self-assessment in one step. */
export async function planSellerAudit({ supplier, date, auditor, standard }) {
  if (!date) throw new Error('Pick a visit date.')
  if (!auditor) throw new Error('Your auditor profile is not on the panel yet.')
  const std = String(standard || defaultStandard(supplier)).trim() || defaultStandard(supplier)
  const days = auditDaysForStandard(std)
  const auditId = await scheduleSellerVisit(supplier, date, auditor, {
    standard: std,
    auditDays: days,
    title: `${std} – ${supplier?.name || 'Seller'}`,
  })
  await issuePreAssessment(supplier, auditor)
  return auditId
}

export async function uploadClosingReport({ audit, supplier, auditor, file }) {
  if (!file || !audit?.id) throw new Error('Choose the signed closing report file.')
  const companyId = await getActorCompanyId()
  let path = ''
  if (companyId) {
    try {
      const { storageService } = await import('../../services/supabaseService')
      const uploaded = await storageService.upload({
        companyId,
        entityType: 'audit-closing',
        entityId: audit.id,
        file,
      })
      path = uploaded?.path || ''
    } catch {
      path = ''
    }
  }
  const uploadedAt = new Date().toISOString()
  useAuditProStore.getState().patchAudit(audit.id, {
    closingReportUploadedAt: uploadedAt,
    closingReportFileName: file.name,
    closingReportPath: path,
  })
  useAuditProStore.getState().addAuditLog(audit.id, 'Closing report uploaded', auditor?.name || 'System', file.name)
  await persistSellerPlan(supplier, auditor, {
    status: 'passed',
    plannedAt: audit.plannedDate,
    completeOnsite: true,
  })
  if (supplier?.id) {
    const suppliers = useAuditProStore.getState().suppliers || []
    useAuditProStore.getState().setSuppliers(suppliers.map((row) => (
      row.id === supplier.id ? { ...row, onsiteAuditCompleted: true } : row
    )))
  }
  notifyWorkspaceKeyDirty('audit_pro', true)
}
