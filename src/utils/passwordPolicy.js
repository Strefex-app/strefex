/** Same rules as supplier registration. */

export function validateNewPassword(password, confirmPassword) {
  const value = String(password || '')
  if (!value || value.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter'
  if (!/[0-9]/.test(value)) return 'Password must contain at least one number'
  if (confirmPassword !== undefined && value !== String(confirmPassword || '')) {
    return 'Passwords do not match'
  }
  return null
}
