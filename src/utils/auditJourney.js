import { notesHavePreAssessmentReturn, toAuditDateInput } from './companyExternalAudit'
import { selfAssessmentReturned } from './auditSupplierRegister'
import { auditDaysForStandard, defaultSellerStandard } from './auditSellerLabel'

export { auditDaysForStandard, defaultSellerStandard }

export const JOURNEY_STEPS = [
  { id: 'plan', n: 1, label: 'Plan visit' },
  { id: 'pre', n: 2, label: 'Self-assessment' },
  { id: 'onsite', n: 3, label: 'On-site questionnaire' },
  { id: 'closing', n: 4, label: 'Closing report' },
  { id: 'badge', n: 5, label: 'Audited' },
]

export const SELLER_BOARD = [
  { id: 'new', label: 'New' },
  { id: 'action', label: 'Need action' },
  { id: 'scheduled', label: 'Audit scheduled' },
  { id: 'audited', label: 'Audited' },
]

export function openAuditForSeller(audits = [], supplierId) {
  const rows = (audits || []).filter((a) => a.supplierId === supplierId && a.status !== 'Cancelled')
  const open = rows.find((a) => a.status !== 'Completed')
  if (open) return open
  return [...rows].sort((a, b) => String(b.completedDate || b.plannedDate || '').localeCompare(String(a.completedDate || a.plannedDate || '')))[0] || null
}

function preAssessmentDone(audit, supplier) {
  const key = String(audit?.preAssessmentStatus || '').toLowerCase()
  if (['issued', 'auditor_filled', 'seller_returned'].includes(key)) return true
  if (audit?.preAssessmentReturnedAt) return true
  if (notesHavePreAssessmentReturn(supplier?.externalAuditNotes)) return true
  return selfAssessmentReturned(audit)
}

function isAudited(audit, supplier) {
  return supplier?.onsiteAuditCompleted === true
    || supplier?.onsite_audit_completed === true
    || Boolean(audit?.closingReportUploadedAt)
}

export function sellerBoardStatus(audit, supplier) {
  if (isAudited(audit, supplier)) {
    return { id: 'audited', label: 'Audited' }
  }
  const date = toAuditDateInput(audit?.plannedDate)
  if (date && audit?.status !== 'Completed') {
    return { id: 'scheduled', label: 'Audit scheduled' }
  }
  if (!audit) {
    return { id: 'new', label: 'New' }
  }
  return { id: 'action', label: 'Need action' }
}

export function sellersWaitingToPlan(suppliers = [], audits = []) {
  return (suppliers || []).filter((s) => {
    const board = sellerBoardStatus(openAuditForSeller(audits, s.id), s)
    return board.id === 'new' || board.id === 'action'
  })
}

export function journeyStage(audit, supplier) {
  if (isAudited(audit, supplier)) {
    return { id: 'badge', label: 'On-site audited', action: 'done' }
  }
  if (audit?.status === 'Completed') {
    return { id: 'closing', label: 'Upload the signed closing report', action: 'upload' }
  }
  if (audit?.status === 'In Progress') {
    return { id: 'onsite', label: 'Continue the on-site questionnaire', action: 'conduct' }
  }
  if (!toAuditDateInput(audit?.plannedDate)) {
    return { id: 'plan', label: 'Pick a date and standard', action: 'plan' }
  }
  if (!preAssessmentDone(audit, supplier)) {
    return { id: 'pre', label: 'Self-assessment is out with the seller', action: 'pre' }
  }
  return { id: 'onsite', label: 'Open the on-site questionnaire', action: 'conduct' }
}

export function journeyStepIndex(stageId) {
  const i = JOURNEY_STEPS.findIndex((s) => s.id === stageId)
  return i < 0 ? 0 : i
}
