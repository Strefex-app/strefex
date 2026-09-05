/**
 * Industry-specific quality / regulatory profiles for buyer sourcing,
 * plant certificates, folder seeds, and RFQ launch sections.
 */

export const DEFAULT_INDUSTRY_PROFILE_ID = 'general'

/** @typedef {{ id: string, label: string, pattern: string, score: number, primary?: boolean }} CertStandardDef */

/** @type {Record<string, { id: string, label: string, primaryStandardId: string, filterStandardId: string, rfqSectionId: string, plantWorkspaceHint: string, certStandards: CertStandardDef[] }>} */
export const INDUSTRY_QUALITY_PROFILES = {
  automotive: {
    id: 'automotive',
    label: 'Automotive',
    primaryStandardId: 'iatf_16949',
    filterStandardId: 'iatf_16949',
    rfqSectionId: 'automotive',
    plantWorkspaceHint: 'IATF 16949 plant evidence — PPAP, APQP, and lot traceability.',
    certStandards: [
      { id: 'iatf_16949', label: 'IATF 16949', pattern: 'iatf\\s*16949|iatf16949', score: 45, primary: true },
      { id: 'iso_9001', label: 'ISO 9001', pattern: 'iso\\s*9001', score: 15 },
      { id: 'iso_14001', label: 'ISO 14001', pattern: 'iso\\s*14001', score: 5 },
    ],
  },
  medical: {
    id: 'medical',
    label: 'Medical / MedTech',
    primaryStandardId: 'iso_13485',
    filterStandardId: 'iso_13485',
    rfqSectionId: 'medical',
    plantWorkspaceHint: 'ISO 13485 QMS — design history, validation, and regulatory submissions.',
    certStandards: [
      { id: 'iso_13485', label: 'ISO 13485', pattern: 'iso\\s*13485', score: 45, primary: true },
      { id: 'fda', label: 'FDA registered', pattern: '\\bfda\\b|fda\\s*registered|510\\s*\\(?k\\)?', score: 25 },
      { id: 'ce_mark', label: 'CE / MDR', pattern: '\\bce\\b|\\bmdr\\b|eu\\s*mdd', score: 15 },
      { id: 'iso_9001', label: 'ISO 9001', pattern: 'iso\\s*9001', score: 10 },
    ],
  },
  electronics: {
    id: 'electronics',
    label: 'Electronics',
    primaryStandardId: 'iso_9001',
    filterStandardId: 'iso_9001',
    rfqSectionId: 'general',
    plantWorkspaceHint: 'Electronics QMS — ISO 9001 with IPC workmanship where applicable.',
    certStandards: [
      { id: 'iso_9001', label: 'ISO 9001', pattern: 'iso\\s*9001', score: 35, primary: true },
      { id: 'iatf_16949', label: 'IATF 16949', pattern: 'iatf\\s*16949|iatf16949', score: 20 },
      { id: 'ipc_a_610', label: 'IPC-A-610', pattern: 'ipc[-\\s]?a[-\\s]?610', score: 15 },
      { id: 'iso_14001', label: 'ISO 14001', pattern: 'iso\\s*14001', score: 5 },
    ],
  },
  nuclear: {
    id: 'nuclear',
    label: 'Nuclear',
    primaryStandardId: 'iso_19443',
    filterStandardId: 'iso_19443',
    rfqSectionId: 'general',
    plantWorkspaceHint: 'Nuclear supply chain — ISO 19443 and audited quality programs.',
    certStandards: [
      { id: 'iso_19443', label: 'ISO 19443', pattern: 'iso\\s*19443', score: 45, primary: true },
      { id: 'iso_9001', label: 'ISO 9001', pattern: 'iso\\s*9001', score: 20 },
      { id: 'asme_nqa', label: 'ASME NQA-1', pattern: 'nqa[-\\s]?1|asme\\s*nqa', score: 20 },
    ],
  },
  'oil-gas': {
    id: 'oil-gas',
    label: 'Oil & Gas',
    primaryStandardId: 'api_q1',
    filterStandardId: 'api_q1',
    rfqSectionId: 'general',
    plantWorkspaceHint: 'Oil & gas quality — API Q1 / ISO 9001 supplier programs.',
    certStandards: [
      { id: 'api_q1', label: 'API Q1', pattern: 'api\\s*q1|\\bapi\\b', score: 35, primary: true },
      { id: 'iso_9001', label: 'ISO 9001', pattern: 'iso\\s*9001', score: 25 },
      { id: 'iso_14001', label: 'ISO 14001', pattern: 'iso\\s*14001', score: 10 },
    ],
  },
  machinery: {
    id: 'machinery',
    label: 'Machinery',
    primaryStandardId: 'iso_9001',
    filterStandardId: 'iso_9001',
    rfqSectionId: 'general',
    plantWorkspaceHint: 'General manufacturing QMS — ISO 9001 and customer-specific requirements.',
    certStandards: [
      { id: 'iso_9001', label: 'ISO 9001', pattern: 'iso\\s*9001', score: 40, primary: true },
      { id: 'iso_14001', label: 'ISO 14001', pattern: 'iso\\s*14001', score: 10 },
      { id: 'iso_45001', label: 'ISO 45001', pattern: 'iso\\s*45001', score: 8 },
    ],
  },
  'green-energy': {
    id: 'green-energy',
    label: 'Green Energy',
    primaryStandardId: 'iso_9001',
    filterStandardId: 'iso_9001',
    rfqSectionId: 'general',
    plantWorkspaceHint: 'Energy sector QMS — ISO 9001 with traceability for critical components.',
    certStandards: [
      { id: 'iso_9001', label: 'ISO 9001', pattern: 'iso\\s*9001', score: 40, primary: true },
      { id: 'iso_14001', label: 'ISO 14001', pattern: 'iso\\s*14001', score: 15 },
      { id: 'iatf_16949', label: 'IATF 16949', pattern: 'iatf\\s*16949|iatf16949', score: 10 },
    ],
  },
  'raw-materials': {
    id: 'raw-materials',
    label: 'Raw Materials',
    primaryStandardId: 'iso_9001',
    filterStandardId: 'iso_9001',
    rfqSectionId: 'general',
    plantWorkspaceHint: 'Materials supplier QMS — ISO 9001 and material test certificates.',
    certStandards: [
      { id: 'iso_9001', label: 'ISO 9001', pattern: 'iso\\s*9001', score: 40, primary: true },
      { id: 'iso_14001', label: 'ISO 14001', pattern: 'iso\\s*14001', score: 10 },
    ],
  },
  'household-products': {
    id: 'household-products',
    label: 'Household Products',
    primaryStandardId: 'iso_9001',
    filterStandardId: 'iso_9001',
    rfqSectionId: 'general',
    plantWorkspaceHint: 'Consumer goods QMS — ISO 9001 and product safety documentation.',
    certStandards: [
      { id: 'iso_9001', label: 'ISO 9001', pattern: 'iso\\s*9001', score: 40, primary: true },
      { id: 'iso_14001', label: 'ISO 14001', pattern: 'iso\\s*14001', score: 10 },
    ],
  },
  general: {
    id: 'general',
    label: 'General manufacturing',
    primaryStandardId: 'iso_9001',
    filterStandardId: 'iso_9001',
    rfqSectionId: 'general',
    plantWorkspaceHint: 'General QMS — ISO 9001 and customer-specific requirements.',
    certStandards: [
      { id: 'iso_9001', label: 'ISO 9001', pattern: 'iso\\s*9001', score: 40, primary: true },
      { id: 'iso_14001', label: 'ISO 14001', pattern: 'iso\\s*14001', score: 10 },
    ],
  },
}

export function getIndustryQualityProfile(industryId) {
  const key = String(industryId || '').trim()
  return INDUSTRY_QUALITY_PROFILES[key] || INDUSTRY_QUALITY_PROFILES.general
}

export function certStandardDefsForIndustry(industryId) {
  return getIndustryQualityProfile(industryId).certStandards
}

export function primaryStandardForIndustry(industryId) {
  const profile = getIndustryQualityProfile(industryId)
  return profile.certStandards.find((row) => row.id === profile.primaryStandardId)
    || profile.certStandards.find((row) => row.primary)
    || profile.certStandards[0]
}

export function filterStandardForIndustry(industryId) {
  const profile = getIndustryQualityProfile(industryId)
  return profile.certStandards.find((row) => row.id === profile.filterStandardId)
    || primaryStandardForIndustry(industryId)
}

function hasCertHint(certifications = [], pattern) {
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
  return (certifications || []).some((row) => re.test(String(row || '')))
}

/** Infer valid standards from directory certification strings. */
export function inferStandardsFromCerts(certifications = [], industryId) {
  const defs = certStandardDefsForIndustry(industryId)
  const standards = {}
  defs.forEach((def) => {
    standards[def.id] = {
      id: def.id,
      label: def.label,
      valid: hasCertHint(certifications, def.pattern),
    }
  })
  return standards
}

export function validStandardIds(standards = {}) {
  return Object.values(standards).filter((row) => row?.valid).map((row) => row.id)
}

export function cardHasStandard(card, standardId) {
  if (!card || !standardId) return false
  if (card.standards?.[standardId]?.valid) return true
  if (standardId === 'iatf_16949' && card.iatfValid) return true
  if (standardId === 'iso_9001' && card.iso9001Valid) return true
  if (standardId === 'iso_13485' && card.iso13485Valid) return true
  if (standardId === 'fda' && card.fdaValid) return true
  if (standardId === 'ce_mark' && card.ceValid) return true
  return false
}

export function matchesIndustryPrimaryStandard(card, industryId) {
  const profile = getIndustryQualityProfile(industryId)
  return cardHasStandard(card, profile.filterStandardId)
}

export function reliabilityBadgesForCard(card, industryId) {
  if (!card) return []
  const defs = certStandardDefsForIndustry(industryId)
  return defs
    .filter((def) => cardHasStandard(card, def.id))
    .map((def) => ({ id: def.id, label: def.label, primary: def.id === getIndustryQualityProfile(industryId).primaryStandardId }))
}

export function scoreStandardsForIndustry(standards = {}, industryId, extras = {}) {
  const defs = certStandardDefsForIndustry(industryId)
  let score = 0
  defs.forEach((def) => {
    if (standards[def.id]?.valid) score += def.score
  })
  if (extras.traceMethod && extras.traceMethod !== 'none') score += 12
  if (extras.ppapLevels?.length) score += 10
  if (extras.processes?.length) score += 8
  if (extras.capabilityNote) score += 7
  if (extras.source === 'published') score += 5
  return Math.min(100, score)
}

/** Plant certificate dropdown options for IATF / QMS hub. */
export function plantCertStandardOptions(industryId) {
  return certStandardDefsForIndustry(industryId).map((row) => ({
    id: row.id,
    label: row.label,
  }))
}

/** Extra plant-QMS folder rows for an industry (merged into seed). */
export function industryPlantFolderSeed(industryId) {
  const space = 'plant-qms'
  const row = (id, parentId, name, sort, extra = {}) => ({
    id,
    parentId: parentId || '',
    space,
    name,
    slug: id.replace(/^folder-/, ''),
    sort,
    system: true,
    department: extra.department || '',
    docTypes: extra.docTypes || [],
    industry: industryId,
    ...extra,
  })

  if (industryId === 'medical') {
    return [
      row('folder-08-med-design', 'folder-plant-qms', '08 — Design & DHF', 80, { department: 'Engineering' }),
      row('folder-08-dhf', 'folder-08-med-design', 'Design history file (DHF)', 81, { docTypes: ['dhf_record'] }),
      row('folder-08-dmr', 'folder-08-med-design', 'Device master record (DMR)', 82, { docTypes: ['dmr_record'] }),
      row('folder-08-risk', 'folder-08-med-design', 'Risk management (ISO 14971)', 83, { docTypes: ['risk_file'] }),
      row('folder-09-med-reg', 'folder-plant-qms', '09 — Regulatory & validation', 90, { department: 'Quality' }),
      row('folder-09-validation', 'folder-09-med-reg', 'Process / sterilization validation', 91, { docTypes: ['validation_protocol'] }),
      row('folder-09-submissions', 'folder-09-med-reg', '510(k) / CE technical files', 92, { docTypes: ['regulatory_submission'] }),
      row('folder-09-biocompat', 'folder-09-med-reg', 'Biocompatibility / ISO 10993', 93),
      row('folder-06-13485', 'folder-06-certs', 'ISO 13485 certificates', 63),
    ]
  }

  if (industryId === 'automotive') {
    return [
      row('folder-08-customer-ppap', 'folder-02-ppap', 'Customer PPAP submissions', 24),
      row('folder-08-imds', 'folder-05-purch', 'IMDS / material declarations', 53),
    ]
  }

  if (industryId === 'electronics') {
    return [
      row('folder-08-ipc', 'folder-04-quality', '08 — IPC workmanship', 44, { docTypes: ['work_instruction'] }),
      row('folder-08-test', 'folder-04-quality', 'ICT / functional test', 45),
    ]
  }

  if (industryId === 'nuclear') {
    return [
      row('folder-08-nuclear-qa', 'folder-plant-qms', '08 — Nuclear QA records', 80, { department: 'Quality' }),
      row('folder-08-nqa', 'folder-08-nuclear-qa', 'NQA-1 / critical characteristics', 81),
    ]
  }

  return []
}
