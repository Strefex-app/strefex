import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useCostStore from '../store/costStore'
import './CostTargets.css'

const CostTargets = () => {
  const navigate = useNavigate()
  const { products, updateProduct, costCategories, getCostSummary } = useCostStore()
  const summary = getCostSummary()
  
  const [editingProductId, setEditingProductId] = useState(null)
  const [editTargetValue, setEditTargetValue] = useState(0)

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`
  }

  const handleStartEdit = (product) => {
    setEditingProductId(product.id)
    setEditTargetValue(product.targetCost)
  }

  const handleSaveTarget = (productId) => {
    updateProduct(productId, { targetCost: editTargetValue })
    setEditingProductId(null)
  }

  const handleCancelEdit = () => {
    setEditingProductId(null)
    setEditTargetValue(0)
  }

  // Calculate target achievement percentage
  const getTargetAchievement = (product) => {
    if (product.targetCost === 0) return 100
    const achievement = (product.targetCost / product.currentCost) * 100
    return Math.min(achievement, 100)
  }

  // Get status color based on variance
  const getStatusClass = (product) => {
    const variance = product.currentCost - product.targetCost
    if (variance <= 0) return 'on-target'
    if (variance <= product.targetCost * 0.1) return 'close'
    return 'over-budget'
  }

  const getStatusLabel = (product) => {
    const variance = product.currentCost - product.targetCost
    if (variance <= 0) return 'On Target'
    if (variance <= product.targetCost * 0.1) return 'Near Target'
    return 'Over Budget'
  }

  return (
    <AppLayout>
      <div className="cost-targets-page">
        {/* Header */}
        <div className="cost-targets-header">
          <a 
            className="cost-targets-back-link" 
            href="/cost-management" 
            onClick={(e) => { e.preventDefault(); navigate(-1) }}
          >
            ← Back
          </a>
          <h1 className="cost-targets-title">Target Costing</h1>
          <p className="cost-targets-subtitle">Set and track cost targets for products</p>
        </div>

        {/* Summary Cards */}
        <div className="targets-summary-cards">
          <div className="targets-summary-card">
            <div className="summary-icon green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="summary-content">
              <span className="summary-value">{summary.onTarget}</span>
              <span className="summary-label">On Target</span>
            </div>
          </div>
          <div className="targets-summary-card">
            <div className="summary-icon orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="summary-content">
              <span className="summary-value">{summary.overBudget}</span>
              <span className="summary-label">Over Budget</span>
            </div>
          </div>
          <div className="targets-summary-card">
            <div className="summary-icon blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="summary-content">
              <span className="summary-value">{formatCurrency(summary.totalTargetCost)}</span>
              <span className="summary-label">Total Target</span>
            </div>
          </div>
          <div className="targets-summary-card">
            <div className={`summary-icon ${summary.variance <= 0 ? 'green' : 'red'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="summary-content">
              <span className={`summary-value ${summary.variance > 0 ? 'over' : 'under'}`}>
                {summary.variance > 0 ? '+' : ''}{formatCurrency(summary.variance)}
              </span>
              <span className="summary-label">Total Variance</span>
            </div>
          </div>
        </div>

        {/* Products Target List */}
        <div className="targets-card">
          <h3 className="targets-card-title">Product Target Costs</h3>
          <div className="targets-list">
            {products.map(product => {
              const variance = product.currentCost - product.targetCost
              const achievement = getTargetAchievement(product)
              const statusClass = getStatusClass(product)
              const isEditing = editingProductId === product.id

              return (
                <div key={product.id} className={`target-item ${statusClass}`}>
                  <div className="target-item-header">
                    <div className="target-product-info">
                      <h4 className="target-product-name">{product.name}</h4>
                      <span className="target-product-sku">{product.sku}</span>
                    </div>
                    <span className={`target-status-badge ${statusClass}`}>
                      {getStatusLabel(product)}
                    </span>
                  </div>

                  <div className="target-costs-row">
                    <div className="target-cost-block">
                      <span className="cost-block-label">Current Cost</span>
                      <span className="cost-block-value current">{formatCurrency(product.currentCost)}</span>
                    </div>
                    <div className="target-cost-block">
                      <span className="cost-block-label">Target Cost</span>
                      {isEditing ? (
                        <div className="target-edit-input">
                          <span className="currency-prefix">$</span>
                          <input 
                            type="number"
                            value={editTargetValue}
                            onChange={(e) => setEditTargetValue(parseFloat(e.target.value) || 0)}
                            step="0.01"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <span className="cost-block-value target">{formatCurrency(product.targetCost)}</span>
                      )}
                    </div>
                    <div className="target-cost-block">
                      <span className="cost-block-label">Variance</span>
                      <span className={`cost-block-value variance ${variance > 0 ? 'over' : 'under'}`}>
                        {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                      </span>
                    </div>
                    <div className="target-actions">
                      {isEditing ? (
                        <>
                          <button 
                            type="button" 
                            className="target-btn save"
                            onClick={() => handleSaveTarget(product.id)}
                          >
                            Save
                          </button>
                          <button 
                            type="button" 
                            className="target-btn cancel"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button 
                          type="button" 
                          className="target-btn edit"
                          onClick={() => handleStartEdit(product)}
                        >
                          Edit Target
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="target-progress">
                    <div className="progress-label">
                      <span>Target Achievement</span>
                      <span className="progress-percent">{formatPercent(achievement)}</span>
                    </div>
                    <div className="progress-bar-track">
                      <div 
                        className={`progress-bar-fill ${statusClass}`}
                        style={{ width: `${Math.min(achievement, 100)}%` }}
                      />
                      {achievement < 100 && (
                        <div 
                          className="progress-bar-remaining"
                          style={{ width: `${100 - achievement}%` }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Cost Category Breakdown */}
                  <div className="target-breakdown">
                    <span className="breakdown-label">Cost Breakdown:</span>
                    <div className="breakdown-items">
                      {costCategories.map(cat => {
                        const catCost = product.costBreakdown[cat.id] || 0
                        const catPercent = product.currentCost > 0 ? ((catCost / product.currentCost) * 100).toFixed(0) : 0
                        return (
                          <span key={cat.id} className="breakdown-item" style={{ color: cat.color }}>
                            {cat.name}: {catPercent}%
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Target Setting Guide */}
        <div className="targets-card guide-card">
          <h3 className="targets-card-title">Target Costing Guidelines</h3>
          <div className="guide-content">
            <div className="guide-section">
              <h4>What is Target Costing?</h4>
              <p>Target costing is a pricing method that starts with the selling price and desired profit margin to determine the maximum allowable product cost.</p>
            </div>
            <div className="guide-section">
              <h4>Setting Effective Targets</h4>
              <ul>
                <li>Consider market prices and competitor offerings</li>
                <li>Account for desired profit margins</li>
                <li>Include all direct and indirect costs</li>
                <li>Set realistic but challenging targets</li>
                <li>Review and adjust targets periodically</li>
              </ul>
            </div>
            <div className="guide-section">
              <h4>Cost Reduction Strategies</h4>
              <ul>
                <li><strong>Design optimization:</strong> Simplify product design to reduce material and labor costs</li>
                <li><strong>Supplier negotiation:</strong> Work with suppliers to reduce material costs</li>
                <li><strong>Process improvement:</strong> Streamline manufacturing processes</li>
                <li><strong>Value engineering:</strong> Identify and eliminate non-value-adding costs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default CostTargets
