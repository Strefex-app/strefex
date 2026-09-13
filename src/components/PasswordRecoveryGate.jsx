import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  detectRecoveryFromLocation,
  isPasswordRecoveryPending,
  markPasswordRecovery,
  subscribePasswordRecovery,
} from '../utils/authPasswordRecovery'

/**
 * Recovery links may land on Site URL (`/`) or `/login`. Keep the user on
 * `/reset-password` until they set a new password.
 */
export default function PasswordRecoveryGate() {
  const navigate = useNavigate()
  const location = useLocation()
  const pending = useAuthStore((s) => s.passwordRecoveryPending)

  useEffect(() => {
    if (detectRecoveryFromLocation() || isPasswordRecoveryPending()) {
      markPasswordRecovery()
      useAuthStore.getState().setPasswordRecoveryPending(true)
    }
    return subscribePasswordRecovery(() => {
      useAuthStore.getState().setPasswordRecoveryPending(isPasswordRecoveryPending())
    })
  }, [])

  useEffect(() => {
    if (location.pathname === '/reset-password') return
    const fromLink = detectRecoveryFromLocation()
    if (!fromLink && location.pathname !== '/') return
    if (!pending && !fromLink) return
    navigate(`/reset-password${location.search}${location.hash}`, { replace: true })
  }, [pending, location.pathname, location.search, location.hash, navigate])

  return null
}
