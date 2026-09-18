import { AUDIT_STANDARDS } from '../data/auditManagementDetailedData'
import { isAuditServiceCategoryId } from '../data/auditServices'
import { toAuditDateInput } from './companyExternalAudit'

export const POOL_REGIONS = ['EMEA', 'ASIA', 'AMERICAS']
export const DEFAULT_ANNUAL_CAPACITY_DAYS = 60
export const YEARLY_AUDIT_AFTER_DAYS = 300
export const JOINED_WINDOW_DAYS = 120

const ASIA = /\b(china|japan|korea|india|vietnam|thailand|indonesia|malaysia|singapore|taiwan|philippines|pakistan|bangladesh|sri lanka|hong kong|uae|qatar|saudi|asia)\b/i
const AMERICAS = /\b(usa|united states|canada|mexico|brazil|argentina|chile|colombia|peru|america)\b/i

export const AUDIT_KIND_META = {
  joined: { label: 'Initial', reason: 'Just joined' },
  yearly: { label: 'Surveillance', reason: 'Yearly audit' },
  reoccurred: { label: 'Follow-up', reason: 'Reoccurred audit' },
  request: { label: 'By request', reason: 'Audit by request' },
  planned: { label: 'Scheduled', reason: 'Planned visit' },
}

export function regionFromCountry(country = '') {
  const c = String(country || '')
  if (ASIA.test(c)) return 'ASIA'
  if (AMERICAS.test(c)) return 'AMERICAS'
  return 'EMEA'
}

export function utcTodayIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10)
}

export function daysFromTo(fromIso, toIso) {
  const a = toAuditDateInput(fromIso)
  const b = toAuditDateInput(toIso)
  if (!a || !b) return null
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)
  if (Number.isNaN(ms)) return null
  return Math.round(ms / 86400000)
}

export function addDaysIso(iso, days) {
  const d = toAuditDateInput(iso) || utcTodayIso()
  const t = Date.parse(`${d}T00:00:00Z`) + days * 86400000
  return new Date(t).toISOString().slice(0, 10)
}

function hashCode(value) {
  const s = String(value || '')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function sellerSiteCode(supplier) {
  if (supplier?.supplierCode) return String(supplier.supplierCode)
  const n = 1000 + (hashCode(supplier?.id || supplier?.email || supplier?.name) % 9000)
  return `SUP-${n}`
}

export function sellerRiskFromHistory(supplier, audits = []) {
  const sa = (audits || []).filter((a) => a.supplierId === supplier?.id && a.status === 'Completed')
  const maj = sa.reduce((n, a) => n + (a.findings?.filter((f) => f.type === 'Major NC').length || 0), 0)
  const min = sa.reduce((n, a) => n + (a.findings?.filter((f) => f.type === 'Minor NC').length || 0), 0)
  const open = sa.reduce((n, a) => n + (a.findings?.filter((f) => f.status === 'Open').length || 0), 0)
  const L = Math.min(5, Math.ceil((maj * 2 + min + open * 1.5) / 2) + 1)
  const I = Math.min(5, Math.ceil((maj * 3 + min) / 3) + 1)
  const score = L * I
  const level = score >= 16 ? 'CRITICAL' : score >= 9 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW'
  return { score, level, maj, min, open }
}

export function lastCompletedAudit(supplier, audits = []) {
  return [...(audits || [])]
    .filter((a) => a.supplierId === supplier?.id && a.status === 'Completed' && (a.completedDate || a.plannedDate))
    .sort((a, b) => String(b.completedDate || b.plannedDate).localeCompare(String(a.completedDate || a.plannedDate)))[0] || null
}

export function scopeModulesForSeller(supplier, audit) {
  const fromAudit = [audit?.standard, ...(String(audit?.scope || '').split(/[,;|/]/))]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
  if (fromAudit.length) return [...new Set(fromAudit)].slice(0, 4)
  const certs = Array.isArray(supplier?.certifications)
    ? supplier.certifications.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean)
    : []
  if (certs.length) return [...new Set(certs)].slice(0, 4)
  const industry = supplier?.industry || audit?.industry
  const types = AUDIT_STANDARDS[industry] || {}
  const quality = types['Manufacturing / Quality'] || Object.values(types)[0] || []
  return (quality || []).slice(0, 3)
}

export function inferAuditKind({ lastCompleted, openFindings = 0, fromRequest = false, registeredAt, todayIso }) {
  if (fromRequest) return 'request'
  if (openFindings > 0) return 'reoccurred'
  const joinedDays = daysFromTo(registeredAt, todayIso)
  if (!lastCompleted) {
    if (joinedDays != null && joinedDays <= JOINED_WINDOW_DAYS) return 'joined'
    return null
  }
  const since = daysFromTo(lastCompleted.completedDate || lastCompleted.plannedDate, todayIso)
  if (since != null && since >= YEARLY_AUDIT_AFTER_DAYS) return 'yearly'
  if (since != null && since >= 0 && since < 90 && (lastCompleted.findings || []).length > 0) return 'reoccurred'
  return null
}

function auditDaysForKind(kind) {
  if (kind === 'joined') return 3
  if (kind === 'reoccurred') return 2
  return 2
}

export function readinessForJob({ kind, deadlineAt, plannedAt, hasResponses, todayIso }) {
  const due = toAuditDateInput(deadlineAt) || toAuditDateInput(plannedAt)
  if (due && due < todayIso) return { key: 'overdue', label: 'Self-assessment overdue' }
  if (hasResponses) return { key: 'returned', label: 'Self-assessment returned' }
  if (kind === 'joined' || kind === 'request') return { key: 'issued', label: 'Self-assessment issued' }
  return { key: 'issued', label: 'Self-assessment issued' }
}

function openStatuses(status) {
  const s = String(status || '')
  return !['Completed', 'Cancelled', 'passed', 'failed'].includes(s)
}

export function isOpenAuditRequest(request) {
  if (!request) return false
  const status = String(request.status || '').toLowerCase()
  if (['completed', 'cancelled', 'recalled'].includes(status)) return false
  if (isAuditServiceCategoryId(request.serviceCategoryId)) return true
  return (request.services || []).some((s) => String(s || '').toLowerCase().includes('audit'))
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function auditorCoversModule(auditor, module) {
  const needle = normalize(module)
  if (!needle) return true
  const certs = [
    ...(auditor?.certifications || []),
    ...(Array.isArray(auditor?.qualifiedModules) ? auditor.qualifiedModules : []),
    auditor?.notes,
  ]
    .flatMap((c) => String(typeof c === 'string' ? c : c?.name || '').split(/[,;]/))
    .map(normalize)
    .filter(Boolean)
  if (!certs.length) return false
  return certs.some((c) => needle.includes(c) || c.includes(needle) || needle.split(' ').some((w) => w.length > 3 && c.includes(w)))
}

export function auditorQualification(auditor, modules = []) {
  const missing = (modules || []).filter((m) => !auditorCoversModule(auditor, m))
  const total = (auditor?.certifications || []).length
  const provisional = String(auditor?.notes || '').toLowerCase().includes('provisional')
    ? 1
    : Math.max(0, Math.round(total * 0.15))
  return {
    qualifiedCount: Math.max(0, total - provisional),
    provisionalCount: provisional,
    missing,
    coversAll: missing.length === 0 && modules.length > 0,
  }
}

function bookedDaysForAuditor(auditor, audits = []) {
  const year = utcTodayIso().slice(0, 4)
  return (audits || []).reduce((sum, a) => {
    if (a.auditorId !== auditor.id && a.secondaryAuditorId !== auditor.id) return sum
    if (!openStatuses(a.status)) return sum
    const when = toAuditDateInput(a.plannedDate) || ''
    if (when && !when.startsWith(year)) return sum
    return sum + (Number(a.auditDays) || 1)
  }, 0)
}

export function buildPanelCapacity({ auditors = [], audits = [], proposals = {}, annualDays = DEFAULT_ANNUAL_CAPACITY_DAYS } = {}) {
  return (auditors || []).map((auditor) => {
    const booked = bookedDaysForAuditor(auditor, audits)
    const assignedHere = Object.values(proposals || {}).reduce((n, p) => (
      p?.auditorId === auditor.id ? n + (Number(p.auditDays) || 0) : n
    ), 0)
    const capacity = Number(auditor.annualCapacityDays) || annualDays
    const utilised = booked + assignedHere
    const utilisation = capacity > 0 ? Math.round((utilised / capacity) * 100) : 0
    const certs = auditor.certifications || []
    const provisional = String(auditor.notes || '').toLowerCase().includes('provisional')
    return {
      id: auditor.id,
      name: auditor.name || auditor.email || 'Auditor',
      code: auditor.auditorCode || `SX-A-${String(1000 + (hashCode(auditor.id || auditor.email) % 900)).padStart(3, '0')}`,
      country: auditor.country || auditor.city || '',
      region: auditor.region || regionFromCountry(auditor.country || auditor.city || ''),
      qualifiedCount: certs.length,
      provisionalCount: provisional ? 1 : 0,
      booked,
      assignedHere: assignedHere || 0,
      utilisation,
      capacity,
      email: auditor.email || '',
      auditor,
    }
  }).sort((a, b) => b.utilisation - a.utilisation)
}

function matchSupplierEmail(suppliers, email) {
  const key = String(email || '').trim().toLowerCase()
  if (!key) return null
  return (suppliers || []).find((s) => String(s.email || '').trim().toLowerCase() === key) || null
}

export function buildAssignmentPool({
  suppliers = [],
  audits = [],
  requests = [],
  todayIso = utcTodayIso(),
} = {}) {
  const items = []
  const seen = new Set()

  const push = (item) => {
    const key = `${item.supplierId || item.requestId}:${item.kind}:${item.auditId || ''}`
    if (seen.has(key)) return
    seen.add(key)
    items.push(item)
  }

  for (const audit of audits || []) {
    if (!openStatuses(audit.status)) continue
    const assigned = Boolean(audit.auditorId)
    if (assigned) continue
    const supplier = (suppliers || []).find((s) => s.id === audit.supplierId) || null
    const last = lastCompletedAudit(supplier, audits)
    const risk = sellerRiskFromHistory(supplier || { id: audit.supplierId }, audits)
    const kind = inferAuditKind({
      lastCompleted: last,
      openFindings: risk.open,
      fromRequest: false,
      registeredAt: supplier?.registeredAt,
      todayIso,
    }) || 'planned'
    const modules = scopeModulesForSeller(supplier, audit)
    const target = toAuditDateInput(audit.deadlineDate) || toAuditDateInput(audit.plannedDate) || addDaysIso(todayIso, 45)
    push({
      id: `audit:${audit.id}`,
      auditId: audit.id,
      supplierId: supplier?.id || audit.supplierId || '',
      supplier,
      kind,
      kindLabel: AUDIT_KIND_META[kind].label,
      kindReason: AUDIT_KIND_META[kind].reason,
      risk,
      modules,
      targetDate: target,
      deadlineDate: toAuditDateInput(audit.deadlineDate) || '',
      plannedDate: toAuditDateInput(audit.plannedDate) || '',
      auditDays: Number(audit.auditDays) || auditDaysForKind(kind),
      region: regionFromCountry(supplier?.country || audit.country),
      readiness: readinessForJob({
        kind,
        deadlineAt: audit.deadlineDate,
        plannedAt: audit.plannedDate,
        hasResponses: Boolean(audit.responses && Object.keys(audit.responses).length),
        todayIso,
      }),
      source: 'audit',
    })
  }

  for (const supplier of suppliers || []) {
    const existingOpen = (audits || []).some((a) => a.supplierId === supplier.id && openStatuses(a.status))
    if (existingOpen) continue
    const last = lastCompletedAudit(supplier, audits)
    const risk = sellerRiskFromHistory(supplier, audits)
    const cloudPending = ['pending', 'planned', 'confirmed'].includes(
      String(supplier.externalAuditStatus || '').toLowerCase(),
    )
    const cloudUnassigned = cloudPending && !String(supplier.externalAuditAssignedAuditorEmail || '').trim()
    const kind = inferAuditKind({
      lastCompleted: last,
      openFindings: risk.open,
      fromRequest: false,
      registeredAt: supplier.registeredAt || supplier.createdAt,
      todayIso,
    }) || (cloudUnassigned ? 'planned' : null)
    const needsPool = Boolean(kind)
    if (!needsPool) continue
    const target = toAuditDateInput(supplier.externalAuditDeadlineAt)
      || toAuditDateInput(supplier.externalAuditPlannedAt)
      || addDaysIso(supplier.registeredAt || todayIso, kind === 'joined' ? 60 : 45)
    push({
      id: `seller:${supplier.id}:${kind}`,
      auditId: '',
      supplierId: supplier.id,
      supplier,
      kind,
      kindLabel: AUDIT_KIND_META[kind].label,
      kindReason: AUDIT_KIND_META[kind].reason,
      risk,
      modules: scopeModulesForSeller(supplier, null),
      targetDate: target,
      deadlineDate: toAuditDateInput(supplier.externalAuditDeadlineAt) || '',
      plannedDate: toAuditDateInput(supplier.externalAuditPlannedAt) || '',
      auditDays: auditDaysForKind(kind),
      region: regionFromCountry(supplier.country),
      readiness: readinessForJob({
        kind,
        deadlineAt: supplier.externalAuditDeadlineAt,
        plannedAt: supplier.externalAuditPlannedAt,
        hasResponses: false,
        todayIso,
      }),
      source: 'seller',
    })
  }

  for (const request of requests || []) {
    if (!isOpenAuditRequest(request)) continue
    const supplier = matchSupplierEmail(suppliers, request.email)
      || matchSupplierEmail(suppliers, request.preferredProviderEmail)
    const risk = sellerRiskFromHistory(supplier || { id: request.id }, audits)
    const standardMatch = String(request.description || '').match(/Audit standard:\s*([^.]*)/i)
    const standard = standardMatch?.[1]?.trim()
    const modules = standard && standard !== 'N/A'
      ? [standard]
      : scopeModulesForSeller(supplier, { standard: request.serviceCategoryLabel })
    push({
      id: `request:${request.id}`,
      auditId: '',
      requestId: request.id,
      supplierId: supplier?.id || '',
      supplier: supplier || {
        id: `req-${request.id}`,
        name: request.companyName || 'Requested seller',
        country: '',
        industry: request.industryLabel || '',
        email: request.email,
      },
      kind: 'request',
      kindLabel: AUDIT_KIND_META.request.label,
      kindReason: AUDIT_KIND_META.request.reason,
      risk: { ...risk, level: request.priority === 'High' ? 'HIGH' : risk.level },
      modules,
      targetDate: toAuditDateInput(request.preferredDate) || addDaysIso(todayIso, 30),
      deadlineDate: toAuditDateInput(request.preferredDate) || '',
      plannedDate: toAuditDateInput(request.preferredDate) || '',
      auditDays: 2,
      region: regionFromCountry(request.address || supplier?.country),
      readiness: readinessForJob({ kind: 'request', todayIso, hasResponses: false }),
      source: 'request',
    })
  }

  const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  return items.sort((a, b) => {
    const r = (rank[a.risk.level] ?? 9) - (rank[b.risk.level] ?? 9)
    if (r) return r
    return String(a.targetDate).localeCompare(String(b.targetDate))
  })
}

export function explainAuditorBlock(auditor, job, capacityRow) {
  const region = auditor.region || regionFromCountry(auditor.country || auditor.city)
  if (job.region && region && job.region !== region) {
    return `Based in ${region}, job is ${job.region}`
  }
  const qual = auditorQualification(auditor, job.modules)
  if (job.modules?.length && !qual.coversAll) {
    return `Not qualified for ${qual.missing[0]}`
  }
  if (capacityRow && capacityRow.utilisation >= 100) {
    return 'No remaining annual capacity'
  }
  return ''
}

export function matchAuditorForJob(job, auditors = [], capacityRows = []) {
  const byId = new Map((capacityRows || []).map((r) => [r.id, r]))
  const ranked = (auditors || []).map((auditor) => {
    const cap = byId.get(auditor.id)
    const block = explainAuditorBlock(
      { ...auditor, region: auditor.region || cap?.region },
      job,
      cap,
    )
    return { auditor, capacity: cap, blocked: Boolean(block), reason: block }
  }).sort((a, b) => {
    if (a.blocked !== b.blocked) return a.blocked ? 1 : -1
    return (a.capacity?.utilisation ?? 0) - (b.capacity?.utilisation ?? 0)
  })
  const pick = ranked.find((r) => !r.blocked)
  return { pick: pick || null, panel: ranked }
}

export function matchWholePool(jobs = [], auditors = [], audits = [], existingProposals = {}) {
  const proposals = { ...existingProposals }
  const remaining = [...jobs].sort((a, b) => String(a.targetDate).localeCompare(String(b.targetDate)))
  for (const job of remaining) {
    if (proposals[job.id]) continue
    const cap = buildPanelCapacity({ auditors, audits, proposals })
    const { pick } = matchAuditorForJob(job, auditors, cap)
    if (!pick) continue
    proposals[job.id] = {
      auditorId: pick.auditor.id,
      auditorName: pick.auditor.name,
      auditorEmail: pick.auditor.email,
      auditDays: job.auditDays,
    }
  }
  return proposals
}

export function poolKpis(jobs = [], capacityRows = [], todayIso = utcTodayIso(), programmeYear = todayIso.slice(0, 4)) {
  const unassigned = jobs.length
  const critical = jobs.filter((j) => j.risk.level === 'CRITICAL' || j.risk.level === 'HIGH').length
  const pastTarget = jobs.filter((j) => j.targetDate && j.targetDate < todayIso).length
  const booked = (capacityRows || []).reduce((n, r) => n + (r.booked || 0), 0)
  const capacity = (capacityRows || []).reduce((n, r) => n + (r.capacity || 0), 0)
  const utilisation = capacity > 0 ? Math.round((booked / capacity) * 100) : 0
  return {
    unassigned,
    programmeYear,
    critical,
    pastTarget,
    utilisation,
  }
}
