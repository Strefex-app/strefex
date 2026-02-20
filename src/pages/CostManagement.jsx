import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import useCostStore from '../store/costStore'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n/useTranslation'
import './CostManagement.css'

const CostManagement = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { products, scenarios, getCostSummary, costCategories } = useCostStore()
  const summary = getCostSummary()
  const role = useAuthStore((s) => s.role)
  const canEdit = role === 'manager' || role === 'admin' || role === 'superadmin'
  const [editModal, setEditModal] = useState(null)

  const subPages = [
    { id: 'calculator', label: 'Product Cost Calculator', description: 'Calculate and manage product costs with BOM', path: '/cost-management/calculator', icon: 'calculator' },
    { id: 'bom', label: 'Bill of Materials', description: 'Manage material lists and component costs', path: '/cost-management/bom', icon: 'list' },
    { id: 'breakdown', label: 'Cost Breakdown Analysis', description: 'Analyze cost structure and categories', path: '/cost-management/breakdown', icon: 'chart' },
    { id: 'comparison', label: 'Cost Comparison', description: 'Compare products, versions, and scenarios', path: '/cost-management/comparison', icon: 'compare' },
    { id: 'scenarios', label: 'What-If Scenarios', description: 'Model cost impact of changes', path: '/cost-management/scenarios', icon: 'whatif' },
    { id: 'targets', label: 'Target Costing', description: 'Set and track cost targets', path: '/cost-management/targets', icon: 'target' },
  ]

  const quickActions = [
    { id: 'new-product', label: 'New Product Cost', icon: 'plus', path: '/cost-management/calculator?new=true' },
    { id: 'import', label: 'Import BOM', icon: 'upload', path: '/cost-management/bom?import=true' },
    { id: 'report', label: 'Generate Report', icon: 'report', path: '/cost-management/breakdown' },
    { id: 'scenario', label: 'New Scenario', icon: 'whatif', path: '/cost-management/scenarios?new=true' },
  ]

  const getIcon = (iconName) => <Icon name={iconName} size={20} />

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  return (
    <AppLayout>
      <div className="cost-mgmt-page">
        {/* Header */}
        <div className="cost-mgmt-header">
          <a 
            className="cost-mgmt-back-link stx-click-feedback" 
            href="/management" 
            onClick={(e) => { e.preventDefault(); navigate(-1) }}
          >
            <Icon name="arrow-left" size={16} /> Back
          </a>
          <h1 className="cost-mgmt-title">{t('cost.title')}</h1>
          <p className="cost-mgmt-subtitle">{t('cost.subtitle')}</p>
        </div>

        {/* Top indicator cards */}
        <div className="cost-mgmt-indicators">
          <div className="cost-mgmt-indicator-card">
            <div className="cost-mgmt-indicator-icon blue">
              <Icon name="enterprise" size={24} />
            </div>
            <div>
              <div className="cost-mgmt-indicator-value">{summary.totalProducts}</div>
              <div className="cost-mgmt-indicator-label">Total Products</div>
            </div>
          </div>
          <div className="cost-mgmt-indicator-card">
            <div className="cost-mgmt-indicator-icon green">
              <Icon name="check-square" size={24} />
            </div>
            <div>
              <div className="cost-mgmt-indicator-value">{summary.onTarget}</div>
              <div className="cost-mgmt-indicator-label">On Target</div>
            </div>
          </div>
          <div className="cost-mgmt-indicator-card">
            <div className="cost-mgmt-indicator-icon orange">
              <Icon name="alert" size={24} />
            </div>
            <div>
              <div className="cost-mgmt-indicator-value">{summary.overBudget}</div>
              <div className="cost-mgmt-indicator-label">Over Budget</div>
            </div>
          </div>
          <div className="cost-mgmt-indicator-card">
            <div className={`cost-mgmt-indicator-icon ${summary.variance <= 0 ? 'green' : 'red'}`}>
              <Icon name="cost" size={24} />
            </div>
            <div>
              <div className="cost-mgmt-indicator-value">{summary.variancePercent}%</div>
              <div className="cost-mgmt-indicator-label">Cost Variance</div>
            </div>
          </div>
        </div>

        {/* Main: Pages on left + Quick Actions on right */}
        <div className="cost-mgmt-main">
          {/* Pages (Left) */}
          <div className="cost-mgmt-card">
            <h2 className="cost-mgmt-card-title">Cost Management Modules</h2>
            <p className="cost-mgmt-card-subtitle">Select a module to manage product costs</p>
            <div className="cost-mgmt-pages-list">
              {subPages.map((page) => (
                <div
                  key={page.id}
                  className="cost-mgmt-page-item stx-click-feedback"
                  onClick={() => navigate(page.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(page.path)}
                >
                  <span className="cost-mgmt-page-icon">{getIcon(page.icon)}</span>
                  <div className="cost-mgmt-page-info">
                    <div className="cost-mgmt-page-name">{page.label}</div>
                    <div className="cost-mgmt-page-desc">{page.description}</div>
                  </div>
                  <span className="cost-mgmt-page-arrow"><Icon name="chevron-right" size={16} /></span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions (Right) */}
          <div className="cost-mgmt-card">
            <h2 className="cost-mgmt-card-title">+ Quick Actions</h2>
            <p className="cost-mgmt-card-subtitle">Common cost management tasks</p>
            <div className="cost-mgmt-actions-list">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="cost-mgmt-action-item stx-click-feedback"
                  onClick={() => navigate(action.path)}
                >
                  <span className="cost-mgmt-action-icon">{getIcon(action.icon)}</span>
                  {action.label}
                </button>
              ))}
            </div>

            {/* Recent Products Summary */}
            <div className="cost-mgmt-recent">
              <h3 className="cost-mgmt-recent-title">Recent Products</h3>
              {products.slice(0, 3).map((product) => {
                const variance = product.currentCost - product.targetCost
                const isOverBudget = variance > 0
                return (
                  <div 
                    key={product.id} 
                    className="cost-mgmt-recent-item"
                    onClick={() => navigate(`/cost-management/calculator?id=${product.id}`)}
                  >
                    <div className="recent-product-info">
                      <span className="recent-product-name">{product.name}</span>
                      <span className="recent-product-sku">{product.sku}</span>
                    </div>
                    <div className="recent-product-cost">
                      <span className="recent-cost-current">{formatCurrency(product.currentCost)}</span>
                      <span className={`recent-cost-variance ${isOverBudget ? 'over' : 'under'}`}>
                        {isOverBudget ? '+' : ''}{formatCurrency(variance)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Cost Categories Overview */}
        <div className="cost-mgmt-card cost-mgmt-categories-card">
          <h2 className="cost-mgmt-card-title">Cost Categories Overview</h2>
          <div className="cost-categories-grid">
            {costCategories.map((cat) => {
              const totalForCategory = products.reduce((sum, p) => sum + (p.costBreakdown[cat.id] || 0), 0)
              const totalAllCosts = products.reduce((sum, p) => sum + p.currentCost, 0)
              const percentage = totalAllCosts > 0 ? ((totalForCategory / totalAllCosts) * 100).toFixed(1) : 0
              return (
                <div key={cat.id} className="cost-category-item">
                  <div className="category-header">
                    <span className="category-dot" style={{ background: cat.color }} />
                    <span className="category-name">{cat.name}</span>
                  </div>
                  <div className="category-value">{formatCurrency(totalForCategory)}</div>
                  <div className="category-bar">
                    <div 
                      className="category-bar-fill" 
                      style={{ width: `${percentage}%`, background: cat.color }}
                    />
                  </div>
                  <div className="category-percent">{percentage}% of total</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default CostManagement
