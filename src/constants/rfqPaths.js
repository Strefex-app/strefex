/** Canonical Sourcing paths under /management/sourcing/… */
export const SOURCING_CLUSTER_PATH = '/management/sourcing'
export const SOURCING_WORKSPACE_PATH = '/management/sourcing/workspace'
export const RFQ_PROCUREMENT_NEW_PATH = '/management/sourcing/register/new'
export const RFQ_INTELLIGENCE_PATH = '/management/sourcing/intelligence'

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
  const params = new URLSearchParams(searchOrParams)
  const q = params.toString()
  return q ? `${RFQ_INTELLIGENCE_PATH}?${q}` : RFQ_INTELLIGENCE_PATH
}
