import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import useEnterpriseStore from '../store/enterpriseStore'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n/useTranslation'
import './EnterpriseManagement.css'

const EnterpriseManagement = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { getEnterpriseSummary } = useEnterpriseStore()
  const summary = getEnterpriseSummary()
  const role = useAuthStore((s) => s.role)
  const canEdit = role === 'manager' || role === 'admin' || role === 'superadmin'
  const [editModal, setEditModal] = useState(null)

  const subPages = [
    { id: 'fixed', label: 'Fixed Costs', description: 'Costs that remain constant regardless of production', path: '/enterprise/fixed-costs', icon: 'lock', color: '#3498db' },
    { id: 'variable', label: 'Variable Costs', description: 'Costs that change with production volume', path: '/enterprise/variable-costs', icon: 'trending', color: '#e74c3c' },
    { id: 'semi-variable', label: 'Semi-Variable Costs', description: 'Costs with fixed and variable components', path: '/enterprise/semi-variable-costs', icon: 'split', color: '#9b59b6' },
    { id: 'direct', label: 'Direct Costs', description: 'Costs directly attributable to products', path: '/enterprise/direct-costs', icon: 'target', color: '#27ae60' },
    { id: 'indirect', label: 'Indirect Costs', description: 'Overhead costs not directly tied to products', path: '/enterprise/indirect-costs', icon: 'layers', color: '#f39c12' },
    { id: 'opex', label: 'Operating Expenses (OPEX)', description: 'Day-to-day operational expenses', path: '/enterprise/opex', icon: 'activity', color: '#1abc9c' },
    { id: 'capex', label: 'Capital Expenditures (CAPEX)', description: 'Long-term asset investments', path: '/enterprise/capex', icon: 'building', color: '#34495e' },
    { id: 'personnel', label: 'Personnel Costs', description: 'Salaries, benefits, and training', path: '/enterprise/personnel', icon: 'users', color: '#e67e22' },
    { id: 'financial', label: 'Financial Costs', description: 'Interest, fees, and financing costs', path: '/enterprise/financial', icon: 'percent', color: '#8e44ad' },
    { id: 'exceptional', label: 'Exceptional Costs', description: 'Non-recurring and emergency costs', path: '/enterprise/exceptional', icon: 'alert', color: '#c0392b' },
    { id: 'risk', label: 'Risk Costs', description: 'Provisions and contingencies', path: '/enterprise/risk', icon: 'shield', color: '#2c3e50' },
    { id: 'product-calc', label: 'Product Cost Calculation', description: 'Calculate full manufacturing cost and margins', path: '/enterprise/product-calculation', icon: 'calculator', color: '#16a085' },
  ]

  const quickActions = [
    { id: 'calc', label: 'Calculate Product Costs', icon: 'calculator', path: '/enterprise/product-calculation' },
    { id: 'report', label: 'Cost Report', icon: 'report', path: '/enterprise/product-calculation' },
    { id: 'add-cost', label: 'Add New Cost', icon: 'plus', path: '/enterprise/fixed-costs' },
    { id: 'simulation', label: 'Run Simulation', icon: 'play', path: '/enterprise/product-calculation?simulation=true' },
  ]

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <AppLayout>
      <div className="enterprise-page">
        {/* Header */}
        <div className="enterprise-header">
          <a 
            className="enterprise-back-link stx-click-feedback" 
            href="/management" 
            onClick={(e) => { e.preventDefault(); navigate(-1) }}
          >
            <Icon name="arrow-left" size={16} /> Back
          </a>
          <h1 className="enterprise-title">{t('enterprise.title')}</h1>
          <p className="enterprise-subtitle">{t('enterprise.subtitle')}</p>
        </div>

        {/* Top Indicators */}
        <div className="enterprise-indicators">
          <div className="enterprise-indicator-card enterprise-indicator-clickable" onClick={() => navigate('/enterprise/fixed-costs')}>
            {canEdit && (
              <button className="em-edit-btn" onClick={(e) => { e.stopPropagation(); setEditModal({ id: 'monthlyCosts', label: 'Monthly Costs', value: summary.totalMonthlyCosts }) }}>
                <Icon name="edit" size={14} />
              </button>
            )}
            <div className="indicator-icon blue">
              <Icon name="dollar" size={24} />
            </div>
            <div>
              <div className="indicator-value">{formatCurrency(summary.totalMonthlyCosts)}</div>
              <div className="indicator-label">Monthly Costs</div>
            </div>
          </div>
          <div className="enterprise-indicator-card enterprise-indicator-clickable" onClick={() => navigate('/enterprise/product-calculation')}>
            {canEdit && (
              <button className="em-edit-btn" onClick={(e) => { e.stopPropagation(); setEditModal({ id: 'monthlyRevenue', label: 'Monthly Revenue', value: summary.totalRevenue }) }}>
                <Icon name="edit" size={14} />
              </button>
            )}
            <div className="indicator-icon green">
              <Icon name="trending" size={24} />
            </div>
            <div>
              <div className="indicator-value">{formatCurrency(summary.totalRevenue)}</div>
              <div className="indicator-label">Monthly Revenue</div>
            </div>
          </div>
          <div className="enterprise-indicator-card enterprise-indicator-clickable" onClick={() => navigate('/enterprise/product-calculation')}>
            {canEdit && (
              <button className="em-edit-btn" onClick={(e) => { e.stopPropagation(); setEditModal({ id: 'monthlyProfit', label: 'Monthly Profit', value: summary.totalProfit }) }}>
                <Icon name="edit" size={14} />
              </button>
            )}
            <div className={`indicator-icon ${summary.totalProfit >= 0 ? 'green' : 'red'}`}>
              <Icon name="clock" size={24} />
            </div>
            <div>
              <div className={`indicator-value ${summary.totalProfit >= 0 ? 'profit' : 'loss'}`}>
                {formatCurrency(summary.totalProfit)}
              </div>
              <div className="indicator-label">Monthly Profit</div>
            </div>
          </div>
          <div className="enterprise-indicator-card enterprise-indicator-clickable" onClick={() => navigate('/enterprise/product-calculation')}>
            {canEdit && (
              <button className="em-edit-btn" onClick={(e) => { e.stopPropagation(); setEditModal({ id: 'grossMargin', label: 'Gross Margin', value: summary.overallMargin }) }}>
                <Icon name="edit" size={14} />
              </button>
            )}
            <div className={`indicator-icon ${summary.overallMargin >= 15 ? 'green' : summary.overallMargin >= 5 ? 'orange' : 'red'}`}>
              <Icon name="percent" size={24} />
            </div>
            <div>
              <div className="indicator-value">{summary.overallMargin.toFixed(1)}%</div>
              <div className="indicator-label">Gross Margin</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="enterprise-main">
          {/* Cost Categories */}
          <div className="enterprise-card">
            <h2 className="enterprise-card-title">Cost Categories</h2>
            <p className="enterprise-card-subtitle">Manage all enterprise cost components</p>
            <div className="enterprise-pages-grid">
              {subPages.map((page) => (
                <div
                  key={page.id}
                  className="enterprise-page-item"
                  onClick={() => navigate(page.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(page.path)}
                >
                  <div className="page-item-icon" style={{ background: `${page.color}15`, color: page.color }}>
                    <Icon name={page.icon} size={20} />
                  </div>
                  <div className="page-item-info">
                    <div className="page-item-name">{page.label}</div>
                    <div className="page-item-desc">{page.description}</div>
                  </div>
                  <span className="page-item-arrow">→</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="enterprise-card enterprise-sidebar">
            <h2 className="enterprise-card-title">+ Quick Actions</h2>
            <p className="enterprise-card-subtitle">Common tasks</p>
            <div className="enterprise-actions-list">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="enterprise-action-item"
                  onClick={() => navigate(action.path)}
                >
                  <span className="action-icon"><Icon name={action.icon} size={20} /></span>
                  {action.label}
                </button>
              ))}
            </div>

            {/* Cost Summary */}
            <div className="enterprise-summary">
              <h3 className="summary-title">Cost Summary</h3>
              <div className="summary-items">
                <div className="summary-item">
                  <span className="summary-item-label">Fixed Costs</span>
                  <span className="summary-item-value">{formatCurrency(summary.totalFixed)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">Variable Costs</span>
                  <span className="summary-item-value">{formatCurrency(summary.totalVariable)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">Semi-Variable</span>
                  <span className="summary-item-value">{formatCurrency(summary.totalSemiVariable)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">Indirect Costs</span>
                  <span className="summary-item-value">{formatCurrency(summary.totalIndirect)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">OPEX</span>
                  <span className="summary-item-value">{formatCurrency(summary.totalOpex)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">Personnel</span>
                  <span className="summary-item-value">{formatCurrency(summary.totalPersonnel)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">Financial</span>
                  <span className="summary-item-value">{formatCurrency(summary.totalFinancial)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">Risk Provisions</span>
                  <span className="summary-item-value">{formatCurrency(summary.totalRisk)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">Depreciation</span>
                  <span className="summary-item-value">{formatCurrency(summary.monthlyDepreciation)}</span>
                </div>
                <div className="summary-item total">
                  <span className="summary-item-label">Total Monthly</span>
                  <span className="summary-item-value">{formatCurrency(summary.totalMonthlyCosts)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editModal && (
        <div className="em-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="em-modal" onClick={e => e.stopPropagation()}>
            <div className="em-modal-header">
              <h3>Edit {editModal.label}</h3>
              <button className="em-modal-close" onClick={() => setEditModal(null)}>×</button>
            </div>
            <div className="em-modal-body">
              <label className="em-field-label">Value</label>
              <input className="em-field-input" value={editModal.value} onChange={e => setEditModal(m => ({...m, value: e.target.value}))} />
            </div>
            <div className="em-modal-footer">
              <button className="em-modal-cancel" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="em-modal-save" onClick={() => setEditModal(null)}>Save</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

export default EnterpriseManagement
