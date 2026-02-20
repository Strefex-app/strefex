import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import '../styles/app-page.css'
import './RequestService.css'

const RequestService = () => {
  const navigate = useNavigate()

  const serviceOptions = [
    { id: 'find-supplier', label: 'Find Supplier', icon: 'search', description: 'Search and connect with suppliers' },
    { id: 'request-audit', label: 'Request Audit', icon: 'audit', description: 'Request an audit of your operations' },
    { id: 'request-trial', label: 'Request Trial', icon: 'trial', description: 'Request a trial period for services' },
    { id: 'production-follow-up', label: 'Production Follow Up', icon: 'production', description: 'Track and monitor production progress' },
    { id: 'industrialisation', label: 'Industrialisation', icon: 'industry', description: 'Industrialisation services and support' },
    { id: 'project-management', label: 'Project Management', icon: 'project', description: 'Professional project management services' },
  ]

  const handleServiceClick = (serviceId) => {
    if (serviceId === 'project-management') navigate('/project-management')
    else if (serviceId === 'request-audit') navigate('/audit-request')
    else { /* unhandled service – no-op until backend is wired */ }
  }

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <a className="app-page-back-link stx-click-feedback" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            <Icon name="arrow-left" size={16} /> Back
          </a>
          <h2 className="app-page-title">Request a Service</h2>
          <p className="app-page-subtitle">Choose a service type to request.</p>
        </div>

        <div className="app-page-card">
          <ul className="app-page-list">
            {serviceOptions.map((option) => (
              <li
                key={option.id}
                className="app-page-list-item stx-click-feedback"
                onClick={() => handleServiceClick(option.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleServiceClick(option.id)}
                role="button"
                tabIndex={0}
              >
                <div className="app-page-list-item-icon"><Icon name={option.icon} size={24} /></div>
                <div className="app-page-list-item-info">
                  <span className="app-page-list-item-title">{option.label}</span>
                  <span className="app-page-list-item-desc">{option.description}</span>
                </div>
                <span className="app-page-list-item-arrow"><Icon name="chevron-right" size={16} /></span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppLayout>
  )
}

export default RequestService
