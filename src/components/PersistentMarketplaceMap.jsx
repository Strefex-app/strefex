import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import WorldMap from './WorldMap'
import { usePersistentSourcingCanvas } from './PersistentSourcingCanvas'
import useMarketplaceMapStore, { mapSurfaceFromPath } from '../store/marketplaceMapStore'
import './PersistentMarketplaceMap.css'

/**
 * Single world geography for Home, Sourcing, and People HR.
 * Pins come from the active surface only.
 */
export default function PersistentMarketplaceMap() {
  const hostRef = useRef(null)
  const surface = useMarketplaceMapStore((s) => s.surface)
  const setSurface = useMarketplaceMapStore((s) => s.setSurface)
  const home = useMarketplaceMapStore((s) => s.home)
  const sourcing = useMarketplaceMapStore((s) => s.sourcing)
  const hr = useMarketplaceMapStore((s) => s.hr)
  const viewports = useMarketplaceMapStore((s) => s.viewports)
  const setHomeView = useMarketplaceMapStore((s) => s.setHomeView)
  const setSourcingView = useMarketplaceMapStore((s) => s.setSourcingView)
  const setHrView = useMarketplaceMapStore((s) => s.setHrView)
  const { iframeRef } = usePersistentSourcingCanvas()
  const { pathname, search } = useLocation()

  useEffect(() => {
    setSurface(mapSurfaceFromPath(pathname, search))
  }, [pathname, search, setSurface])

  const view = surface === 'sourcing' ? sourcing : surface === 'hr' ? hr : home
  const live = surface === 'home'
    || surface === 'hr'
    || (surface === 'sourcing' && Boolean(sourcing.slot))

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const sync = () => {
      if ((surface === 'home' || surface === 'hr') && viewports[surface]) {
        place(host, viewports[surface].getBoundingClientRect())
        return
      }
      if (surface === 'sourcing' && sourcing.slot) {
        const frame = iframeRef.current
        const fr = frame ? frame.getBoundingClientRect() : null
        if (!fr || fr.width < 8) {
          park(host)
          return
        }
        place(host, {
          top: fr.top + Number(sourcing.slot.top || 0),
          left: fr.left + Number(sourcing.slot.left || 0),
          width: Number(sourcing.slot.width || 0),
          height: Number(sourcing.slot.height || 0),
        })
        return
      }
      park(host)
    }
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [surface, viewports, sourcing.slot, iframeRef])

  const showLane = view.showLane !== false && Boolean(view.plantLocation)

  return (
    <div
      ref={hostRef}
      className={`persistent-marketplace-map${live ? ' is-live' : ' is-parked'}`}
      aria-hidden={!live}
    >
      <WorldMap
        variant="sourcing"
        locations={Array.isArray(view.locations) ? view.locations : []}
        plantLocation={view.plantLocation || null}
        selectedId={view.selectedId || null}
        metric={view.metric || 'risk'}
        showLane={showLane}
        lanes={view.lanes}
        fit="xMidYMid meet"
        onMarkerClick={(loc) => {
          const id = loc?.id || null
          if (surface === 'home') setHomeView({ selectedId: id })
          else if (surface === 'hr') setHrView({ selectedId: id })
          else if (surface === 'sourcing') setSourcingView({ selectedId: id })
        }}
      />
    </div>
  )
}

function park(host) {
  host.classList.add('is-parked')
  host.classList.remove('is-live')
  host.setAttribute('aria-hidden', 'true')
}

function place(host, r) {
  const width = Math.max(0, Math.round(r.width || 0))
  const height = Math.max(0, Math.round(r.height || 0))
  if (width < 8 || height < 8) {
    park(host)
    return
  }
  host.classList.remove('is-parked')
  host.classList.add('is-live')
  host.setAttribute('aria-hidden', 'false')
  host.style.top = `${Math.round(r.top)}px`
  host.style.left = `${Math.round(r.left)}px`
  host.style.width = `${width}px`
  host.style.height = `${height}px`
}
