import { useSearchParams } from 'react-router-dom'
import BuyerWorkspace from './BuyerWorkspace'
import IntelligentSourcingPage from './IntelligentSourcingPage'

const TRACK_TABS = new Set(['track'])

/**
 * Marketplace Sourcing at /sourcing:
 * - default → Intelligent Sourcing (map, compare, RFQ)
 * - ?tab=track → quote tracking
 */
export default function NetworkSourcingRoute() {
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab')
  if (TRACK_TABS.has(tab)) {
    return <BuyerWorkspace />
  }
  return <IntelligentSourcingPage />
}
