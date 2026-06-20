import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthPageShell from '../components/AuthPageShell'
import authService from '../services/authService'
import './Login.css'

function getReadableErrorMessage(err, fallback) {
  if (!err) return fallback
  if (typeof err === 'string' && err.trim()) return err
  const detail = typeof err?.detail === 'string' ? err.detail.trim() : ''
  if (detail) return detail
  const message = typeof err?.message === 'string' ? err.message.trim() : ''
  if (message) return message
  return fallback
}

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState(token ? 'verifying' : 'missing')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!token) return

    let cancelled = false
    ;(async () => {
      try {
        await authService.verifyEmail(token)
        if (cancelled) return
        setStatus('success')
        setInfo('Your email is verified. You can now sign in.')
      } catch (err) {
        if (cancelled) return
        setStatus('failed')
        setError(getReadableErrorMessage(err, 'This verification link is invalid or has expired.'))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  const handleResend = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter the email address you used to register.')
      return
    }
    setResending(true)
    try {
      await authService.resendConfirmation(normalizedEmail)
      setInfo('If an unverified account exists, a new verification link was sent.')
    } catch (err) {
      setError(getReadableErrorMessage(err, 'Could not resend verification email. Please try again.'))
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthPageShell>
      <div className="login-content">
        <div className="login-card">
          <h1 className="login-title">Verify Email</h1>
          <p className="login-subtitle">STREFEX Platform account confirmation</p>

          {status === 'verifying' && (
            <p className="stx-text-body" style={{ textAlign: 'center', margin: '2rem 0' }}>
              Confirming your email…
            </p>
          )}

          {status === 'success' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              {info && (
                <div className="login-info" role="status" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 16px', borderRadius: 8, background: '#e8f5e9',
                  color: '#2e7d32', marginBottom: 24, border: '1px solid #c8e6c9',
                }}>
                  {info}
                </div>
              )}
              <Link to="/login?confirmed=true" className="login-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Go to Sign In
              </Link>
            </div>
          )}

          {(status === 'failed' || status === 'missing') && (
            <div>
              {status === 'missing' && (
                <p className="stx-text-body" style={{ marginBottom: 16 }}>
                  Open the verification link from your email, or request a new one below.
                </p>
              )}
              {error && (
                <div className="login-error" role="alert" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}
              {info && (
                <div className="login-info" role="status" style={{
                  padding: '12px 16px', borderRadius: 8, background: '#e8f5e9',
                  color: '#2e7d32', marginBottom: 16, border: '1px solid #c8e6c9',
                }}>
                  {info}
                </div>
              )}
              <form onSubmit={handleResend} className="login-form" noValidate>
                <div className="form-group">
                  <label htmlFor="verify-email">Account email</label>
                  <input
                    type="email"
                    id="verify-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    disabled={resending}
                    required
                  />
                </div>
                <button type="submit" className="login-button" disabled={resending}>
                  {resending ? 'Sending…' : 'Resend verification email'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <Link to="/login" style={{ color: '#00d4ff', fontWeight: 500, textDecoration: 'none' }}>
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthPageShell>
  )
}
