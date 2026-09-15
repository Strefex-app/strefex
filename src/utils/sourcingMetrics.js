/**
 * Sourcing compare metrics — editable on seller Profile and superadmin account detail.
 * Stored flat on the account registry and under companies.metadata.sourcing_metrics.
 */

export const SOURCING_METRICS_METADATA_KEY = 'sourcing_metrics'

/**
 * All metric keys stay in storage / Intelligent Sourcing compare.
 * `inQuestionnaire` = what purchasing needs from a supplier profile (not platform scores).
 */
export const SOURCING_METRIC_NUMBER_FIELDS = [
  { key: 'fitLevel', label: 'Supplier fit (0–100)', hint: 'Platform capability fit vs buyer gate', min: 0, max: 100, step: 1 },
  { key: 'riskLevel', label: 'Risk index', hint: 'Lower is better', min: 0, max: 100, step: 1 },
  { key: 'leadTimeDays', label: 'Lead time (days)', hint: 'Typical production / delivery lead time quoted to purchasing', min: 0, max: 730, step: 1, inQuestionnaire: true },
  { key: 'quoteTurnDays', label: 'Quote turnaround (days)', hint: 'Days to answer an RFQ', min: 0, max: 120, step: 1, inQuestionnaire: true },
  { key: 'capacityLevel', label: 'Capacity utilised (%)', hint: 'Current plant load — remaining capacity for new orders', min: 0, max: 100, step: 1, inQuestionnaire: true },
  { key: 'onTimePct', label: 'On-time delivery (%)', hint: 'OTD from customer receipts / history', min: 0, max: 100, step: 1, inQuestionnaire: true },
  { key: 'qualityPpm', label: 'Quality (ppm)', hint: 'Defect parts per million', min: 0, max: 100000, step: 1, inQuestionnaire: true },
  { key: 'employees', label: 'Employees', hint: 'Plant / company headcount', min: 0, max: 500000, step: 1, inQuestionnaire: true },
  { key: 'priceIndex', label: 'Price index (100 = market avg)', hint: 'Declared price competitiveness', min: 50, max: 200, step: 1 },
  { key: 'annualSpend', label: 'Annual spend with you ($M)', hint: 'Buyer context, not a score', min: 0, max: 10000, step: 0.1 },
  { key: 'respRate', label: 'RFQ response rate (%)', hint: 'Share of RFQs answered', min: 0, max: 100, step: 1 },
  { key: 'machines', label: 'Machines', hint: 'Primary production equipment count', min: 0, max: 100000, step: 1 },
  { key: 'shifts', label: 'Shifts', hint: 'Typical shifts per day', min: 0, max: 4, step: 1 },
  { key: 'certExpiryDays', label: 'Nearest cert expiry (days)', hint: 'Days until next certificate expires', min: 0, max: 3650, step: 1 },
  { key: 'auditDueDays', label: 'Audit due (days)', hint: 'Negative = overdue', min: -3650, max: 3650, step: 1 },
]

export const SOURCING_METRIC_TEXT_FIELDS = [
  { key: 'certificationsText', label: 'Certificates', hint: 'Comma-separated, e.g. IATF 16949, ISO 9001', placeholder: 'IATF 16949, ISO 9001', inQuestionnaire: true },
  { key: 'financialGrade', label: 'Financial grade', hint: 'e.g. A, B+, C', placeholder: 'A' },
  { key: 'tariffRegime', label: 'Trade / tariff exposure', hint: 'e.g. None, Section 301', placeholder: 'None' },
  { key: 'tier2', label: 'Tier-2 visibility', hint: 'Full / Partial / Unknown', placeholder: 'Unknown' },
  { key: 'auditStatus', label: 'Audit status label', hint: 'Passed / Due / Overdue', placeholder: '—' },
  { key: 'languages', label: 'Working languages', hint: 'Comma-separated, e.g. EN, DE, ZH', placeholder: 'EN, DE' },
]

export const SOURCING_METRIC_QUESTIONNAIRE_NUMBER_FIELDS = SOURCING_METRIC_NUMBER_FIELDS.filter((f) => f.inQuestionnaire)
export const SOURCING_METRIC_QUESTIONNAIRE_TEXT_FIELDS = SOURCING_METRIC_TEXT_FIELDS.filter((f) => f.inQuestionnaire)

const NUMBER_KEYS = SOURCING_METRIC_NUMBER_FIELDS.map((f) => f.key)
const TEXT_KEYS = SOURCING_METRIC_TEXT_FIELDS.map((f) => f.key)

export function emptySourcingMetricsForm() {
  const out = {}
  NUMBER_KEYS.forEach((k) => { out[k] = '' })
  TEXT_KEYS.forEach((k) => { out[k] = '' })
  return out
}

function pickNumber(raw, ...keys) {
  for (const key of keys) {
    if (raw == null || typeof raw !== 'object') break
    if (raw[key] == null || raw[key] === '') continue
    const n = Number(raw[key])
    if (Number.isFinite(n)) return n
  }
  return null
}

function pickText(raw, ...keys) {
  for (const key of keys) {
    if (raw == null || typeof raw !== 'object') break
    const v = raw[key]
    if (v == null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return ''
}

/** Merge flat account + metadata.sourcing_metrics into one object. */
export function resolveSourcingMetricsSource(accountOrCompany = {}, registryAccount = null) {
  const md = (accountOrCompany?.metadata && typeof accountOrCompany.metadata === 'object')
    ? accountOrCompany.metadata
    : {}
  const nested = (md[SOURCING_METRICS_METADATA_KEY] && typeof md[SOURCING_METRICS_METADATA_KEY] === 'object')
    ? md[SOURCING_METRICS_METADATA_KEY]
    : {}
  const reg = registryAccount && typeof registryAccount === 'object' ? registryAccount : {}
  return { ...nested, ...accountOrCompany, ...reg }
}

export function sourcingMetricsFormFromSource(accountOrCompany = {}, registryAccount = null) {
  const src = resolveSourcingMetricsSource(accountOrCompany, registryAccount)
  const form = emptySourcingMetricsForm()
  form.fitLevel = strNum(pickNumber(src, 'fitLevel', 'fit'))
  form.riskLevel = strNum(pickNumber(src, 'riskLevel', 'risk'))
  form.capacityLevel = strNum(pickNumber(src, 'capacityLevel', 'capacity', 'utilisation', 'utilization'))
  form.onTimePct = strNum(pickNumber(src, 'onTimePct', 'onTime', 'otd'))
  form.qualityPpm = strNum(pickNumber(src, 'qualityPpm', 'ppm'))
  form.leadTimeDays = strNum(pickNumber(src, 'leadTimeDays', 'lead_time_days', 'engagementDays', 'deliveryTimeDays'))
  form.priceIndex = strNum(pickNumber(src, 'priceIndex', 'price_index'))
  form.annualSpend = strNum(pickNumber(src, 'annualSpend', 'spend', 'spendM'))
  form.quoteTurnDays = strNum(pickNumber(src, 'quoteTurnDays', 'quoteTurn'))
  form.respRate = strNum(pickNumber(src, 'respRate', 'responseRate'))
  form.employees = strNum(pickNumber(src, 'employees', 'employeeCount'))
  form.machines = strNum(pickNumber(src, 'machines', 'machineCount'))
  form.shifts = strNum(pickNumber(src, 'shifts'))
  form.certExpiryDays = strNum(pickNumber(src, 'certExpiryDays', 'certExpiry', 'cert_expiry_days'))
  form.auditDueDays = strNum(pickNumber(src, 'auditDueDays', 'auditIn', 'audit_due_days'))
  form.financialGrade = pickText(src, 'financialGrade', 'fin', 'creditGrade')
  form.tariffRegime = pickText(src, 'tariffRegime', 'tariff')
  form.tier2 = pickText(src, 'tier2', 'subTierStatus', 'tier2Status')
  form.auditStatus = pickText(src, 'auditStatus', 'audit')
  const langs = src.languages || src.langs
  form.languages = Array.isArray(langs) ? langs.join(', ') : pickText(src, 'languages', 'langs')
  const certs = src.certifications || src.certs
  form.certificationsText = Array.isArray(certs)
    ? certs.join(', ')
    : pickText(src, 'certificationsText')
  return form
}

function strNum(n) {
  return n == null ? '' : String(n)
}

function parseOptionalNumber(raw) {
  if (raw == null || String(raw).trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function parseList(raw) {
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim()).filter(Boolean)
  return String(raw || '')
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

/**
 * Parse form strings → canonical metric object for registry + metadata.
 * Omits null/empty so merges do not wipe unrelated keys unintentionally when spreading carefully.
 */
export function parseSourcingMetricsForm(form = {}) {
  const certifications = parseList(form.certificationsText)
  const languages = parseList(form.languages)
  const auditDueDays = parseOptionalNumber(form.auditDueDays)
  return {
    fitLevel: parseOptionalNumber(form.fitLevel),
    riskLevel: parseOptionalNumber(form.riskLevel),
    capacityLevel: parseOptionalNumber(form.capacityLevel),
    onTimePct: parseOptionalNumber(form.onTimePct),
    qualityPpm: parseOptionalNumber(form.qualityPpm),
    leadTimeDays: parseOptionalNumber(form.leadTimeDays),
    priceIndex: parseOptionalNumber(form.priceIndex),
    annualSpend: parseOptionalNumber(form.annualSpend),
    quoteTurnDays: parseOptionalNumber(form.quoteTurnDays),
    respRate: parseOptionalNumber(form.respRate),
    employees: parseOptionalNumber(form.employees),
    machines: parseOptionalNumber(form.machines),
    shifts: parseOptionalNumber(form.shifts),
    certExpiryDays: parseOptionalNumber(form.certExpiryDays),
    auditDueDays,
    auditIn: auditDueDays,
    financialGrade: String(form.financialGrade || '').trim() || null,
    tariffRegime: String(form.tariffRegime || '').trim() || null,
    tier2: String(form.tier2 || '').trim() || null,
    auditStatus: String(form.auditStatus || '').trim() || null,
    languages: languages.length ? languages : null,
    langs: languages.length ? languages : null,
    certifications: certifications.length ? certifications : null,
  }
}

/** Flat registry patch (camelCase keys Intelligent Sourcing already reads). */
export function sourcingMetricsRegistryPatch(parsed) {
  if (!parsed || typeof parsed !== 'object') return {}
  return {
    fitLevel: parsed.fitLevel,
    riskLevel: parsed.riskLevel,
    capacityLevel: parsed.capacityLevel,
    onTimePct: parsed.onTimePct,
    qualityPpm: parsed.qualityPpm,
    leadTimeDays: parsed.leadTimeDays,
    priceIndex: parsed.priceIndex,
    annualSpend: parsed.annualSpend,
    quoteTurnDays: parsed.quoteTurnDays,
    respRate: parsed.respRate,
    employees: parsed.employees,
    machines: parsed.machines,
    shifts: parsed.shifts,
    certExpiry: parsed.certExpiryDays,
    certExpiryDays: parsed.certExpiryDays,
    auditIn: parsed.auditDueDays,
    auditDueDays: parsed.auditDueDays,
    financialGrade: parsed.financialGrade,
    fin: parsed.financialGrade,
    tariffRegime: parsed.tariffRegime,
    tariff: parsed.tariffRegime,
    tier2: parsed.tier2,
    auditStatus: parsed.auditStatus,
    languages: parsed.languages,
    langs: parsed.langs,
    certifications: parsed.certifications,
  }
}

/** Nested blob for companies.metadata.sourcing_metrics */
export function sourcingMetricsMetadataBlob(parsed) {
  const patch = sourcingMetricsRegistryPatch(parsed)
  const out = {}
  Object.entries(patch).forEach(([k, v]) => {
    if (v != null && !(Array.isArray(v) && v.length === 0)) out[k] = v
  })
  return out
}

export function mergeSourcingMetricsIntoMetadata(existingMetadata = {}, parsed) {
  const md = existingMetadata && typeof existingMetadata === 'object' ? { ...existingMetadata } : {}
  md[SOURCING_METRICS_METADATA_KEY] = sourcingMetricsMetadataBlob(parsed)
  return md
}

/** Expand nested metadata onto a flat account-like object for mappers. */
export function flattenSourcingMetricsFromAccount(account) {
  if (!account || typeof account !== 'object') return account
  const md = account.metadata && typeof account.metadata === 'object' ? account.metadata : {}
  const nested = md[SOURCING_METRICS_METADATA_KEY] && typeof md[SOURCING_METRICS_METADATA_KEY] === 'object'
    ? md[SOURCING_METRICS_METADATA_KEY]
    : null
  if (!nested) return account
  return { ...nested, ...account }
}
