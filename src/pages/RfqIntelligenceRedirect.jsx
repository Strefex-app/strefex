import { Navigate, useLocation } from 'react-router-dom'

/** Legacy `/rfq-intelligence` → Management RFQ Intelligence (preserves query). */
export default function RfqIntelligenceRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/management/rfq/intelligence${search}`} replace />
}
