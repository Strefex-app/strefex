import { notesHavePreAssessmentReturn, normalizeAuditEmail, toAuditDateInput } from './companyExternalAudit'
import { selfAssessmentReturned } from './auditSupplierRegister'
import { auditDaysForStandard, defaultSellerStandard } from './auditSellerLabel'
import {
  inferAuditKind,
  isOpenAuditRequest,
  lastCompletedAudit,
  sellerRiskFromHistory,
} from './auditorsAssignmentPool'

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

export const CALENDAR_QUEUE = [
  { id: 'to_plan', label: 'To plan' },
  { id: 'planned', label: 'Planned' },
  { id: 'new_registered', label: 'New suppliers' },
  { id: 'reevaluation', label: 'Re-evaluation' },
  { id: 'buyer_request', label: 'Buyer request' },
]

const QUEUE_LABEL = Object.fromEntries(CALENDAR_QUEUE.map((q) => [q.id, q.label]))

function requestEmails(requests = []) {
  const set = new Set()
  for (const request of requests || []) {
    if (!isOpenAuditRequest(request)) continue
    const email = normalizeAuditEmail(request.email) || normalizeAuditEmail(request.preferredProviderEmail)
    if (email) set.add(email)
  }
  return set
}

export function calendarQueueTags({ boardId, kind, fromRequest }) {
  const tags = []
  if (fromRequest || kind === 'request') tags.push('buyer_request')
  if (boardId === 'scheduled') tags.push('planned')
  else if (boardId !== 'audited') tags.push('to_plan')
  if (kind === 'joined' || boardId === 'new') tags.push('new_registered')
  if (kind === 'yearly' || kind === 'reoccurred') tags.push('reevaluation')
  return [...new Set(tags)]
}

export function buildCalendarQueue({
  suppliers = [],
  audits = [],
  requests = [],
  todayIso = '',
  includeUnmatchedRequests = true,
} = {}) {
  const emails = requestEmails(requests)
  const seen = new Set()
  const rows = []

  const pushRow = (row) => {
    if (!row?.id || seen.has(row.id) || !row.tags?.length) return
    seen.add(row.id)
    rows.push(row)
  }

  for (const supplier of suppliers || []) {
    const audit = openAuditForSeller(audits, supplier.id)
    const board = sellerBoardStatus(audit, supplier)
    const fromRequest = emails.has(normalizeAuditEmail(supplier.email))
    const kind = inferAuditKind({
      lastCompleted: lastCompletedAudit(supplier, audits),
      openFindings: sellerRiskFromHistory(supplier, audits).open,
      fromRequest,
      registeredAt: supplier.registeredAt || supplier.createdAt,
      todayIso,
    })
    const tags = calendarQueueTags({ boardId: board.id, kind, fromRequest })
    pushRow({
      id: supplier.id,
      supplier,
      audit,
      board,
      kind,
      tags,
      urgent: fromRequest,
      label: QUEUE_LABEL[tags[0]] || board.label,
      primary: tags[0] || board.id,
    })
  }

  for (const request of includeUnmatchedRequests ? (requests || []) : []) {
    if (!isOpenAuditRequest(request)) continue
    const email = normalizeAuditEmail(request.email)
    const matched = (suppliers || []).find((s) => normalizeAuditEmail(s.email) === email)
    if (matched) continue
    const supplier = {
      id: `req-${request.id}`,
      name: request.companyName || 'Requested seller',
      email: request.email || '',
      industry: request.industryLabel || '',
      country: '',
    }
    pushRow({
      id: supplier.id,
      supplier,
      audit: null,
      board: { id: 'action', label: 'Need action' },
      kind: 'request',
      tags: ['buyer_request', 'to_plan'],
      urgent: true,
      requestId: request.id,
      label: QUEUE_LABEL.buyer_request,
      primary: 'buyer_request',
    })
  }

  const rank = { buyer_request: 0, reevaluation: 1, new_registered: 2, to_plan: 3, planned: 4 }
  return rows.sort((a, b) => (rank[a.primary] ?? 9) - (rank[b.primary] ?? 9))
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
