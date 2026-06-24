/** Canonical RFQ routes under Management (not Profile / Buyers hub). */
export const RFQ_HUB_PATH = '/management/rfq'
export const RFQ_PROCUREMENT_NEW_PATH = '/management/rfq/new'
export const RFQ_INTELLIGENCE_PATH = '/management/rfq/intelligence'

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
