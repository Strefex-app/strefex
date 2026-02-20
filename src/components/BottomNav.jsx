import { useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon'
import './BottomNav.css'

const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()

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
            <div className="nav-icon"><Icon name={item.icon} size={24} /></div>
            <span className="nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
