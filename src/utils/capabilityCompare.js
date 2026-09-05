import { comparisonRowFromSupplier } from './shortlistGapAnalysis'

/**
 * Unified capability-compare row for Discover, Buyer Workspace, and Executive Summary.
 * Aligns pre-RFQ manufacturer comparison on one column set (canvas stage 2).
 */
export function normalizeCapabilityCompareRow(supplier, industryId = 'general') {
  if (!supplier) return null
  const base = comparisonRowFromSupplier(supplier, industryId)
  const city = base.city || supplier.city || ''
  const country = base.country || supplier.country || ''
  const location = [city, country].filter(Boolean).join(', ') || '—'

  return {
    ...base,
    id: base.supplier_id || base.id || supplier.id,
    name: base.display_name || base.displayName || base.legal_name || base.name || 'Supplier',
    location,
    capacityPct: base.capacityLevel ?? base.capacity_pct ?? supplier.capacityLevel ?? null,
    leadTimeDays: base.leadTimeDays ?? base.lead_time_days ?? supplier.leadTimeDays ?? null,
    deliveryDays: base.deliveryTimeDays ?? base.delivery_time_days ?? supplier.deliveryTimeDays ?? null,
    priceIndex: base.priceIndex ?? base.price_index ?? supplier.priceIndex ?? null,
    certificationsText: base.certificationsText
      || (supplier.certifications || []).slice(0, 4).join(', ')
      || '—',
    evidenceScore: base.evidenceScore ?? base.reliabilityScore ?? 0,
    ppapText: base.ppapText || '—',
    traceText: base.traceText || '—',
    score: base.overall_score ?? base.reliabilityScore ?? base.fitLevel ?? 0,
    risk: base.risk_score ?? base.riskLevel ?? null,
    evidenceSource: base.evidenceSource || '—',
  }
}

export function normalizeCapabilityCompareRows(suppliers = [], industryId = 'general') {
  return (suppliers || [])
    .map((row) => normalizeCapabilityCompareRow(row, industryId))
    .filter(Boolean)
}
