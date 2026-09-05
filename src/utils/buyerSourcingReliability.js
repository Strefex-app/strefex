import { matchPublishedReliability } from './publishedReliability'
import {
  cardHasStandard,
  filterStandardForIndustry,
  getIndustryQualityProfile,
  inferStandardsFromCerts,
  matchesIndustryPrimaryStandard,
  primaryStandardForIndustry,
  reliabilityBadgesForCard,
  scoreStandardsForIndustry,
  validStandardIds,
} from '../data/industryQualityProfiles'

export {
  getIndustryQualityProfile,
  reliabilityBadgesForCard,
  matchesIndustryPrimaryStandard,
  primaryStandardForIndustry,
  filterStandardForIndustry,
} from '../data/industryQualityProfiles'

export function normalizeCompanyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+(gmbh|ltd|llc|inc|co|corp|ag|sa|srl|ooo|plc)\.?$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function mergePublishedStandards(published = {}, industryId) {
  const inferred = inferStandardsFromCerts([], industryId)
  const standards = { ...inferred }
  Object.keys(standards).forEach((id) => {
    standards[id] = { ...standards[id], valid: false }
  })
  if (published.iatfValid) {
    if (standards.iatf_16949) standards.iatf_16949.valid = true
  }
  if (published.iso9001Valid) {
    if (standards.iso_9001) standards.iso_9001.valid = true
  }
  if (published.iso13485Valid) {
    if (standards.iso_13485) standards.iso_13485.valid = true
  }
  if (published.fdaValid) {
    if (standards.fda) standards.fda.valid = true
  }
  if (published.ceValid) {
    if (standards.ce_mark) standards.ce_mark.valid = true
  }
  if (published.standards) {
    Object.entries(published.standards).forEach(([id, row]) => {
      if (standards[id]) standards[id].valid = Boolean(row?.valid)
    })
  }
  return standards
}

/** Build a buyer-visible reliability slice from directory / registry metadata. */
export function inferReliabilityFromSupplier(supplier = {}, industryId = 'general') {
  const certs = supplier.certifications || supplier.metadata?.certifications || []
  const standards = inferStandardsFromCerts(certs, industryId)
  const validIds = validStandardIds(standards)
  if (!validIds.length) return null
  return {
    companyName: supplier.legal_name || supplier.display_name || supplier.displayName || supplier.name || '',
    industryId,
    standards,
    validStandardIds: validIds,
    iatfValid: standards.iatf_16949?.valid || false,
    iso9001Valid: standards.iso_9001?.valid || false,
    iso13485Valid: standards.iso_13485?.valid || false,
    fdaValid: standards.fda?.valid || false,
    ceValid: standards.ce_mark?.valid || false,
    traceMethod: 'none',
    ppapLevels: [],
    processes: [],
    source: 'directory',
  }
}

/** 0–100 score for ranking and badges. */
export function scoreReliabilityCard(card, industryId = card?.industryId || 'general') {
  if (!card) return 0
  if (card.standards) {
    return scoreStandardsForIndustry(card.standards, industryId, card)
  }
  const standards = inferStandardsFromCerts([], industryId)
  if (card.iatfValid && standards.iatf_16949) standards.iatf_16949.valid = true
  if (card.iso9001Valid && standards.iso_9001) standards.iso_9001.valid = true
  if (card.iso13485Valid && standards.iso_13485) standards.iso_13485.valid = true
  if (card.fdaValid && standards.fda) standards.fda.valid = true
  if (card.ceValid && standards.ce_mark) standards.ce_mark.valid = true
  return scoreStandardsForIndustry(standards, industryId, card)
}

export function sortSuppliersByReliability(suppliers = []) {
  return [...(suppliers || [])].sort((a, b) => {
    const scoreDelta = (b.reliabilityScore || 0) - (a.reliabilityScore || 0)
    if (scoreDelta !== 0) return scoreDelta
    return (b.overall_score || 0) - (a.overall_score || 0)
  })
}

export function matchPublishedReliabilityLoose(supplier) {
  const direct = matchPublishedReliability(supplier)
  if (direct) return direct
  const name = normalizeCompanyName(
    supplier.legal_name || supplier.display_name || supplier.displayName || supplier.name,
  )
  if (!name) return null
  try {
    const raw = localStorage.getItem('strefex-published-reliability')
    if (!raw) return null
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return null
    return list.find((card) => normalizeCompanyName(card.companyName) === name) || null
  } catch {
    return null
  }
}

function normalizePublishedCard(published, industryId) {
  const standards = mergePublishedStandards(published, industryId)
  return {
    ...published,
    industryId,
    standards,
    validStandardIds: validStandardIds(standards),
    source: published.source || 'published',
  }
}

export function enhanceSupplierReliability(supplier, industryId = 'general') {
  if (!supplier) return supplier
  const publishedRaw = matchPublishedReliabilityLoose(supplier)
  const published = publishedRaw ? normalizePublishedCard(publishedRaw, industryId) : null
  const inferred = published ? null : inferReliabilityFromSupplier(supplier, industryId)
  const card = published || inferred
  const reliabilityScore = scoreReliabilityCard(card, industryId)
  const profile = getIndustryQualityProfile(industryId)
  return {
    ...supplier,
    reliabilityCard: card || null,
    reliabilityScore,
    reliabilityPublished: Boolean(published),
    reliabilityBadges: reliabilityBadgesForCard(card, industryId),
    reliabilityPrimaryStandardId: profile.primaryStandardId,
  }
}

/** Enhance and rank a discover/shortlist page of suppliers. */
export function enhanceSupplierList(suppliers = [], industryId = 'general') {
  return sortSuppliersByReliability(
    (suppliers || []).map((row) => enhanceSupplierReliability(row, industryId)),
  )
}

export function coverageStats(suppliers = [], industryId = 'general') {
  const rows = suppliers || []
  const profile = getIndustryQualityProfile(industryId)
  const withEvidence = rows.filter((row) => (row.reliabilityScore || 0) > 0)
  const withPrimary = rows.filter((row) => matchesIndustryPrimaryStandard(row.reliabilityCard, industryId))
  const published = rows.filter((row) => row.reliabilityPublished)
  const total = rows.length
  const percent = total ? Math.round((withEvidence.length / total) * 100) : 0
  const primary = primaryStandardForIndustry(industryId)
  return {
    total,
    withEvidence: withEvidence.length,
    withPrimary: withPrimary.length,
    withIatf: rows.filter((row) => cardHasStandard(row.reliabilityCard, 'iatf_16949')).length,
    published: published.length,
    percent,
    primaryStandardId: profile.primaryStandardId,
    primaryStandardLabel: primary?.label || 'Primary standard',
  }
}

export function supplierMeetsCertFilter(supplier, industryId) {
  return matchesIndustryPrimaryStandard(supplier?.reliabilityCard, industryId)
}
