import { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon'
import { useAuthStore } from '../store/authStore'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useSubscriptionStore } from '../services/featureFlags'
import './BottomNav.css'

const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const userEmail = useAuthStore((s) => s.user?.email)
  const role = useAuthStore((s) => s.role)
  const accountType = useSubscriptionStore((s) => s.accountType)
  const requestNotifSummary = useServiceRequestStore((s) =>
    s.getNotificationSummary(userEmail)
  )
  const unreadCount = requestNotifSummary?.unreadCount || 0

  const showBuyerWs = role === 'superadmin' || accountType === 'buyer'
  const showSupplierWs =
    role === 'superadmin' || accountType === 'seller' || accountType === 'service_provider'

  const navItems = useMemo(() => {
    const core = [
      { id: 'home', label: 'Home', icon: 'home', path: '/main-menu' },
    ]
    if (showBuyerWs) {
      core.push({ id: 'buyer-ws', label: 'Buyers', icon: 'package', path: '/hub/procurement' })
    }
    if (showSupplierWs) {
      core.push({ id: 'supplier-ws', label: 'Partners', icon: 'vendors', path: '/hub/partner' })
    }
    core.push(
      { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
      { id: 'profile', label: 'Profile', icon: 'profile', path: '/profile' },
      { id: 'notifications', label: 'Alerts', icon: 'notifications', path: '/notifications' },
    )
    return core
  }, [showBuyerWs, showSupplierWs])

  const handleNavClick = (path) => {
    navigate(path)
  }

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive =
          location.pathname === item.path
          || (item.id === 'buyer-ws' && (
            location.pathname.startsWith('/hub/procurement') ||
            location.pathname.startsWith('/dashboard/buyer')
          ))
          || (item.id === 'supplier-ws' && (
            location.pathname.startsWith('/hub/partner') ||
            location.pathname.startsWith('/dashboard/supplier') ||
            location.pathname.startsWith('/supplier-dashboard') ||
            location.pathname.startsWith('/service-requests') ||
            location.pathname.startsWith('/service-provider-dashboard') ||
            location.pathname.startsWith('/seller-dashboard')
          ))
        return (
          <button
            key={item.id}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => handleNavClick(item.path)}
          >
            <div className="bottom-nav-icon">
              <Icon name={item.icon} size={24} />
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
