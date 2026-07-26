import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import { useTranslation } from '../i18n/useTranslation'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { hrSpacePath } from '../constants/hrSpaceRoutes'
import './HeadcountManagement.css'
import AiInsightsCtaStrip from '../components/AiInsightsCtaStrip'

const HeadcountManagement = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const hasFeature = useSubscriptionStore((s) => s.hasFeature)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')

  const [indicators, setIndicators] = useState([
    { id: 'employees', labelKey: 'headcount.totalEmployees', value: '48', icon: 'team', iconClass: 'blue' },
    { id: 'qualification', labelKey: 'headcount.averageQualification', value: '3.8 / 5.0', icon: 'quality', iconClass: 'orange' },
    { id: 'goals', labelKey: 'headcount.openGoals', value: '24', icon: 'target', iconClass: 'green' },
    { id: 'reviews', labelKey: 'headcount.pendingReviews', value: '6', icon: 'clipboard', iconClass: 'purple' },
  ])
  const [editModal, setEditModal] = useState(null)
  const role = useAuthStore((s) => s.role)
  const canEdit = role === 'manager' || role === 'admin' || role === 'superadmin'
  const canEnterprise = isSuperAdmin || hasFeature('enterpriseManagement')
  const canTemplates = isSuperAdmin || hasFeature('templateLibrary')

  const saveIndicator = useCallback(() => {
    if (!editModal) return
    setIndicators((prev) => prev.map((ind) => (ind.id === editModal.id ? { ...editModal, iconClass: ind.iconClass, labelKey: ind.labelKey } : ind)))
    setEditModal(null)
  }, [editModal])

  const pages = [
    { id: 'qualification-matrix', path: hrSpacePath('qualification-matrix'), icon: 'stars', color: '#3498db' },
    { id: 'goals', path: hrSpacePath('goals'), icon: 'target', color: '#27ae60' },
    { id: 'dialogue', path: hrSpacePath('dialogue'), icon: 'dialogue', color: '#e67e22' },
    { id: 'hr-docs', path: hrSpacePath('hr-docs'), icon: 'document', color: '#9b59b6' },
    { id: 'training', path: hrSpacePath('training'), icon: 'training', color: '#16a085' },
    { id: 'workforce', path: hrSpacePath('workforce'), icon: 'workforce', color: '#2c3e50' },
    { id: 'onboarding', path: hrSpacePath('onboarding'), icon: 'onboarding', color: '#e74c3c' },
    { id: 'attendance', path: hrSpacePath('attendance'), icon: 'clock', color: '#f39c12' },
    { id: 'hiring', path: hrSpacePath('hiring'), icon: 'user-plus', color: '#1e8449' },
  ]

  const linkedManagementTools = [
    {
      id: 'enterprise-personnel',
      labelKey: 'hrSpace.enterprisePersonnel',
      descKey: 'hrSpace.enterprisePersonnelDesc',
      path: '/enterprise/personnel',
      icon: 'cost',
      color: '#1a5276',
      unlocked: canEnterprise,
      planLabel: 'Enterprise',
    },
    {
      id: 'templates-hr',
      labelKey: 'hrSpace.templateLibraryHr',
      descKey: 'hrSpace.templateLibraryHrDesc',
      path: '/templates',
      icon: 'templates',
      color: '#7d3c98',
      unlocked: canTemplates,
      planLabel: 'Enterprise',
    },
  ]

  const quickActions = [
    { id: 'add-employee', labelKey: 'hrSpace.qa.add-employee', icon: 'user-plus', path: `${hrSpacePath('onboarding')}?add=true` },
    { id: 'start-review', labelKey: 'hrSpace.qa.start-review', icon: 'dialogue', path: `${hrSpacePath('dialogue')}?new=true` },
    { id: 'set-goals', labelKey: 'hrSpace.qa.set-goals', icon: 'target', path: `${hrSpacePath('goals')}?add=true` },
    { id: 'view-matrix', labelKey: 'hrSpace.qa.view-matrix', icon: 'stars', path: hrSpacePath('qualification-matrix') },
  ]

  return (
    <AppLayout>
      <div className="headcount-page">
        {/* Header */}
        <div className="headcount-header">
          <h1 className="headcount-title">{t('hrSpace.title')}</h1>
          <p className="headcount-subtitle">{t('hrSpace.subtitle')}</p>
        </div>

        <AiInsightsCtaStrip context="hr" />

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
                <div className="headcount-indicator-label">{t(ind.labelKey)}</div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="hm-edit-btn stx-click-feedback"
                  onClick={(e) => { e.stopPropagation(); setEditModal({ ...ind }); }}
                  title="Edit"
                  aria-label={`Edit ${t(ind.labelKey)}`}
                >
                  <Icon name="edit" size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="headcount-main">
          <div className="headcount-main-left">
          {/* Pages Section */}
          <div className="headcount-card">
            <h2 className="headcount-card-title">{t('hrSpace.coreModules')}</h2>
            <p className="headcount-card-subtitle">{t('hrSpace.coreModulesDesc')}</p>
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
                    <div className="headcount-page-item-name">{t(`hrSpace.page.${page.id}.label`)}</div>
                    <div className="headcount-page-item-desc">{t(`hrSpace.page.${page.id}.desc`)}</div>
                  </div>
                  <span className="headcount-page-item-arrow"><Icon name="chevron-right" size={16} /></span>
                </div>
              ))}
            </div>
          </div>

          {/* Linked Management modules (Enterprise / templates) */}
          <div className="headcount-card">
            <h2 className="headcount-card-title">{t('hrSpace.linkedTools')}</h2>
            <p className="headcount-card-subtitle">{t('hrSpace.linkedToolsDesc')}</p>
            <div className="headcount-pages-list">
              {linkedManagementTools.map((item) => (
                <div
                  key={item.id}
                  className={`headcount-page-item stx-click-feedback ${item.unlocked ? '' : 'headcount-page-item--locked'}`}
                  onClick={() => {
                    if (item.unlocked) navigate(item.path)
                    else navigate('/plans')
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && (item.unlocked ? navigate(item.path) : navigate('/plans'))}
                >
                  <div className="headcount-page-item-icon" style={{ background: `${item.color}15`, color: item.color }}>
                    <Icon name={item.icon} size={20} />
                  </div>
                  <div className="headcount-page-item-info">
                    <div className="headcount-page-item-name">
                      {t(item.labelKey)}
                      {!item.unlocked && (
                        <span className="headcount-plan-badge">{item.planLabel}+</span>
                      )}
                    </div>
                    <div className="headcount-page-item-desc">{t(item.descKey)}</div>
                  </div>
                  <span className="headcount-page-item-arrow">
                    <Icon name={item.unlocked ? 'chevron-right' : 'lock'} size={16} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Talent sourcing roadmap */}
          <div className="headcount-card headcount-full-width headcount-talent-roadmap">
            <h2 className="headcount-card-title">{t('hrSpace.talentSourcing')}</h2>
            <p className="headcount-card-subtitle">{t('hrSpace.talentSourcingDesc')}</p>
            <ul className="headcount-talent-list">
              <li>
                <strong>LinkedIn</strong> — {t('hrSpace.talentBulletLinkedIn')}
              </li>
              <li>
                <strong>HeadHunter (hh.ru)</strong> — {t('hrSpace.talentBulletHH')}
              </li>
              <li>
                <strong>International</strong> — {t('hrSpace.talentBulletInternational')}
              </li>
            </ul>
            <p className="headcount-talent-note">{t('hrSpace.talentNote')}</p>
          </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="headcount-card headcount-sidebar">
            <h2 className="headcount-card-title">+ {t('headcount.quickActions')}</h2>
            <p className="headcount-card-subtitle">{t('headcount.quickActionsDesc')}</p>
            <div className="headcount-actions-list">
              {canEdit && (
                <button
                  type="button"
                  className="headcount-action-item headcount-action-add stx-click-feedback"
                  onClick={() => navigate(`${hrSpacePath()}?addModule=true`)}
                >
                  <span className="headcount-action-icon"><Icon name="plus" size={20} /></span>
                  {t('hrSpace.addNewModule')}
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
                  {t(action.labelKey)}
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
              <h3>Edit {t(editModal.labelKey)}</h3>
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
