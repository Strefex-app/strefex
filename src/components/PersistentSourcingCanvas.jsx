import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import './PersistentSourcingCanvas.css'

export const SOURCING_FRAME_SRC = '/intelligent-sourcing/index.html?embed=1&v=20260910f'

const SourcingCanvasContext = createContext({
  attachSlot: () => {},
  iframeRef: { current: null },
  frameReady: false,
})

export function usePersistentSourcingCanvas() {
  return useContext(SourcingCanvasContext)
}

/**
 * One Intelligent Sourcing iframe for the session. Parked off-screen when
 * leaving /sourcing so the world atlas is not downloaded again.
 */
export function PersistentSourcingCanvasProvider({ children }) {
  const iframeRef = useRef(null)
  const hostRef = useRef(null)
  const slotRef = useRef(null)
  const [booted, setBooted] = useState(false)
  const [frameReady, setFrameReady] = useState(false)
  const [live, setLive] = useState(false)

  const attachSlot = useCallback((el) => {
    slotRef.current = el
    if (el) setBooted(true)
    setLive(Boolean(el))
  }, [])

  useLayoutEffect(() => {
    const host = hostRef.current
    const slot = slotRef.current
    if (!host) return undefined
    const sync = () => {
      if (!live || !slot) {
        host.classList.add('is-parked')
        host.classList.remove('is-live')
        host.setAttribute('aria-hidden', 'true')
        return
      }
      const r = slot.getBoundingClientRect()
      host.classList.remove('is-parked')
      host.classList.add('is-live')
      host.setAttribute('aria-hidden', 'false')
      host.style.top = `${Math.round(r.top)}px`
      host.style.left = `${Math.round(r.left)}px`
      host.style.width = `${Math.max(0, Math.round(r.width))}px`
      host.style.height = `${Math.max(0, Math.round(r.height))}px`
    }
    sync()
    if (!live || !slot) return undefined
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null
    if (ro) ro.observe(slot)
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [live])

  const value = useMemo(
    () => ({ attachSlot, iframeRef, frameReady }),
    [attachSlot, frameReady],
  )

  return (
    <SourcingCanvasContext.Provider value={value}>
      {children}
      <div ref={hostRef} className="persistent-sourcing-canvas is-parked" aria-hidden="true">
        {booted ? (
          <iframe
            ref={iframeRef}
            className="persistent-sourcing-canvas__frame"
            title="Intelligent Sourcing"
            src={SOURCING_FRAME_SRC}
            onLoad={() => setFrameReady(true)}
          />
        ) : null}
      </div>
    </SourcingCanvasContext.Provider>
  )
}
