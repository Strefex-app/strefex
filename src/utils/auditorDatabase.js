import { uniqueAuditStandards, standardsReferredByAuditor } from './auditStandardsCatalogue'
import { auditorCode } from './auditProgrammeViews'
import { toAuditDateInput } from './companyExternalAudit'

const FINDING_SCORE = {
  'Major NC': 0,
  'Minor NC': 5,
  Observation: 8,
  'Opportunity for Improvement': 8,
  Conform: 10,
}

export function programmeYear(now = new Date()) {
  return String(now.getUTCFullYear())
}

export function auditorPanelStatus(auditor) {
  const explicit = String(auditor?.panelStatus || auditor?.status || '').trim().toUpperCase()
  if (explicit === 'QUALIFIED' || explicit === 'PROVISIONAL' || explicit === 'EXPERT') return explicit
  const role = String(auditor?.role || '').toLowerCase()
  if (role.includes('expert')) return 'EXPERT'
  const hay = [
    auditor?.notes,
    ...(auditor?.certifications || []),
    ...(auditor?.qualifiedModules || []),
  ].join(' ').toLowerCase()
  if (hay.includes('provisional')) return 'PROVISIONAL'
  return 'QUALIFIED'
}

export function auditorRoleLine(auditor) {
  const role = String(auditor?.role || 'Auditor').trim()
  const extra = []
  const hay = `${role} ${auditor?.notes || ''} ${(auditor?.certifications || []).join(' ')}`.toLowerCase()
  if (/medical|iso 13485|mdr/.test(hay) && !/medical/.test(role.toLowerCase())) extra.push('medical')
  if (/weld|special process|nadcap|iso 3834/.test(hay) && !/weld|special/.test(role.toLowerCase())) {
    extra.push('welding & special process')
  }
  return extra.length ? `${role} · ${extra.join(' · ')}` : role
}

export function auditorLanguages(auditor) {
  const raw = auditor?.languages || auditor?.langs
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[,;/|]+/).map((x) => x.trim()).filter(Boolean)
  }
  const notes = String(auditor?.notes || '')
  const m = notes.match(/\b((?:[A-Z]{2})(?:\s*[,/]\s*[A-Z]{2})+)\b/)
  if (m) return m[1].split(/[,/]/).map((x) => x.trim()).filter(Boolean)
  return []
}

export function auditorBaseLabel(auditor) {
  const city = String(auditor?.city || '').trim()
  const country = String(auditor?.country || '').trim()
  if (city && country) return `${city}, ${country}`
  return city || country || '—'
}

export function auditorSinceLabel(auditor) {
  const d = toAuditDateInput(auditor?.since || auditor?.registeredAt)
  return d ? d.slice(0, 7) : ''
}

function isProvisionalLabel(label) {
  return /provisional/i.test(String(label || ''))
}

function moduleDate(auditor, file) {
  return toAuditDateInput(file?.uploadedAt || auditor?.registeredAt) || ''
}

export function auditorModules(auditor, catalogue = uniqueAuditStandards()) {
  const files = auditor?.certificationFiles || []
  const fromFiles = files.map((file) => ({
    id: file.id || file.fileName || file.name,
    label: String(file.name || file.fileName || 'Certificate').trim(),
    status: isProvisionalLabel(file.name) ? 'Provisional' : 'Qualified',
    date: moduleDate(auditor, file),
  }))
  const titles = [
    ...(auditor?.qualifiedModules || []),
    ...(auditor?.certifications || []),
  ].map((x) => String(typeof x === 'string' ? x : x?.name || '').trim()).filter(Boolean)

  const mapped = standardsReferredByAuditor(auditor, catalogue).map((row) => {
    const title = titles.find((t) => t.toLowerCase().includes(String(row.standard).toLowerCase().replace(/:\d{4}.*$/, '')) || String(row.standard).toLowerCase().includes(t.toLowerCase()))
    return {
      id: row.standard,
      label: row.standard,
      status: isProvisionalLabel(title) ? 'Provisional' : 'Qualified',
      date: moduleDate(auditor),
    }
  })

  const leftovers = titles.filter((title) => {
    const n = title.toLowerCase()
    return !mapped.some((m) => n.includes(String(m.label).toLowerCase().replace(/:\d{4}.*$/, '')) || String(m.label).toLowerCase().includes(n))
      && !fromFiles.some((m) => m.label.toLowerCase() === n)
  }).map((label) => ({
    id: label,
    label,
    status: isProvisionalLabel(label) ? 'Provisional' : 'Qualified',
    date: moduleDate(auditor),
  }))

  const byId = new Map()
  ;[...fromFiles, ...mapped, ...leftovers].forEach((row) => {
    if (!row.label) return
    const prev = byId.get(row.id)
    if (!prev) byId.set(row.id, row)
    else if (prev.status === 'Qualified' && row.status === 'Provisional') byId.set(row.id, row)
  })
  return [...byId.values()]
}

export function auditorImpartiality(auditor) {
  const text = String(auditor?.impartiality || '').trim()
  if (text) return text
  const notes = String(auditor?.notes || '')
  const idx = notes.toLowerCase().indexOf('impartial')
  if (idx >= 0) return notes.slice(idx).trim()
  return 'None declared.'
}

function auditTouchesAuditor(audit, auditor) {
  if (!audit || !auditor) return false
  if (audit.auditorId === auditor.id || audit.secondaryAuditorId === auditor.id) return true
  const email = String(auditor.email || '').toLowerCase()
  if (!email) return false
  return String(audit.auditorEmail || '').toLowerCase() === email
}

export function auditorYearAudits(auditor, audits = [], year = programmeYear()) {
  return (audits || []).filter((a) => {
    if (!auditTouchesAuditor(a, auditor)) return false
    const when = toAuditDateInput(a.plannedDate || a.completedDate) || ''
    if (when && !when.startsWith(year)) return false
    if (String(a.status || '') === 'Cancelled') return false
    return true
  })
}

export function auditorBookedDays(auditor, audits = [], year = programmeYear()) {
  return auditorYearAudits(auditor, audits, year).reduce((n, a) => n + (Number(a.auditDays) || 1), 0)
}

function auditMeanScore(audit) {
  const findings = audit?.findings || []
  if (!findings.length) return null
  const scores = findings.map((f) => FINDING_SCORE[f.type]).filter((n) => Number.isFinite(n))
  if (!scores.length) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

export function auditorSpread(auditor, audits = [], year = programmeYear()) {
  if (auditor?.spread != null && auditor.spread !== '') {
    const n = Number(auditor.spread)
    return Number.isFinite(n) ? n : null
  }
  const scores = auditorYearAudits(auditor, audits, year)
    .filter((a) => a.status === 'Completed')
    .map(auditMeanScore)
    .filter((n) => n != null)
  if (scores.length < 2) return null
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((s, n) => s + (n - mean) ** 2, 0) / scores.length
  return Math.round(Math.sqrt(variance) * 10) / 10
}

export function auditorCpd(auditor) {
  const status = auditorPanelStatus(auditor)
  const target = Number(auditor?.cpdTarget) || (status === 'EXPERT' ? 20 : 40)
  const raw = auditor?.cpdHours
  if (raw == null || raw === '') return { hours: null, target, below: false }
  const hours = Number(raw)
  if (!Number.isFinite(hours)) return { hours: null, target, below: false }
  return { hours, target, below: hours < target }
}

export function formatSpread(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const n = Number(value)
  const abs = Math.abs(n).toFixed(1).replace(/\.0$/, '.0')
  return `±${abs}`
}

export function buildAuditorDatabaseRows({ auditors = [], audits = [], catalogue, year = programmeYear() } = {}) {
  const cat = catalogue || uniqueAuditStandards()
  return (auditors || []).map((auditor) => {
    const modules = auditorModules(auditor, cat)
    const status = auditorPanelStatus(auditor)
    const cpd = auditorCpd(auditor)
    const langs = auditorLanguages(auditor)
    const since = auditorSinceLabel(auditor)
    return {
      id: auditor.id,
      auditor,
      name: auditor.name || auditor.email || 'Auditor',
      code: auditorCode(auditor),
      roleLine: auditorRoleLine(auditor),
      base: auditorBaseLabel(auditor),
      languages: langs,
      languagesLine: langs.length
        ? `${langs.join(', ')}${since ? ` · since ${since}` : ''}`
        : (since ? `since ${since}` : '—'),
      status,
      bookedDays: auditorBookedDays(auditor, audits, year),
      spread: auditorSpread(auditor, audits, year),
      calibrated: toAuditDateInput(auditor.calibratedAt || auditor.registeredAt) || '—',
      cpd,
      travelMedical: toAuditDateInput(auditor.travelMedicalUntil) || '—',
      modules,
      qualifiedModules: modules.filter((m) => m.status === 'Qualified').length,
      provisionalModules: modules.filter((m) => m.status === 'Provisional').length,
      impartiality: auditorImpartiality(auditor),
    }
  })
}

export function countYearAuditsForRows(rows, audits = [], year = programmeYear()) {
  const ids = new Set()
  for (const row of rows) {
    auditorYearAudits(row.auditor, audits, year).forEach((a) => { if (a?.id) ids.add(a.id) })
  }
  return ids.size
}

export function auditorDatabaseKpis(rows = [], audits = [], year = programmeYear()) {
  const qualified = rows.filter((r) => r.status === 'QUALIFIED').length
  const experts = rows.filter((r) => r.status === 'EXPERT').length
  const modules = rows.reduce((n, r) => n + r.modules.length, 0)
  const provisional = rows.reduce((n, r) => n + r.provisionalModules, 0)
  const booked = rows.reduce((n, r) => n + r.bookedDays, 0)
  const cpdBelow = rows.filter((r) => r.cpd.below).length
  const latestCalib = rows
    .map((r) => r.calibrated)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .at(-1) || '—'
  const minTarget = rows.some((r) => r.status === 'EXPERT') ? 20 : 40
  return {
    panel: rows.length,
    qualified,
    experts,
    modules,
    provisional,
    booked,
    year,
    yearAudits: countYearAuditsForRows(rows, audits, year),
    cpdBelow,
    latestCalib,
    minTarget,
  }
}
