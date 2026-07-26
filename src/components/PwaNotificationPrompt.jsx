import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  dismissPwaPrompt,
  enablePushNotifications,
  getNotificationPermission,
  isStandalonePwa,
} from '../services/pushNotificationService'
import './PwaNotificationPrompt.css'

export default function PwaNotificationPrompt() {
  const navigate = useNavigate()
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)

  if (hidden) return null

  const handleEnable = async () => {
    setBusy(true)
    try {
      const result = await enablePushNotifications()
      if (result === 'granted') {
        setHidden(true)
      } else if (result === 'denied') {
        dismissPwaPrompt()
        setHidden(true)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleLater = () => {
    dismissPwaPrompt()
    setHidden(true)
  }

  const handleSettings = () => {
    dismissPwaPrompt()
    setHidden(true)
    navigate('/settings')
  }

  const installed = isStandalonePwa()
  const perm = getNotificationPermission()

  return (
    <div className="pwa-notif-prompt" role="region" aria-label="Enable notifications">
      <div className="pwa-notif-prompt__icon" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="pwa-notif-prompt__body min-width-0">
        <strong className="pwa-notif-prompt__title">
          {installed ? 'Enable alerts on this device' : 'Enable push notifications'}
        </strong>
        <p className="pwa-notif-prompt__text stx-text-wrap">
          {installed
            ? 'Get incoming service requests, assignments, and status updates on your home screen app.'
            : 'Receive incoming alerts when the app is in the background or installed on your home screen.'}
          {perm === 'denied' ? ' Notifications are blocked in browser settings — enable them there first.' : ''}
        </p>
      </div>
      <div className="pwa-notif-prompt__actions">
        <button type="button" className="pwa-notif-prompt__btn pwa-notif-prompt__btn--primary" onClick={handleEnable} disabled={busy || perm === 'denied'}>
          {busy ? 'Enabling…' : 'Enable'}
        </button>
        <button type="button" className="pwa-notif-prompt__btn" onClick={handleSettings}>
          Settings
        </button>
        <button type="button" className="pwa-notif-prompt__btn" onClick={handleLater}>
          Later
        </button>
      </div>
    </div>
  )
}
