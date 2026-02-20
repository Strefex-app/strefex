import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useCostStore from '../store/costStore'
import './CostScenarios.css'

const CostScenarios = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { products, scenarios, costCategories, addScenario, deleteScenario, calculateScenarioCost } = useCostStore()
  
  const isNew = searchParams.get('new') === 'true'
  const [showNewScenario, setShowNewScenario] = useState(isNew)
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '')
  const [compareScenarios, setCompareScenarios] = useState([])
  
  const [newScenario, setNewScenario] = useState({
    name: '',
    description: '',
    productId: products[0]?.id || '',
    adjustments: {
      materials: 1.0,
      labor: 1.0,
      overhead: 1.0,
      tooling: 1.0,
      logistics: 1.0,
    }
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatPercent = (multiplier) => {
    const change = ((multiplier - 1) * 100).toFixed(0)
    if (change > 0) return `+${change}%`
    if (change < 0) return `${change}%`
    return '0%'
  }

  const productScenarios = useMemo(() => 
    scenarios.filter(s => s.productId === selectedProductId),
    [scenarios, selectedProductId]
  )

  const selectedProduct = products.find(p => p.id === selectedProductId)

  const handleCreateScenario = () => {
    if (!newScenario.name || !newScenario.productId) return
    addScenario(newScenario)
    setShowNewScenario(false)
    setNewScenario({
      name: '',
      description: '',
      productId: products[0]?.id || '',
      adjustments: { materials: 1.0, labor: 1.0, overhead: 1.0, tooling: 1.0, logistics: 1.0 }
    })
  }

  const toggleScenarioCompare = (scenarioId) => {
    if (compareScenarios.includes(scenarioId)) {
      setCompareScenarios(compareScenarios.filter(id => id !== scenarioId))
    } else if (compareScenarios.length < 3) {
      setCompareScenarios([...compareScenarios, scenarioId])
    }
  }

  const getScenarioResults = (scenarioId) => {
    return calculateScenarioCost(scenarioId)
  }

  return (
    <AppLayout>
      <div className="cost-scenarios-page">
        {/* Header */}
        <div className="cost-scenarios-header">
          <a 
            className="cost-scenarios-back-link" 
            href="/cost-management" 
            onClick={(e) => { e.preventDefault(); navigate(-1) }}
          >
            ← Back
          </a>
          <div className="cost-scenarios-header-row">
            <div>
              <h1 className="cost-scenarios-title">What-If Scenarios</h1>
              <p className="cost-scenarios-subtitle">Model cost impact of changes and compare different scenarios</p>
            </div>
            <button 
              type="button" 
              className="scenario-new-btn"
              onClick={() => setShowNewScenario(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              New Scenario
            </button>
          </div>
        </div>

        {/* Product Selector */}
        <div className="scenario-product-selector">
          <label>Select Product:</label>
          <select 
            value={selectedProductId} 
            onChange={(e) => {
              setSelectedProductId(e.target.value)
              setCompareScenarios([])
            }}
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="scenarios-content">
            {/* Base Cost Card */}
            <div className="scenario-card baseline-card">
              <h3 className="scenario-card-title">Baseline Cost</h3>
              <p className="baseline-product-name">{selectedProduct.name}</p>
              <div className="baseline-costs">
                {costCategories.map(cat => (
                  <div key={cat.id} className="baseline-cost-item">
                    <span className="baseline-cost-label" style={{ color: cat.color }}>{cat.name}</span>
                    <span className="baseline-cost-value">{formatCurrency(selectedProduct.costBreakdown[cat.id] || 0)}</span>
                  </div>
                ))}
                <div className="baseline-cost-item total">
                  <span className="baseline-cost-label">Total Cost</span>
                  <span className="baseline-cost-value">{formatCurrency(selectedProduct.currentCost)}</span>
                </div>
                <div className="baseline-cost-item">
                  <span className="baseline-cost-label">Target Cost</span>
                  <span className="baseline-cost-value target">{formatCurrency(selectedProduct.targetCost)}</span>
                </div>
              </div>
            </div>

            {/* Scenarios List */}
            <div className="scenario-card scenarios-list-card">
              <h3 className="scenario-card-title">Scenarios ({productScenarios.length})</h3>
              {productScenarios.length === 0 ? (
                <div className="no-scenarios">
                  <p>No scenarios created for this product yet.</p>
                  <button type="button" className="create-scenario-link" onClick={() => setShowNewScenario(true)}>
                    Create your first scenario
                  </button>
                </div>
              ) : (
                <div className="scenarios-list">
                  {productScenarios.map(scenario => {
                    const results = getScenarioResults(scenario.id)
                    const variance = results ? results.total - selectedProduct.currentCost : 0
                    const isSelected = compareScenarios.includes(scenario.id)
                    
                    return (
                      <div 
                        key={scenario.id} 
                        className={`scenario-item ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="scenario-item-header">
                          <div className="scenario-item-info">
                            <h4 className="scenario-item-name">{scenario.name}</h4>
                            <p className="scenario-item-desc">{scenario.description}</p>
                          </div>
                          <div className="scenario-item-actions">
                            <button 
                              type="button"
                              className={`compare-btn ${isSelected ? 'active' : ''}`}
                              onClick={() => toggleScenarioCompare(scenario.id)}
                              disabled={!isSelected && compareScenarios.length >= 3}
                            >
                              {isSelected ? '✓ Comparing' : 'Compare'}
                            </button>
                            {!scenario.isBaseline && (
                              <button 
                                type="button"
                                className="delete-btn"
                                onClick={() => deleteScenario(scenario.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="scenario-adjustments">
                          {Object.entries(scenario.adjustments).map(([key, value]) => {
                            const cat = costCategories.find(c => c.id === key)
                            if (!cat || value === 1) return null
                            return (
                              <span key={key} className={`adjustment-badge ${value > 1 ? 'increase' : 'decrease'}`}>
                                {cat.name}: {formatPercent(value)}
                              </span>
                            )
                          })}
                          {Object.values(scenario.adjustments).every(v => v === 1) && (
                            <span className="adjustment-badge">No adjustments (baseline)</span>
                          )}
                        </div>
                        
                        {results && (
                          <div className="scenario-results">
                            <div className="scenario-result-item">
                              <span className="result-label">Projected Cost</span>
                              <span className="result-value">{formatCurrency(results.total)}</span>
                            </div>
                            <div className="scenario-result-item">
                              <span className="result-label">vs. Current</span>
                              <span className={`result-value ${variance > 0 ? 'increase' : 'decrease'}`}>
                                {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Comparison View */}
            {compareScenarios.length > 0 && (
              <div className="scenario-card comparison-card">
                <h3 className="scenario-card-title">Scenario Comparison</h3>
                <div className="comparison-table-wrapper">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th>Cost Category</th>
                        <th>Current</th>
                        {compareScenarios.map(scenarioId => {
                          const scenario = scenarios.find(s => s.id === scenarioId)
                          return <th key={scenarioId}>{scenario?.name}</th>
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {costCategories.map(cat => (
                        <tr key={cat.id}>
                          <td className="category-cell" style={{ color: cat.color }}>
                            {cat.name}
                          </td>
                          <td className="value-cell">
                            {formatCurrency(selectedProduct.costBreakdown[cat.id] || 0)}
                          </td>
                          {compareScenarios.map(scenarioId => {
                            const results = getScenarioResults(scenarioId)
                            const currentVal = selectedProduct.costBreakdown[cat.id] || 0
                            const newVal = results?.[cat.id] || 0
                            const diff = newVal - currentVal
                            return (
                              <td key={scenarioId} className="value-cell">
                                <span className="scenario-value">{formatCurrency(newVal)}</span>
                                {diff !== 0 && (
                                  <span className={`scenario-diff ${diff > 0 ? 'increase' : 'decrease'}`}>
                                    ({diff > 0 ? '+' : ''}{formatCurrency(diff)})
                                  </span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td><strong>Total</strong></td>
                        <td className="value-cell">
                          <strong>{formatCurrency(selectedProduct.currentCost)}</strong>
                        </td>
                        {compareScenarios.map(scenarioId => {
                          const results = getScenarioResults(scenarioId)
                          const diff = (results?.total || 0) - selectedProduct.currentCost
                          return (
                            <td key={scenarioId} className="value-cell">
                              <strong>{formatCurrency(results?.total || 0)}</strong>
                              {diff !== 0 && (
                                <span className={`scenario-diff ${diff > 0 ? 'increase' : 'decrease'}`}>
                                  ({diff > 0 ? '+' : ''}{formatCurrency(diff)})
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                      <tr className="target-row">
                        <td>Target</td>
                        <td className="value-cell target">
                          {formatCurrency(selectedProduct.targetCost)}
                        </td>
                        {compareScenarios.map(scenarioId => {
                          const results = getScenarioResults(scenarioId)
                          const variance = (results?.total || 0) - selectedProduct.targetCost
                          return (
                            <td key={scenarioId} className={`value-cell ${variance <= 0 ? 'on-target' : 'over-target'}`}>
                              {variance <= 0 ? '✓ On Target' : `+${formatCurrency(variance)} over`}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* New Scenario Modal */}
        {showNewScenario && (
          <div className="scenario-modal-overlay" onClick={() => setShowNewScenario(false)}>
            <div className="scenario-modal" onClick={e => e.stopPropagation()}>
              <div className="scenario-modal-header">
                <h3>Create New Scenario</h3>
                <button type="button" className="modal-close" onClick={() => setShowNewScenario(false)}>×</button>
              </div>
              <div className="scenario-modal-body">
                <div className="modal-form-group">
                  <label>Scenario Name *</label>
                  <input 
                    type="text"
                    value={newScenario.name}
                    onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                    placeholder="e.g., Material Cost +15%"
                  />
                </div>
                <div className="modal-form-group">
                  <label>Description</label>
                  <textarea 
                    value={newScenario.description}
                    onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                    placeholder="Describe the scenario..."
                    rows={2}
                  />
                </div>
                <div className="modal-form-group">
                  <label>Product</label>
                  <select 
                    value={newScenario.productId}
                    onChange={(e) => setNewScenario({ ...newScenario, productId: e.target.value })}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="adjustments-section">
                  <h4>Cost Adjustments</h4>
                  <p className="adjustments-hint">Set multipliers for each cost category (1.0 = no change, 1.1 = +10%, 0.9 = -10%)</p>
                  <div className="adjustments-grid">
                    {costCategories.map(cat => (
                      <div key={cat.id} className="adjustment-input-group">
                        <label style={{ color: cat.color }}>{cat.name}</label>
                        <div className="adjustment-input-wrapper">
                          <input 
                            type="number"
                            value={newScenario.adjustments[cat.id]}
                            onChange={(e) => setNewScenario({
                              ...newScenario,
                              adjustments: {
                                ...newScenario.adjustments,
                                [cat.id]: parseFloat(e.target.value) || 1
                              }
                            })}
                            step="0.01"
                            min="0"
                          />
                          <span className="adjustment-preview">
                            {formatPercent(newScenario.adjustments[cat.id])}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="scenario-modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowNewScenario(false)}>Cancel</button>
                <button type="button" className="modal-btn primary" onClick={handleCreateScenario}>Create Scenario</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default CostScenarios
