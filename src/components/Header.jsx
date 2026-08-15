import { useNavigate } from 'react-router-dom'
import NavIcon from './NavIcon'
import './Header.css'

const Header = () => {
  const navigate = useNavigate()

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-logo">
          <img src="/assets/strefex-logo-user-exact.png" alt="STREFEX Logo" className="logo-image" />
        </div>
        <div className="header-actions">
          <div className="header-search stx-click-feedback">
            <NavIcon name="search" size={24} />
          </div>
          <div className="header-profile stx-click-feedback" onClick={() => navigate('/profile')}>
            <NavIcon name="profile" size={24} />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
