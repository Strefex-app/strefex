import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import Icon from '../components/Icon'
import './MainMenu.css'

const MainMenu = () => {
  const navigate = useNavigate()

  const menuItems = [
    { id: 'automotive', label: 'Automotive Industry', icon: 'gear', path: '/industry/automotive', description: 'Equipment, suppliers, and services for automotive' },
    { id: 'machinery', label: 'Machinery Industry', icon: 'robot', path: '/industry/machinery', description: 'Equipment, suppliers, and services for machinery' },
    { id: 'electronics', label: 'Electronics Industry', icon: 'chip', path: '/industry/electronics', description: 'Equipment, suppliers, and services for electronics' },
    { id: 'medical', label: 'Medical Industry', icon: 'medical', path: '/industry/medical', description: 'Equipment, suppliers, and services for medical' },
    { id: 'raw-materials', label: 'Raw Materials', icon: 'raw', path: '/industry/raw-materials', description: 'Plastic, metal, and other materials for all industries' },
  ]

  const quickActions = [
    { id: 'equipment', label: 'Equipment Supplier Selection', icon: 'document', path: '/equipment-request' },
    { id: 'service', label: 'Service', icon: 'refresh', path: '/services' },
    { id: 'parts', label: 'Project Management', icon: 'gantt', path: '/project-management' },
    { id: 'audits', label: 'Audits', icon: 'monitor', path: '/audit-request' },
  ]

  return (
    <div className="main-menu-container">
      <Header />
      <div className="main-menu-content">
        <div className="menu-list dark-list-container">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="dark-list-item stx-click-feedback"
              onClick={() => navigate(item.path)}
            >
              <div className="dark-list-item-icon"><Icon name={item.icon} size={24} /></div>
              <div className="dark-list-item-info">
                <h3 className="dark-list-item-title">{item.label}</h3>
                {item.description && (
                  <p className="dark-list-item-description">{item.description}</p>
                )}
              </div>
              <span className="dark-list-item-arrow"><Icon name="chevron-right" size={16} /></span>
            </div>
          ))}
          <div className="menu-divider">
            <span className="divider-label">Next Level</span>
          </div>
        </div>
        
        <div className="quick-actions">
          {quickActions.map((action) => (
            <div
              key={action.id}
              className="quick-action-item stx-click-feedback"
              onClick={() => action.path && navigate(action.path)}
            >
              <div className="quick-action-icon"><Icon name={action.icon} size={20} /></div>
              <span className="quick-action-label">{action.label}</span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default MainMenu
