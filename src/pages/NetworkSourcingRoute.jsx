import { Navigate, useSearchParams } from 'react-router-dom'
import BuyerWorkspace from './BuyerWorkspace'
import IntelligentSourcingPage from './IntelligentSourcingPage'

const TRACK_TABS = new Set(['track'])
/** Legacy create/send URLs → Sourcing map (RFQ overlay lives here). */
const CREATE_TABS = new Set(['create', 'send', 'rfq'])
const LEGACY_FIND = new Set(['find', 'discover', 'shortlist'])

/**
 * Network main-menu Sourcing:
 * - default → Intelligent Sourcing (map, compare, RFQ)
 * - ?tab=track → BuyerWorkspace track quotes
 * - ?tab=create|send|rfq → Sourcing (create path)
 * - legacy find tabs → clean Intelligent Sourcing URL
 */
export default function NetworkSourcingRoute() {
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab')
  if (LEGACY_FIND.has(tab) || CREATE_TABS.has(tab)) {
    return <Navigate to="/hub/procurement" replace />
  }
  if (TRACK_TABS.has(tab)) {
    return <BuyerWorkspace />
  }
  return <IntelligentSourcingPage />
}
