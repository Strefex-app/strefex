import { useState } from 'react'
import { isSupabaseConfigured } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import authService from '../../services/authService'

function getReadableErrorMessage(err, fallback) {
  if (!err) return fallback
  if (typeof err === 'string' && err.trim()) return err
  const message = typeof err?.message === 'string' ? err.message.trim() : ''
  return message || fallback
}

export default function ProfilePasswordCard() {
  const sessionMode = useAuthStore((s) => s.sessionMode)
  const isDemo = sessionMode === 'demo'
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setSaving(true)
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setInfo('Password updated. Use the new password the next time you sign in.')
    } catch (err) {
      setError(getReadableErrorMessage(err, 'Could not update password.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="prof-card prof-password-card" id="profile-password">
      <h3 className="prof-card-title">Password</h3>
      <p className="prof-card-subtitle">
        Change the password used to sign in. This updates your login in Supabase Auth — not company profile data.
      </p>

      {isDemo && (
        <p className="prof-dir-hint">Demo sessions cannot change a live account password.</p>
      )}

      {!isDemo && !isSupabaseConfigured && (
        <p className="prof-dir-hint">Password change is unavailable because auth is not configured.</p>
      )}

      {!isDemo && isSupabaseConfigured && (
        <form className="prof-password-form" onSubmit={handleSubmit} noValidate>
          {error && <p className="prof-password-msg prof-password-msg-error" role="alert">{error}</p>}
          {info && <p className="prof-password-msg prof-password-msg-ok" role="status">{info}</p>}
          <label className="prof-password-field">
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={saving}
              required
            />
          </label>
          <label className="prof-password-field">
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              disabled={saving}
              required
            />
          </label>
          <label className="prof-password-field">
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={saving}
              required
            />
          </label>
          <button type="submit" className="prof-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
    </div>
  )
}
