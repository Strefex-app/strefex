import { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon'
import { useAuthStore } from '../store/authStore'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import './BottomNav.css'

const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const userEmail = useAuthStore((s) => s.user?.email)
  const safeNotifications = useServiceRequestStore((s) => s.getSafeNotifications())
  const normalizedUserEmail = String(userEmail || '').toLowerCase()

  const unreadCount = useMemo(() => {
    if (!normalizedUserEmail) return 0
    return safeNotifications.filter((n) => !(n.readBy || []).includes(normalizedUserEmail)).length
  }, [safeNotifications, normalizedUserEmail])

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home', path: '/main-menu' },
    { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
    { id: 'profile', label: 'Profile', icon: 'profile', path: '/profile' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications', path: '/notifications' },
  ]

  const handleNavClick = (path) => {
    navigate(path)
  }

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => handleNavClick(item.path)}
          >
            <div className="nav-icon">
              <Icon name={item.icon} size={24} />
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="nav-notif-badge">+{unreadCount > 99 ? '99' : unreadCount}</span>
              )}
            </div>
            <span className="nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
