import { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavIcon from './NavIcon'
import { useAuthStore } from '../store/authStore'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { useTranslation } from '../i18n/useTranslation'
import {
  shouldShowHomeInNav,
  shouldShowSourcingInNav,
  shouldShowManagementInNav,
} from '../utils/networkRoles'
import './BottomNav.css'

const BottomNav = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const userEmail = user?.email
  const accountType = useSubscriptionStore((s) => s.accountType)
  const isSuperAdmin = role === 'superadmin'
  const accountTypes = Array.isArray(user?.accountTypes) && user.accountTypes.length > 0
    ? user.accountTypes
    : [accountType].filter(Boolean)
  const roleCtx = { accountType, accountTypes, isSuperAdmin }
  const showHome = shouldShowHomeInNav(roleCtx)
  const showSourcing = shouldShowSourcingInNav(roleCtx)
  const showManagement = shouldShowManagementInNav(roleCtx)
  const requestNotifSummary = useServiceRequestStore((s) =>
    s.getNotificationSummary(userEmail)
  )
  const unreadCount = requestNotifSummary?.unreadCount || 0

  const navItems = useMemo(() => {
    const core = []
    if (showHome) {
      core.push({ id: 'home', label: t('nav.home'), icon: 'home', path: '/main-menu' })
    }
    if (showSourcing) {
      core.push({ id: 'sourcing', label: t('nav.sourcing'), icon: 'search', path: '/hub/procurement' })
    }
    if (showManagement) {
      core.push({ id: 'management', label: t('nav.management'), icon: 'management', path: '/management' })
    }
    if (!core.length) {
      core.push({ id: 'home', label: t('nav.home'), icon: 'home', path: '/main-menu' })
    }
    core.push(
      { id: 'profile', label: 'Profile', icon: 'profile', path: '/profile' },
      { id: 'notifications', label: 'Alerts', icon: 'notifications', path: '/notifications' },
    )
    return core
  }, [showHome, showSourcing, showManagement, t])

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive =
          location.pathname === item.path
          || (item.id === 'home' && location.pathname === '/main-menu')
          || (item.id === 'sourcing' && (
            location.pathname.startsWith('/hub/procurement')
            || location.pathname === '/sourcing'
          ))
          || (item.id === 'management' && location.pathname.startsWith('/management'))
        return (
          <button
            key={item.id}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <div className="bottom-nav-icon">
              <NavIcon name={item.icon} size={24} />
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="bottom-nav-notif-badge">+{unreadCount > 99 ? '99' : unreadCount}</span>
              )}
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
