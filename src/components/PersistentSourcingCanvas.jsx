import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import './PersistentSourcingCanvas.css'

export const SOURCING_FRAME_VERSION = '20260911a'

function readSourcingTheme() {
  try {
    if (document.documentElement.getAttribute('data-theme') === 'dark') return 'dark'
  } catch { /* */ }
  try {
    if (localStorage.getItem('strefex-theme') === 'dark') return 'dark'
  } catch { /* */ }
  return 'light'
}

export function sourcingFrameSrc() {
  return `/intelligent-sourcing/index.html?embed=1&v=${SOURCING_FRAME_VERSION}`
}

function paintFrameTheme(iframe) {
  const theme = readSourcingTheme()
  try {
    const doc = iframe?.contentDocument
    const root = doc?.documentElement
    if (root) {
      root.setAttribute('data-theme', theme)
      root.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
    }
    const win = iframe?.contentWindow
    if (!win) return
    win.__STREFEX_PLATFORM_THEME__ = theme
    if (typeof win.__STREFEX_APPLY_SOURCING_THEME__ === 'function') {
      win.__STREFEX_APPLY_SOURCING_THEME__(theme)
    }
  } catch { /* */ }
}

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
  const frameSrcRef = useRef('')

  const attachSlot = useCallback((el) => {
    slotRef.current = el
    if (el) setBooted(true)
    setLive(Boolean(el))
  }, [])

  if (booted && !frameSrcRef.current) {
    frameSrcRef.current = sourcingFrameSrc()
  }

  const onFrameLoad = useCallback(() => {
    setFrameReady(true)
    paintFrameTheme(iframeRef.current)
  }, [])

  useEffect(() => {
    const send = () => paintFrameTheme(iframeRef.current)
    window.addEventListener('themechange', send)
    return () => window.removeEventListener('themechange', send)
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
              src={frameSrcRef.current}
              onLoad={onFrameLoad}
            />
          ) : null}
        </div>
      </div>
    </SourcingCanvasContext.Provider>
  )
}
