import {
  filterStandardForIndustry,
  matchesIndustryPrimaryStandard,
  reliabilityBadgesForCard,
} from './buyerSourcingReliability'

export function analyzeShortlistGap(suppliers = [], industryId = 'general') {
  const rows = suppliers || []
  const primary = filterStandardForIndustry(industryId)
  const withPrimary = rows.filter((row) => matchesIndustryPrimaryStandard(row.reliabilityCard, industryId))
  const withAnyEvidence = rows.filter((row) => (row.reliabilityScore || 0) > 0)
  const published = rows.filter((row) => row.reliabilityPublished)
  const gaps = rows.filter((row) => !matchesIndustryPrimaryStandard(row.reliabilityCard, industryId))

  return {
    total: rows.length,
    withPrimary: withPrimary.length,
    withoutPrimary: gaps.length,
    withAnyEvidence: withAnyEvidence.length,
    published: published.length,
    primaryStandardId: primary?.id || '',
    primaryStandardLabel: primary?.label || 'Primary standard',
    readyPercent: rows.length ? Math.round((withPrimary.length / rows.length) * 100) : 0,
    gapSuppliers: gaps.map((row) => ({
      id: row.supplier_id || row.id,
      name: row.display_name || row.displayName || row.legal_name || row.name || 'Supplier',
      reliabilityScore: row.reliabilityScore || 0,
      badges: reliabilityBadgesForCard(row.reliabilityCard, industryId),
    })),
    isReadyForRfq: gaps.length === 0 && rows.length > 0,
  }
}

export function comparisonRowFromSupplier(supplier, industryId = 'general') {
  if (!supplier) return null
  const badges = supplier.reliabilityBadges?.length
    ? supplier.reliabilityBadges
    : reliabilityBadgesForCard(supplier.reliabilityCard, industryId)
  const certText = badges.map((b) => b.label).join(', ')
    || (supplier.certifications || []).slice(0, 4).join(', ')
    || '—'
  const trace = supplier.reliabilityCard?.traceMethod
  const traceText = trace && trace !== 'none' ? trace : '—'
  const ppap = supplier.reliabilityCard?.ppapLevels?.length
    ? `L${supplier.reliabilityCard.ppapLevels.join('/')}`
    : '—'
  const source = supplier.reliabilityPublished
    ? 'Published'
    : supplier.reliabilityCard?.source === 'directory'
      ? 'Directory'
      : '—'

  return {
    ...supplier,
    certificationsText: certText,
    evidenceScore: supplier.reliabilityScore || 0,
    evidenceSource: source,
    traceText,
    ppapText: ppap,
    primaryOnFile: matchesIndustryPrimaryStandard(supplier.reliabilityCard, industryId),
  }
}
