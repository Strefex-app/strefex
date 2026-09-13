import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthPageShell from '../components/AuthPageShell'
import authService from '../services/authService'
import { supabaseAuth } from '../services/supabaseService'
import { isSupabaseConfigured } from '../config/supabase'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { resolveWorkspaceLandingPath } from '../utils/workspaceLanding'
import {
  clearPasswordRecovery,
  detectRecoveryFromLocation,
  isPasswordRecoveryPending,
  markPasswordRecovery,
} from '../utils/authPasswordRecovery'
import './Login.css'

function getReadableErrorMessage(err, fallback) {
  if (!err) return fallback
  if (typeof err === 'string' && err.trim()) return err
  const detail = typeof err?.detail === 'string' ? err.detail.trim() : ''
  if (detail && detail !== '{}') return detail
  const message = typeof err?.message === 'string' ? err.message.trim() : ''
  if (message && message !== '{}') return message
  return fallback
}

async function getSessionQuick(ms = 2500) {
  return Promise.race([
    supabaseAuth.getSession(),
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('timeout')), ms)
    }),
  ]).catch(() => null)
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (detectRecoveryFromLocation()) {
      markPasswordRecovery()
      useAuthStore.getState().setPasswordRecoveryPending(true)
    }

    if (!isSupabaseConfigured) {
      setError('Password reset is not configured for this deployment.')
      return undefined
    }

    let cancelled = false
    const started = Date.now()

    const waitForSession = async () => {
      const fromLink = detectRecoveryFromLocation()
      while (!cancelled && Date.now() - started < 10000) {
        const session = await getSessionQuick()
        const allow = fromLink
          || isPasswordRecoveryPending()
          || useAuthStore.getState().passwordRecoveryPending
        if (session?.user && allow) {
          if (!cancelled) {
            markPasswordRecovery()
            useAuthStore.getState().setPasswordRecoveryPending(true)
            setReady(true)
          }
          return
        }
        await new Promise((resolve) => window.setTimeout(resolve, 200))
      }
      if (!cancelled) {
        clearPasswordRecovery()
        useAuthStore.getState().setPasswordRecoveryPending(false)
        setError('This reset link is invalid or has expired. Go to Login and click Forgot password for a new email.')
      }
    }

    waitForSession()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.completePasswordRecovery({
        newPassword: password,
        confirmPassword,
      })
      const auth = useAuthStore.getState()
      const accountType = useSubscriptionStore.getState().accountType
      const accountTypes = Array.isArray(auth.user?.accountTypes) && auth.user.accountTypes.length > 0
        ? auth.user.accountTypes
        : [accountType].filter(Boolean)
      navigate(resolveWorkspaceLandingPath({
        accountType,
        accountTypes,
        isSuperAdmin: auth.role === 'superadmin',
      }), { replace: true })
    } catch (err) {
      setError(getReadableErrorMessage(err, 'Could not update password. Request a new reset email.'))
    } finally {
      setLoading(false)
    }
  }

  const goLogin = () => {
    clearPasswordRecovery()
    useAuthStore.getState().setPasswordRecoveryPending(false)
  }

  return (
    <AuthPageShell>
      <div className="login-content">
        <div className="login-card">
          <h1 className="login-title">Set a new password</h1>
          <p className="login-subtitle">Choose a password for your STREFEX account, then sign in with it next time.</p>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          {!ready && !error && (
            <p className="stx-text-body" style={{ textAlign: 'center', margin: '1.5rem 0' }}>
              Opening your reset link…
            </p>
          )}

          {ready && (
            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="form-group">
                <label htmlFor="reset-password">New password</label>
                <input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reset-password-confirm">Confirm new password</label>
                <input
                  id="reset-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Saving…' : 'Save password and continue'}
              </button>
            </form>
          )}

          {error && (
            <p style={{ textAlign: 'center', marginTop: 20 }}>
              <Link to="/login" onClick={goLogin}>Back to Login</Link>
            </p>
          )}
        </div>
      </div>
    </AuthPageShell>
  )
}
