import { useState, useEffect } from 'react'
import { onSWUpdate, skipWaitingAndReload } from '../registerSW'

export default function PWAUpdateBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    onSWUpdate(() => setShow(true))
  }, [])

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, background: '#000888', color: '#fff', borderRadius: 12,
      padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,.25)', fontSize: 14, maxWidth: 420,
    }}>
      <span style={{ flex: 1 }}>A new version of STREFEX is available.</span>
      <button
        onClick={skipWaitingAndReload}
        style={{
          background: '#fff', color: '#000888', border: 'none', borderRadius: 8,
          padding: '6px 16px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Update
      </button>
      <button
        onClick={() => setShow(false)}
        style={{
          background: 'transparent', border: 'none', color: 'rgba(255,255,255,.6)',
          cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px',
        }}
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  )
}
