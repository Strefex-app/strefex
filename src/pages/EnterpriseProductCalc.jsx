import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useEnterpriseStore from '../store/enterpriseStore'
import './EnterpriseProductCalc.css'

const EnterpriseProductCalc = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    products,
    calculateProductCost,
    getEnterpriseSummary,
    addProduct,
    updateProduct,
    deleteProduct,
    config,
  } = useEnterpriseStore()

  const showSimOnLoad = searchParams.get('simulation') === 'true'

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [showSimulation, setShowSimulation] = useState(showSimOnLoad)
  const [activeTab, setActiveTab] = useState('breakdown') // breakdown | pricing | simulation

  const [simulationParams, setSimulationParams] = useState({
    priceChange: 0, volumeChange: 0, materialChange: 0, laborChange: 0,
  })

  const emptyProduct = {
    name: '', sku: '', sellingPrice: '', unitsPerMonth: '',
    directMaterialCost: '', directLaborHours: '', machineHours: '',
    packagingCost: '', shippingCost: '',
  }

  const [newProduct, setNewProduct] = useState({ ...emptyProduct })
  const [editProductData, setEditProductData] = useState({ ...emptyProduct })

  // Selling price state
  const [targetMargin, setTargetMargin] = useState(25)

  const summary = useMemo(() => getEnterpriseSummary(), [getEnterpriseSummary, products])

  const productCalc = useMemo(() => {
    if (!selectedProductId) return null
    return calculateProductCost(selectedProductId)
  }, [selectedProductId, calculateProductCost, products])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  )

  const allProductCalcs = useMemo(
    () => products.map((p) => calculateProductCost(p.id)).filter(Boolean),
    [products, calculateProductCost]
  )

  // Auto-select first if none selected
  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id)
    }
  }, [products, selectedProductId])

  // ─── Helpers ───────────────────────────────────────────────
  const fmt = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(amount)
  }

  const fmtPct = (val) => `${Number(val || 0).toFixed(1)}%`

  const parseNum = (val) => {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
  }

  // ─── Pricing calculations ─────────────────────────────────
  const priceCalc = useMemo(() => {
    if (!productCalc || !selectedProduct) return null
    const cost = productCalc.totalCostPerUnit
    const price = selectedProduct.sellingPrice
    const profit = price - cost
    const margin = price > 0 ? (profit / price) * 100 : 0
    const markup = cost > 0 ? (profit / cost) * 100 : 0
    const recommendedPrice = cost > 0 ? cost / (1 - targetMargin / 100) : 0
    const recommendedProfit = recommendedPrice - cost
    return { cost, price, profit, margin, markup, recommendedPrice, recommendedProfit }
  }, [productCalc, selectedProduct, targetMargin])

  // ─── Simulation ───────────────────────────────────────────
  const simulatedResult = useMemo(() => {
    if (!productCalc || !selectedProduct) return null

    const priceMultiplier = 1 + (simulationParams.priceChange / 100)
    const volumeMultiplier = 1 + (simulationParams.volumeChange / 100)
    const materialMultiplier = 1 + (simulationParams.materialChange / 100)
    const laborMultiplier = 1 + (simulationParams.laborChange / 100)

    const newPrice = selectedProduct.sellingPrice * priceMultiplier
    const newVolume = selectedProduct.unitsPerMonth * volumeMultiplier

    const bd = productCalc.breakdown
    const newDirectMaterial = bd.directMaterial * materialMultiplier
    const newDirectLabor = bd.directLabor * laborMultiplier

    const newTotalCost =
      newDirectMaterial + newDirectLabor + bd.machineTime +
      bd.packaging + bd.shipping + bd.variableCostPerUnit +
      (volumeMultiplier > 0 ? bd.fixedPerUnit / volumeMultiplier : 0) +
      (volumeMultiplier > 0 ? bd.indirectPerUnit / volumeMultiplier : 0) +
      (volumeMultiplier > 0 ? bd.opexPerUnit / volumeMultiplier : 0) +
      (volumeMultiplier > 0 ? bd.depreciationPerUnit / volumeMultiplier : 0) +
      (volumeMultiplier > 0 ? bd.personnelPerUnit / volumeMultiplier : 0) +
      (volumeMultiplier > 0 ? bd.financialPerUnit / volumeMultiplier : 0) +
      (volumeMultiplier > 0 ? bd.riskPerUnit / volumeMultiplier : 0) +
      bd.semiVariablePerUnit

    const newMargin = newPrice - newTotalCost
    const newMarginPercent = newPrice > 0 ? (newMargin / newPrice) * 100 : 0

    return {
      originalPrice: selectedProduct.sellingPrice,
      newPrice,
      originalCost: productCalc.totalCostPerUnit,
      newCost: newTotalCost,
      originalMargin: productCalc.grossMargin,
      newMargin,
      originalMarginPercent: productCalc.grossMarginPercent,
      newMarginPercent,
      originalVolume: selectedProduct.unitsPerMonth,
      newVolume,
      originalProfit: productCalc.monthlyProfit,
      newProfit: newMargin * newVolume,
    }
  }, [productCalc, selectedProduct, simulationParams])

  // ─── Handlers ─────────────────────────────────────────────
  const handleAddProduct = () => {
    if (!newProduct.name) return
    addProduct({
      name: newProduct.name,
      sku: newProduct.sku,
      sellingPrice: parseNum(newProduct.sellingPrice),
      unitsPerMonth: Math.round(parseNum(newProduct.unitsPerMonth)),
      directMaterialCost: parseNum(newProduct.directMaterialCost),
      directLaborHours: parseNum(newProduct.directLaborHours),
      machineHours: parseNum(newProduct.machineHours),
      packagingCost: parseNum(newProduct.packagingCost),
      shippingCost: parseNum(newProduct.shippingCost),
    })
    setShowAddModal(false)
    setNewProduct({ ...emptyProduct })
    setTimeout(() => {
      const latest = useEnterpriseStore.getState().products
      if (latest.length > 0) setSelectedProductId(latest[latest.length - 1].id)
    }, 50)
  }

  const openEditProduct = (prod) => {
    setEditProductData({
      name: prod.name,
      sku: prod.sku,
      sellingPrice: prod.sellingPrice,
      unitsPerMonth: prod.unitsPerMonth,
      directMaterialCost: prod.directMaterialCost,
      directLaborHours: prod.directLaborHours,
      machineHours: prod.machineHours,
      packagingCost: prod.packagingCost,
      shippingCost: prod.shippingCost,
    })
    setShowEditModal(true)
  }

  const handleSaveEditProduct = () => {
    if (!selectedProductId || !editProductData.name) return
    updateProduct(selectedProductId, {
      name: editProductData.name,
      sku: editProductData.sku,
      sellingPrice: parseNum(editProductData.sellingPrice),
      unitsPerMonth: Math.round(parseNum(editProductData.unitsPerMonth)),
      directMaterialCost: parseNum(editProductData.directMaterialCost),
      directLaborHours: parseNum(editProductData.directLaborHours),
      machineHours: parseNum(editProductData.machineHours),
      packagingCost: parseNum(editProductData.packagingCost),
      shippingCost: parseNum(editProductData.shippingCost),
    })
    setShowEditModal(false)
  }

  const handleDeleteProduct = (id) => {
    deleteProduct(id)
    setConfirmDeleteId(null)
    if (selectedProductId === id) {
      const remaining = products.filter((p) => p.id !== id)
      setSelectedProductId(remaining.length > 0 ? remaining[0].id : '')
    }
  }

  const handleApplyRecommendedPrice = () => {
    if (!selectedProductId || !priceCalc) return
    updateProduct(selectedProductId, {
      sellingPrice: parseFloat(priceCalc.recommendedPrice.toFixed(2)),
    })
  }

  // Cost breakdown colors
  const costColors = {
    directMaterial: '#2196F3',
    directLabor: '#4CAF50',
    machineTime: '#FF9800',
    packaging: '#9C27B0',
    shipping: '#00BCD4',
    variableCostPerUnit: '#e74c3c',
    fixedPerUnit: '#3498db',
    indirectPerUnit: '#f39c12',
    opexPerUnit: '#1abc9c',
    depreciationPerUnit: '#8e44ad',
    personnelPerUnit: '#e67e22',
    financialPerUnit: '#2c3e50',
    riskPerUnit: '#c0392b',
    semiVariablePerUnit: '#7f8c8d',
  }

  const costLabels = {
    directMaterial: 'Direct Materials',
    directLabor: 'Direct Labor',
    machineTime: 'Machine Time',
    packaging: 'Packaging',
    shipping: 'Shipping',
    variableCostPerUnit: 'Variable Costs',
    fixedPerUnit: 'Fixed Costs (allocated)',
    indirectPerUnit: 'Indirect Costs (allocated)',
    opexPerUnit: 'OPEX (allocated)',
    depreciationPerUnit: 'Depreciation (allocated)',
    personnelPerUnit: 'Personnel (allocated)',
    financialPerUnit: 'Financial (allocated)',
    riskPerUnit: 'Risk Provisions (allocated)',
    semiVariablePerUnit: 'Semi-Variable Costs',
  }

  return (
    <AppLayout>
      <div className="epc-page">
        {/* Header */}
        <div className="epc-header">
          <a className="epc-back" href="/enterprise" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            ← Back
          </a>
          <div className="epc-header-row">
            <div>
              <h1 className="epc-title">Product Cost Calculation</h1>
              <p className="epc-subtitle">Calculate real manufacturing costs and profit margins using all enterprise cost data</p>
            </div>
            <div className="epc-header-actions">
              <button type="button" className="epc-btn primary" onClick={() => setShowAddModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                Add Product
              </button>
            </div>
          </div>
        </div>

        {/* Enterprise Summary */}
        <div className="epc-overview">
          <div className="epc-ov-card">
            <span className="epc-ov-label">Monthly Revenue</span>
            <span className="epc-ov-value green">{fmt(summary.totalRevenue)}</span>
          </div>
          <div className="epc-ov-card">
            <span className="epc-ov-label">Monthly Costs</span>
            <span className="epc-ov-value">{fmt(summary.totalCost)}</span>
          </div>
          <div className="epc-ov-card">
            <span className="epc-ov-label">Monthly Profit</span>
            <span className={`epc-ov-value ${summary.totalProfit >= 0 ? 'green' : 'red'}`}>{fmt(summary.totalProfit)}</span>
          </div>
          <div className="epc-ov-card">
            <span className="epc-ov-label">Overall Margin</span>
            <span className={`epc-ov-value ${summary.overallMargin >= 15 ? 'green' : summary.overallMargin >= 5 ? 'orange' : 'red'}`}>
              {fmtPct(summary.overallMargin)}
            </span>
          </div>
        </div>

        <div className="epc-content">
          {/* Left sidebar - Product list */}
          <div className="epc-sidebar">
            <h3 className="epc-sidebar-title">Products ({products.length})</h3>
            <div className="epc-product-list">
              {products.map((p) => {
                const calc = calculateProductCost(p.id)
                return (
                  <div
                    key={p.id}
                    className={`epc-prod-item ${selectedProductId === p.id ? 'active' : ''}`}
                    onClick={() => setSelectedProductId(p.id)}
                  >
                    <div className="epc-prod-info">
                      <span className="epc-prod-name">{p.name}</span>
                      <span className="epc-prod-sku">{p.sku}</span>
                    </div>
                    <div className="epc-prod-metrics">
                      <span className="epc-prod-price">{fmt(p.sellingPrice)}</span>
                      {calc && (
                        <span className={`epc-prod-margin ${calc.grossMarginPercent >= 15 ? 'good' : calc.grossMarginPercent >= 5 ? 'ok' : 'bad'}`}>
                          {fmtPct(calc.grossMarginPercent)}
                        </span>
                      )}
                    </div>
                    <div className="epc-prod-actions">
                      <button
                        type="button" className="epc-pa-btn edit"
                        onClick={(e) => { e.stopPropagation(); setSelectedProductId(p.id); openEditProduct(p) }}
                        title="Edit"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" /></svg>
                      </button>
                      <button
                        type="button" className="epc-pa-btn delete"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id) }}
                        title="Delete"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
              {products.length === 0 && (
                <p className="epc-sidebar-empty">No products. Add one to begin.</p>
              )}
            </div>
          </div>

          {/* Main area */}
          <div className="epc-main">
            {productCalc && selectedProduct ? (
              <>
                {/* Product Summary Card */}
                <div className="epc-card epc-summary-card">
                  <div className="epc-summary-header">
                    <div>
                      <h2 className="epc-summary-name">{productCalc.productName}</h2>
                      <span className="epc-summary-sku">{productCalc.sku} · {productCalc.unitsPerMonth.toLocaleString()} units/mo</span>
                    </div>
                    <div className="epc-key-metrics">
                      <div className="epc-km">
                        <span className="epc-km-label">Selling Price</span>
                        <span className="epc-km-value">{fmt(productCalc.sellingPrice)}</span>
                      </div>
                      <div className="epc-km">
                        <span className="epc-km-label">Full Cost</span>
                        <span className="epc-km-value">{fmt(productCalc.totalCostPerUnit)}</span>
                      </div>
                      <div className="epc-km">
                        <span className="epc-km-label">Margin</span>
                        <span className={`epc-km-value ${productCalc.grossMarginPercent >= 15 ? 'green' : productCalc.grossMarginPercent >= 5 ? 'orange' : 'red'}`}>
                          {fmt(productCalc.grossMargin)}
                          <small className="epc-km-pct"> ({fmtPct(productCalc.grossMarginPercent)})</small>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Impact strip */}
                  <div className="epc-monthly-strip">
                    <div className="epc-ms-item">
                      <span className="epc-ms-label">Monthly Revenue</span>
                      <span className="epc-ms-value green">{fmt(productCalc.monthlyRevenue)}</span>
                    </div>
                    <div className="epc-ms-item">
                      <span className="epc-ms-label">Monthly Cost</span>
                      <span className="epc-ms-value">{fmt(productCalc.monthlyCost)}</span>
                    </div>
                    <div className="epc-ms-item highlight">
                      <span className="epc-ms-label">Monthly Profit</span>
                      <span className={`epc-ms-value ${productCalc.monthlyProfit >= 0 ? 'green' : 'red'}`}>{fmt(productCalc.monthlyProfit)}</span>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="epc-tabs">
                  <button type="button" className={`epc-tab ${activeTab === 'breakdown' ? 'active' : ''}`} onClick={() => setActiveTab('breakdown')}>
                    Cost Breakdown
                  </button>
                  <button type="button" className={`epc-tab ${activeTab === 'pricing' ? 'active' : ''}`} onClick={() => setActiveTab('pricing')}>
                    Selling Price Analysis
                  </button>
                  <button type="button" className={`epc-tab ${activeTab === 'simulation' ? 'active' : ''}`} onClick={() => { setActiveTab('simulation'); setShowSimulation(true) }}>
                    What-If Simulation
                  </button>
                </div>

                {/* Tab: Cost Breakdown */}
                {activeTab === 'breakdown' && (
                  <div className="epc-card epc-breakdown-card">
                    <h3 className="epc-section-title">Full Cost Breakdown (Per Unit)</h3>

                    {/* Visual bars */}
                    <div className="epc-breakdown-bars">
                      {Object.entries(costLabels).map(([key, label]) => {
                        const value = productCalc.breakdown[key] || 0
                        const pct = productCalc.totalCostPerUnit > 0 ? (value / productCalc.totalCostPerUnit) * 100 : 0
                        return (
                          <div key={key} className="epc-bb-item">
                            <div className="epc-bb-header">
                              <span className="epc-bb-name">
                                <span className="epc-bb-dot" style={{ background: costColors[key] }} />
                                {label}
                              </span>
                              <span className="epc-bb-values">
                                {fmt(value)} <span className="epc-bb-pct">({fmtPct(pct)})</span>
                              </span>
                            </div>
                            <div className="epc-bb-track">
                              <div className="epc-bb-fill" style={{ width: `${pct}%`, background: costColors[key] }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Detailed table */}
                    <div className="epc-breakdown-table">
                      <div className="epc-bt-section">
                        <h4 className="epc-bt-title">Direct Costs</h4>
                        <div className="epc-bt-row">
                          <span>Direct Materials</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.directMaterial)}</span>
                        </div>
                        <div className="epc-bt-row">
                          <span>Direct Labor ({(productCalc.breakdown.directLabor / config.laborHourlyRate).toFixed(1)} hrs @ {fmt(config.laborHourlyRate)}/hr)</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.directLabor)}</span>
                        </div>
                        <div className="epc-bt-row">
                          <span>Machine Time ({(productCalc.breakdown.machineTime / config.machineHourlyRate).toFixed(1)} hrs @ {fmt(config.machineHourlyRate)}/hr)</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.machineTime)}</span>
                        </div>
                        <div className="epc-bt-row">
                          <span>Packaging</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.packaging)}</span>
                        </div>
                        <div className="epc-bt-row">
                          <span>Shipping</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.shipping)}</span>
                        </div>
                        <div className="epc-bt-row subtotal">
                          <span>Subtotal Direct Costs</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.totalDirectCost)}</span>
                        </div>
                      </div>

                      <div className="epc-bt-section">
                        <h4 className="epc-bt-title">Variable & Semi-Variable Costs</h4>
                        <div className="epc-bt-row">
                          <span>Variable Costs (per unit)</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.variableCostPerUnit)}</span>
                        </div>
                        <div className="epc-bt-row">
                          <span>Semi-Variable Costs (allocated)</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.semiVariablePerUnit)}</span>
                        </div>
                      </div>

                      <div className="epc-bt-section">
                        <h4 className="epc-bt-title">Allocated Overhead</h4>
                        <div className="epc-bt-row">
                          <span>Fixed Costs</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.fixedPerUnit)}</span>
                        </div>
                        <div className="epc-bt-row">
                          <span>Indirect Costs</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.indirectPerUnit)}</span>
                        </div>
                        <div className="epc-bt-row">
                          <span>OPEX</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.opexPerUnit)}</span>
                        </div>
                        <div className="epc-bt-row">
                          <span>Depreciation</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.depreciationPerUnit)}</span>
                        </div>
                        <div className="epc-bt-row">
                          <span>Personnel Costs</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.personnelPerUnit)}</span>
                        </div>
                        <div className="epc-bt-row">
                          <span>Financial Costs</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.financialPerUnit)}</span>
                        </div>
                        <div className="epc-bt-row">
                          <span>Risk Provisions</span>
                          <span className="epc-bt-val">{fmt(productCalc.breakdown.riskPerUnit)}</span>
                        </div>
                      </div>

                      <div className="epc-bt-section epc-bt-total-section">
                        <div className="epc-bt-row total-row">
                          <span>TOTAL COST PER UNIT</span>
                          <span className="epc-bt-val">{fmt(productCalc.totalCostPerUnit)}</span>
                        </div>
                        <div className="epc-bt-row">
                          <span>Selling Price</span>
                          <span className="epc-bt-val">{fmt(productCalc.sellingPrice)}</span>
                        </div>
                        <div className="epc-bt-row margin-row">
                          <span>GROSS MARGIN</span>
                          <span className={`epc-bt-val ${productCalc.grossMarginPercent >= 0 ? 'green' : 'red'}`}>
                            {fmt(productCalc.grossMargin)} ({fmtPct(productCalc.grossMarginPercent)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Selling Price Analysis */}
                {activeTab === 'pricing' && priceCalc && (
                  <div className="epc-card epc-pricing-card">
                    <h3 className="epc-section-title">Selling Price Analysis</h3>
                    <p className="epc-section-hint">Evaluate the optimal customer price based on your full enterprise cost structure.</p>

                    <div className="epc-price-grid">
                      {/* Left: Controls */}
                      <div className="epc-price-inputs">
                        <div className="epc-pi-group">
                          <label>Current Selling Price</label>
                          <div className="epc-money-input">
                            <span className="epc-mi-symbol">$</span>
                            <input
                              type="number"
                              value={selectedProduct.sellingPrice}
                              onChange={(e) => updateProduct(selectedProductId, { sellingPrice: parseNum(e.target.value) })}
                              step="0.01"
                            />
                          </div>
                        </div>

                        <div className="epc-pi-group">
                          <label>Target Margin (%)</label>
                          <div className="epc-margin-slider-row">
                            <input
                              type="range" min="0" max="80" step="1"
                              value={targetMargin}
                              onChange={(e) => setTargetMargin(parseInt(e.target.value, 10))}
                              className="epc-margin-slider"
                            />
                            <span className="epc-margin-val">{targetMargin}%</span>
                          </div>
                        </div>

                        <button type="button" className="epc-recommend-btn" onClick={handleApplyRecommendedPrice}>
                          Apply Recommended Price: {fmt(priceCalc.recommendedPrice)}
                        </button>

                        <div className="epc-pi-group">
                          <label>Units per Month</label>
                          <input
                            type="number"
                            value={selectedProduct.unitsPerMonth}
                            onChange={(e) => updateProduct(selectedProductId, { unitsPerMonth: Math.round(parseNum(e.target.value)) })}
                            className="epc-text-input"
                          />
                        </div>
                      </div>

                      {/* Right: Results */}
                      <div className="epc-price-results">
                        <div className="epc-pr-item">
                          <span className="epc-pr-label">Full Product Cost</span>
                          <span className="epc-pr-value">{fmt(priceCalc.cost)}</span>
                        </div>
                        <div className="epc-pr-item">
                          <span className="epc-pr-label">Selling Price</span>
                          <span className="epc-pr-value highlight">{fmt(priceCalc.price)}</span>
                        </div>
                        <div className="epc-pr-divider" />
                        <div className="epc-pr-item">
                          <span className="epc-pr-label">Profit per Unit</span>
                          <span className={`epc-pr-value ${priceCalc.profit >= 0 ? 'positive' : 'negative'}`}>
                            {priceCalc.profit >= 0 ? '+' : ''}{fmt(priceCalc.profit)}
                          </span>
                        </div>
                        <div className="epc-pr-item">
                          <span className="epc-pr-label">Gross Margin</span>
                          <span className={`epc-pr-value ${priceCalc.margin >= targetMargin ? 'positive' : 'negative'}`}>
                            {fmtPct(priceCalc.margin)}
                          </span>
                        </div>
                        <div className="epc-pr-item">
                          <span className="epc-pr-label">Markup</span>
                          <span className="epc-pr-value">{fmtPct(priceCalc.markup)}</span>
                        </div>
                        <div className="epc-pr-item">
                          <span className="epc-pr-label">Monthly Profit</span>
                          <span className={`epc-pr-value ${productCalc.monthlyProfit >= 0 ? 'positive' : 'negative'}`}>
                            {fmt(productCalc.monthlyProfit)}
                          </span>
                        </div>

                        {/* Margin gauge */}
                        <div className="epc-mg">
                          <div className="epc-mg-track">
                            <div
                              className={`epc-mg-fill ${priceCalc.margin >= targetMargin ? 'good' : priceCalc.margin > 0 ? 'warning' : 'bad'}`}
                              style={{ width: `${Math.min(Math.max(priceCalc.margin, 0), 80)}%` }}
                            />
                            <div className="epc-mg-target" style={{ left: `${targetMargin}%` }}>
                              <span className="epc-mg-target-label">Target {targetMargin}%</span>
                            </div>
                          </div>
                          <div className="epc-mg-labels">
                            <span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Simulation */}
                {activeTab === 'simulation' && simulatedResult && (
                  <div className="epc-card epc-sim-card">
                    <h3 className="epc-section-title">What-If Cost Simulation</h3>
                    <p className="epc-section-hint">Adjust parameters to see how changes impact profitability.</p>

                    <div className="epc-sim-controls">
                      {[
                        { key: 'priceChange', label: 'Price Change (%)' },
                        { key: 'volumeChange', label: 'Volume Change (%)' },
                        { key: 'materialChange', label: 'Material Cost (%)' },
                        { key: 'laborChange', label: 'Labor Cost (%)' },
                      ].map((ctrl) => (
                        <div key={ctrl.key} className="epc-sim-ctrl">
                          <label>{ctrl.label}</label>
                          <div className="epc-sim-input-row">
                            <input
                              type="range" min="-50" max="50" step="1"
                              value={simulationParams[ctrl.key]}
                              onChange={(e) => setSimulationParams({ ...simulationParams, [ctrl.key]: parseNum(e.target.value) })}
                              className="epc-sim-slider"
                            />
                            <div className="epc-sim-val-wrap">
                              <input
                                type="number"
                                value={simulationParams[ctrl.key]}
                                onChange={(e) => setSimulationParams({ ...simulationParams, [ctrl.key]: parseNum(e.target.value) })}
                                className="epc-sim-num-input"
                              />
                              <span>%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="epc-sim-reset"
                        onClick={() => setSimulationParams({ priceChange: 0, volumeChange: 0, materialChange: 0, laborChange: 0 })}
                      >
                        Reset All
                      </button>
                    </div>

                    <div className="epc-sim-comparison">
                      <div className="epc-sim-col current">
                        <span className="epc-sim-col-title">Current</span>
                        {[
                          ['Price', fmt(simulatedResult.originalPrice)],
                          ['Cost / Unit', fmt(simulatedResult.originalCost)],
                          ['Margin', fmtPct(simulatedResult.originalMarginPercent)],
                          ['Volume / Mo', simulatedResult.originalVolume.toLocaleString()],
                        ].map(([l, v]) => (
                          <div key={l} className="epc-sim-row"><span>{l}</span><span>{v}</span></div>
                        ))}
                        <div className="epc-sim-row profit">
                          <span>Monthly Profit</span>
                          <span>{fmt(simulatedResult.originalProfit)}</span>
                        </div>
                      </div>

                      <div className="epc-sim-arrow">→</div>

                      <div className="epc-sim-col simulated">
                        <span className="epc-sim-col-title">Simulated</span>
                        <div className="epc-sim-row">
                          <span>Price</span>
                          <span className={simulatedResult.newPrice > simulatedResult.originalPrice ? 'green' : simulatedResult.newPrice < simulatedResult.originalPrice ? 'red' : ''}>{fmt(simulatedResult.newPrice)}</span>
                        </div>
                        <div className="epc-sim-row">
                          <span>Cost / Unit</span>
                          <span className={simulatedResult.newCost < simulatedResult.originalCost ? 'green' : simulatedResult.newCost > simulatedResult.originalCost ? 'red' : ''}>{fmt(simulatedResult.newCost)}</span>
                        </div>
                        <div className="epc-sim-row">
                          <span>Margin</span>
                          <span className={simulatedResult.newMarginPercent > simulatedResult.originalMarginPercent ? 'green' : 'red'}>{fmtPct(simulatedResult.newMarginPercent)}</span>
                        </div>
                        <div className="epc-sim-row">
                          <span>Volume / Mo</span>
                          <span>{Math.round(simulatedResult.newVolume).toLocaleString()}</span>
                        </div>
                        <div className="epc-sim-row profit">
                          <span>Monthly Profit</span>
                          <span className={simulatedResult.newProfit > simulatedResult.originalProfit ? 'green' : 'red'}>{fmt(simulatedResult.newProfit)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="epc-sim-impact">
                      <strong>Profit Impact: </strong>
                      <span className={simulatedResult.newProfit - simulatedResult.originalProfit >= 0 ? 'green' : 'red'}>
                        {simulatedResult.newProfit - simulatedResult.originalProfit >= 0 ? '+' : ''}
                        {fmt(simulatedResult.newProfit - simulatedResult.originalProfit)} / month
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="epc-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" stroke="#ccc" strokeWidth="2" />
                </svg>
                <h3>No Product Selected</h3>
                <p>Select a product from the list or add a new one to start analyzing costs.</p>
                <button type="button" className="epc-btn primary" onClick={() => setShowAddModal(true)}>+ Add Product</button>
              </div>
            )}
          </div>
        </div>

        {/* All Products Comparison Table */}
        {allProductCalcs.length > 0 && (
          <div className="epc-card epc-comparison-card">
            <h3 className="epc-section-title">All Products Comparison</h3>
            <div className="epc-table-wrap">
              <table className="epc-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Volume/Mo</th>
                    <th>Selling Price</th>
                    <th>Full Cost</th>
                    <th>Margin $</th>
                    <th>Margin %</th>
                    <th>Monthly Profit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allProductCalcs.map((calc) => (
                    <tr
                      key={calc.productId}
                      className={calc.productId === selectedProductId ? 'selected' : ''}
                      onClick={() => setSelectedProductId(calc.productId)}
                    >
                      <td className="epc-t-name">
                        <span className="epc-t-pname">{calc.productName}</span>
                        <span className="epc-t-psku">{calc.sku}</span>
                      </td>
                      <td className="epc-t-num">{calc.unitsPerMonth.toLocaleString()}</td>
                      <td className="epc-t-money">{fmt(calc.sellingPrice)}</td>
                      <td className="epc-t-money">{fmt(calc.totalCostPerUnit)}</td>
                      <td className="epc-t-money">{fmt(calc.grossMargin)}</td>
                      <td className={`epc-t-margin ${calc.grossMarginPercent >= 15 ? 'good' : calc.grossMarginPercent >= 5 ? 'ok' : 'bad'}`}>
                        {fmtPct(calc.grossMarginPercent)}
                      </td>
                      <td className={`epc-t-money ${calc.monthlyProfit >= 0 ? 'profit' : 'loss'}`}>
                        {fmt(calc.monthlyProfit)}
                      </td>
                      <td className="epc-t-actions">
                        <button
                          type="button" className="epc-ta-btn edit"
                          onClick={(e) => { e.stopPropagation(); setSelectedProductId(calc.productId); openEditProduct(products.find(p => p.id === calc.productId)) }}
                        >Edit</button>
                        <button
                          type="button" className="epc-ta-btn delete"
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(calc.productId) }}
                        >Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>TOTAL</strong></td>
                    <td className="epc-t-num"><strong>{summary.totalUnits.toLocaleString()}</strong></td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td className={`epc-t-margin ${summary.overallMargin >= 15 ? 'good' : summary.overallMargin >= 5 ? 'ok' : 'bad'}`}>
                      <strong>{fmtPct(summary.overallMargin)}</strong>
                    </td>
                    <td className={`epc-t-money ${summary.totalProfit >= 0 ? 'profit' : 'loss'}`}>
                      <strong>{fmt(summary.totalProfit)}</strong>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ─── Modals ─────────────────────────────────────── */}

        {/* Add Product */}
        {showAddModal && (
          <div className="epc-modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="epc-modal" onClick={(e) => e.stopPropagation()}>
              <div className="epc-modal-header">
                <h3>Add New Product</h3>
                <button type="button" className="epc-modal-close" onClick={() => setShowAddModal(false)}>×</button>
              </div>
              <div className="epc-modal-body">
                <div className="epc-mf-row">
                  <div className="epc-mf-group"><label>Product Name *</label><input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g., Industrial Controller" /></div>
                  <div className="epc-mf-group"><label>SKU</label><input type="text" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="e.g., ICU-2026-A" /></div>
                </div>
                <div className="epc-mf-row">
                  <div className="epc-mf-group"><label>Selling Price ($)</label><input type="number" value={newProduct.sellingPrice} onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: e.target.value })} step="0.01" placeholder="0.00" /></div>
                  <div className="epc-mf-group"><label>Units per Month</label><input type="number" value={newProduct.unitsPerMonth} onChange={(e) => setNewProduct({ ...newProduct, unitsPerMonth: e.target.value })} placeholder="0" /></div>
                </div>
                <div className="epc-mf-row">
                  <div className="epc-mf-group"><label>Direct Material Cost ($)</label><input type="number" value={newProduct.directMaterialCost} onChange={(e) => setNewProduct({ ...newProduct, directMaterialCost: e.target.value })} step="0.01" placeholder="0.00" /></div>
                  <div className="epc-mf-group"><label>Direct Labor Hours</label><input type="number" value={newProduct.directLaborHours} onChange={(e) => setNewProduct({ ...newProduct, directLaborHours: e.target.value })} step="0.1" placeholder="0.0" /></div>
                </div>
                <div className="epc-mf-row">
                  <div className="epc-mf-group"><label>Machine Hours</label><input type="number" value={newProduct.machineHours} onChange={(e) => setNewProduct({ ...newProduct, machineHours: e.target.value })} step="0.1" placeholder="0.0" /></div>
                  <div className="epc-mf-group"><label>Packaging Cost ($)</label><input type="number" value={newProduct.packagingCost} onChange={(e) => setNewProduct({ ...newProduct, packagingCost: e.target.value })} step="0.01" placeholder="0.00" /></div>
                </div>
                <div className="epc-mf-group"><label>Shipping Cost ($)</label><input type="number" value={newProduct.shippingCost} onChange={(e) => setNewProduct({ ...newProduct, shippingCost: e.target.value })} step="0.01" placeholder="0.00" /></div>
              </div>
              <div className="epc-modal-footer">
                <button type="button" className="epc-mbtn secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="button" className="epc-mbtn primary" onClick={handleAddProduct}>Add Product</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product */}
        {showEditModal && (
          <div className="epc-modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="epc-modal" onClick={(e) => e.stopPropagation()}>
              <div className="epc-modal-header">
                <h3>Edit Product</h3>
                <button type="button" className="epc-modal-close" onClick={() => setShowEditModal(false)}>×</button>
              </div>
              <div className="epc-modal-body">
                <div className="epc-mf-row">
                  <div className="epc-mf-group"><label>Product Name *</label><input type="text" value={editProductData.name} onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })} /></div>
                  <div className="epc-mf-group"><label>SKU</label><input type="text" value={editProductData.sku} onChange={(e) => setEditProductData({ ...editProductData, sku: e.target.value })} /></div>
                </div>
                <div className="epc-mf-row">
                  <div className="epc-mf-group"><label>Selling Price ($)</label><input type="number" value={editProductData.sellingPrice} onChange={(e) => setEditProductData({ ...editProductData, sellingPrice: e.target.value })} step="0.01" /></div>
                  <div className="epc-mf-group"><label>Units per Month</label><input type="number" value={editProductData.unitsPerMonth} onChange={(e) => setEditProductData({ ...editProductData, unitsPerMonth: e.target.value })} /></div>
                </div>
                <div className="epc-mf-row">
                  <div className="epc-mf-group"><label>Direct Material Cost ($)</label><input type="number" value={editProductData.directMaterialCost} onChange={(e) => setEditProductData({ ...editProductData, directMaterialCost: e.target.value })} step="0.01" /></div>
                  <div className="epc-mf-group"><label>Direct Labor Hours</label><input type="number" value={editProductData.directLaborHours} onChange={(e) => setEditProductData({ ...editProductData, directLaborHours: e.target.value })} step="0.1" /></div>
                </div>
                <div className="epc-mf-row">
                  <div className="epc-mf-group"><label>Machine Hours</label><input type="number" value={editProductData.machineHours} onChange={(e) => setEditProductData({ ...editProductData, machineHours: e.target.value })} step="0.1" /></div>
                  <div className="epc-mf-group"><label>Packaging Cost ($)</label><input type="number" value={editProductData.packagingCost} onChange={(e) => setEditProductData({ ...editProductData, packagingCost: e.target.value })} step="0.01" /></div>
                </div>
                <div className="epc-mf-group"><label>Shipping Cost ($)</label><input type="number" value={editProductData.shippingCost} onChange={(e) => setEditProductData({ ...editProductData, shippingCost: e.target.value })} step="0.01" /></div>
              </div>
              <div className="epc-modal-footer">
                <button type="button" className="epc-mbtn secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="button" className="epc-mbtn primary" onClick={handleSaveEditProduct}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Delete */}
        {confirmDeleteId && (
          <div className="epc-modal-overlay" onClick={() => setConfirmDeleteId(null)}>
            <div className="epc-modal epc-modal-sm" onClick={(e) => e.stopPropagation()}>
              <div className="epc-modal-header">
                <h3>Delete Product</h3>
                <button type="button" className="epc-modal-close" onClick={() => setConfirmDeleteId(null)}>×</button>
              </div>
              <div className="epc-modal-body">
                <p className="epc-confirm-text">
                  Are you sure you want to delete <strong>{products.find((p) => p.id === confirmDeleteId)?.name}</strong>?
                  This action cannot be undone.
                </p>
              </div>
              <div className="epc-modal-footer">
                <button type="button" className="epc-mbtn secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                <button type="button" className="epc-mbtn danger" onClick={() => handleDeleteProduct(confirmDeleteId)}>Delete Product</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default EnterpriseProductCalc
