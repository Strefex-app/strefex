import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useTranslation } from '../i18n/useTranslation'
import './HeadcountManagement.css'

const HeadcountManagement = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const pages = [
    { id: 'qualification-matrix', label: 'Qualification Matrix', description: '5-level star rating system for employee skills', path: '/production/headcount/qualification-matrix', icon: 'stars', color: '#3498db' },
    { id: 'goals', label: 'Employee Goals', description: 'Goal tracking and KPI management', path: '/production/headcount/goals', icon: 'target', color: '#27ae60' },
    { id: 'dialogue', label: 'Employee Dialogue', description: 'Yearly performance reviews and development talks', path: '/production/headcount/dialogue', icon: 'dialogue', color: '#e67e22' },
    { id: 'hr-docs', label: 'HR Documentation', description: 'Employment contracts, policies, and HR documents', path: '/production/headcount/hr-docs', icon: 'document', color: '#9b59b6' },
    { id: 'training', label: 'Training Records', description: 'Training history and certification tracking', path: '/production/headcount/training', icon: 'training', color: '#16a085' },
    { id: 'workforce', label: 'Workforce Planning', description: 'Headcount planning, shift scheduling, capacity', path: '/production/headcount/workforce', icon: 'workforce', color: '#2c3e50' },
    { id: 'onboarding', label: 'Onboarding / Offboarding', description: 'New hire checklists and exit procedures', path: '/production/headcount/onboarding', icon: 'onboarding', color: '#e74c3c' },
    { id: 'attendance', label: 'Attendance & Time', description: 'Time tracking, absence management, overtime', path: '/production/headcount/attendance', icon: 'clock', color: '#f39c12' },
  ]

  const quickActions = [
    { id: 'add-employee', label: 'Add Employee', icon: 'user-plus', path: '/production/headcount/onboarding?add=true' },
    { id: 'start-review', label: 'Start Review', icon: 'dialogue', path: '/production/headcount/dialogue?new=true' },
    { id: 'set-goals', label: 'Set Goals', icon: 'target', path: '/production/headcount/goals?add=true' },
    { id: 'view-matrix', label: 'View Qualification Matrix', icon: 'stars', path: '/production/headcount/qualification-matrix' },
  ]

  const getIcon = (iconName, size = 20) => {
    const stroke = 'currentColor'
    switch (iconName) {
      case 'stars':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      case 'target':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth="2"/><circle cx="12" cy="12" r="6" stroke={stroke} strokeWidth="2"/><circle cx="12" cy="12" r="2" stroke={stroke} strokeWidth="2"/></svg>
      case 'dialogue':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      case 'document':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      case 'training':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8v8M9 11l3-3 3 3" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      case 'workforce':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke={stroke} strokeWidth="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      case 'onboarding':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="7" r="4" stroke={stroke} strokeWidth="2"/><path d="M20 8v6M23 11h-6" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      case 'clock':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth="2"/><path d="M12 6v6l4 2" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      case 'user-plus':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="7" r="4" stroke={stroke} strokeWidth="2"/><line x1="20" y1="8" x2="20" y2="14" stroke={stroke} strokeWidth="2" strokeLinecap="round"/><line x1="23" y1="11" x2="17" y2="11" stroke={stroke} strokeWidth="2" strokeLinecap="round"/></svg>
      default:
        return null
    }
  }

  return (
    <AppLayout>
      <div className="headcount-page">
        <div className="headcount-header">
          <a
            className="headcount-back-link"
            href="/production"
            onClick={(e) => { e.preventDefault(); navigate('/production') }}
          >
            ← {t('headcount.backToProduction')}
          </a>
          <h1 className="headcount-title">{t('headcount.title')}</h1>
          <p className="headcount-subtitle">{t('headcount.subtitle')}</p>
        </div>

        <div className="headcount-indicators">
          <div className="headcount-indicator-card">
            <div className="headcount-indicator-icon blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="headcount-indicator-value">48</div>
              <div className="headcount-indicator-label">{t('headcount.totalEmployees')}</div>
            </div>
          </div>
          <div className="headcount-indicator-card">
            <div className="headcount-indicator-icon orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div>
              <div className="headcount-indicator-value">3.8 <span className="headcount-star">/ 5.0 ★</span></div>
              <div className="headcount-indicator-label">{t('headcount.averageQualification')}</div>
            </div>
          </div>
          <div className="headcount-indicator-card">
            <div className="headcount-indicator-icon green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div>
              <div className="headcount-indicator-value">24</div>
              <div className="headcount-indicator-label">{t('headcount.openGoals')}</div>
            </div>
          </div>
          <div className="headcount-indicator-card">
            <div className="headcount-indicator-icon purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="headcount-indicator-value">6</div>
              <div className="headcount-indicator-label">{t('headcount.pendingReviews')}</div>
            </div>
          </div>
        </div>

        <div className="headcount-main">
          <div className="headcount-card headcount-pages-card">
            <h2 className="headcount-card-title">{t('headcount.modules')}</h2>
            <p className="headcount-card-subtitle">{t('headcount.modulesDesc')}</p>
            <div className="headcount-pages-list">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="headcount-page-item"
                  onClick={() => navigate(page.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(page.path)}
                >
                  <div className="headcount-page-item-icon" style={{ background: `${page.color}15`, color: page.color }}>
                    {getIcon(page.icon)}
                  </div>
                  <div className="headcount-page-item-info">
                    <div className="headcount-page-item-name">{page.label}</div>
                    <div className="headcount-page-item-desc">{page.description}</div>
                  </div>
                  <span className="headcount-page-item-arrow">→</span>
                </div>
              ))}
            </div>
          </div>

          <div className="headcount-card headcount-sidebar">
            <h2 className="headcount-card-title">+ {t('headcount.quickActions')}</h2>
            <p className="headcount-card-subtitle">{t('headcount.quickActionsDesc')}</p>
            <div className="headcount-actions-list">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="headcount-action-item"
                  onClick={() => navigate(action.path)}
                >
                  <span className="headcount-action-icon">{getIcon(action.icon)}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default HeadcountManagement
