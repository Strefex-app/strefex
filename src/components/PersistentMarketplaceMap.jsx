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
  const { iframeRef, frameReady } = usePersistentSourcingCanvas()
  const { pathname, search } = useLocation()

  useEffect(() => {
    setSurface(mapSurfaceFromPath(pathname, search))
  }, [pathname, search, setSurface])

  const view = surface === 'sourcing' ? sourcing : surface === 'hr' ? hr : home

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const sync = () => {
      if ((surface === 'home' || surface === 'hr') && viewports[surface]) {
        place(host, viewports[surface].getBoundingClientRect())
        return
      }
      if (surface === 'sourcing') {
        const frame = iframeRef.current
        const rect = readSourcingMapRect(frame, sourcing.slot)
        if (!rect) {
          park(host)
          return
        }
        place(host, rect)
        return
      }
      park(host)
    }
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    const frame = iframeRef.current
    const innerWin = frame?.contentWindow
    const innerDoc = frame?.contentDocument
    const slotEl = innerDoc?.querySelector('[data-stx-shared-map]')
    innerWin?.addEventListener('scroll', sync, true)
    innerWin?.addEventListener('resize', sync)
    const ro = typeof ResizeObserver !== 'undefined' && slotEl
      ? new ResizeObserver(sync)
      : null
    if (ro && slotEl) ro.observe(slotEl)
    const tick = surface === 'sourcing' ? window.setInterval(sync, 400) : null
    requestAnimationFrame(sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
      innerWin?.removeEventListener('scroll', sync, true)
      innerWin?.removeEventListener('resize', sync)
      ro?.disconnect()
      if (tick) window.clearInterval(tick)
    }
  }, [surface, viewports, sourcing.slot, iframeRef, frameReady])

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
          else if (surface === 'sourcing') setSourcingView({ selectedId: id })
        }}
      />
    </div>
  )
}

function readSourcingMapRect(iframe, postedSlot) {
  if (!iframe) return null
  const frameRect = iframe.getBoundingClientRect()
  if (frameRect.width < 8 || frameRect.height < 8) return null
  try {
    const el = iframe.contentDocument?.querySelector('[data-stx-shared-map]')
    if (el) {
      const r = el.getBoundingClientRect()
      if (r.width >= 8 && r.height >= 8) {
        return {
          top: frameRect.top + r.top,
          left: frameRect.left + r.left,
          width: r.width,
          height: r.height,
        }
      }
    }
  } catch { /* cross-origin or not ready */ }
  const slot = postedSlot
  if (!slot) return null
  const width = Number(slot.width || 0)
  const height = Number(slot.height || 0)
  if (width < 8 || height < 8) return null
  return {
    top: frameRect.top + Number(slot.top || 0),
    left: frameRect.left + Number(slot.left || 0),
    width,
    height,
  }
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
