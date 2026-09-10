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

export const SOURCING_FRAME_SRC = '/intelligent-sourcing/index.html?embed=1&v=20260910g'

const SourcingCanvasContext = createContext({
  attachSlot: () => {},
  iframeRef: { current: null },
  frameReady: false,
})

export function usePersistentSourcingCanvas() {
  return useContext(SourcingCanvasContext)
}

/**
 * One Intelligent Sourcing iframe for the session. When /sourcing is open the
 * host is moved into the page slot (document flow). Parked off-screen otherwise
 * so the atlas is not downloaded again. No JS getBoundingClientRect tracking.
 */
export function PersistentSourcingCanvasProvider({ children }) {
  const iframeRef = useRef(null)
  const hostRef = useRef(null)
  const parkRef = useRef(null)
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
    const park = parkRef.current
    const slot = slotRef.current
    if (!host || !park) return undefined

    if (live && slot) {
      if (host.parentElement !== slot) slot.appendChild(host)
      host.classList.remove('is-parked')
      host.classList.add('is-live')
      host.removeAttribute('style')
      host.setAttribute('aria-hidden', 'false')
      return undefined
    }

    if (host.parentElement !== park) park.appendChild(host)
    host.classList.add('is-parked')
    host.classList.remove('is-live')
    host.setAttribute('aria-hidden', 'true')
    return undefined
  }, [live])

  const value = useMemo(
    () => ({ attachSlot, iframeRef, frameReady }),
    [attachSlot, frameReady],
  )

  return (
    <SourcingCanvasContext.Provider value={value}>
      {children}
      <div ref={parkRef} className="persistent-sourcing-canvas-park" aria-hidden="true">
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
      </div>
    </SourcingCanvasContext.Provider>
  )
}
