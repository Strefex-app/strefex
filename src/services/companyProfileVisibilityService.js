import {
  EXTRA_PROFILE_KEYS,
  isSellerLikeAccountType,
  MANDATORY_PROFILE_KEYS,
  PROFILE_ATTACHMENT_SLOT,
  VISIBILITY_TIER,
} from '../constants/companyProfileDirectory'

function norm(s) {
  return String(s || '').trim()
}

function attachmentList(company) {
  const raw = company?.profile_attachments
  return Array.isArray(raw) ? raw : []
}

function countBySlot(company, slot) {
  return attachmentList(company).filter((a) => (a?.profile_slot || 'other') === slot).length
}

function hasPresentation(company) {
  const list = attachmentList(company)
  if (list.some((a) => (a?.profile_slot || 'other') === PROFILE_ATTACHMENT_SLOT.COMPANY_PRESENTATION)) {
    return true
  }
  const presMime = /pdf|presentation|powerpoint/i
  return list.some((a) => presMime.test(String(a?.mime_type || '')) || /\.(pdf|pptx?)$/i.test(String(a?.name || '')))
}

function countProductionPhotos(company) {
  const list = attachmentList(company)
  return list.filter((a) => {
    if ((a?.profile_slot || 'other') !== PROFILE_ATTACHMENT_SLOT.PRODUCTION_PHOTO) return false
    const mt = String(a?.mime_type || '').toLowerCase()
    return mt.startsWith('image/')
  }).length
}

function countProductionVideos(company) {
  return attachmentList(company).filter((a) => {
    if ((a?.profile_slot || 'other') !== PROFILE_ATTACHMENT_SLOT.PRODUCTION_VIDEO) return false
    const mt = String(a?.mime_type || '').toLowerCase()
    return mt.startsWith('video/')
  }).length
}

/**
 * Evaluate mandatory / extra checklist for a company row (+ profile metadata).
 * @param {object} company — companies.* shape (may include nested metadata)
 */
export function evaluateCompanyProfileDirectory(company) {
  const accountType = norm(company?.account_type) || 'seller'
  const md = company?.metadata && typeof company.metadata === 'object' ? company.metadata : {}

  if (!isSellerLikeAccountType(accountType)) {
    return {
      accountType,
      mandatory: {},
      extra: {},
      mandatoryComplete: true,
      extraComplete: true,
      visibilityTier: VISIBILITY_TIER.STANDARD,
    }
  }

  const industries = Array.isArray(company?.industries) ? company.industries : []
  const summary = norm(md.company_summary)
  const addrLine = norm(company?.address || md.address)
  const geoOk = norm(company?.country) && norm(company?.city)

  const mandatory = {
    [MANDATORY_PROFILE_KEYS.LEGAL_NAME]: norm(company?.name).length >= 2,
    [MANDATORY_PROFILE_KEYS.REGISTERED_ADDRESS]: addrLine.length >= 8,
    [MANDATORY_PROFILE_KEYS.BUSINESS_EMAIL]: norm(company?.email).includes('@'),
    [MANDATORY_PROFILE_KEYS.BUSINESS_PHONE]: norm(company?.phone).replace(/\D/g, '').length >= 8,
    [MANDATORY_PROFILE_KEYS.WEBSITE]: norm(company?.website).length >= 4,
    [MANDATORY_PROFILE_KEYS.GEOGRAPHY]: Boolean(geoOk),
    [MANDATORY_PROFILE_KEYS.COMPANY_SUMMARY]: summary.length >= 40,
    [MANDATORY_PROFILE_KEYS.INDUSTRIES]: industries.length > 0,
    [MANDATORY_PROFILE_KEYS.COMPANY_PRESENTATION]: hasPresentation(company),
  }

  const extra = {
    [EXTRA_PROFILE_KEYS.PRODUCTION_PHOTOS]: countProductionPhotos(company) >= 2,
    [EXTRA_PROFILE_KEYS.PRODUCTION_VIDEOS]: countProductionVideos(company) >= 1,
  }

  const mandatoryComplete = Object.values(mandatory).every(Boolean)
  const extraComplete = Object.values(extra).every(Boolean)

  let visibilityTier = VISIBILITY_TIER.INCOMPLETE
  if (company?.external_audit_status === 'passed') {
    visibilityTier = VISIBILITY_TIER.VERIFIED
  } else if (mandatoryComplete && extraComplete) {
    visibilityTier = VISIBILITY_TIER.PREMIUM
  } else if (mandatoryComplete) {
    visibilityTier = VISIBILITY_TIER.STANDARD
  }

  return {
    accountType,
    mandatory,
    extra,
    mandatoryComplete,
    extraComplete,
    visibilityTier,
    evaluatedAt: new Date().toISOString(),
  }
}

/**
 * Fields to merge into companies UPDATE (visibility_tier + metadata.profile_directory).
 */
export function buildCompanyVisibilityUpdate(company) {
  const snapshot = evaluateCompanyProfileDirectory(company)
  const prevMd = company?.metadata && typeof company.metadata === 'object' ? company.metadata : {}
  return {
    visibility_tier: snapshot.visibilityTier,
    metadata: {
      ...prevMd,
      profile_directory: snapshot,
    },
  }
}

/** Sort weight for RFQ / discovery (higher = more prominent). */
export function visibilityTierRank(tier) {
  if (tier === VISIBILITY_TIER.VERIFIED) return 4
  if (tier === VISIBILITY_TIER.PREMIUM) return 3
  if (tier === VISIBILITY_TIER.STANDARD) return 2
  return 1
}
