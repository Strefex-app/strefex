import { Navigate } from 'react-router-dom'
import { COMPANY_MFG_CALC_PATH } from '../constants/rfqPaths'

/** Legacy Management Sourcing workspace — Network RFQ lives on Home → Executive Summary. */
export default function RfqManagementHub() {
  return <Navigate to={COMPANY_MFG_CALC_PATH} replace />
}
