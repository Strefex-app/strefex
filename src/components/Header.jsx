import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import './Header.css'

const Header = () => {
  const navigate = useNavigate()

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-logo">
          <img src="/assets/strefex-logo.png" alt="STREFEX Logo" className="logo-image" />
        </div>
        <div className="header-actions">
          <div className="header-search stx-click-feedback">
            <Icon name="search" size={24} />
          </div>
          <div className="header-profile stx-click-feedback" onClick={() => navigate('/profile')}>
            <Icon name="profile" size={24} />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
