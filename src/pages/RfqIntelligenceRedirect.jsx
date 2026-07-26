import { Navigate, useLocation } from 'react-router-dom'
import { RFQ_INTELLIGENCE_PATH } from '../constants/rfqPaths'

/** Legacy `/rfq-intelligence` → Sourcing Intelligence (preserves query). */
export default function RfqIntelligenceRedirect() {
  const { search } = useLocation()
  return <Navigate to={`${RFQ_INTELLIGENCE_PATH}${search}`} replace />
}
