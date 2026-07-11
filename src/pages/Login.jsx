import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n/useTranslation'
import authService from '../services/authService'
import { ToggleCheckButton } from '../components/ToggleCheckButton'
import AuthPageShell from '../components/AuthPageShell'
import { normalizeCompanySlugInput, shouldPromptCompanySlug } from '../utils/loginErrors'
import './Login.css'

function getReadableErrorMessage(err, fallback) {
  if (!err) return fallback
  if (typeof err === 'string' && err.trim()) return err

  const detail = typeof err?.detail === 'string' ? err.detail.trim() : ''
  if (detail && detail !== '{}') return detail

  const message = typeof err?.message === 'string' ? err.message.trim() : ''
  if (message && message !== '{}') return message

  const errorDescription = typeof err?.error_description === 'string' ? err.error_description.trim() : ''
  if (errorDescription && errorDescription !== '{}') return errorDescription

  return fallback
}

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [canResendConfirmation, setCanResendConfirmation] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [companySlug, setCompanySlug] = useState('')
  const [showCompanySlug, setShowCompanySlug] = useState(false)

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { t } = useTranslation()

  useEffect(() => {
    if (isAuthenticated) navigate('/main-menu', { replace: true })
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (searchParams.get('confirmed') === 'true') {
      setInfo('Email confirmed! You can now sign in.')
    }
  }, [searchParams])

  const handleResetPassword = async () => {
    setError('')
    setInfo('')
    setCanResendConfirmation(false)
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter your account email first, then click Forgot password.')
      return
    }
    try {
      const result = await authService.sendPasswordReset(normalizedEmail)
      if (result?.confirmationResent) {
        setInfo('Your account is not confirmed yet. A new confirmation email was sent.')
      } else {
        setInfo('Password reset email sent. Please check your inbox.')
      }
    } catch (err) {
      setError(getReadableErrorMessage(err, 'Could not send password reset email. Please try again.'))
    }
  }

  const handleResendConfirmation = async () => {
    setError('')
    setInfo('')
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter your account email first, then click resend confirmation.')
      return
    }
    try {
      await authService.resendConfirmation(normalizedEmail)
      setInfo('Confirmation email resent. Please check your inbox.')
      setCanResendConfirmation(false)
    } catch (err) {
      setError(getReadableErrorMessage(err, 'Could not resend confirmation email. Please try again.'))
    }
  }

  /* ── Main login handler ──────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setCanResendConfirmation(false)

    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address')
      return
    }
    if (!password || password.length < 3) {
      setError('Password must be at least 3 characters')
      return
    }

    // ── Regular login via Supabase / backend ──
    setLoading(true)
    try {
      const slug = normalizeCompanySlugInput(companySlug)
      await authService.loginWithEmail(normalizedEmail, password, slug)
      navigate('/main-menu')
    } catch (err) {
      const msg = getReadableErrorMessage(err, '')

      if (shouldPromptCompanySlug(msg)) {
        setShowCompanySlug(true)
        setError(msg)
      } else if (err.code === 'email_not_confirmed' || msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('verify your email')) {
        setError('Please verify your email before logging in.')
        setCanResendConfirmation(true)
      } else if (err.code === 'request_timeout' || msg.toLowerCase().includes('timed out')) {
        setError('Login is taking too long. Please check your connection and try again.')
      } else if (err.code === 'invalid_credentials' || msg.toLowerCase().includes('invalid login')) {
        setError('Invalid email or password. If this started after billing changes, use Forgot password to reset access.')
      } else if (err.status === 0 || msg.includes('Network error') || msg.includes('Failed to fetch')) {
        setError('Unable to reach the server. Please check your internet connection and try again.')
      } else {
        setError(getReadableErrorMessage(err, 'Login failed. Please try again.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell>
      <div className="login-content">
        <div className="login-card">
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">{t('login.signIn')} — STREFEX Platform</p>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {error && (
              <div className="login-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}
            {info && (
              <div className="login-info" role="status" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                borderRadius: 8, background: '#e8f5e9', color: '#2e7d32', fontSize: 14,
                marginBottom: 16, border: '1px solid #c8e6c9'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {info}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="email">{t('login.email')}</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.email')}
                required
                disabled={loading}
              />
            </div>

            {(showCompanySlug || companySlug) && (
              <div className="form-group">
                <label htmlFor="companySlug">Company slug</label>
                <input
                  type="text"
                  id="companySlug"
                  value={companySlug}
                  onChange={(e) => setCompanySlug(e.target.value)}
                  placeholder="your-company-slug"
                  autoComplete="organization"
                  disabled={loading}
                />
                <p className="login-field-hint stx-text-caption">
                  Required when your email is registered with more than one company.
                </p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">{t('login.password')}</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.password')}
                required
                disabled={loading}
              />
            </div>

            <div className="form-options">
              <div className="checkbox-label">
                <ToggleCheckButton compact checked={rememberMe} onChange={setRememberMe} disabled={loading} aria-label={t('login.rememberMe')} />
                <span>{t('login.rememberMe')}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  className="forgot-password"
                  onClick={handleResetPassword}
                  disabled={loading}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  {t('login.forgotPassword')}
                </button>
                {canResendConfirmation && (
                  <button
                    type="button"
                    className="forgot-password"
                    onClick={handleResendConfirmation}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    Resend confirmation
                  </button>
                )}
              </div>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Signing in...' : t('login.signIn')}
            </button>

            <div className="login-divider">
              <span>Professional accounts only</span>
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#00d4ff', fontWeight: 500, textDecoration: 'none' }}>
              Sign Up
            </Link>
          </div>

          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 14 }}>
            <Link to="/pitchbook" style={{ color: '#1a6b4f', fontWeight: 500, textDecoration: 'none' }}>
              ⚽ Try PitchBook football training demo
            </Link>
          </div>

        </div>
      </div>
    </AuthPageShell>
  )
}

export default Login
