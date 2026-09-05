/** Canonical Sourcing paths under /management/sourcing/… */
export const SOURCING_CLUSTER_PATH = '/management/sourcing'
/** Legacy workspace URL — redirects to company price calculator. */
export const SOURCING_WORKSPACE_PATH = '/management/sourcing/workspace'
/** Primary Network Sourcing workspace (Intelligent Sourcing design). */
export const BUYER_WORKSPACE_PATH = '/hub/procurement'
/** Track quotes only — same path with tab. */
export const BUYER_TRACK_PATH = '/hub/procurement?tab=track'
/** Legacy alias — same page, prefer BUYER_WORKSPACE_PATH in new links. */
export const BUYER_WORKSPACE_LEGACY_PATH = '/dashboard/buyer'
export const RFQ_PROCUREMENT_NEW_PATH = '/management/sourcing/register/new'
export const RFQ_INTELLIGENCE_PATH = '/management/sourcing/intelligence'

/** Company-mode price calculator + editable rate / tariff database */
export const COMPANY_MFG_CALC_PATH = '/management/sourcing/price-calculator'

/** @deprecated Use SOURCING_WORKSPACE_PATH */
export const SOURCING_HUB_PATH = SOURCING_WORKSPACE_PATH
/** @deprecated Use SOURCING_WORKSPACE_PATH */
export const RFQ_HUB_PATH = SOURCING_WORKSPACE_PATH

/** Build RFQ Intelligence URL with optional query string or params object. */
export function rfqIntelligenceUrl(searchOrParams = '') {
  if (typeof searchOrParams === 'string') {
    if (!searchOrParams) return RFQ_INTELLIGENCE_PATH
    return searchOrParams.startsWith('?')
      ? `${RFQ_INTELLIGENCE_PATH}${searchOrParams}`
      : `${RFQ_INTELLIGENCE_PATH}?${searchOrParams}`
  }
  const params = new URLSearchParams()
  Object.entries(searchOrParams || {}).forEach(([key, value]) => {
    if (value == null || value === '') return
    params.set(key, String(value))
  })
  const q = params.toString()
  return q ? `${RFQ_INTELLIGENCE_PATH}?${q}` : RFQ_INTELLIGENCE_PATH
}

export function companyMfgCalcUrl(searchOrParams = '') {
  if (typeof searchOrParams === 'string') {
    if (!searchOrParams) return COMPANY_MFG_CALC_PATH
    return searchOrParams.startsWith('?')
      ? `${COMPANY_MFG_CALC_PATH}${searchOrParams}`
      : `${COMPANY_MFG_CALC_PATH}?${searchOrParams}`
  }
  const params = new URLSearchParams()
  Object.entries(searchOrParams || {}).forEach(([key, value]) => {
    if (value == null || value === '') return
    params.set(key, String(value))
  })
  const q = params.toString()
  return q ? `${COMPANY_MFG_CALC_PATH}?${q}` : COMPANY_MFG_CALC_PATH
}

/** Build Executive Summary URL for industry / category context. */
export function executiveSummaryUrl(searchOrParams = '') {
  if (typeof searchOrParams === 'string') {
    if (!searchOrParams) return '/executive-summary'
    return searchOrParams.startsWith('/')
      ? searchOrParams
      : `/executive-summary?${searchOrParams.replace(/^\?/, '')}`
  }
  const { industryId, categoryId } = searchOrParams || {}
  if (industryId && categoryId) {
    return `/industry/${encodeURIComponent(industryId)}/equipment/${encodeURIComponent(categoryId)}/executive-summary`
  }
  if (industryId) {
    return `/industry/${encodeURIComponent(industryId)}/executive-summary`
  }
  return '/executive-summary'
}

/** Build Buyer Workspace URL with optional tab and prefill params. */
export function buyerWorkspaceUrl(searchOrParams = '') {
  if (typeof searchOrParams === 'string') {
    if (!searchOrParams) return BUYER_WORKSPACE_PATH
    return searchOrParams.startsWith('?')
      ? `${BUYER_WORKSPACE_PATH}${searchOrParams}`
      : `${BUYER_WORKSPACE_PATH}?${searchOrParams}`
  }
  const params = new URLSearchParams()
  Object.entries(searchOrParams || {}).forEach(([key, value]) => {
    if (value == null || value === '') return
    params.set(key, String(value))
  })
  const q = params.toString()
  return q ? `${BUYER_WORKSPACE_PATH}?${q}` : BUYER_WORKSPACE_PATH
}

/** Deep link into Network RFQ create — Sourcing when no industry; ES when industry is known. */
export function networkRfqCreateUrl(searchOrParams = '') {
  const withOpenRfq = (path) => (path.includes('?') ? `${path}&openRfq=1` : `${path}?openRfq=1`)

  if (typeof searchOrParams === 'string') {
    const q = searchOrParams.replace(/^\?/, '')
    if (!q) return BUYER_WORKSPACE_PATH
    const params = new URLSearchParams(q)
    const industryId = params.get('industryId')
    const categoryId = params.get('categoryId')
    if (industryId) {
      return withOpenRfq(executiveSummaryUrl({ industryId, categoryId: categoryId || undefined }))
    }
    return BUYER_WORKSPACE_PATH
  }
  const { industryId, categoryId } = searchOrParams || {}
  if (industryId) {
    return withOpenRfq(executiveSummaryUrl({ industryId, categoryId: categoryId || undefined }))
  }
  return BUYER_WORKSPACE_PATH
}
