import {
  PROFILE_ATTACHMENT_SLOT,
  LEGACY_PLATFORM_RECOGNITION_SLOTS,
} from '../constants/companyProfileDirectory'

function norm(s) {
  return String(s ?? '').trim()
}

function digits(s) {
  return norm(s).replace(/\D/g, '')
}

function attachmentsList(tenant) {
  const raw = tenant?.profile_attachments
  return Array.isArray(raw) ? raw : []
}

/** True if tenant has persisted attachment with this slot. */
export function hasProfileSlot(tenant, slot) {
  return attachmentsList(tenant).some((a) => (a?.profile_slot || PROFILE_ATTACHMENT_SLOT.OTHER) === slot)
}

/** Declared docs: `{ companyProfile, productPortfolio }` each `{ fileName, ... }` or null — supports legacy pdf/ppt keys. */
export function normalizeDeclaredDocs(raw) {
  if (!raw || typeof raw !== 'object') return { companyProfile: null, productPortfolio: null }

  function pick(meta) {
    return meta?.fileName ? meta : null
  }

  const companyProfile =
    pick(raw.companyProfile) ||
    pick(raw.companyProfilePdf) ||
    pick(raw.companyProfilePpt)

  const productPortfolio =
    pick(raw.productPortfolio) ||
    pick(raw.productPortfolioPdf) ||
    pick(raw.productPortfolioPpt)

  return { companyProfile: companyProfile ?? null, productPortfolio: productPortfolio ?? null }
}

function hasTenantSlotAny(tenant, slots) {
  return slots.some((slot) => hasProfileSlot(tenant, slot))
}

function hasCompanyProfileDocAttachment(tenant) {
  if (hasProfileSlot(tenant, PROFILE_ATTACHMENT_SLOT.COMPANY_PROFILE_DOC)) return true
  return hasTenantSlotAny(tenant, [
    LEGACY_PLATFORM_RECOGNITION_SLOTS.COMPANY_PROFILE_PDF,
    LEGACY_PLATFORM_RECOGNITION_SLOTS.COMPANY_PROFILE_PPT,
  ])
}

function hasProductPortfolioDocAttachment(tenant) {
  if (hasProfileSlot(tenant, PROFILE_ATTACHMENT_SLOT.PRODUCT_PORTFOLIO_DOC)) return true
  return hasTenantSlotAny(tenant, [
    LEGACY_PLATFORM_RECOGNITION_SLOTS.PRODUCT_PORTFOLIO_PDF,
    LEGACY_PLATFORM_RECOGNITION_SLOTS.PRODUCT_PORTFOLIO_PPT,
  ])
}

function hasCompanyProfileDoc(tenant, declaredNorm) {
  if (declaredNorm?.companyProfile?.fileName) return true
  return hasCompanyProfileDocAttachment(tenant)
}

function hasProductPortfolioDoc(tenant, declaredNorm) {
  if (declaredNorm?.productPortfolio?.fileName) return true
  return hasProductPortfolioDocAttachment(tenant)
}

const AUDIT_KEYWORDS = [
  'iatf',
  'vda',
  'iso 9001',
  'iso9001',
  'iso 14001',
  'iso14001',
  'tisax',
  'as9100',
  'as 9100',
  'nadcap',
]

/**
 * Evaluate platform recognition checklist (equal-weight → ratio → stars).
 * Consolidated attachments: optional PDF OR PowerPoint per category.
 */
export function evaluatePlatformRecognition({ tenant = null, user = null, store = {} } = {}) {
  const md = tenant?.metadata && typeof tenant.metadata === 'object' ? tenant.metadata : {}

  const registrationLegal =
    norm(store.registrationLegalName) ||
    norm(md.registration_legal_name) ||
    norm(md.legal_registered_name)

  const addr =
    norm(tenant?.address) ||
    norm(md.address) ||
    norm(store.addressLineOverride)
  const country = norm(tenant?.country) || norm(store.countryOverride)
  const city = norm(tenant?.city) || norm(store.cityOverride)

  const phone = digits(user?.phone || tenant?.phone || store.contactPhoneOverride)
  const declaredNorm = normalizeDeclaredDocs(store.declaredDocs || {})

  const departments = Array.isArray(store.departments) ? store.departments : []
  const validDept = departments.filter((d) => norm(d?.name).length >= 2 && Number(d?.headcount) >= 1)
  const deptSum = validDept.reduce((s, d) => s + Number(d.headcount), 0)

  const productLines = norm(store.productPortfolioText)
    .split(/\n|;/)
    .map((x) => norm(x))
    .filter(Boolean)

  const checklist = []

  function add(id, label, ok) {
    checklist.push({ id, label, ok })
    return ok
  }

  add('company_name', 'Company name', norm(tenant?.name).length >= 2)
  add('registration_name', 'Registration (legal entity) name', registrationLegal.length >= 2 || norm(tenant?.name).length >= 4)
  add('registration_location', 'Registration location (country, city, street/address)', Boolean(country.length >= 2 && city.length >= 2 && addr.length >= 6))
  add('contact_phone', 'Business contact phone', phone.length >= 8)
  add('business_email', 'Verified business email on account', Boolean(norm(user?.email).includes('@')))
  add('website', 'Company website', norm(tenant?.website).length >= 4)
  add(
    'licenses_certifications',
    'License categories & certifications (summary)',
    norm(store.licenseCertifications).length >= 12,
  )
  add('company_profile_doc', 'Company profile PDF or PowerPoint (optional)', hasCompanyProfileDoc(tenant, declaredNorm))
  add(
    'product_portfolio_text',
    'Product portfolio (written list, one item per line)',
    productLines.length >= 1 && productLines.join(' ').length >= 8,
  )
  add('product_portfolio_doc', 'Product portfolio PDF or PowerPoint (optional)', hasProductPortfolioDoc(tenant, declaredNorm))
  add(
    'organization_structure',
    'Organization structure (departments + headcount per department)',
    validDept.length >= 1 && deptSum >= 1,
  )
  add('machine_park', 'Capabilities — machine park / key equipment', norm(store.machinePark).length >= 15)
  add(
    'manufacturing_capabilities',
    'Manufacturing capabilities (capacity, availability, processes)',
    norm(store.manufacturingCapabilities).length >= 20,
  )
  add(
    'lead_time',
    'Average lead time (days or stated range)',
    (() => {
      const n = Number(store.leadTimeAvgDays)
      if (Number.isFinite(n) && n > 0) return true
      return norm(store.leadTimeNote).length >= 6
    })(),
  )

  const auditText = norm(store.auditLogsDetail).toLowerCase()
  const keywordHits = AUDIT_KEYWORDS.filter((k) => auditText.includes(k.toLowerCase())).length
  const standardsChosen = Array.isArray(store.auditStandards) ? store.auditStandards.length : 0
  add(
    'audit_standards',
    'Quality / audit programs (e.g. IATF 16949, VDA 6.x, ISO 9001 & 14001, TISAX, AS9100…) documented',
    auditText.length >= 40 || keywordHits >= 2 || standardsChosen >= 2,
  )

  const ind = Array.isArray(store.auditIndustryFocus) ? store.auditIndustryFocus : []
  add(
    'audit_industries',
    'Industry scopes for audits (automotive, medical, aerospace, oil & gas, …)',
    ind.length >= 1,
  )

  const filled = checklist.filter((c) => c.ok).length
  const total = checklist.length
  const ratio = total > 0 ? filled / total : 0

  const stars = Math.max(0, Math.min(5, Math.round(ratio * 5)))
  const missingForFiveStars = checklist.filter((c) => !c.ok).map((c) => c.label)

  return {
    checklist,
    filled,
    total,
    ratio,
    stars,
    percent: Math.round(ratio * 100),
    missingForFiveStars,
  }
}

/** Payload merged into companies.metadata.platform_recognition */
export function serializePlatformRecognitionStore(storeSlice) {
  if (!storeSlice || typeof storeSlice !== 'object') return {}
  const {
    registrationLegalName,
    addressLineOverride,
    countryOverride,
    cityOverride,
    contactPhoneOverride,
    licenseCertifications,
    productPortfolioText,
    departments,
    machinePark,
    manufacturingCapabilities,
    leadTimeAvgDays,
    leadTimeNote,
    auditLogsDetail,
    auditStandards,
    auditIndustryFocus,
    declaredDocs,
  } = storeSlice

  const decl = normalizeDeclaredDocs(declaredDocs)

  return {
    registrationLegalName: norm(registrationLegalName) || undefined,
    addressLineOverride: norm(addressLineOverride) || undefined,
    countryOverride: norm(countryOverride) || undefined,
    cityOverride: norm(cityOverride) || undefined,
    contactPhoneOverride: norm(contactPhoneOverride) || undefined,
    licenseCertifications: norm(licenseCertifications) || undefined,
    productPortfolioText: norm(productPortfolioText) || undefined,
    departments: Array.isArray(departments) ? departments : [],
    machinePark: norm(machinePark) || undefined,
    manufacturingCapabilities: norm(manufacturingCapabilities) || undefined,
    leadTimeAvgDays: leadTimeAvgDays === '' || leadTimeAvgDays == null ? undefined : Number(leadTimeAvgDays),
    leadTimeNote: norm(leadTimeNote) || undefined,
    auditLogsDetail: norm(auditLogsDetail) || undefined,
    auditStandards: Array.isArray(auditStandards) ? auditStandards : [],
    auditIndustryFocus: Array.isArray(auditIndustryFocus) ? auditIndustryFocus : [],
    declaredDocs:
      decl.companyProfile || decl.productPortfolio
        ? { companyProfile: decl.companyProfile, productPortfolio: decl.productPortfolio }
        : {},
  }
}
