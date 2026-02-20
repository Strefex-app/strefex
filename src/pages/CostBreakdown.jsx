import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useCostStore from '../store/costStore'
import './CostBreakdown.css'

const CostBreakdown = () => {
  const navigate = useNavigate()
  const { products, costCategories, getCostSummary } = useCostStore()
  const summary = getCostSummary()
  
  const [selectedView, setSelectedView] = useState('all') // all, category, product
  const [selectedCategory, setSelectedCategory] = useState('materials')
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '')

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  // Aggregate data by category across all products
  const categoryTotals = useMemo(() => {
    return costCategories.map(cat => {
      const total = products.reduce((sum, p) => sum + (p.costBreakdown[cat.id] || 0), 0)
      return { ...cat, total }
    })
  }, [products, costCategories])

  const grandTotal = categoryTotals.reduce((sum, c) => sum + c.total, 0)

  // Product breakdown data
  const productBreakdowns = useMemo(() => {
    return products.map(p => ({
      ...p,
      categoryBreakdown: costCategories.map(cat => ({
        category: cat.name,
        color: cat.color,
        value: p.costBreakdown[cat.id] || 0,
        percentage: p.currentCost > 0 ? ((p.costBreakdown[cat.id] || 0) / p.currentCost * 100).toFixed(1) : 0,
      }))
    }))
  }, [products, costCategories])

  // Pie chart data
  const renderPieChart = (data, size = 200) => {
    let cumulativePercent = 0
    const total = data.reduce((sum, d) => sum + d.total, 0)
    
    return (
      <svg width={size} height={size} viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
        {data.map((item, index) => {
          const percent = total > 0 ? item.total / total : 0
          const startX = Math.cos(2 * Math.PI * cumulativePercent)
          const startY = Math.sin(2 * Math.PI * cumulativePercent)
          cumulativePercent += percent
          const endX = Math.cos(2 * Math.PI * cumulativePercent)
          const endY = Math.sin(2 * Math.PI * cumulativePercent)
          const largeArcFlag = percent > 0.5 ? 1 : 0
          
          const pathData = percent < 1 
            ? `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`
            : `M 0 -1 A 1 1 0 1 1 0 1 A 1 1 0 1 1 0 -1`
          
          return (
            <path
              key={index}
              d={pathData}
              fill={item.color}
              stroke="#fff"
              strokeWidth="0.02"
            />
          )
        })}
      </svg>
    )
  }

  return (
    <AppLayout>
      <div className="cost-breakdown-page">
        {/* Header */}
        <div className="cost-breakdown-header">
          <a 
            className="cost-breakdown-back-link" 
            href="/cost-management" 
            onClick={(e) => { e.preventDefault(); navigate(-1) }}
          >
            ← Back
          </a>
          <h1 className="cost-breakdown-title">Cost Breakdown Analysis</h1>
          <p className="cost-breakdown-subtitle">Analyze cost structure and distribution across products and categories</p>
        </div>

        {/* Summary Cards */}
        <div className="breakdown-summary-cards">
          <div className="breakdown-summary-card">
            <span className="summary-label">Total Products</span>
            <span className="summary-value">{summary.totalProducts}</span>
          </div>
          <div className="breakdown-summary-card">
            <span className="summary-label">Total Current Cost</span>
            <span className="summary-value">{formatCurrency(summary.totalCurrentCost)}</span>
          </div>
          <div className="breakdown-summary-card">
            <span className="summary-label">Total Target Cost</span>
            <span className="summary-value">{formatCurrency(summary.totalTargetCost)}</span>
          </div>
          <div className="breakdown-summary-card">
            <span className="summary-label">Overall Variance</span>
            <span className={`summary-value ${summary.variance > 0 ? 'over' : 'under'}`}>
              {summary.variance > 0 ? '+' : ''}{formatCurrency(summary.variance)}
            </span>
          </div>
        </div>

        {/* View Selector */}
        <div className="breakdown-view-selector">
          <button 
            className={`view-btn ${selectedView === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedView('all')}
          >
            Overview
          </button>
          <button 
            className={`view-btn ${selectedView === 'category' ? 'active' : ''}`}
            onClick={() => setSelectedView('category')}
          >
            By Category
          </button>
          <button 
            className={`view-btn ${selectedView === 'product' ? 'active' : ''}`}
            onClick={() => setSelectedView('product')}
          >
            By Product
          </button>
        </div>

        {/* Overview View */}
        {selectedView === 'all' && (
          <div className="breakdown-content">
            <div className="breakdown-row">
              {/* Pie Chart */}
              <div className="breakdown-card pie-chart-card">
                <h3 className="breakdown-card-title">Cost Distribution</h3>
                <div className="pie-chart-container">
                  {renderPieChart(categoryTotals, 220)}
                </div>
                <div className="pie-legend">
                  {categoryTotals.map(cat => (
                    <div key={cat.id} className="pie-legend-item">
                      <span className="legend-dot" style={{ background: cat.color }} />
                      <span className="legend-name">{cat.name}</span>
                      <span className="legend-value">
                        {grandTotal > 0 ? ((cat.total / grandTotal) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Bars */}
              <div className="breakdown-card category-bars-card">
                <h3 className="breakdown-card-title">Cost by Category</h3>
                <div className="category-bars">
                  {categoryTotals.map(cat => {
                    const percentage = grandTotal > 0 ? ((cat.total / grandTotal) * 100).toFixed(1) : 0
                    return (
                      <div key={cat.id} className="category-bar-row">
                        <div className="category-bar-info">
                          <span className="category-bar-name">{cat.name}</span>
                          <span className="category-bar-value">{formatCurrency(cat.total)}</span>
                        </div>
                        <div className="category-bar-track">
                          <div 
                            className="category-bar-fill" 
                            style={{ width: `${percentage}%`, background: cat.color }}
                          />
                        </div>
                        <span className="category-bar-percent">{percentage}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="breakdown-card products-table-card">
              <h3 className="breakdown-card-title">Product Cost Matrix</h3>
              <div className="products-table-wrapper">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      {costCategories.map(cat => (
                        <th key={cat.id} style={{ color: cat.color }}>{cat.name}</th>
                      ))}
                      <th>Total</th>
                      <th>Target</th>
                      <th>Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => {
                      const variance = product.currentCost - product.targetCost
                      return (
                        <tr key={product.id}>
                          <td className="product-name-cell">
                            <span className="product-name">{product.name}</span>
                            <span className="product-sku">{product.sku}</span>
                          </td>
                          {costCategories.map(cat => (
                            <td key={cat.id} className="cost-cell">
                              {formatCurrency(product.costBreakdown[cat.id] || 0)}
                            </td>
                          ))}
                          <td className="cost-cell total">{formatCurrency(product.currentCost)}</td>
                          <td className="cost-cell target">{formatCurrency(product.targetCost)}</td>
                          <td className={`cost-cell variance ${variance > 0 ? 'over' : 'under'}`}>
                            {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="totals-row">
                      <td><strong>Totals</strong></td>
                      {costCategories.map(cat => (
                        <td key={cat.id} className="cost-cell">
                          <strong>{formatCurrency(categoryTotals.find(c => c.id === cat.id)?.total || 0)}</strong>
                        </td>
                      ))}
                      <td className="cost-cell total"><strong>{formatCurrency(summary.totalCurrentCost)}</strong></td>
                      <td className="cost-cell target"><strong>{formatCurrency(summary.totalTargetCost)}</strong></td>
                      <td className={`cost-cell variance ${summary.variance > 0 ? 'over' : 'under'}`}>
                        <strong>{summary.variance > 0 ? '+' : ''}{formatCurrency(summary.variance)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Category View */}
        {selectedView === 'category' && (
          <div className="breakdown-content">
            <div className="category-selector">
              {costCategories.map(cat => (
                <button
                  key={cat.id}
                  className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                  style={{ 
                    borderColor: selectedCategory === cat.id ? cat.color : 'transparent',
                    background: selectedCategory === cat.id ? `${cat.color}15` : '#f8f9fa'
                  }}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span className="category-btn-dot" style={{ background: cat.color }} />
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="breakdown-card category-detail-card">
              <h3 className="breakdown-card-title">
                {costCategories.find(c => c.id === selectedCategory)?.name} Cost by Product
              </h3>
              <div className="category-products-list">
                {products.map(product => {
                  const catCost = product.costBreakdown[selectedCategory] || 0
                  const maxCatCost = Math.max(...products.map(p => p.costBreakdown[selectedCategory] || 0))
                  const percentage = maxCatCost > 0 ? ((catCost / maxCatCost) * 100) : 0
                  const catColor = costCategories.find(c => c.id === selectedCategory)?.color || '#666'
                  
                  return (
                    <div key={product.id} className="category-product-item">
                      <div className="category-product-info">
                        <span className="category-product-name">{product.name}</span>
                        <span className="category-product-value">{formatCurrency(catCost)}</span>
                      </div>
                      <div className="category-product-bar">
                        <div 
                          className="category-product-bar-fill" 
                          style={{ width: `${percentage}%`, background: catColor }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Product View */}
        {selectedView === 'product' && (
          <div className="breakdown-content">
            <div className="product-selector">
              <label>Select Product:</label>
              <select 
                value={selectedProductId} 
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {products.find(p => p.id === selectedProductId) && (() => {
              const product = products.find(p => p.id === selectedProductId)
              const variance = product.currentCost - product.targetCost
              return (
                <div className="product-detail-content">
                  <div className="breakdown-row">
                    {/* Product Summary */}
                    <div className="breakdown-card product-summary-card">
                      <div className="product-detail-header">
                        <h3>{product.name}</h3>
                        <span className="product-detail-sku">{product.sku}</span>
                      </div>
                      <div className="product-cost-metrics">
                        <div className="cost-metric">
                          <span className="metric-label">Current Cost</span>
                          <span className="metric-value">{formatCurrency(product.currentCost)}</span>
                        </div>
                        <div className="cost-metric">
                          <span className="metric-label">Target Cost</span>
                          <span className="metric-value target">{formatCurrency(product.targetCost)}</span>
                        </div>
                        <div className="cost-metric">
                          <span className="metric-label">Variance</span>
                          <span className={`metric-value ${variance > 0 ? 'over' : 'under'}`}>
                            {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Product Pie Chart */}
                    <div className="breakdown-card product-pie-card">
                      <h3 className="breakdown-card-title">Cost Distribution</h3>
                      <div className="pie-chart-container small">
                        {renderPieChart(
                          costCategories.map(cat => ({
                            ...cat,
                            total: product.costBreakdown[cat.id] || 0
                          })),
                          180
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="breakdown-card product-categories-card">
                    <h3 className="breakdown-card-title">Cost Category Breakdown</h3>
                    <div className="product-categories-grid">
                      {costCategories.map(cat => {
                        const catCost = product.costBreakdown[cat.id] || 0
                        const percentage = product.currentCost > 0 ? ((catCost / product.currentCost) * 100).toFixed(1) : 0
                        return (
                          <div key={cat.id} className="product-category-item" style={{ borderLeftColor: cat.color }}>
                            <div className="product-category-header">
                              <span className="product-category-name">{cat.name}</span>
                              <span className="product-category-percent">{percentage}%</span>
                            </div>
                            <span className="product-category-value">{formatCurrency(catCost)}</span>
                            <div className="product-category-bar">
                              <div 
                                className="product-category-bar-fill" 
                                style={{ width: `${percentage}%`, background: cat.color }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* BOM Table */}
                  <div className="breakdown-card product-bom-card">
                    <h3 className="breakdown-card-title">Bill of Materials</h3>
                    <table className="product-bom-table">
                      <thead>
                        <tr>
                          <th>Component</th>
                          <th>Supplier</th>
                          <th>Qty</th>
                          <th>Unit Cost</th>
                          <th>Total</th>
                          <th>% of Materials</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.bom.map(item => {
                          const materialTotal = product.costBreakdown.materials || 0
                          const itemPercent = materialTotal > 0 ? ((item.totalCost / materialTotal) * 100).toFixed(1) : 0
                          return (
                            <tr key={item.id}>
                              <td>{item.name}</td>
                              <td className="supplier-cell">{item.supplier}</td>
                              <td className="qty-cell">{item.quantity} {item.unit}</td>
                              <td className="cost-cell">{formatCurrency(item.unitCost)}</td>
                              <td className="cost-cell">{formatCurrency(item.totalCost)}</td>
                              <td className="percent-cell">{itemPercent}%</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default CostBreakdown
