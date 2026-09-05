/**
 * Standard Network RFQ ask/bid schema (product + equipment).
 * Aligns buyer create, plant reply, and comparison on one package —
 * commercial + feasibility + quality level + cost buckets
 * (material / operations / flexible) inspired by RFQ Intelligence costing.
 */

export const RFQ_TYPES = [
  { id: 'product', label: 'Product / component' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'service', label: 'Service' },
]

export const RFQ_UNITS = [
  { id: 'pcs', label: 'pcs' },
  { id: 'sets', label: 'sets' },
  { id: 'lots', label: 'lots' },
  { id: 'machines', label: 'machines' },
  { id: 'hours', label: 'hours' },
  { id: 'days', label: 'days' },
]

/** Preferred transport modes from Intelligent Sourcing RFQ canvas. */
export const TRANSPORT_MODES = [
  { id: 'sea', label: 'Sea' },
  { id: 'rail', label: 'Rail' },
  { id: 'road', label: 'Road' },
  { id: 'air', label: 'Air' },
  { id: 'supplier', label: "Supplier's choice" },
]

/** Industries shown as RFQ coverage chips (HTML standard form). */
export const RFQ_COVER_INDUSTRIES = [
  { id: 'automotive', label: 'Automotive' },
  { id: 'aerospace', label: 'Aerospace' },
  { id: 'medical', label: 'Medical' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'machinery', label: 'Machinery' },
  { id: 'oil-gas', label: 'Oil & Gas' },
  { id: 'nuclear', label: 'Nuclear' },
]

/** Official QMS standards buyers can request on a Network RFQ. */
export const QUALITY_LEVELS = [
  { id: 'iso_9001', label: 'ISO 9001', hint: 'Quality management systems' },
  { id: 'iatf_16949', label: 'IATF 16949', hint: 'Automotive quality management' },
  { id: 'iso_13485', label: 'ISO 13485', hint: 'Medical devices quality management' },
  { id: 'as9100', label: 'AS9100', hint: 'Aerospace quality management' },
  { id: 'iso_14001', label: 'ISO 14001', hint: 'Environmental management (when required with QMS)' },
]

/** Map legacy / free-text quality ids onto official standards. */
export function normalizeQualityLevel(raw) {
  const id = String(raw || '').trim()
  if (QUALITY_LEVELS.some((q) => q.id === id)) return id
  const legacy = {
    standard: 'iso_9001',
    elevated: 'iso_9001',
    automotive_ppap: 'iatf_16949',
    medical_controlled: 'iso_13485',
  }
  return legacy[id] || 'iso_9001'
}

export const FEASIBILITY_LEVELS = [
  { id: 'feasible', label: 'Feasible', hint: 'Can quote as specified' },
  { id: 'feasible_with_changes', label: 'Feasible with changes', hint: 'Needs drawing / process / MOQ changes' },
  { id: 'not_feasible', label: 'Not feasible', hint: 'Decline with reason in notes' },
]

export const CAPACITY_STATUSES = [
  { id: 'available', label: 'Available' },
  { id: 'limited', label: 'Limited' },
  { id: 'full', label: 'Full' },
]

export const INCOTERMS = [
  { id: '', label: 'Not specified' },
  { id: 'EXW', label: 'EXW — Ex works' },
  { id: 'FOB', label: 'FOB — Free on board' },
  { id: 'CIF', label: 'CIF — Cost, insurance & freight' },
  { id: 'DDP', label: 'DDP — Delivered duty paid' },
]

export const PAYMENT_TERMS_ASK = [
  { id: '', label: 'Not specified' },
  { id: 'net30', label: 'Net 30' },
  { id: 'net60', label: 'Net 60' },
  { id: 'milestone', label: 'Milestone / progress' },
  { id: 'lc', label: 'Letter of credit' },
]

export const DEFAULT_ASK_REQUIREMENTS = {
  quantity: 1,
  unit: 'pcs',
  maxLeadTime: 90,
  currency: 'USD',
  targetUnitPrice: '',
  itemName: '',
  qualityLevel: 'iso_9001',
  incoterms: '',
  paymentTermsAsk: '',
  monthlyCapacityAsk: '',
  moqAsk: '',
  /** HTML canvas + platform combined ask extras */
  coveredIndustries: [],
  internalRef: '',
  annualVolume: '',
  lotSize: '',
  requiredSop: '',
  programmeLife: '',
  toolingOwnership: '',
  transportMode: 'sea',
  packaging: '',
  callOffPattern: '',
  safetyStock: '',
}

export const EMPTY_BID_COSTS = {
  material: '',
  operations: '',
  flexible: '',
}

export function labelOf(list, id) {
  return list.find((row) => row.id === id)?.label || id || '—'
}

export function qualityAskSummary(requirements = {}) {
  const bits = []
  if (requirements.ppapLevel) bits.push(`PPAP L${requirements.ppapLevel}`)
  if (requirements.traceabilityRequired) bits.push('Traceability')
  if (requirements.imdsRequired) bits.push('IMDS')
  if (requirements.specialCharacteristics) bits.push('Special characteristics')
  if (requirements.iso13485Required) bits.push('ISO 13485')
  if (requirements.designControlsRequired) bits.push('Design controls')
  if (requirements.sterilizationValidation) bits.push('Sterilization validation')
  if (requirements.udiRequired) bits.push('UDI')
  if (requirements.regulatoryPath) bits.push(`Regulatory: ${requirements.regulatoryPath}`)
  if (requirements.biocompatibility) bits.push('Biocompatibility')
  if (requirements.ndaRequired) bits.push('NDA before drawings')
  return bits
}

export function summarizeRfqAsk(draft = {}) {
  const req = draft.requirements || {}
  const currency = req.currency || draft.currency || 'USD'
  const qualityLevel = normalizeQualityLevel(req.qualityLevel)
  const lines = [
    `Type: ${labelOf(RFQ_TYPES, draft.rfqType || 'product')}`,
    req.itemName ? `Item: ${req.itemName}` : null,
    `Qty ${req.quantity ?? 1} ${req.unit || 'pcs'}`,
    `Max lead ${req.maxLeadTime ?? '—'}d`,
    req.targetUnitPrice !== '' && req.targetUnitPrice != null
      ? `Target ${currency} ${req.targetUnitPrice}/unit`
      : 'Price target: open',
    req.incoterms ? `Incoterms: ${req.incoterms}` : null,
    req.paymentTermsAsk
      ? `Payment: ${labelOf(PAYMENT_TERMS_ASK, req.paymentTermsAsk)}`
      : null,
    req.monthlyCapacityAsk ? `Capacity ask: ${req.monthlyCapacityAsk}/mo` : null,
    req.moqAsk ? `MOQ ask: ≤ ${req.moqAsk}` : null,
    req.transportMode ? `Transport: ${labelOf(TRANSPORT_MODES, req.transportMode)}` : null,
    req.packaging ? `Packaging: ${req.packaging}` : null,
    req.annualVolume ? `Annual volume: ${req.annualVolume}` : null,
    Array.isArray(req.coveredIndustries) && req.coveredIndustries.length
      ? `Industries: ${req.coveredIndustries.join(', ')}`
      : null,
    `Quality: ${labelOf(QUALITY_LEVELS, qualityLevel)}`,
  ].filter(Boolean)
  const quality = qualityAskSummary(req)
  return {
    commercial: lines,
    quality,
    rfqTypeLabel: labelOf(RFQ_TYPES, draft.rfqType || 'product'),
    itemName: req.itemName || draft.title || '—',
    quantity: req.quantity ?? 1,
    unit: req.unit || 'pcs',
    currency,
    targetUnitPrice: numOrNull(req.targetUnitPrice),
    qualityLevel,
    qualityLevelLabel: labelOf(QUALITY_LEVELS, qualityLevel),
  }
}

/**
 * Normalize plant bid for store + comparison. Keeps legacy price/leadTime aliases.
 */
export function normalizeRfqBid(raw = {}) {
  const costs = {
    material: numOrNull(raw.costs?.material ?? raw.materialCost),
    operations: numOrNull(raw.costs?.operations ?? raw.operationsCost ?? raw.processCost),
    flexible: numOrNull(raw.costs?.flexible ?? raw.flexibleCost ?? raw.overheadCost),
  }
  const costSum = ['material', 'operations', 'flexible']
    .map((k) => costs[k])
    .filter((n) => n != null)
    .reduce((s, n) => s + n, 0)

  const unitPrice = numOrNull(raw.unitPrice ?? raw.price) ?? (costSum > 0 ? round2(costSum) : 0)
  const leadTime = Math.max(0, parseInt(raw.leadTimeDays ?? raw.leadTime, 10) || 0)
  const capacityStatus = CAPACITY_STATUSES.some((c) => c.id === raw.capacityStatus)
    ? raw.capacityStatus
    : 'available'
  const ppapCommit = String(raw.ppapCommit || raw.ppapLevelOffered || '').trim()

  return {
    unitPrice,
    price: unitPrice,
    materialCost: costs.material,
    operationsCost: costs.operations,
    flexibleCost: costs.flexible,
    costNotes: String(raw.costNotes || '').trim(),
    currency: String(raw.currency || 'USD').toUpperCase(),
    leadTimeDays: leadTime,
    leadTime,
    moq: numOrNull(raw.moq),
    paymentTerms: String(raw.paymentTerms || '').trim(),
    incotermsOffer: String(raw.incotermsOffer || raw.incoterms || '').trim(),
    warranty: String(raw.warranty || '').trim() || '12 months',
    feasibility: FEASIBILITY_LEVELS.some((f) => f.id === raw.feasibility)
      ? raw.feasibility
      : 'feasible',
    qualityLevel: normalizeQualityLevel(raw.qualityLevel),
    capacityStatus,
    capacity: labelOf(CAPACITY_STATUSES, capacityStatus),
    monthlyCapacity: numOrNull(raw.monthlyCapacity),
    ppapCommit,
    ppapLevelOffered: ppapCommit,
    certConfirm: Boolean(raw.certConfirm),
    certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
    costs,
    notes: String(raw.notes || '').trim(),
    respondedAt: raw.respondedAt || null,
  }
}

export function emptyBidFormState() {
  return {
    unitPrice: '',
    currency: 'USD',
    leadTimeDays: '',
    moq: '',
    paymentTerms: '',
    incotermsOffer: '',
    warranty: '12 months',
    feasibility: 'feasible',
    qualityLevel: 'iso_9001',
    capacityStatus: 'available',
    monthlyCapacity: '',
    ppapCommit: '',
    certConfirm: true,
    costs: { ...EMPTY_BID_COSTS },
    notes: '',
  }
}

/** Prefill plant bid from buyer ask so reply fields align with comparison matrix. */
export function seedBidFormFromAsk(requirements = {}) {
  const base = emptyBidFormState()
  const req = requirements || {}
  const paymentLabel = req.paymentTermsAsk
    ? labelOf(PAYMENT_TERMS_ASK, req.paymentTermsAsk)
    : ''
  return {
    ...base,
    currency: req.currency || base.currency,
    qualityLevel: normalizeQualityLevel(req.qualityLevel),
    paymentTerms: paymentLabel && paymentLabel !== 'Not specified' ? paymentLabel : base.paymentTerms,
    incotermsOffer: req.incoterms || '',
    ppapCommit: req.ppapLevel ? String(req.ppapLevel) : '',
    moq: req.moqAsk ? String(req.moqAsk) : '',
  }
}

export function bidFormToPayload(form) {
  return normalizeRfqBid({
    unitPrice: form.unitPrice,
    currency: form.currency,
    leadTimeDays: form.leadTimeDays,
    moq: form.moq,
    paymentTerms: form.paymentTerms,
    incotermsOffer: form.incotermsOffer,
    warranty: form.warranty,
    feasibility: form.feasibility,
    qualityLevel: form.qualityLevel,
    capacityStatus: form.capacityStatus,
    monthlyCapacity: form.monthlyCapacity,
    ppapCommit: form.ppapCommit,
    certConfirm: form.certConfirm,
    costs: form.costs,
    notes: form.notes,
  })
}

/** Flag bid gaps vs buyer ask — powers compare matrix chips (canvas stage 6). */
export function assessBidAgainstAsk(bid = {}, requirements = {}) {
  const req = requirements || {}
  const normalized = normalizeRfqBid(bid)
  const gaps = []

  const askQuality = normalizeQualityLevel(req.qualityLevel)
  const bidQuality = normalizeQualityLevel(normalized.qualityLevel)
  if (askQuality && bidQuality !== askQuality) {
    gaps.push({
      id: 'quality',
      label: `Quality mismatch (ask ${labelOf(QUALITY_LEVELS, askQuality)})`,
    })
  }

  const maxLead = Number(req.maxLeadTime)
  const lead = Number(normalized.leadTimeDays ?? normalized.leadTime)
  if (maxLead > 0 && lead > maxLead) {
    gaps.push({ id: 'lead', label: `Lead ${lead}d > max ${maxLead}d` })
  }

  if (req.ppapLevel) {
    const askPpap = Number(req.ppapLevel)
    const bidPpap = Number(normalized.ppapCommit || normalized.ppapLevelOffered)
    if (!Number.isFinite(bidPpap) || bidPpap < askPpap) {
      gaps.push({ id: 'ppap', label: `PPAP below L${req.ppapLevel}` })
    }
  }

  if (qualityAskSummary(req).length > 0 && !normalized.certConfirm) {
    gaps.push({ id: 'cert', label: 'Certs not confirmed' })
  }

  const capAsk = Number(req.monthlyCapacityAsk)
  const capBid = Number(normalized.monthlyCapacity)
  if (capAsk > 0 && (!Number.isFinite(capBid) || capBid < capAsk)) {
    gaps.push({ id: 'capacity', label: `Below ${capAsk}/mo capacity` })
  }

  if (capAsk > 0 && normalized.capacityStatus === 'full') {
    gaps.push({ id: 'capacity_status', label: 'Capacity full' })
  }

  const moqAsk = Number(req.moqAsk)
  const moqBid = Number(normalized.moq)
  if (moqAsk > 0 && Number.isFinite(moqBid) && moqBid > moqAsk) {
    gaps.push({ id: 'moq', label: `MOQ ${moqBid} > max ${moqAsk}` })
  }

  if (req.incoterms && normalized.incotermsOffer && normalized.incotermsOffer !== req.incoterms) {
    gaps.push({ id: 'incoterms', label: `Incoterms ${normalized.incotermsOffer} ≠ ${req.incoterms}` })
  }

  if (normalized.feasibility === 'not_feasible') {
    gaps.push({ id: 'feasibility', label: 'Not feasible' })
  }

  return gaps
}

export function comparisonBests(responses = []) {
  const active = responses.filter((r) => r && r.status !== 'declined' && r.feasibility !== 'not_feasible')
  const minOf = (getter) => {
    const vals = active.map(getter).filter((n) => Number.isFinite(n) && n >= 0)
    return vals.length ? Math.min(...vals) : null
  }
  const bestUnitPrice = minOf((r) => Number(r.unitPrice ?? r.price))
  const bestLead = minOf((r) => Number(r.leadTimeDays ?? r.leadTime))
  return {
    bestUnitPrice,
    bestPrice: bestUnitPrice,
    bestMaterial: minOf((r) => Number(r.materialCost ?? r.costs?.material)),
    bestOps: minOf((r) => Number(r.operationsCost ?? r.costs?.operations)),
    bestFlex: minOf((r) => Number(r.flexibleCost ?? r.costs?.flexible)),
    bestTotal: minOf((r) => {
      const unit = Number(r.unitPrice ?? r.price)
      return Number.isFinite(unit) ? unit : NaN
    }),
    bestLead,
  }
}

function numOrNull(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function round2(n) {
  return Math.round(n * 100) / 100
}
