import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import WorldMap from './WorldMap'
import useMarketplaceMapStore, { mapSurfaceFromPath } from '../store/marketplaceMapStore'
import './PersistentMarketplaceMap.css'

/**
 * Shared WorldMap for Home and People HR. Sourcing draws its own map inside
 * the iframe so it scrolls with the page (no JS overlay).
 */
export default function PersistentMarketplaceMap() {
  const hostRef = useRef(null)
  const surface = useMarketplaceMapStore((s) => s.surface)
  const setSurface = useMarketplaceMapStore((s) => s.setSurface)
  const home = useMarketplaceMapStore((s) => s.home)
  const hr = useMarketplaceMapStore((s) => s.hr)
  const viewports = useMarketplaceMapStore((s) => s.viewports)
  const setHomeView = useMarketplaceMapStore((s) => s.setHomeView)
  const setHrView = useMarketplaceMapStore((s) => s.setHrView)
  const { pathname } = useLocation()

  useEffect(() => {
    setSurface(mapSurfaceFromPath(pathname))
  }, [pathname, setSurface])

  const view = surface === 'hr' ? hr : home

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    let raf = 0
    const sync = () => {
      raf = 0
      if ((surface === 'home' || surface === 'hr') && viewports[surface]) {
        place(host, viewports[surface].getBoundingClientRect())
        return
      }
      park(host)
    }
    const schedule = () => {
      if (raf) return
      raf = window.requestAnimationFrame(sync)
    }
    sync()
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    const viewport = viewports[surface]
    let ro
    if (viewport && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(schedule)
      ro.observe(viewport)
    }
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
      ro?.disconnect()
    }
  }, [surface, viewports])

  const showLane = view.showLane !== false && Boolean(view.plantLocation)

  return (
    <div
      ref={hostRef}
      className="persistent-marketplace-map is-parked"
      aria-hidden="true"
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
