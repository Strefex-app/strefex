import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import Home from './Home'
import IntelligentSourcingPage from './IntelligentSourcingPage'
import BuyerWorkspace from './BuyerWorkspace'
import './MarketplaceKeepAlive.css'

const TRACK_TABS = new Set(['track'])

/**
 * Keep Home + Sourcing mounted when switching between them so the world
 * geography (Home WorldMap / Sourcing iframe atlas) is not fetched again.
 * Pins still update from RFQs, activities, and sourcing filters.
 */
export default function MarketplaceKeepAlive() {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab')
  const isHome = pathname === '/main-menu'
  const isSourcingMap = pathname === '/sourcing' && !TRACK_TABS.has(tab)
  const isTrack = pathname === '/sourcing' && TRACK_TABS.has(tab)

  const [keepHome, setKeepHome] = useState(isHome)
  const [keepSourcing, setKeepSourcing] = useState(isSourcingMap)

  useEffect(() => {
    if (isHome) setKeepHome(true)
    if (isSourcingMap) setKeepSourcing(true)
  }, [isHome, isSourcingMap])

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
      {keepSourcing ? (
        <div
          className="marketplace-keepalive-pane"
          hidden={!isSourcingMap}
          inert={!isSourcingMap ? true : undefined}
        >
          <IntelligentSourcingPage />
        </div>
      ) : null}
      {isTrack ? <BuyerWorkspace /> : null}
    </>
  )
}
