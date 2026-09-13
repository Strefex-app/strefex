import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import Home from './Home'
import IntelligentSourcingPage from './IntelligentSourcingPage'
import BuyerWorkspace from './BuyerWorkspace'
import { fetchSourcingNetworkAccounts } from '../services/sourcingNetworkService'
import { useAccountRegistry } from '../store/accountRegistry'
import { useSourcingFramePlatformSync } from '../hooks/useSourcingFramePlatformSync'
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
  const [networkTick, setNetworkTick] = useState(0)
  const mergeNetworkAccounts = useAccountRegistry((s) => s.mergeNetworkAccounts)
  useSourcingFramePlatformSync()

  useEffect(() => {
    if (isHome) setKeepHome(true)
  }, [isHome])

  useEffect(() => {
    const bump = () => setNetworkTick((n) => n + 1)
    window.addEventListener('strefex-sourcing-network-invalidate', bump)
    return () => window.removeEventListener('strefex-sourcing-network-invalidate', bump)
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer = 0
    let attempt = 0
    const delays = [0, 1500, 4000, 12000]

    const run = () => {
      fetchSourcingNetworkAccounts({ limit: 800, force: networkTick > 0 || attempt > 0 })
        .then((rows) => {
          if (cancelled) return
          if (rows.length) {
            mergeNetworkAccounts(rows)
            return
          }
          if (attempt < delays.length - 1) {
            attempt += 1
            timer = window.setTimeout(run, delays[attempt])
          }
        })
        .catch(() => {
          if (cancelled) return
          if (attempt < delays.length - 1) {
            attempt += 1
            timer = window.setTimeout(run, delays[attempt])
          }
        })
    }
    run()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [mergeNetworkAccounts, networkTick])

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
