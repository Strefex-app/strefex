import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (value) return [value]
  return []
}

export default function AccountTypeRoute({ children, allowed = [] }) {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const location = useLocation()

  if (role === 'superadmin') {
    return children
  }

  const accountTypes = toArray(user?.accountTypes).map((v) => String(v).toLowerCase())
  const primary = String(user?.primaryAccountType || user?.accountType || '').toLowerCase()
  const currentTypes = new Set(primary ? [...accountTypes, primary] : accountTypes)
  const normalizedAllowed = allowed.map((v) => String(v).toLowerCase())
  const hasAccess = normalizedAllowed.some((type) => currentTypes.has(type))

  if (!hasAccess) {
    return <Navigate to="/main-menu" state={{ from: location.pathname }} replace />
  }

  return children
}
