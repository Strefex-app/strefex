import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import Home from './Home'
import IntelligentSourcingPage from './IntelligentSourcingPage'
import BuyerWorkspace from './BuyerWorkspace'
import { fetchSourcingNetworkAccounts } from '../services/sourcingNetworkService'
import { useAccountRegistry } from '../store/accountRegistry'
import './MarketplaceKeepAlive.css'

const TRACK_TABS = new Set(['track'])

/**
 * Keep Home mounted when switching to Sourcing so WorldMap geography stays
 * in memory. The Sourcing iframe is parked separately (PersistentSourcingCanvas)
 * so leaving /sourcing does not re-download the atlas.
 */
export default function MarketplaceKeepAlive() {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab')
  const isHome = pathname === '/main-menu'
  const isSourcingMap = pathname === '/sourcing' && !TRACK_TABS.has(tab)
  const isTrack = pathname === '/sourcing' && TRACK_TABS.has(tab)

  const [keepHome, setKeepHome] = useState(isHome)
  const mergeNetworkAccounts = useAccountRegistry((s) => s.mergeNetworkAccounts)

  useEffect(() => {
    if (isHome) setKeepHome(true)
  }, [isHome])

  useEffect(() => {
    let cancelled = false
    fetchSourcingNetworkAccounts({ limit: 800 }).then((rows) => {
      if (cancelled || !rows.length) return
      mergeNetworkAccounts(rows)
    })
    return () => { cancelled = true }
  }, [mergeNetworkAccounts])

  return (
    <>
      {keepHome ? (
        <div
          className="marketplace-keepalive-pane"
          hidden={!isHome}
          inert={!isHome ? true : undefined}
        >
          <Home />
        </div>
      ) : null}
      {isSourcingMap ? <IntelligentSourcingPage /> : null}
      {isTrack ? <BuyerWorkspace /> : null}
    </>
  )
}
