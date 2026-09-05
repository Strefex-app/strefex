import { IATF_CORE_TOOL_MAP } from '../data/iatfControlCatalog'
import {
  certStandardDefsForIndustry,
  getIndustryQualityProfile,
} from '../data/industryQualityProfiles'

export function isCertOnFile(cert) {
  if (!cert || cert.status === 'obsolete') return false
  const number = String(cert.number || '').trim()
  const cb = String(cert.certifyingBody || '').trim()
  return Boolean(number && cb)
}

export function isCertValid(cert, now = Date.now()) {
  if (!isCertOnFile(cert)) return false
  if (!cert.expiresAt) return false
  const exp = new Date(cert.expiresAt).getTime()
  if (Number.isNaN(exp)) return false
  return exp >= now
}

export function liveStandardStatus(certificates = [], standardId, now = Date.now()) {
  const rows = (certificates || []).filter((c) => c.standard === standardId)
  const valid = rows.find((c) => isCertValid(c, now))
  if (valid) {
    return {
      status: 'valid',
      label: 'On file — valid',
      cert: valid,
    }
  }
  const expired = rows.find((c) => isCertOnFile(c) && !isCertValid(c, now))
  if (expired) {
    return {
      status: 'expired',
      label: 'On file — expired',
      cert: expired,
    }
  }
  if (rows.some(isCertOnFile)) {
    return { status: 'incomplete', label: 'Incomplete (missing expiry)', cert: rows[0] }
  }
  return { status: 'not_on_file', label: 'Not on file', cert: null }
}

function toolScore(records, toolIds) {
  const hits = (records || []).filter((r) => toolIds.includes(r.toolId))
  if (!hits.length) return 0
  if (hits.some((r) => r.status === 'verified' || r.status === 'closed')) return 80
  if (hits.some((r) => r.status === 'in_progress')) return 50
  return 25
}

export function gaugeCalibrationStatus(gauge, now = Date.now()) {
  if (!gauge) return 'ok'
  if (gauge.status === 'out_of_service') return 'out_of_service'
  if (!gauge.calibrationDue) return gauge.status || 'ok'
  const due = new Date(gauge.calibrationDue).getTime()
  if (Number.isNaN(due)) return gauge.status || 'ok'
  const days = (due - now) / (24 * 60 * 60 * 1000)
  if (days < 0) return 'overdue'
  if (days <= 14) return 'due'
  return 'ok'
}

export function lotReleaseBlocked(lot = {}, gauges = [], now = Date.now()) {
  const status = lot.status
  if (status !== 'released' && status !== 'shipped') return false
  if (!lot.partId) return false
  return (gauges || []).some((gauge) => (
    gauge.partId === lot.partId && gaugeCalibrationStatus(gauge, now) === 'overdue'
  ))
}

export function coreToolsMaturity(qeRecords = [], parts = [], ppapPackages = []) {
  const ppapApproved = (parts || []).some((p) => p.ppapStatus === 'approved')
    || (ppapPackages || []).some((pkg) => pkg.status === 'approved')
  return [
    { id: 'APQP', name: 'APQP', maturity: toolScore(qeRecords, IATF_CORE_TOOL_MAP.APQP) },
    {
      id: 'PPAP',
      name: 'PPAP',
      maturity: ppapApproved ? 80 : toolScore(qeRecords, IATF_CORE_TOOL_MAP.PPAP),
    },
    { id: 'FMEA', name: 'FMEA', maturity: toolScore(qeRecords, IATF_CORE_TOOL_MAP.FMEA) },
    { id: 'MSA', name: 'MSA', maturity: toolScore(qeRecords, IATF_CORE_TOOL_MAP.MSA) },
    { id: 'SPC', name: 'SPC', maturity: toolScore(qeRecords, IATF_CORE_TOOL_MAP.SPC) },
  ]
}

export function lotGenealogy(lots = [], lotId) {
  const byId = new Map((lots || []).map((lot) => [lot.id, lot]))
  const seen = new Set()
  const walk = (id, depth) => {
    if (!id || seen.has(id) || depth > 12) return []
    seen.add(id)
    const lot = byId.get(id)
    if (!lot) return []
    const parents = (lot.parentLotIds || []).flatMap((pid) => walk(pid, depth + 1))
    return [...parents, lot]
  }
  return walk(lotId, 0)
}

export function freezeLots(lots = [], lotIds = [], ncrId) {
  const freeze = new Set(lotIds)
  return (lots || []).map((lot) => {
    if (!freeze.has(lot.id)) return lot
    return {
      ...lot,
      status: lot.status === 'shipped' ? 'shipped' : 'hold',
      ncrIds: [...new Set([...(lot.ncrIds || []), ncrId].filter(Boolean))],
    }
  })
}

function capabilityNote(qeRecords = []) {
  const cap = (qeRecords || []).filter((r) => r.toolId === 't9-cpk-ppk')
  if (!cap.length) return null
  const verified = cap.filter((r) => r.status === 'verified' || r.status === 'closed').length
  return `${cap.length} process-capability record${cap.length === 1 ? '' : 's'}${verified ? ` (${verified} verified)` : ''}`
}

export function inferTraceMethod(lots = []) {
  if (!(lots || []).length) return 'none'
  if ((lots || []).some((lot) => lot.serialNumber)) return 'serial'
  return 'lot'
}

export function buildReliabilityCard({
  certificates = [],
  processes = [],
  lots = [],
  parts = [],
  qeRecords = [],
  share = {},
  companyId = '',
  companyName = '',
  industryId = 'general',
  now = Date.now(),
} = {}) {
  const profile = getIndustryQualityProfile(industryId)
  const defs = certStandardDefsForIndustry(industryId)
  const standards = {}
  defs.forEach((def) => {
    const live = liveStandardStatus(certificates, def.id, now)
    standards[def.id] = {
      id: def.id,
      label: def.label,
      valid: live.status === 'valid',
    }
  })

  const primaryLive = liveStandardStatus(certificates, profile.primaryStandardId, now)
  const iatf = liveStandardStatus(certificates, 'iatf_16949', now)
  const iso = liveStandardStatus(certificates, 'iso_9001', now)
  const iso13485 = liveStandardStatus(certificates, 'iso_13485', now)
  const fda = liveStandardStatus(certificates, 'fda', now)
  const ce = liveStandardStatus(certificates, 'ce_mark', now)

  const card = {
    companyId: companyId || null,
    companyName: companyName || '',
    industryId,
    publishedAt: new Date(now).toISOString(),
    standards,
    validStandardIds: Object.values(standards).filter((row) => row.valid).map((row) => row.id),
    iatfValid: false,
    iso9001Valid: false,
    iso13485Valid: false,
    fdaValid: false,
    ceValid: false,
    certExpiry: null,
    certifyingBody: null,
    scope: null,
    processes: [],
    traceMethod: 'none',
    ppapLevels: [],
    capabilityNote: null,
  }

  if (share.shareCert !== false) {
    card.iatfValid = iatf.status === 'valid'
    card.iso9001Valid = iso.status === 'valid'
    card.iso13485Valid = iso13485.status === 'valid'
    card.fdaValid = fda.status === 'valid'
    card.ceValid = ce.status === 'valid'
    card.certExpiry = primaryLive.cert?.expiresAt || iatf.cert?.expiresAt || null
    card.certifyingBody = primaryLive.cert?.certifyingBody || iatf.cert?.certifyingBody || null
    card.scope = primaryLive.cert?.scope || iatf.cert?.scope || null
  }
  if (share.shareProcesses !== false) {
    card.processes = (processes || []).map((p) => p.name).filter(Boolean).slice(0, 12)
  }
  if (share.shareTraceMethod !== false) {
    card.traceMethod = inferTraceMethod(lots)
  }
  if (share.sharePpap !== false) {
    card.ppapLevels = [...new Set((parts || []).map((p) => String(p.ppapLevel || '')).filter(Boolean))]
  }
  if (share.shareCapability !== false) {
    card.capabilityNote = capabilityNote(qeRecords)
  }
  return card
}
