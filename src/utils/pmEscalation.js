/**
 * Monitoring cadence & risk escalation (D3).
 * Default: monthly. Active risk triggers weekly review escalation.
 */

export const MONITORING_CADENCE = {
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function parseDate(str) {
  if (!str) return null
  const d = new Date(str)
  return Number.isNaN(d.getTime()) ? null : d
}

function addDays(date, days) {
  const d = new Date(date.getTime())
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function getOpenRisks(project) {
  return (project?.risks || []).filter(
    (r) => r && r.status !== 'closed' && r.status !== 'mitigated',
  )
}

/** True when weekly review should replace monthly. */
export function hasActiveRiskEscalation(project) {
  if (!project) return false
  const open = getOpenRisks(project)
  if (open.length === 0) return false

  const rag = String(project.portfolioRag || 'green').toLowerCase()
  const hasEscalatedFlag = open.some((r) => r.escalated)
  const hasHighSeverity = open.some(
    (r) => r.severity === 'critical' || r.severity === 'high',
  )

  if (rag === 'red') return true
  if (hasEscalatedFlag || hasHighSeverity) return true
  if (rag === 'amber' && open.length >= 1) return true
  return false
}

export function buildEscalationReason(project) {
  const open = getOpenRisks(project)
  const rag = String(project.portfolioRag || 'green').toLowerCase()
  const parts = []
  if (rag === 'red') parts.push('Portfolio RAG is red')
  const esc = open.filter((r) => r.escalated).length
  if (esc > 0) parts.push(`${esc} escalated risk${esc === 1 ? '' : 's'}`)
  const high = open.filter((r) => r.severity === 'critical' || r.severity === 'high').length
  if (high > 0) parts.push(`${high} high/critical risk${high === 1 ? '' : 's'}`)
  if (rag === 'amber' && open.length > 0 && parts.length === 0) {
    parts.push(`${open.length} open risk${open.length === 1 ? '' : 's'} with amber RAG`)
  }
  return parts.join(' · ') || 'Active risks require closer monitoring'
}

/**
 * @returns escalation level 0 = none, 1 = weekly review, 2 = sponsor escalation
 */
export function computeEscalationLevel(project) {
  if (!hasActiveRiskEscalation(project)) return 0
  const open = getOpenRisks(project)
  const rag = String(project.portfolioRag || 'green').toLowerCase()
  if (rag === 'red' || open.some((r) => r.escalated)) return 2
  return 1
}

export function computeMonitoringState(project, now = new Date()) {
  const baseCadence = project?.monitoring?.baseCadence || MONITORING_CADENCE.MONTHLY
  const escalated = hasActiveRiskEscalation(project)
  const effectiveCadence = escalated ? MONITORING_CADENCE.WEEKLY : baseCadence
  const escalationLevel = computeEscalationLevel(project)
  const escalationReason = escalated ? buildEscalationReason(project) : ''
  const intervalDays = effectiveCadence === MONITORING_CADENCE.WEEKLY ? 7 : 30

  const lastReview = parseDate(project?.monitoring?.lastReviewAt)
  const anchor = lastReview || parseDate(project?.createdAt) || now
  const nextReviewDue = addDays(anchor, intervalDays)

  const due = parseDate(nextReviewDue)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const overdue = due && due.getTime() < today.getTime()

  return {
    baseCadence,
    effectiveCadence,
    escalationLevel,
    escalationReason,
    escalatedAt: escalated
      ? (project?.monitoring?.escalatedAt || new Date().toISOString().slice(0, 10))
      : null,
    lastReviewAt: project?.monitoring?.lastReviewAt || null,
    nextReviewDue,
    reviewOverdue: Boolean(overdue),
  }
}

export function applyMonitoringPatch(project) {
  const state = computeMonitoringState(project)
  return {
    monitoring: {
      ...(project.monitoring || {}),
      baseCadence: state.baseCadence,
      effectiveCadence: state.effectiveCadence,
      escalationLevel: state.escalationLevel,
      escalationReason: state.escalationReason,
      escalatedAt: state.escalatedAt,
      nextReviewDue: state.nextReviewDue,
      lastReviewAt: state.lastReviewAt,
    },
  }
}

export function cadenceLabel(cadence) {
  return cadence === MONITORING_CADENCE.WEEKLY ? 'Weekly' : 'Monthly'
}
