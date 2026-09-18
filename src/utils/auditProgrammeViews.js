import { getQuestionnaire, getQuestionnaireVerdictPreset, VERDICT_PRESET_SUPPLIER_RU_SCORE } from '../data/auditManagementDetailedData'
import { AUDITORS_DIRECTORY_ALIAS } from './auditorsDirectory'
import { sellerSiteCode } from './auditorsAssignmentPool'
import { toAuditDateInput } from './companyExternalAudit'

export const PROGRAMME_VIEWS = ['calendar', 'findings', 'capa']

export function programmePath(leaf = 'calendar', params = {}) {
  const qs = new URLSearchParams(params)
  const q = qs.toString()
  const base = `${AUDITORS_DIRECTORY_ALIAS}/${leaf}`
  return q ? `${base}?${q}` : base
}

function hashCode(value) {
  const s = String(value || '')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function reportNumber(audit) {
  if (audit?.reportNo) return audit.reportNo
  const year = String(toAuditDateInput(audit?.completedDate || audit?.plannedDate) || '').slice(0, 4) || '0000'
  const n = String(100 + (hashCode(audit?.id) % 900)).padStart(3, '0')
  return `SX-AR-${year}-${n}`
}

export function auditorCode(auditor) {
  if (auditor?.auditorCode) return auditor.auditorCode
  if (auditor?.registrationNo) return auditor.registrationNo
  return `SX-A-${String(1000 + (hashCode(auditor?.id || auditor?.email) % 900)).padStart(3, '0')}`
}

export function findingCounts(findings = []) {
  const list = findings || []
  return {
    major: list.filter((f) => f.type === 'Major NC').length,
    minor: list.filter((f) => f.type === 'Minor NC').length,
    obs: list.filter((f) => f.type === 'Observation' || f.type === 'Opportunity for Improvement').length,
    open: list.filter((f) => String(f.status || 'Open') === 'Open').length,
    openMajor: list.filter((f) => f.type === 'Major NC' && String(f.status || 'Open') === 'Open').length,
  }
}

export function auditKindLabel(audit) {
  const pool = String(audit?.poolKind || '')
  if (pool === 'joined') return 'Initial'
  if (pool === 'yearly') return 'Surveillance'
  if (pool === 'reoccurred') return 'Follow-up'
  if (pool === 'request') return 'By request'
  const title = String(audit?.title || audit?.scope || '').toLowerCase()
  if (title.includes('follow') || title.includes('re-audit') || title.includes('reoccur')) return 'Follow-up'
  if (title.includes('surveillance') || title.includes('annual')) return 'Surveillance'
  if (title.includes('initial') || title.includes('stage')) return 'Initial'
  if (audit?.parentAuditId) return 'Follow-up'
  if (audit?.isAutoPlanned) return 'Surveillance'
  return 'Audit'
}

function verdictScore(verdict, supplierMode) {
  if (verdict == null || verdict === '' || verdict === 'N/A' || verdict === 'NA') return null
  if (supplierMode) {
    if (verdict === '3') return 100
    if (verdict === '2') return 50
    if (verdict === '1') return 0
    return null
  }
  if (verdict === 'Conforms' || verdict === 'Positive Finding') return 100
  if (verdict === 'Observation' || verdict === 'Opportunity for Improvement') return 80
  if (verdict === 'Minor NC') return 50
  if (verdict === 'Major NC') return 0
  return null
}

export function sectionScores(audit, language = 'en') {
  const questionnaire = getQuestionnaire(audit?.standard, audit?.auditType, language) || []
  const supplierMode = getQuestionnaireVerdictPreset(audit?.standard) === VERDICT_PRESET_SUPPLIER_RU_SCORE
  const responses = audit?.responses || {}
  return questionnaire.map((sec, si) => {
    let total = 0
    let n = 0
    ;(sec.questions || []).forEach((_, qi) => {
      const score = verdictScore(responses[`${si}-${qi}`]?.verdict, supplierMode)
      if (score == null) return
      total += score
      n += 1
    })
    const pct = n ? Math.round(total / n) : null
    return {
      name: String(sec.section || `Element ${si + 1}`).replace(/^\d+\s*[–-]\s*/, ''),
      pct,
      answered: n,
    }
  })
}

export function overallScore(audit, language = 'en') {
  const sections = sectionScores(audit, language).filter((s) => s.pct != null)
  if (!sections.length) return null
  return Math.round(sections.reduce((n, s) => n + s.pct, 0) / sections.length)
}

export function auditResult(audit, language = 'en') {
  const counts = findingCounts(audit?.findings)
  const score = overallScore(audit, language)
  const status = String(audit?.status || '')
  const notes = String(audit?.notes || audit?.scope || '').toLowerCase()
  if (status === 'Cancelled' || notes.includes('suspend')) {
    return { key: 'rejected', label: 'REJECTED', score }
  }
  if (counts.openMajor > 0 || (score != null && score < 70 && counts.major > 0)) {
    if (score != null && score < 65 && counts.openMajor >= 3) {
      return { key: 'rejected', label: 'REJECTED', score }
    }
    return { key: 'conditional', label: 'CONDITIONAL', score }
  }
  if (score != null && score >= 80 && counts.openMajor === 0) {
    return { key: 'approved', label: 'APPROVED', score }
  }
  if (score != null && score < 80) return { key: 'conditional', label: 'CONDITIONAL', score }
  return { key: 'planned', label: status === 'Completed' ? 'APPROVED' : 'PLANNED', score }
}

export function addDaysIso(iso, days) {
  const d = toAuditDateInput(iso)
  if (!d) return ''
  return new Date(Date.parse(`${d}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
}

export function buildScheduleEvents({ audits = [], suppliers = [], auditors = [], reminders = [], todayIso }) {
  const byId = new Map((suppliers || []).map((s) => [s.id, s]))
  const audById = new Map((auditors || []).map((a) => [a.id, a]))
  const events = []

  for (const audit of audits || []) {
    const supplier = byId.get(audit.supplierId)
    const auditor = audById.get(audit.auditorId) || audById.get(audit.secondaryAuditorId)
    const auditorBit = auditor?.name ? ` · ${auditor.name}` : ''
    const kind = auditKindLabel(audit)
    const name = supplier?.name || audit.title || 'Seller'
    if (audit.status === 'Completed' && toAuditDateInput(audit.completedDate || audit.plannedDate)) {
      events.push({
        id: `done:${audit.id}`,
        date: toAuditDateInput(audit.completedDate || audit.plannedDate),
        type: 'performed',
        label: name,
        detail: `${kind} performed${auditorBit}`,
        auditId: audit.id,
        supplierId: audit.supplierId,
        auditorId: audit.auditorId || '',
        statusLabel: 'PERFORMED',
      })
    }
    const planned = toAuditDateInput(audit.plannedDate)
    if (planned && audit.status !== 'Completed' && audit.status !== 'Cancelled') {
      events.push({
        id: `plan:${audit.id}`,
        date: planned,
        type: 'planned',
        label: name,
        detail: `${kind} audit planned${auditorBit}${audit.scope ? ` · ${String(audit.scope).slice(0, 48)}` : ''}`,
        auditId: audit.id,
        supplierId: audit.supplierId,
        auditorId: audit.auditorId || '',
        statusLabel: 'PLANNED',
      })
      const answered = Object.values(audit.responses || {}).some((r) => r?.verdict)
      if (!answered) {
        const qDue = addDaysIso(planned, -21) || planned
        events.push({
          id: `q:${audit.id}`,
          date: qDue,
          type: 'questionnaire',
          label: name,
          detail: `Self-assessment due back (issued ${addDaysIso(qDue, -14) || qDue})`,
          auditId: audit.id,
          supplierId: audit.supplierId,
          auditorId: audit.auditorId || '',
          statusLabel: 'QUESTIONNAIRE',
        })
      }
    }
  }

  for (const rem of reminders || []) {
    if (rem.status !== 'Open' || !toAuditDateInput(rem.dueDate)) continue
    if (rem.type === 'finding_due' || String(rem.title || '').toLowerCase().includes('capa')) {
      const audit = (audits || []).find((a) => a.id === rem.auditId)
      const supplier = byId.get(audit?.supplierId)
      events.push({
        id: `capa:${rem.id}`,
        date: toAuditDateInput(rem.dueDate),
        type: 'capa',
        label: supplier?.name || rem.title,
        detail: rem.title,
        auditId: rem.auditId,
        findingId: rem.findingId,
        supplierId: audit?.supplierId,
        auditorId: audit?.auditorId || '',
        statusLabel: 'CAPA',
      })
    }
  }

  return events.sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

export function nextCommitments(events = [], todayIso, limit = 8) {
  return (events || [])
    .filter((e) => e.date >= todayIso && e.type !== 'performed')
    .slice(0, limit)
}

export function buildFindingsReports({ audits = [], suppliers = [], auditors = [], language = 'en' } = {}) {
  const supById = new Map((suppliers || []).map((s) => [s.id, s]))
  const audById = new Map((auditors || []).map((a) => [a.id, a]))
  return (audits || [])
    .filter((a) => a.status === 'Completed' || (a.findings || []).length > 0)
    .map((audit) => {
      const supplier = supById.get(audit.supplierId)
      const auditor = audById.get(audit.auditorId)
      const counts = findingCounts(audit.findings)
      const result = auditResult(audit, language)
      return {
        id: audit.id,
        reportNo: reportNumber(audit),
        supplier,
        supplierName: supplier?.name || 'Unnamed seller',
        site: [supplier?.country, supplier?.city].filter(Boolean).join(' · '),
        date: toAuditDateInput(audit.completedDate || audit.plannedDate),
        kind: auditKindLabel(audit),
        auditor,
        auditorLabel: auditor ? `${auditor.name} (${auditorCode(auditor)})` : '—',
        score: result.score,
        counts,
        result,
        capaOpen: counts.open,
        audit,
      }
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

export function findingsKpis(reports = [], year) {
  const y = String(year || new Date().getUTCFullYear())
  const scored = reports.filter((r) => r.score != null)
  const avg = scored.length
    ? Math.round(scored.reduce((n, r) => n + r.score, 0) / scored.length)
    : 0
  const openCapa = reports.reduce((n, r) => n + (r.capaOpen || 0), 0)
  const majorOpen = reports.reduce((n, r) => n + (r.counts?.openMajor || 0), 0)
  const rejected = reports.filter((r) => r.result?.key === 'rejected').length
  const thisYear = reports.filter((r) => String(r.date || '').startsWith(y))
  return {
    reports: reports.length,
    avg,
    year: y,
    yearAvg: thisYear.filter((r) => r.score != null).length
      ? Math.round(thisYear.filter((r) => r.score != null).reduce((n, r) => n + r.score, 0) / thisYear.filter((r) => r.score != null).length)
      : avg,
    openCapa,
    majorOpen,
    rejected,
  }
}

export function buildCapaRows({ audits = [], suppliers = [], auditors = [], todayIso } = {}) {
  const supById = new Map((suppliers || []).map((s) => [s.id, s]))
  const audById = new Map((auditors || []).map((a) => [a.id, a]))
  const rows = []
  for (const audit of audits || []) {
    const supplier = supById.get(audit.supplierId)
    const auditor = audById.get(audit.auditorId)
    ;(audit.findings || []).forEach((finding, index) => {
      const due = toAuditDateInput(finding.dueDate)
      const open = String(finding.status || 'Open') === 'Open'
      const daysLate = due && todayIso && due < todayIso ? Math.round((Date.parse(`${todayIso}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / 86400000) : 0
      rows.push({
        id: finding.id || `${audit.id}-${index}`,
        finding,
        findingNo: finding.code || `F-${String(index + 1).padStart(2, '0')}`,
        type: finding.type || 'Minor NC',
        isMajor: finding.type === 'Major NC',
        open,
        overdue: open && daysLate > 0,
        daysLate,
        supplier,
        supplierId: audit.supplierId,
        supplierName: supplier?.name || 'Unnamed seller',
        supplierCode: sellerSiteCode(supplier || { id: audit.supplierId }),
        clause: finding.reference || finding.section || audit.standard || '—',
        action: finding.action || finding.responsibleParty || finding.description || '',
        description: finding.description || '',
        due,
        auditId: audit.id,
        auditor,
        auditorEmail: auditor?.email || '',
        escalation: open
          ? `Escalate to head of supplier quality${auditor ? ` · Auditor ${auditor.name} (${auditorCode(auditor)})` : ''}`
          : 'Closed',
      })
    })
  }
  return rows.sort((a, b) => {
    if (a.open !== b.open) return a.open ? -1 : 1
    if (a.isMajor !== b.isMajor) return a.isMajor ? -1 : 1
    return (b.daysLate || 0) - (a.daysLate || 0)
  })
}

export function capaKpis(rows = []) {
  const open = rows.filter((r) => r.open)
  const overdue = open.filter((r) => r.overdue)
  const majorLate = overdue.filter((r) => r.isMajor)
  const suppliers = new Set(open.map((r) => r.supplierId).filter(Boolean))
  const allSuppliers = new Set(rows.map((r) => r.supplierId).filter(Boolean))
  return {
    open: open.length,
    raised: rows.length,
    overdue: overdue.length,
    majorLate: majorLate.length,
    suppliersAffected: suppliers.size,
    suppliersTotal: allSuppliers.size,
  }
}

export function filterCapaRows(rows = [], filter = 'open', myEmail = '') {
  const mail = String(myEmail || '').toLowerCase()
  if (filter === 'all') return rows
  if (filter === 'open') return rows.filter((r) => r.open)
  if (filter === 'overdue') return rows.filter((r) => r.overdue)
  if (filter === 'major') return rows.filter((r) => r.isMajor && r.open)
  if (filter === 'mine') return rows.filter((r) => r.open && String(r.auditorEmail || '').toLowerCase() === mail)
  return rows
}

export function yearComparison(supplierId, audits = [], language = 'en') {
  const completed = (audits || [])
    .filter((a) => a.supplierId === supplierId && a.status === 'Completed')
    .sort((a, b) => String(a.completedDate || a.plannedDate).localeCompare(String(b.completedDate || b.plannedDate)))
  const byYear = new Map()
  for (const audit of completed) {
    const year = String(toAuditDateInput(audit.completedDate || audit.plannedDate) || '').slice(0, 4)
    if (!year) continue
    byYear.set(year, audit)
  }
  const years = [...byYear.keys()].sort()
  const latest = years.slice(-2)
  const elements = new Map()
  latest.forEach((year) => {
    sectionScores(byYear.get(year), language).forEach((sec) => {
      if (!elements.has(sec.name)) elements.set(sec.name, { name: sec.name, years: {} })
      elements.get(sec.name).years[year] = sec.pct
    })
  })
  const rows = [...elements.values()].map((row) => {
    const [y1, y2] = latest
    const a = row.years[y1]
    const b = row.years[y2]
    const delta = a != null && b != null ? b - a : null
    return { ...row, delta }
  })
  const overall = latest.map((year) => ({ year, score: overallScore(byYear.get(year), language) }))
  return { years: latest, rows, overall, improved: rows.filter((r) => (r.delta || 0) > 0).length, regressed: rows.filter((r) => (r.delta || 0) < 0).length }
}

export function sellerIsSuspended(reports = []) {
  return reports.some((r) => r.result?.key === 'rejected')
}
