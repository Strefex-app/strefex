/**
 * Company profile directory — mandatory vs extra (seller & service provider).
 * Visibility: standard (mandatory met) → premium (extra met) → verified (external audit).
 */

export const PROFILE_ATTACHMENT_SLOT = {
  COMPANY_PRESENTATION: 'company_presentation',
  PRODUCTION_PHOTO: 'production_photo',
  PRODUCTION_VIDEO: 'production_video',
  OTHER: 'other',
}

export const PROFILE_ATTACHMENT_SLOT_LABELS = {
  [PROFILE_ATTACHMENT_SLOT.COMPANY_PRESENTATION]: 'Company presentation (required for full profile)',
  [PROFILE_ATTACHMENT_SLOT.PRODUCTION_PHOTO]: 'Production / facility photo',
  [PROFILE_ATTACHMENT_SLOT.PRODUCTION_VIDEO]: 'Real production video',
  [PROFILE_ATTACHMENT_SLOT.OTHER]: 'Other document',
}

/** Keys stored under companies.metadata.profile_directory.mandatory */
export const MANDATORY_PROFILE_KEYS = {
  LEGAL_NAME: 'legal_name',
  REGISTERED_ADDRESS: 'registered_address',
  BUSINESS_EMAIL: 'business_email',
  BUSINESS_PHONE: 'business_phone',
  WEBSITE: 'website',
  GEOGRAPHY: 'geography',
  COMPANY_SUMMARY: 'company_summary',
  INDUSTRIES: 'industries',
  COMPANY_PRESENTATION: 'company_presentation',
}

export const EXTRA_PROFILE_KEYS = {
  PRODUCTION_PHOTOS: 'production_photos',
  PRODUCTION_VIDEOS: 'production_videos',
}

export const VISIBILITY_TIER = {
  INCOMPLETE: 'incomplete',
  STANDARD: 'standard',
  PREMIUM: 'premium',
  VERIFIED: 'verified',
}

export const VISIBILITY_TIER_LABELS = {
  [VISIBILITY_TIER.INCOMPLETE]: 'Limited visibility',
  [VISIBILITY_TIER.STANDARD]: 'Standard platform visibility',
  [VISIBILITY_TIER.PREMIUM]: 'Premium RFQ visibility',
  [VISIBILITY_TIER.VERIFIED]: 'Verified seller / service provider',
}

export function isSellerLikeAccountType(accountType) {
  return accountType === 'seller' || accountType === 'service_provider'
}
