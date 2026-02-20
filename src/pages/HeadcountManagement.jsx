import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import { useTranslation } from '../i18n/useTranslation'
import { useAuthStore } from '../store/authStore'
import { getUserRole, getTenantId } from '../utils/tenantStorage'
import './HeadcountManagement.css'

const HeadcountManagement = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [indicators, setIndicators] = useState([
    { id: 'employees', label: 'Total Employees', value: '48', icon: 'team', iconClass: 'blue' },
    { id: 'qualification', label: 'Avg Qualification', value: '3.8 / 5.0', icon: 'quality', iconClass: 'orange' },
    { id: 'goals', label: 'Open Goals', value: '24', icon: 'target', iconClass: 'green' },
    { id: 'reviews', label: 'Pending Reviews', value: '6', icon: 'clipboard', iconClass: 'purple' },
  ])
  const [editModal, setEditModal] = useState(null)
  const role = useAuthStore((s) => s.role)
  const canEdit = role === 'manager' || role === 'admin' || role === 'superadmin'

  const saveIndicator = useCallback(() => {
    if (!editModal) return
    setIndicators((prev) => prev.map((ind) => (ind.id === editModal.id ? { ...editModal, iconClass: ind.iconClass } : ind)))
    setEditModal(null)
  }, [editModal])

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

  return (
    <AppLayout>
      <div className="headcount-page">
        {/* Header */}
        <div className="headcount-header">
          <button 
            type="button"
            className="headcount-back-link stx-click-feedback" 
            onClick={() => navigate(-1)}
          >
            <Icon name="arrow-left" size={16} /> Back
          </button>
          <h1 className="headcount-title">Headcount Management</h1>
          <p className="headcount-subtitle">Workforce and HR management hub for employee development, performance tracking, and organizational planning</p>
        </div>

        {/* Top Indicators */}
        <div className="headcount-indicators">
          {indicators.map((ind) => (
            <div key={ind.id} className="headcount-indicator-card">
              <div className={`headcount-indicator-icon ${ind.iconClass || 'blue'}`}>
                <Icon name={ind.icon} size={24} />
              </div>
              <div className="headcount-indicator-content">
                <div className="headcount-indicator-value">
                  {ind.id === 'qualification' && ind.value.includes('/') ? (
                    <>{(ind.value.split('/')[0] || '').trim()} <span className="headcount-star">/ 5.0 ★</span></>
                  ) : (
                    ind.value
                  )}
                </div>
                <div className="headcount-indicator-label">{ind.label}</div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="hm-edit-btn stx-click-feedback"
                  onClick={(e) => { e.stopPropagation(); setEditModal({ ...ind }); }}
                  title="Edit"
                  aria-label={`Edit ${ind.label}`}
                >
                  <Icon name="edit" size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="headcount-main">
          {/* Pages Section */}
          <div className="headcount-card">
            <h2 className="headcount-card-title">Headcount Modules</h2>
            <p className="headcount-card-subtitle">Manage workforce, track performance, and develop your team</p>
            <div className="headcount-pages-list">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="headcount-page-item stx-click-feedback"
                  onClick={() => navigate(page.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(page.path)}
                >
                  <div className="headcount-page-item-icon" style={{ background: `${page.color}15`, color: page.color }}>
                    <Icon name={page.icon} size={20} />
                  </div>
                  <div className="headcount-page-item-info">
                    <div className="headcount-page-item-name">{page.label}</div>
                    <div className="headcount-page-item-desc">{page.description}</div>
                  </div>
                  <span className="headcount-page-item-arrow"><Icon name="chevron-right" size={16} /></span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="headcount-card headcount-sidebar">
            <h2 className="headcount-card-title">+ Quick Actions</h2>
            <p className="headcount-card-subtitle">Common tasks and shortcuts</p>
            <div className="headcount-actions-list">
              {canEdit && (
                <button
                  type="button"
                  className="headcount-action-item headcount-action-add stx-click-feedback"
                  onClick={() => navigate('/production/headcount?addModule=true')}
                >
                  <span className="headcount-action-icon"><Icon name="plus" size={20} /></span>
                  Add New Module
                </button>
              )}
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="headcount-action-item stx-click-feedback"
                  onClick={() => navigate(action.path)}
                >
                  <span className="headcount-action-icon"><Icon name={action.icon} size={20} /></span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editModal && (
        <div className="hm-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="hm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hm-modal-header">
              <h3>Edit {editModal.label}</h3>
              <button type="button" className="hm-modal-close" onClick={() => setEditModal(null)} aria-label="Close">×</button>
            </div>
            <div className="hm-modal-body">
              <label className="hm-field-label">Value</label>
              <input
                className="hm-field-input"
                value={editModal.value}
                onChange={(e) => setEditModal((m) => ({ ...m, value: e.target.value }))}
              />
            </div>
            <div className="hm-modal-footer">
              <button type="button" className="hm-modal-cancel" onClick={() => setEditModal(null)}>Cancel</button>
              <button type="button" className="hm-modal-save" onClick={saveIndicator}>Save</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

export default HeadcountManagement
