import { sellerSiteCode } from './auditorsAssignmentPool'
import { formatAuditDateLabel, toAuditDateInput } from './companyExternalAudit'
import { sellerCompanyName } from './auditSellerLabel'
import {
  addDaysIso,
  auditKindLabel,
  auditResult,
  auditorCode,
  findingCounts,
  overallScore,
  reportNumber,
  sectionScores,
  yearComparison,
} from './auditProgrammeViews'

export const SUPPLIER_HUB_VIEWS = ['register', 'self', 'certs', 'records']

export const Q_ISSUE_DAYS_BEFORE = 30
export const Q_DUE_DAYS_BEFORE = 10
export const CERT_VALID_MONTHS = 12

function hashCode(value) {
  const s = String(value || '')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function certificateNumber(audit) {
  if (audit?.certificateNo) return audit.certificateNo
  const year = String(toAuditDateInput(audit?.completedDate || audit?.plannedDate) || '').slice(0, 4) || '0000'
  const n = String(100 + (hashCode(audit?.id) % 900)).padStart(3, '0')
  return `SX-CERT-${year}-${n}`
}

export function questionnaireCode(audit) {
  if (audit?.questionnaireCode) return audit.questionnaireCode
  return `SQ-Q${String(10 + (hashCode(audit?.id) % 90)).padStart(2, '0')}`
}

export function addMonthsIso(iso, months) {
  const d = toAuditDateInput(iso)
  if (!d) return ''
  const [y, m, day] = d.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1 + months, day || 1))
  return dt.toISOString().slice(0, 10)
}

export function questionnaireWindows(audit) {
  const planned = toAuditDateInput(audit?.plannedDate || audit?.completedDate)
  return {
    issueBy: planned ? addDaysIso(planned, -Q_ISSUE_DAYS_BEFORE) : '',
    dueBack: planned ? addDaysIso(planned, -Q_DUE_DAYS_BEFORE) : '',
    planned,
  }
}

export function selfAssessmentReturned(audit) {
  return Object.values(audit?.responses || {}).some((r) => r?.verdict != null && r.verdict !== '')
}

export function toVerifyCount(audit) {
  const responses = Object.values(audit?.responses || {})
  if (!responses.length) return 0
  return responses.filter((r) => {
    const v = String(r?.verdict || '')
    return v === '1' || v === '2' || v === 'Minor NC' || v === 'Major NC' || v === 'Observation'
  }).length
}

export function selfAssessmentState(audit, todayIso) {
  const windows = questionnaireWindows(audit)
  const returned = selfAssessmentReturned(audit)
  const score = overallScore(audit)
  if (returned) {
    return { key: 'returned', label: 'RETURNED', score, toVerify: toVerifyCount(audit), ...windows }
  }
  if (windows.dueBack && todayIso && windows.dueBack < todayIso) {
    return { key: 'overdue', label: 'OVERDUE', score: null, toVerify: 0, ...windows }
  }
  return { key: 'issued', label: 'ISSUED', score: null, toVerify: 0, ...windows }
}

export function pipelineReason(audit) {
  const kind = auditKindLabel(audit)
  if (kind === 'Initial') return { id: 'new', label: 'NEW SUPPLIER', auditType: 'Initial audit' }
  if (kind === 'Follow-up') return { id: 'reaudit', label: 'RE-AUDIT', auditType: 'Follow-up audit' }
  if (kind === 'Surveillance') return { id: 'annual', label: 'ANNUAL', auditType: 'Surveillance audit' }
  if (kind === 'By request') return { id: 'annual', label: 'ANNUAL', auditType: 'Re-qualification audit' }
  return { id: 'annual', label: 'ANNUAL', auditType: `${kind} audit` }
}

export function registerStatus(supplier, audits = [], todayIso) {
  const sellerAudits = (audits || []).filter((a) => a.supplierId === supplier?.id)
  const completed = [...sellerAudits]
    .filter((a) => a.status === 'Completed')
    .sort((a, b) => String(b.completedDate || b.plannedDate).localeCompare(String(a.completedDate || a.plannedDate)))
  const latest = completed[0]
  const planned = sellerAudits.find((a) => a.status !== 'Completed' && a.status !== 'Cancelled' && toAuditDateInput(a.plannedDate))
  const qState = planned ? selfAssessmentState(planned, todayIso) : latest ? selfAssessmentState(latest, todayIso) : null
  const result = latest ? auditResult(latest) : null

  if (result?.key === 'rejected') return { key: 'action', label: 'NEEDS ACTION', result }
  if (result?.key === 'conditional') return { key: 'conditional', label: 'CONDITIONAL', result }
  if (planned) return { key: 'scheduled', label: 'AUDIT SCHEDULED', result }
  if (result?.key === 'approved') return { key: 'approved', label: 'APPROVED', result }
  return { key: 'action', label: 'NEEDS ACTION', result }
}

export function approvalUntil(supplier, audits = []) {
  const latest = [...(audits || [])]
    .filter((a) => a.supplierId === supplier?.id && a.status === 'Completed')
    .sort((a, b) => String(b.completedDate || b.plannedDate).localeCompare(String(a.completedDate || a.plannedDate)))[0]
  if (!latest) return ''
  if (latest.nextAuditDate) return toAuditDateInput(latest.nextAuditDate)
  const done = toAuditDateInput(latest.completedDate || latest.plannedDate)
  return addMonthsIso(done, CERT_VALID_MONTHS)
}

export function processLabel(supplier) {
  const notes = String(supplier?.notes || '').trim()
  if (notes && notes.length < 80 && !/^procurement/i.test(notes)) return notes
  return supplier?.industry || '—'
}

export function buildRegisterRows({ suppliers = [], audits = [], todayIso, language = 'en' } = {}) {
  return (suppliers || []).map((supplier) => {
    const sellerAudits = (audits || []).filter((a) => a.supplierId === supplier.id)
    const latest = [...sellerAudits]
      .filter((a) => a.status === 'Completed')
      .sort((a, b) => String(b.completedDate || b.plannedDate).localeCompare(String(a.completedDate || a.plannedDate)))[0]
    const planned = sellerAudits
      .filter((a) => a.status !== 'Completed' && a.status !== 'Cancelled')
      .sort((a, b) => String(a.plannedDate).localeCompare(String(b.plannedDate)))[0]
    const qAudit = planned || latest
    const qState = qAudit ? selfAssessmentState(qAudit, todayIso) : null
    const status = registerStatus(supplier, audits, todayIso)
    const until = approvalUntil(supplier, audits)
    const untilIso = until
    const expiring = untilIso && todayIso && untilIso <= addMonthsIso(todayIso, 3)
    return {
      id: supplier.id,
      supplier,
      code: sellerSiteCode(supplier),
      name: sellerCompanyName(supplier),
      email: supplier.email || '',
      site: [supplier.country, supplier.city].filter(Boolean).join(' · '),
      industry: supplier.industry || '—',
      process: processLabel(supplier),
      registeredAt: toAuditDateInput(supplier.registeredAt),
      status,
      selfAssessment: qState,
      selfLabel: qState?.key === 'returned'
        ? `Returned ${formatAuditDateLabel(qState.dueBack) || ''}`.trim()
        : qState?.key === 'overdue'
          ? `Overdue · due ${formatAuditDateLabel(qState.dueBack)}`
          : qState
            ? `Issued${qState.dueBack ? ` · due ${formatAuditDateLabel(qState.dueBack)}` : ''}`
            : '—',
      score: status.result?.score ?? qState?.score ?? null,
      approvalUntil: untilIso,
      expiring,
      latest,
      planned,
    }
  }).sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export function filterRegisterRows(rows = [], filter = 'all') {
  if (filter === 'approved') return rows.filter((r) => r.status.key === 'approved')
  if (filter === 'conditional') return rows.filter((r) => r.status.key === 'conditional')
  if (filter === 'action') return rows.filter((r) => r.status.key === 'action')
  return rows
}

export function searchRegisterRows(rows = [], query = '') {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return rows
  return rows.filter((r) =>
    [r.name, r.code, r.site, r.industry, r.process].join(' ').toLowerCase().includes(q),
  )
}

export function buildSelfAssessmentPipeline({ audits = [], suppliers = [], todayIso, language = 'en' } = {}) {
  const byId = new Map((suppliers || []).map((s) => [s.id, s]))
  return (audits || [])
    .filter((a) => a.status !== 'Cancelled' && toAuditDateInput(a.plannedDate || a.completedDate))
    .map((audit) => {
      const supplier = byId.get(audit.supplierId)
      const reason = pipelineReason(audit)
      const state = selfAssessmentState(audit, todayIso)
      const windows = questionnaireWindows(audit)
      return {
        id: audit.id,
        audit,
        supplier,
        supplierName: supplier ? sellerCompanyName(supplier) : (audit.title || 'Unnamed seller'),
        code: sellerSiteCode(supplier || { id: audit.supplierId }),
        site: [supplier?.country, supplier?.city].filter(Boolean).join(' · '),
        reason,
        overdue: state.key === 'overdue',
        auditType: reason.auditType,
        plannedDate: windows.planned,
        previousDate: toAuditDateInput(audit.previousAuditDate || audit.completedDate),
        issueBy: windows.issueBy,
        dueBack: windows.dueBack,
        state,
        modules: String(audit.scope || audit.standard || 'Industrial').split(/[,;|/]/).filter(Boolean).slice(0, 2).join(' · ') || audit.standard || '—',
        questionnaire: state.key === 'returned'
          ? `Returned · ${state.score != null ? `${state.score}%` : 'scored'}`
          : state.key === 'overdue'
            ? `Overdue · due ${formatAuditDateLabel(windows.dueBack)}`
            : `Issued · due ${formatAuditDateLabel(windows.dueBack)}`,
      }
    })
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || String(a.plannedDate).localeCompare(String(b.plannedDate)))
}

export function filterPipeline(rows = [], filter = 'all') {
  if (filter === 'overdue') return rows.filter((r) => r.overdue || r.state.key === 'overdue')
  if (filter === 'new') return rows.filter((r) => r.reason.id === 'new')
  if (filter === 'reaudit') return rows.filter((r) => r.reason.id === 'reaudit')
  if (filter === 'annual') return rows.filter((r) => r.reason.id === 'annual')
  return rows
}

export function pipelineCounts(rows = []) {
  return {
    all: rows.length,
    overdue: rows.filter((r) => r.overdue || r.state.key === 'overdue').length,
    new: rows.filter((r) => r.reason.id === 'new').length,
    reaudit: rows.filter((r) => r.reason.id === 'reaudit').length,
    annual: rows.filter((r) => r.reason.id === 'annual').length,
  }
}

export function buildSelfAssessmentTracker({ suppliers = [], audits = [], todayIso, language = 'en' } = {}) {
  const bySupplier = new Map()
  for (const audit of audits || []) {
    if (!audit.supplierId) continue
    const prev = bySupplier.get(audit.supplierId)
    const date = toAuditDateInput(audit.plannedDate || audit.completedDate)
    if (!date) continue
    if (!prev || date > toAuditDateInput(prev.plannedDate || prev.completedDate)) {
      bySupplier.set(audit.supplierId, audit)
    }
  }
  return (suppliers || []).map((supplier) => {
    const audit = bySupplier.get(supplier.id)
    const state = audit ? selfAssessmentState(audit, todayIso) : null
    const windows = audit ? questionnaireWindows(audit) : {}
    return {
      id: supplier.id,
      supplier,
      audit,
      code: sellerSiteCode(supplier),
      name: sellerCompanyName(supplier),
      site: [supplier.country, supplier.city].filter(Boolean).join(' · '),
      issued: windows.issueBy || '',
      dueBack: windows.dueBack || '',
      state,
      score: state?.score ?? null,
      toVerify: state?.key === 'returned' ? state.toVerify : null,
    }
  }).filter((r) => r.audit)
    .sort((a, b) => String(a.dueBack).localeCompare(String(b.dueBack)))
}

export function trackerKpis(rows = []) {
  const overdue = rows.filter((r) => r.state?.key === 'overdue').length
  const returned = rows.filter((r) => r.state?.key === 'returned').length
  const issued = rows.filter((r) => r.state?.key === 'issued').length
  return { out: issued + overdue, overdue, returned, issued }
}

export function buildStrefexCertificates({ suppliers = [], audits = [], todayIso, language = 'en' } = {}) {
  const byId = new Map((suppliers || []).map((s) => [s.id, s]))
  return (audits || [])
    .filter((a) => a.status === 'Completed')
    .map((audit) => {
      const result = auditResult(audit, language)
      return { audit, result }
    })
    .filter(({ result }) => result.key === 'approved' || result.key === 'conditional')
    .map(({ audit, result }) => {
      const supplier = byId.get(audit.supplierId)
      const issued = toAuditDateInput(audit.completedDate || audit.plannedDate)
      const validTo = toAuditDateInput(audit.nextAuditDate) || addMonthsIso(issued, CERT_VALID_MONTHS)
      const expiring = validTo && todayIso && validTo <= addMonthsIso(todayIso, 3)
      const expired = validTo && todayIso && validTo < todayIso
      return {
        id: audit.id,
        audit,
        supplier,
        certNo: certificateNumber(audit),
        supplierName: supplier ? sellerCompanyName(supplier) : audit.title,
        scope: audit.scope || `${supplier?.industry || 'Supplier'} · ${supplier?.city || supplier?.country || 'site'}`,
        issued,
        validTo,
        state: expired ? 'expired' : expiring ? 'expiring' : 'valid',
        result,
        score: result.score,
      }
    })
    .sort((a, b) => String(b.issued).localeCompare(String(a.issued)))
}

export function thirdPartyCertificates(suppliers = [], todayIso) {
  const rows = []
  for (const supplier of suppliers || []) {
    const certs = Array.isArray(supplier.certifications) ? supplier.certifications : []
    certs.forEach((c, i) => {
      const cert = typeof c === 'string' ? { name: c } : c
      const validTo = toAuditDateInput(cert.validUntil || cert.to)
      const expired = validTo && todayIso && validTo < todayIso
      rows.push({
        id: `${supplier.id}-tp-${i}`,
        supplier,
        name: cert.name || cert.standard || 'Certificate',
        issuer: cert.issuer || cert.body || 'Third party',
        validTo,
        state: expired ? 'expired' : 'onfile',
      })
    })
  }
  return rows
}

export function elementVerdict(pct) {
  if (pct == null) return { key: 'na', label: '—' }
  if (pct >= 75) return { key: 'improve', label: 'IMPROVE' }
  return { key: 'nc', label: 'NOT CONFORM' }
}

export function buildCompanyScorecards({ suppliers = [], audits = [], auditors = [], language = 'en' } = {}) {
  const audById = new Map((auditors || []).map((a) => [a.id, a]))
  return (suppliers || []).map((supplier) => {
    const sellerAudits = (audits || []).filter((a) => a.supplierId === supplier.id)
    const completed = sellerAudits.filter((a) => a.status === 'Completed')
    const latest = [...completed].sort((a, b) =>
      String(b.completedDate || b.plannedDate).localeCompare(String(a.completedDate || a.plannedDate)),
    )[0]
    const comparison = yearComparison(supplier.id, sellerAudits, language)
    const result = latest ? auditResult(latest, language) : null
    const auditor = latest ? audById.get(latest.auditorId) : null
    return {
      id: supplier.id,
      supplier,
      code: sellerSiteCode(supplier),
      name: sellerCompanyName(supplier),
      site: [supplier.country, supplier.city].filter(Boolean).join(' · '),
      latest,
      result,
      rating: result?.label || '—',
      score: result?.score ?? null,
      comparison,
      auditor,
      auditorLabel: auditor ? `${auditor.name} (${auditorCode(auditor)})` : '—',
      reportNo: latest ? reportNumber(latest) : '',
    }
  }).filter((r) => r.latest)
    .sort((a, b) => String(b.latest.completedDate || '').localeCompare(String(a.latest.completedDate || '')))
}

export function closingReportModel({ audit, supplier, auditor, language = 'en' } = {}) {
  const scores = sectionScores(audit, language).map((sec) => ({ ...sec, verdict: elementVerdict(sec.pct) }))
  const result = auditResult(audit, language)
  const counts = findingCounts(audit?.findings)
  const capaDue = [...(audit?.findings || [])]
    .map((f) => toAuditDateInput(f.dueDate))
    .filter(Boolean)
    .sort()[0]
  return {
    reportNo: reportNumber(audit),
    certNo: certificateNumber(audit),
    questionnaireCode: questionnaireCode(audit),
    kind: auditKindLabel(audit),
    result,
    counts,
    scores,
    findings: (audit?.findings || []).map((f, i) => ({
      ...f,
      ref: f.code || `F-${String(i + 1).padStart(2, '0')}`,
      grade: f.type === 'Major NC' ? 'MAJOR' : f.type === 'Minor NC' ? 'MINOR' : String(f.type || 'OBS').toUpperCase(),
    })),
    capaDue,
    supplier,
    auditor,
    auditorLabel: auditor ? `${auditor.name} (${auditorCode(auditor)})` : '—',
    site: [supplier?.country, supplier?.city].filter(Boolean).join(' · '),
    issued: toAuditDateInput(audit?.completedDate || audit?.plannedDate),
    validTo: toAuditDateInput(audit?.nextAuditDate) || addMonthsIso(toAuditDateInput(audit?.completedDate || audit?.plannedDate), CERT_VALID_MONTHS),
    signatories: [
      { role: 'Lead auditor', name: auditor ? `${auditor.name} (${auditorCode(auditor)})` : '—' },
      { role: 'Supplier representative', name: supplier?.contact || supplier?.name || '—' },
      { role: 'Head of Supplier Quality', name: 'STREFEX' },
    ],
  }
}

export function filterRegisterByQueryAndStatus(rows, query, filter) {
  return filterRegisterRows(searchRegisterRows(rows, query), filter)
}
