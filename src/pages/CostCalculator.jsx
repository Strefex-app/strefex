import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useCostStore from '../store/costStore'
import './CostCalculator.css'

const CostCalculator = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    addBomItem,
    updateBomItem,
    deleteBomItem,
    recalculateCosts,
    costCategories,
  } = useCostStore()

  const selectedId = searchParams.get('id')
  const isNew = searchParams.get('new') === 'true'

  const [selectedProductId, setSelectedProductId] = useState(selectedId || (products[0]?.id ?? null))
  const [showNewProduct, setShowNewProduct] = useState(isNew)
  const [showEditProduct, setShowEditProduct] = useState(false)
  const [showNewBomItem, setShowNewBomItem] = useState(false)
  const [editingBomId, setEditingBomId] = useState(null)
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState(null)

  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', category: 'Automotive', targetCost: '', currency: 'USD',
  })

  const [editProductData, setEditProductData] = useState({
    name: '', sku: '', category: '', targetCost: '', status: '',
  })

  const [newBomItem, setNewBomItem] = useState({
    name: '', quantity: 1, unit: 'pc', unitCost: '', supplier: '',
  })

  const [editBomData, setEditBomData] = useState({
    name: '', quantity: 1, unit: 'pc', unitCost: '', supplier: '',
  })

  const [editingCosts, setEditingCosts] = useState({
    labor: 0, overhead: 0, tooling: 0, logistics: 0,
  })

  // Selling price state
  const [sellingPrice, setSellingPrice] = useState('')
  const [targetMargin, setTargetMargin] = useState(25)

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  )

  // Sync editing costs when product changes (useEffect, not useState)
  useEffect(() => {
    if (selectedProduct) {
      setEditingCosts({
        labor: selectedProduct.costBreakdown.labor,
        overhead: selectedProduct.costBreakdown.overhead,
        tooling: selectedProduct.costBreakdown.tooling,
        logistics: selectedProduct.costBreakdown.logistics,
      })
      // Initialize selling price from product if stored, else calculate
      const total = selectedProduct.bom.reduce((s, b) => s + b.totalCost, 0)
        + selectedProduct.costBreakdown.labor
        + selectedProduct.costBreakdown.overhead
        + selectedProduct.costBreakdown.tooling
        + selectedProduct.costBreakdown.logistics
      const recommended = total / (1 - targetMargin / 100)
      setSellingPrice(selectedProduct.sellingPrice || recommended.toFixed(2))
    }
  }, [selectedProduct?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first product if none selected
  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id)
    }
  }, [products, selectedProductId])

  // Format currency with proper commas
  const fmt = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Format percentage
  const fmtPct = (val) => `${Number(val).toFixed(1)}%`

  // Parse number from input
  const parseNum = (val) => {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
  }

  // ─── Calculated values ─────────────────────────────────────
  const totals = useMemo(() => {
    if (!selectedProduct) return { materials: 0, total: 0, variance: 0, variancePct: 0 }
    const materials = selectedProduct.bom.reduce((s, b) => s + (b.totalCost || 0), 0)
    const total = materials + editingCosts.labor + editingCosts.overhead + editingCosts.tooling + editingCosts.logistics
    const variance = total - selectedProduct.targetCost
    const variancePct = selectedProduct.targetCost > 0 ? (variance / selectedProduct.targetCost) * 100 : 0
    return { materials, total, variance, variancePct }
  }, [selectedProduct, editingCosts])

  // Selling price calculations
  const priceCalc = useMemo(() => {
    const cost = totals.total
    const price = parseNum(sellingPrice)
    const profit = price - cost
    const margin = price > 0 ? (profit / price) * 100 : 0
    const markup = cost > 0 ? (profit / cost) * 100 : 0
    const recommendedPrice = cost > 0 ? cost / (1 - targetMargin / 100) : 0
    const breakEvenVolume = profit > 0 ? Math.ceil(1000 / profit) : 0 // rough per-1000-cost
    return { cost, price, profit, margin, markup, recommendedPrice, breakEvenVolume }
  }, [totals.total, sellingPrice, targetMargin])

  // ─── Handlers ──────────────────────────────────────────────
  const handleCreateProduct = () => {
    if (!newProduct.name) return
    const p = {
      ...newProduct,
      targetCost: parseNum(newProduct.targetCost),
      currentCost: 0,
      sellingPrice: 0,
    }
    addProduct(p)
    setShowNewProduct(false)
    setNewProduct({ name: '', sku: '', category: 'Automotive', targetCost: '', currency: 'USD' })
    // Select newly created product
    setTimeout(() => {
      const latest = useCostStore.getState().products
      if (latest.length > 0) setSelectedProductId(latest[latest.length - 1].id)
    }, 50)
  }

  const handleEditProduct = () => {
    if (!selectedProduct) return
    setEditProductData({
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      category: selectedProduct.category,
      targetCost: selectedProduct.targetCost,
      status: selectedProduct.status,
    })
    setShowEditProduct(true)
  }

  const handleSaveEditProduct = () => {
    if (!selectedProductId || !editProductData.name) return
    updateProduct(selectedProductId, {
      name: editProductData.name,
      sku: editProductData.sku,
      category: editProductData.category,
      targetCost: parseNum(editProductData.targetCost),
      status: editProductData.status,
    })
    setShowEditProduct(false)
  }

  const handleDeleteProduct = (id) => {
    deleteProduct(id)
    setConfirmDeleteProduct(null)
    if (selectedProductId === id) {
      const remaining = products.filter((p) => p.id !== id)
      setSelectedProductId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  const handleAddBomItem = () => {
    if (!newBomItem.name || !selectedProductId) return
    addBomItem(selectedProductId, {
      ...newBomItem,
      quantity: parseNum(newBomItem.quantity),
      unitCost: parseNum(newBomItem.unitCost),
    })
    recalculateCosts(selectedProductId)
    setShowNewBomItem(false)
    setNewBomItem({ name: '', quantity: 1, unit: 'pc', unitCost: '', supplier: '' })
  }

  const startEditBom = (item) => {
    setEditingBomId(item.id)
    setEditBomData({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
      supplier: item.supplier,
    })
  }

  const handleSaveBomEdit = (bomId) => {
    if (!selectedProductId) return
    updateBomItem(selectedProductId, bomId, {
      name: editBomData.name,
      quantity: parseNum(editBomData.quantity),
      unitCost: parseNum(editBomData.unitCost),
      unit: editBomData.unit,
      supplier: editBomData.supplier,
    })
    recalculateCosts(selectedProductId)
    setEditingBomId(null)
  }

  const handleDeleteBomItem = (bomId) => {
    if (!selectedProductId) return
    deleteBomItem(selectedProductId, bomId)
    recalculateCosts(selectedProductId)
  }

  const handleSaveCosts = () => {
    if (!selectedProductId) return
    const materialsCost = selectedProduct.bom.reduce((s, b) => s + b.totalCost, 0)
    const total = materialsCost + editingCosts.labor + editingCosts.overhead + editingCosts.tooling + editingCosts.logistics
    updateProduct(selectedProductId, {
      costBreakdown: { materials: materialsCost, ...editingCosts },
      currentCost: total,
      sellingPrice: parseNum(sellingPrice),
    })
  }

  return (
    <AppLayout>
      <div className="cost-calc-page">
        {/* Header */}
        <div className="cost-calc-header">
          <a
            className="cost-calc-back-link"
            href="/cost-management"
            onClick={(e) => { e.preventDefault(); navigate(-1) }}
          >
            ← Back
          </a>
          <div className="cost-calc-header-row">
            <div>
              <h1 className="cost-calc-title">Product Cost Calculator</h1>
              <p className="cost-calc-subtitle">Calculate and manage product costs with Bill of Materials</p>
            </div>
            <button type="button" className="cost-calc-new-btn" onClick={() => setShowNewProduct(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              New Product
            </button>
          </div>
        </div>

        <div className="cost-calc-content">
          {/* Sidebar - Product List */}
          <div className="cost-calc-sidebar">
            <h3 className="sidebar-title">Products ({products.length})</h3>
            <div className="product-list">
              {products.map((product) => {
                const variance = product.currentCost - product.targetCost
                const isOverBudget = variance > 0
                return (
                  <div
                    key={product.id}
                    className={`product-list-item ${selectedProductId === product.id ? 'active' : ''}`}
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <div className="product-list-info">
                      <span className="product-list-name">{product.name}</span>
                      <span className="product-list-sku">{product.sku}</span>
                    </div>
                    <div className="product-list-cost">
                      <span className="product-list-current">{fmt(product.currentCost)}</span>
                      <span className={`product-list-status ${isOverBudget ? 'over' : 'on-target'}`}>
                        {isOverBudget ? `+${fmt(variance)}` : 'On Target'}
                      </span>
                    </div>
                    <div className="product-list-actions">
                      <button
                        type="button"
                        className="pla-btn edit"
                        onClick={(e) => { e.stopPropagation(); setSelectedProductId(product.id); setTimeout(handleEditProduct, 0) }}
                        title="Edit product"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" /></svg>
                      </button>
                      <button
                        type="button"
                        className="pla-btn delete"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteProduct(product.id) }}
                        title="Delete product"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
              {products.length === 0 && (
                <p className="sidebar-empty">No products yet. Click "New Product" to start.</p>
              )}
            </div>
          </div>

          {/* Main Calculator Area */}
          <div className="cost-calc-main">
            {selectedProduct ? (
              <>
                {/* Product Info */}
                <div className="cost-calc-card product-info-card">
                  <div className="product-info-header">
                    <div>
                      <h2 className="product-info-name">{selectedProduct.name}</h2>
                      <div className="product-info-meta">
                        <span className="product-sku">{selectedProduct.sku}</span>
                        <span className="product-category">{selectedProduct.category}</span>
                        <span className={`product-status ${selectedProduct.status}`}>{selectedProduct.status}</span>
                        <span className="product-version">v{selectedProduct.version}</span>
                      </div>
                    </div>
                    <div className="product-cost-summary">
                      <div className="cost-summary-item">
                        <span className="cost-label">Target Cost</span>
                        <span className="cost-value target">{fmt(selectedProduct.targetCost)}</span>
                      </div>
                      <div className="cost-summary-item">
                        <span className="cost-label">Current Cost</span>
                        <span className="cost-value current">{fmt(totals.total)}</span>
                      </div>
                      <div className="cost-summary-item">
                        <span className="cost-label">Variance</span>
                        <span className={`cost-value variance ${totals.variance > 0 ? 'over' : 'under'}`}>
                          {totals.variance > 0 ? '+' : ''}{fmt(totals.variance)}
                          <small className="variance-pct"> ({totals.variance > 0 ? '+' : ''}{fmtPct(totals.variancePct)})</small>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bill of Materials */}
                <div className="cost-calc-card bom-card">
                  <div className="bom-header">
                    <h3 className="bom-title">Bill of Materials ({selectedProduct.bom.length} items)</h3>
                    <button type="button" className="bom-add-btn" onClick={() => setShowNewBomItem(true)}>+ Add Item</button>
                  </div>
                  <div className="bom-table-wrapper">
                    <table className="bom-table">
                      <thead>
                        <tr>
                          <th>Component</th>
                          <th>Supplier</th>
                          <th>Qty</th>
                          <th>Unit</th>
                          <th>Unit Cost</th>
                          <th>Total Cost</th>
                          <th>%</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProduct.bom.map((item) => {
                          const isEditing = editingBomId === item.id
                          const pct = totals.materials > 0 ? ((item.totalCost / totals.materials) * 100).toFixed(1) : '0.0'
                          if (isEditing) {
                            return (
                              <tr key={item.id} className="bom-editing-row">
                                <td>
                                  <input type="text" value={editBomData.name} onChange={(e) => setEditBomData({ ...editBomData, name: e.target.value })} className="bom-inline-input" />
                                </td>
                                <td>
                                  <input type="text" value={editBomData.supplier} onChange={(e) => setEditBomData({ ...editBomData, supplier: e.target.value })} className="bom-inline-input" />
                                </td>
                                <td>
                                  <input type="number" value={editBomData.quantity} onChange={(e) => setEditBomData({ ...editBomData, quantity: e.target.value })} className="bom-inline-input narrow" step="0.01" />
                                </td>
                                <td>
                                  <select value={editBomData.unit} onChange={(e) => setEditBomData({ ...editBomData, unit: e.target.value })} className="bom-inline-select">
                                    <option value="pc">pc</option><option value="kg">kg</option><option value="m">m</option><option value="set">set</option><option value="liter">liter</option>
                                  </select>
                                </td>
                                <td>
                                  <input type="number" value={editBomData.unitCost} onChange={(e) => setEditBomData({ ...editBomData, unitCost: e.target.value })} className="bom-inline-input narrow" step="0.01" />
                                </td>
                                <td className="bom-total-cost">{fmt(parseNum(editBomData.quantity) * parseNum(editBomData.unitCost))}</td>
                                <td />
                                <td className="bom-actions">
                                  <button type="button" className="bom-action-btn save" onClick={() => handleSaveBomEdit(item.id)}>Save</button>
                                  <button type="button" className="bom-action-btn cancel" onClick={() => setEditingBomId(null)}>Cancel</button>
                                </td>
                              </tr>
                            )
                          }
                          return (
                            <tr key={item.id}>
                              <td className="bom-component">{item.name}</td>
                              <td className="bom-supplier">{item.supplier}</td>
                              <td className="bom-qty">{item.quantity}</td>
                              <td className="bom-unit">{item.unit}</td>
                              <td className="bom-unit-cost">{fmt(item.unitCost)}</td>
                              <td className="bom-total-cost">{fmt(item.totalCost)}</td>
                              <td className="bom-pct">{pct}%</td>
                              <td className="bom-actions">
                                <button type="button" className="bom-action-btn edit" onClick={() => startEditBom(item)}>Edit</button>
                                <button type="button" className="bom-action-btn delete" onClick={() => handleDeleteBomItem(item.id)}>Delete</button>
                              </td>
                            </tr>
                          )
                        })}
                        <tr className="bom-subtotal">
                          <td colSpan="5"><strong>Materials Subtotal</strong></td>
                          <td className="bom-total-cost"><strong>{fmt(totals.materials)}</strong></td>
                          <td>100%</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Additional Cost Categories */}
                <div className="cost-calc-card other-costs-card">
                  <h3 className="other-costs-title">Additional Cost Categories (Simulation)</h3>
                  <p className="other-costs-hint">Adjust values to simulate different cost scenarios in real-time.</p>
                  <div className="other-costs-grid">
                    {[
                      { key: 'labor', label: 'Labor Cost', color: '#4CAF50' },
                      { key: 'overhead', label: 'Overhead Cost', color: '#FF9800' },
                      { key: 'tooling', label: 'Tooling Cost', color: '#9C27B0' },
                      { key: 'logistics', label: 'Logistics Cost', color: '#00BCD4' },
                    ].map((cat) => {
                      const pct = totals.total > 0 ? ((editingCosts[cat.key] / totals.total) * 100).toFixed(1) : '0.0'
                      return (
                        <div key={cat.key} className="other-cost-item">
                          <label>
                            <span className="cost-cat-dot" style={{ background: cat.color }} />
                            {cat.label}
                          </label>
                          <div className="cost-input-wrapper">
                            <span className="currency-symbol">$</span>
                            <input
                              type="number"
                              value={editingCosts[cat.key]}
                              onChange={(e) => setEditingCosts({ ...editingCosts, [cat.key]: parseNum(e.target.value) })}
                              step="0.01"
                            />
                          </div>
                          <div className="cost-item-bar">
                            <div className="cost-item-bar-fill" style={{ width: `${Math.min(parseFloat(pct), 100)}%`, background: cat.color }} />
                          </div>
                          <span className="cost-item-pct">{pct}% of total</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="other-costs-footer">
                    <div className="total-cost-display">
                      <span>Total Product Cost:</span>
                      <span className="total-cost-value">{fmt(totals.total)}</span>
                    </div>
                    <button type="button" className="save-costs-btn" onClick={handleSaveCosts}>
                      Save All Changes
                    </button>
                  </div>
                </div>

                {/* Cost Breakdown Visualization */}
                <div className="cost-calc-card breakdown-card">
                  <h3 className="breakdown-title">Cost Breakdown</h3>
                  <div className="breakdown-bars">
                    {costCategories.map((cat) => {
                      const value = cat.id === 'materials' ? totals.materials : editingCosts[cat.id] || 0
                      const percentage = totals.total > 0 ? ((value / totals.total) * 100) : 0
                      return (
                        <div key={cat.id} className="breakdown-bar-item">
                          <div className="breakdown-bar-header">
                            <span className="breakdown-bar-name" style={{ color: cat.color }}>
                              <span className="breakdown-dot" style={{ background: cat.color }} />
                              {cat.name}
                            </span>
                            <span className="breakdown-bar-value">
                              {fmt(value)} <span className="bar-pct">({fmtPct(percentage)})</span>
                            </span>
                          </div>
                          <div className="breakdown-bar-track">
                            <div className="breakdown-bar-fill" style={{ width: `${percentage}%`, background: cat.color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="breakdown-total-row">
                    <span>Total</span>
                    <span className="breakdown-total-value">{fmt(totals.total)}</span>
                  </div>
                </div>

                {/* Selling Price Calculator */}
                <div className="cost-calc-card price-card">
                  <h3 className="price-card-title">Selling Price Calculator</h3>
                  <p className="price-card-subtitle">Evaluate the optimal customer price based on your cost structure.</p>

                  <div className="price-grid">
                    {/* Left: Input */}
                    <div className="price-input-section">
                      <div className="price-input-group">
                        <label>Selling Price ($)</label>
                        <div className="cost-input-wrapper">
                          <span className="currency-symbol">$</span>
                          <input
                            type="number"
                            value={sellingPrice}
                            onChange={(e) => setSellingPrice(e.target.value)}
                            step="0.01"
                            placeholder="Enter price"
                          />
                        </div>
                      </div>
                      <div className="price-input-group">
                        <label>Target Margin (%)</label>
                        <div className="margin-slider-row">
                          <input
                            type="range"
                            min="0"
                            max="80"
                            step="1"
                            value={targetMargin}
                            onChange={(e) => setTargetMargin(parseInt(e.target.value, 10))}
                            className="margin-slider"
                          />
                          <span className="margin-value">{targetMargin}%</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="use-recommended-btn"
                        onClick={() => setSellingPrice(priceCalc.recommendedPrice.toFixed(2))}
                      >
                        Use Recommended Price: {fmt(priceCalc.recommendedPrice)}
                      </button>
                    </div>

                    {/* Right: Results */}
                    <div className="price-results">
                      <div className="price-result-item">
                        <span className="pr-label">Product Cost</span>
                        <span className="pr-value">{fmt(priceCalc.cost)}</span>
                      </div>
                      <div className="price-result-item">
                        <span className="pr-label">Selling Price</span>
                        <span className="pr-value highlight">{fmt(priceCalc.price)}</span>
                      </div>
                      <div className="price-result-divider" />
                      <div className="price-result-item">
                        <span className="pr-label">Profit per Unit</span>
                        <span className={`pr-value ${priceCalc.profit >= 0 ? 'positive' : 'negative'}`}>
                          {priceCalc.profit >= 0 ? '+' : ''}{fmt(priceCalc.profit)}
                        </span>
                      </div>
                      <div className="price-result-item">
                        <span className="pr-label">Gross Margin</span>
                        <span className={`pr-value ${priceCalc.margin >= targetMargin ? 'positive' : 'negative'}`}>
                          {fmtPct(priceCalc.margin)}
                        </span>
                      </div>
                      <div className="price-result-item">
                        <span className="pr-label">Markup</span>
                        <span className="pr-value">{fmtPct(priceCalc.markup)}</span>
                      </div>

                      {/* Margin gauge */}
                      <div className="margin-gauge">
                        <div className="margin-gauge-track">
                          <div
                            className={`margin-gauge-fill ${priceCalc.margin >= targetMargin ? 'good' : priceCalc.margin > 0 ? 'warning' : 'bad'}`}
                            style={{ width: `${Math.min(Math.max(priceCalc.margin, 0), 80)}%` }}
                          />
                          <div className="margin-target-line" style={{ left: `${targetMargin}%` }}>
                            <span className="target-label">Target {targetMargin}%</span>
                          </div>
                        </div>
                        <div className="margin-gauge-labels">
                          <span>0%</span>
                          <span>20%</span>
                          <span>40%</span>
                          <span>60%</span>
                          <span>80%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="cost-calc-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" stroke="#ccc" strokeWidth="2" />
                </svg>
                <h3>No Product Selected</h3>
                <p>Select a product from the list or create a new one to start calculating costs.</p>
                <button type="button" className="cost-calc-new-btn" onClick={() => setShowNewProduct(true)}>
                  + New Product
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Modals ────────────────────────────────────────── */}

        {/* New Product Modal */}
        {showNewProduct && (
          <div className="cost-modal-overlay" onClick={() => setShowNewProduct(false)}>
            <div className="cost-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cost-modal-header">
                <h3>Create New Product</h3>
                <button type="button" className="modal-close" onClick={() => setShowNewProduct(false)}>×</button>
              </div>
              <div className="cost-modal-body">
                <div className="modal-form-group">
                  <label>Product Name *</label>
                  <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Enter product name" />
                </div>
                <div className="modal-form-row">
                  <div className="modal-form-group">
                    <label>SKU</label>
                    <input type="text" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="Product SKU" />
                  </div>
                  <div className="modal-form-group">
                    <label>Category</label>
                    <select value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}>
                      <option value="Automotive">Automotive</option>
                      <option value="Medical">Medical</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Machinery">Machinery</option>
                      <option value="Plastic">Plastic</option>
                      <option value="Metal">Metal</option>
                    </select>
                  </div>
                </div>
                <div className="modal-form-group">
                  <label>Target Cost ($)</label>
                  <input type="number" value={newProduct.targetCost} onChange={(e) => setNewProduct({ ...newProduct, targetCost: e.target.value })} placeholder="0.00" step="0.01" />
                </div>
              </div>
              <div className="cost-modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowNewProduct(false)}>Cancel</button>
                <button type="button" className="modal-btn primary" onClick={handleCreateProduct}>Create Product</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product Modal */}
        {showEditProduct && (
          <div className="cost-modal-overlay" onClick={() => setShowEditProduct(false)}>
            <div className="cost-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cost-modal-header">
                <h3>Edit Product</h3>
                <button type="button" className="modal-close" onClick={() => setShowEditProduct(false)}>×</button>
              </div>
              <div className="cost-modal-body">
                <div className="modal-form-group">
                  <label>Product Name *</label>
                  <input type="text" value={editProductData.name} onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })} />
                </div>
                <div className="modal-form-row">
                  <div className="modal-form-group">
                    <label>SKU</label>
                    <input type="text" value={editProductData.sku} onChange={(e) => setEditProductData({ ...editProductData, sku: e.target.value })} />
                  </div>
                  <div className="modal-form-group">
                    <label>Category</label>
                    <select value={editProductData.category} onChange={(e) => setEditProductData({ ...editProductData, category: e.target.value })}>
                      <option value="Automotive">Automotive</option>
                      <option value="Medical">Medical</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Machinery">Machinery</option>
                      <option value="Plastic">Plastic</option>
                      <option value="Metal">Metal</option>
                    </select>
                  </div>
                </div>
                <div className="modal-form-row">
                  <div className="modal-form-group">
                    <label>Target Cost ($)</label>
                    <input type="number" value={editProductData.targetCost} onChange={(e) => setEditProductData({ ...editProductData, targetCost: e.target.value })} step="0.01" />
                  </div>
                  <div className="modal-form-group">
                    <label>Status</label>
                    <select value={editProductData.status} onChange={(e) => setEditProductData({ ...editProductData, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="development">Development</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="cost-modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowEditProduct(false)}>Cancel</button>
                <button type="button" className="modal-btn primary" onClick={handleSaveEditProduct}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Delete Product */}
        {confirmDeleteProduct && (
          <div className="cost-modal-overlay" onClick={() => setConfirmDeleteProduct(null)}>
            <div className="cost-modal cost-modal-confirm" onClick={(e) => e.stopPropagation()}>
              <div className="cost-modal-header">
                <h3>Delete Product</h3>
                <button type="button" className="modal-close" onClick={() => setConfirmDeleteProduct(null)}>×</button>
              </div>
              <div className="cost-modal-body">
                <p className="confirm-text">Are you sure you want to delete <strong>{products.find((p) => p.id === confirmDeleteProduct)?.name}</strong>? This action cannot be undone.</p>
              </div>
              <div className="cost-modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setConfirmDeleteProduct(null)}>Cancel</button>
                <button type="button" className="modal-btn danger" onClick={() => handleDeleteProduct(confirmDeleteProduct)}>Delete Product</button>
              </div>
            </div>
          </div>
        )}

        {/* New BOM Item Modal */}
        {showNewBomItem && (
          <div className="cost-modal-overlay" onClick={() => setShowNewBomItem(false)}>
            <div className="cost-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cost-modal-header">
                <h3>Add BOM Item</h3>
                <button type="button" className="modal-close" onClick={() => setShowNewBomItem(false)}>×</button>
              </div>
              <div className="cost-modal-body">
                <div className="modal-form-group">
                  <label>Component Name *</label>
                  <input type="text" value={newBomItem.name} onChange={(e) => setNewBomItem({ ...newBomItem, name: e.target.value })} placeholder="Enter component name" />
                </div>
                <div className="modal-form-group">
                  <label>Supplier</label>
                  <input type="text" value={newBomItem.supplier} onChange={(e) => setNewBomItem({ ...newBomItem, supplier: e.target.value })} placeholder="Supplier name" />
                </div>
                <div className="modal-form-row three-col">
                  <div className="modal-form-group">
                    <label>Quantity</label>
                    <input type="number" value={newBomItem.quantity} onChange={(e) => setNewBomItem({ ...newBomItem, quantity: e.target.value })} min="0.01" step="0.01" />
                  </div>
                  <div className="modal-form-group">
                    <label>Unit</label>
                    <select value={newBomItem.unit} onChange={(e) => setNewBomItem({ ...newBomItem, unit: e.target.value })}>
                      <option value="pc">pc</option><option value="kg">kg</option><option value="m">m</option><option value="set">set</option><option value="liter">liter</option>
                    </select>
                  </div>
                  <div className="modal-form-group">
                    <label>Unit Cost ($)</label>
                    <input type="number" value={newBomItem.unitCost} onChange={(e) => setNewBomItem({ ...newBomItem, unitCost: e.target.value })} placeholder="0.00" step="0.01" />
                  </div>
                </div>
              </div>
              <div className="cost-modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowNewBomItem(false)}>Cancel</button>
                <button type="button" className="modal-btn primary" onClick={handleAddBomItem}>Add Item</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default CostCalculator
