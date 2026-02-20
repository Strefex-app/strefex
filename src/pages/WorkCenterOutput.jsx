import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import DonutChart from '../components/DonutChart'
import useProductionStore from '../store/productionStore'
import './WorkCenterOutput.css'

const WorkCenterOutput = () => {
  const navigate = useNavigate()
  const {
    workCenters,
    addWorkCenter,
    updateWorkCenter,
    deleteWorkCenter,
    addWorkCenterProduct,
    updateWorkCenterProduct,
    deleteWorkCenterProduct,
  } = useProductionStore()

  const [selectedWCId, setSelectedWCId] = useState(workCenters[0]?.id || '')
  const [showAddWC, setShowAddWC] = useState(false)
  const [showEditWC, setShowEditWC] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [confirmDeleteWC, setConfirmDeleteWC] = useState(null)
  const [editingProdId, setEditingProdId] = useState(null)

  // New work center form
  const emptyWC = {
    name: '', type: 'CNC Machining',
    changeoverTime: 30, plannedMaintenanceTime: 60, unplannedDowntime: 15, breakTime: 60,
    workingDaysPerMonth: 22, workingDaysPerYear: 260, shiftsPerDay: 2, hoursPerShift: 8,
    availability: 90, performance: 92, quality: 98, scrapRate: 2, operators: 2,
  }
  const [newWC, setNewWC] = useState({ ...emptyWC })
  const [editWCData, setEditWCData] = useState({ ...emptyWC })

  const emptyProduct = { name: '', cycleTime: '', setupTime: '', demandPerMonth: '' }
  const [newProd, setNewProd] = useState({ ...emptyProduct })
  const [editProdData, setEditProdData] = useState({ ...emptyProduct })

  const selectedWC = useMemo(
    () => workCenters.find((w) => w.id === selectedWCId),
    [workCenters, selectedWCId]
  )

  // ─── Helpers ───────────────────────────────────
  const fmt = (v) => {
    if (v === undefined || v === null || isNaN(v)) return '0'
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v)
  }
  const fmtInt = (v) => Math.round(v).toLocaleString()
  const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`
  const parseNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n }

  // ─── Core Calculations ─────────────────────────
  const calculations = useMemo(() => {
    if (!selectedWC) return null
    const wc = selectedWC

    // Time calculations
    const totalShiftMinutes = wc.hoursPerShift * 60
    const netShiftMinutes = totalShiftMinutes - wc.breakTime
    const totalDailyMinutes = netShiftMinutes * wc.shiftsPerDay
    const plannedDowntimeDaily = wc.plannedMaintenanceTime + wc.unplannedDowntime
    const availableMinutesDaily = totalDailyMinutes - plannedDowntimeDaily
    const availableMinutesMonthly = availableMinutesDaily * wc.workingDaysPerMonth
    const availableMinutesYearly = availableMinutesDaily * wc.workingDaysPerYear
    const totalHoursMonthly = availableMinutesMonthly / 60
    const totalHoursYearly = availableMinutesYearly / 60

    // OEE calculation
    const oee = (wc.availability / 100) * (wc.performance / 100) * (wc.quality / 100) * 100

    // Per-product calculations
    const productCalcs = wc.products.map((prod) => {
      const effectiveCycleTime = prod.cycleTime // minutes per unit
      const changeoversPerDay = wc.products.length > 1 ? wc.products.length : 0
      const changeoverMinutesPerDay = changeoversPerDay * wc.changeoverTime / wc.products.length
      const productAvailableDaily = (availableMinutesDaily - changeoverMinutesPerDay) / wc.products.length

      // Max theoretical output (no losses)
      const theoreticalOutputPerHour = effectiveCycleTime > 0 ? 60 / effectiveCycleTime : 0
      const theoreticalOutputDaily = effectiveCycleTime > 0 ? productAvailableDaily / effectiveCycleTime : 0
      const theoreticalOutputMonthly = theoreticalOutputDaily * wc.workingDaysPerMonth
      const theoreticalOutputYearly = theoreticalOutputDaily * wc.workingDaysPerYear

      // Actual output with OEE
      const actualOutputDaily = theoreticalOutputDaily * (oee / 100)
      const actualOutputMonthly = actualOutputDaily * wc.workingDaysPerMonth
      const actualOutputYearly = actualOutputDaily * wc.workingDaysPerYear

      // Good parts (quality adjusted)
      const goodPartsDaily = actualOutputDaily * (wc.quality / 100)
      const goodPartsMonthly = goodPartsDaily * wc.workingDaysPerMonth
      const goodPartsYearly = goodPartsDaily * wc.workingDaysPerYear

      // Scrap
      const scrapDaily = actualOutputDaily - goodPartsDaily
      const scrapMonthly = scrapDaily * wc.workingDaysPerMonth

      // Demand coverage
      const demandCoverage = prod.demandPerMonth > 0 ? (goodPartsMonthly / prod.demandPerMonth) * 100 : 0
      const demandGap = prod.demandPerMonth - goodPartsMonthly
      const setupTimeDaily = prod.setupTime // first setup of the day

      // Takt time (available time / demand)
      const taktTime = prod.demandPerMonth > 0
        ? (availableMinutesMonthly / wc.products.length) / prod.demandPerMonth
        : 0

      // Utilization
      const utilization = taktTime > 0 ? (effectiveCycleTime / taktTime) * 100 : 0

      return {
        ...prod,
        effectiveCycleTime,
        theoreticalOutputPerHour,
        theoreticalOutputDaily,
        theoreticalOutputMonthly,
        theoreticalOutputYearly,
        actualOutputDaily,
        actualOutputMonthly,
        actualOutputYearly,
        goodPartsDaily,
        goodPartsMonthly,
        goodPartsYearly,
        scrapDaily,
        scrapMonthly,
        demandCoverage,
        demandGap,
        setupTimeDaily,
        taktTime,
        utilization,
      }
    })

    // Aggregate totals
    const totalTheoreticalMonthly = productCalcs.reduce((s, p) => s + p.theoreticalOutputMonthly, 0)
    const totalActualMonthly = productCalcs.reduce((s, p) => s + p.actualOutputMonthly, 0)
    const totalGoodMonthly = productCalcs.reduce((s, p) => s + p.goodPartsMonthly, 0)
    const totalScrapMonthly = productCalcs.reduce((s, p) => s + p.scrapMonthly, 0)
    const totalDemandMonthly = productCalcs.reduce((s, p) => s + p.demandPerMonth, 0)
    const avgDemandCoverage = totalDemandMonthly > 0 ? (totalGoodMonthly / totalDemandMonthly) * 100 : 0

    // Max capacity (bottleneck = fastest product at full OEE)
    const maxCapacityDaily = availableMinutesDaily // minutes available
    const maxCapacityMonthly = availableMinutesMonthly

    return {
      totalShiftMinutes,
      netShiftMinutes,
      totalDailyMinutes,
      plannedDowntimeDaily,
      availableMinutesDaily,
      availableMinutesMonthly,
      availableMinutesYearly,
      totalHoursMonthly,
      totalHoursYearly,
      oee,
      productCalcs,
      totalTheoreticalMonthly,
      totalActualMonthly,
      totalGoodMonthly,
      totalScrapMonthly,
      totalDemandMonthly,
      avgDemandCoverage,
      maxCapacityDaily,
      maxCapacityMonthly,
    }
  }, [selectedWC])

  // ─── Handlers ──────────────────────────────────
  const handleAddWC = () => {
    if (!newWC.name) return
    addWorkCenter({ ...newWC, products: [] })
    setShowAddWC(false)
    setNewWC({ ...emptyWC })
    setTimeout(() => {
      const latest = useProductionStore.getState().workCenters
      if (latest.length) setSelectedWCId(latest[latest.length - 1].id)
    }, 50)
  }

  const openEditWC = () => {
    if (!selectedWC) return
    setEditWCData({ ...selectedWC })
    setShowEditWC(true)
  }

  const handleSaveEditWC = () => {
    if (!selectedWCId) return
    const { id, products, ...rest } = editWCData
    updateWorkCenter(selectedWCId, rest)
    setShowEditWC(false)
  }

  const handleDeleteWC = (id) => {
    deleteWorkCenter(id)
    setConfirmDeleteWC(null)
    const remaining = workCenters.filter((w) => w.id !== id)
    setSelectedWCId(remaining.length > 0 ? remaining[0].id : '')
  }

  const handleAddProduct = () => {
    if (!newProd.name || !selectedWCId) return
    addWorkCenterProduct(selectedWCId, {
      name: newProd.name,
      cycleTime: parseNum(newProd.cycleTime),
      setupTime: parseNum(newProd.setupTime),
      demandPerMonth: Math.round(parseNum(newProd.demandPerMonth)),
    })
    setShowAddProduct(false)
    setNewProd({ ...emptyProduct })
  }

  const startEditProd = (prod) => {
    setEditingProdId(prod.id)
    setEditProdData({ name: prod.name, cycleTime: prod.cycleTime, setupTime: prod.setupTime, demandPerMonth: prod.demandPerMonth })
  }

  const handleSaveProdEdit = (prodId) => {
    if (!selectedWCId) return
    updateWorkCenterProduct(selectedWCId, prodId, {
      name: editProdData.name,
      cycleTime: parseNum(editProdData.cycleTime),
      setupTime: parseNum(editProdData.setupTime),
      demandPerMonth: Math.round(parseNum(editProdData.demandPerMonth)),
    })
    setEditingProdId(null)
  }

  const handleDeleteProd = (prodId) => {
    if (!selectedWCId) return
    deleteWorkCenterProduct(selectedWCId, prodId)
  }

  // Update a single WC field directly
  const handleDirectUpdate = useCallback((field, value) => {
    if (!selectedWCId) return
    updateWorkCenter(selectedWCId, { [field]: parseNum(value) })
  }, [selectedWCId, updateWorkCenter])

  // OEE color
  const oeeColor = (v) => v >= 85 ? '#27ae60' : v >= 70 ? '#f39c12' : '#e74c3c'
  const coverageColor = (v) => v >= 100 ? '#27ae60' : v >= 80 ? '#f39c12' : '#e74c3c'

  return (
    <AppLayout>
      <div className="wco-page">
        {/* Header */}
        <div className="wco-header">
          <button type="button" className="wco-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="wco-header-row">
            <div>
              <h1 className="wco-title">Work Center Output Calculation</h1>
              <p className="wco-subtitle">Capacity planning, cycle time analysis, and output forecasting</p>
            </div>
            <button type="button" className="wco-btn primary" onClick={() => setShowAddWC(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              Add Work Center
            </button>
          </div>
        </div>

        <div className="wco-content">
          {/* Sidebar */}
          <div className="wco-sidebar">
            <h3 className="wco-sb-title">Work Centers ({workCenters.length})</h3>
            <div className="wco-sb-list">
              {workCenters.map((wc) => (
                <div
                  key={wc.id}
                  className={`wco-sb-item ${selectedWCId === wc.id ? 'active' : ''}`}
                  onClick={() => setSelectedWCId(wc.id)}
                >
                  <div className="wco-sb-info">
                    <span className="wco-sb-name">{wc.name}</span>
                    <span className="wco-sb-type">{wc.type} · {wc.products.length} products</span>
                  </div>
                  <span className="wco-sb-shifts">{wc.shiftsPerDay}×{wc.hoursPerShift}h</span>
                </div>
              ))}
              {workCenters.length === 0 && <p className="wco-sb-empty">No work centers configured.</p>}
            </div>
          </div>

          {/* Main area */}
          <div className="wco-main">
            {selectedWC && calculations ? (
              <>
                {/* Summary indicators */}
                <div className="wco-indicators">
                  <div className="wco-ind-card">
                    <span className="wco-ind-label">OEE</span>
                    <span className="wco-ind-value" style={{ color: oeeColor(calculations.oee) }}>{fmtPct(calculations.oee)}</span>
                  </div>
                  <div className="wco-ind-card">
                    <span className="wco-ind-label">Available Hours / Month</span>
                    <span className="wco-ind-value">{fmt(calculations.totalHoursMonthly)}</span>
                  </div>
                  <div className="wco-ind-card">
                    <span className="wco-ind-label">Good Parts / Month</span>
                    <span className="wco-ind-value">{fmtInt(calculations.totalGoodMonthly)}</span>
                  </div>
                  <div className="wco-ind-card">
                    <span className="wco-ind-label">Demand Coverage</span>
                    <span className="wco-ind-value" style={{ color: coverageColor(calculations.avgDemandCoverage) }}>{fmtPct(calculations.avgDemandCoverage)}</span>
                  </div>
                  <div className="wco-ind-card">
                    <span className="wco-ind-label">Scrap / Month</span>
                    <span className="wco-ind-value red">{fmtInt(calculations.totalScrapMonthly)}</span>
                  </div>
                </div>

                {/* Work Center Parameters (editable) */}
                <div className="wco-card">
                  <div className="wco-card-header">
                    <h3 className="wco-card-title">{selectedWC.name} — Configuration</h3>
                    <div className="wco-card-actions">
                      <button type="button" className="wco-btn-sm edit" onClick={openEditWC}>Edit All</button>
                      <button type="button" className="wco-btn-sm delete" onClick={() => setConfirmDeleteWC(selectedWCId)}>Delete</button>
                    </div>
                  </div>

                  <div className="wco-params-grid">
                    {[
                      { label: 'Working Days / Month', field: 'workingDaysPerMonth', unit: 'days', step: 1 },
                      { label: 'Working Days / Year', field: 'workingDaysPerYear', unit: 'days', step: 1 },
                      { label: 'Shifts / Day', field: 'shiftsPerDay', unit: '', step: 1 },
                      { label: 'Hours / Shift', field: 'hoursPerShift', unit: 'hrs', step: 0.5 },
                      { label: 'Break Time / Shift', field: 'breakTime', unit: 'min', step: 5 },
                      { label: 'Changeover Time', field: 'changeoverTime', unit: 'min', step: 5 },
                      { label: 'Planned Maintenance / Day', field: 'plannedMaintenanceTime', unit: 'min', step: 5 },
                      { label: 'Unplanned Downtime / Day', field: 'unplannedDowntime', unit: 'min', step: 5 },
                      { label: 'Availability', field: 'availability', unit: '%', step: 0.5 },
                      { label: 'Performance', field: 'performance', unit: '%', step: 0.5 },
                      { label: 'Quality Rate', field: 'quality', unit: '%', step: 0.5 },
                      { label: 'Scrap Rate', field: 'scrapRate', unit: '%', step: 0.1 },
                      { label: 'Operators', field: 'operators', unit: '', step: 1 },
                    ].map((p) => (
                      <div key={p.field} className="wco-param">
                        <label>{p.label}</label>
                        <div className="wco-param-input">
                          <input
                            type="number"
                            value={selectedWC[p.field]}
                            onChange={(e) => handleDirectUpdate(p.field, e.target.value)}
                            step={p.step}
                          />
                          {p.unit && <span className="wco-param-unit">{p.unit}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time Breakdown */}
                  <div className="wco-time-breakdown">
                    <h4 className="wco-tb-title">Time Breakdown (per day)</h4>
                    <div className="wco-tb-bars">
                      {(() => {
                        const total = calculations.totalDailyMinutes + calculations.plannedDowntimeDaily + (selectedWC.breakTime * selectedWC.shiftsPerDay)
                        const items = [
                          { label: 'Productive Time', value: calculations.availableMinutesDaily, color: '#27ae60' },
                          { label: 'Planned Maintenance', value: selectedWC.plannedMaintenanceTime, color: '#f39c12' },
                          { label: 'Unplanned Downtime', value: selectedWC.unplannedDowntime, color: '#e74c3c' },
                          { label: 'Breaks', value: selectedWC.breakTime * selectedWC.shiftsPerDay, color: '#95a5a6' },
                        ]
                        return items.map((item) => (
                          <div key={item.label} className="wco-tb-item">
                            <div className="wco-tb-header">
                              <span><span className="wco-tb-dot" style={{ background: item.color }} />{item.label}</span>
                              <span className="wco-tb-val">{fmt(item.value)} min ({total > 0 ? fmtPct((item.value / total) * 100) : '0%'})</span>
                            </div>
                            <div className="wco-tb-track">
                              <div className="wco-tb-fill" style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, background: item.color }} />
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                </div>

                {/* Products & Output Table */}
                <div className="wco-card">
                  <div className="wco-card-header">
                    <h3 className="wco-card-title">Product Output Analysis</h3>
                    <button type="button" className="wco-btn-sm add" onClick={() => setShowAddProduct(true)}>+ Add Product</button>
                  </div>

                  <div className="wco-table-wrap">
                    <table className="wco-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Cycle</th>
                          <th>Takt</th>
                          <th>Util.</th>
                          <th>Day</th>
                          <th>Month</th>
                          <th>Year</th>
                          <th>Demand</th>
                          <th>Cover.</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculations.productCalcs.map((pc) => {
                          const isEditing = editingProdId === pc.id
                          if (isEditing) {
                            return (
                              <tr key={pc.id} className="wco-editing-row">
                                <td><input type="text" value={editProdData.name} onChange={(e) => setEditProdData({ ...editProdData, name: e.target.value })} className="wco-inline-input" /></td>
                                <td><input type="number" value={editProdData.cycleTime} onChange={(e) => setEditProdData({ ...editProdData, cycleTime: e.target.value })} className="wco-inline-input narrow" step="0.01" /></td>
                                <td colSpan="3" />
                                <td><input type="number" value={editProdData.demandPerMonth} onChange={(e) => setEditProdData({ ...editProdData, demandPerMonth: e.target.value })} className="wco-inline-input narrow" step="100" /></td>
                                <td colSpan="2" />
                                <td />
                                <td className="wco-t-actions">
                                  <button type="button" className="wco-ta save" onClick={() => handleSaveProdEdit(pc.id)}>Save</button>
                                  <button type="button" className="wco-ta cancel" onClick={() => setEditingProdId(null)}>×</button>
                                </td>
                              </tr>
                            )
                          }
                          return (
                            <tr key={pc.id}>
                              <td className="wco-t-product">
                                {pc.name}
                                <span className="wco-t-sub">setup {fmt(pc.setupTime)}m</span>
                              </td>
                              <td className="wco-t-num">{fmt(pc.cycleTime)}<small>m</small></td>
                              <td className="wco-t-num">{fmt(pc.taktTime)}<small>m</small></td>
                              <td className={`wco-t-num ${pc.utilization > 100 ? 'red' : pc.utilization > 85 ? 'orange' : 'green'}`}>{fmtPct(pc.utilization)}</td>
                              <td className="wco-t-num">{fmtInt(pc.goodPartsDaily)}</td>
                              <td className="wco-t-num bold">{fmtInt(pc.goodPartsMonthly)}</td>
                              <td className="wco-t-num">{fmtInt(pc.goodPartsYearly)}</td>
                              <td className="wco-t-num">{fmtInt(pc.demandPerMonth)}</td>
                              <td style={{ color: coverageColor(pc.demandCoverage) }} className="wco-t-num bold">{fmtPct(pc.demandCoverage)}</td>
                              <td className="wco-t-actions">
                                <button type="button" className="wco-ta edit" onClick={() => startEditProd(pc)} title="Edit">✎</button>
                                <button type="button" className="wco-ta delete" onClick={() => handleDeleteProd(pc.id)} title="Delete">×</button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td><strong>TOTALS</strong></td>
                          <td colSpan="3" />
                          <td className="wco-t-num"><strong>{fmtInt(calculations.productCalcs.reduce((s, p) => s + p.goodPartsDaily, 0))}</strong></td>
                          <td className="wco-t-num"><strong>{fmtInt(calculations.totalGoodMonthly)}</strong></td>
                          <td className="wco-t-num"><strong>{fmtInt(calculations.productCalcs.reduce((s, p) => s + p.goodPartsYearly, 0))}</strong></td>
                          <td className="wco-t-num"><strong>{fmtInt(calculations.totalDemandMonthly)}</strong></td>
                          <td className="wco-t-num" style={{ color: coverageColor(calculations.avgDemandCoverage) }}><strong>{fmtPct(calculations.avgDemandCoverage)}</strong></td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Detailed Output Summary */}
                <div className="wco-card">
                  <h3 className="wco-card-title">Capacity Summary</h3>
                  <div className="wco-summary-grid">
                    <div className="wco-sum-section">
                      <h4>Time Available</h4>
                      <div className="wco-sum-row"><span>Shift Duration</span><span>{fmt(calculations.totalShiftMinutes)} min ({selectedWC.hoursPerShift} hrs)</span></div>
                      <div className="wco-sum-row"><span>Net Shift (after breaks)</span><span>{fmt(calculations.netShiftMinutes)} min</span></div>
                      <div className="wco-sum-row"><span>Total Daily (all shifts)</span><span>{fmt(calculations.totalDailyMinutes)} min</span></div>
                      <div className="wco-sum-row"><span>Available After Downtime</span><span>{fmt(calculations.availableMinutesDaily)} min</span></div>
                      <div className="wco-sum-row bold"><span>Available Hours / Month</span><span>{fmt(calculations.totalHoursMonthly)} hrs</span></div>
                      <div className="wco-sum-row bold"><span>Available Hours / Year</span><span>{fmt(calculations.totalHoursYearly)} hrs</span></div>
                    </div>
                    <div className="wco-sum-section">
                      <h4>Output Metrics</h4>
                      <div className="wco-sum-row"><span>Theoretical Output / Month</span><span>{fmtInt(calculations.totalTheoreticalMonthly)}</span></div>
                      <div className="wco-sum-row"><span>Actual Output / Month (OEE adjusted)</span><span>{fmtInt(calculations.totalActualMonthly)}</span></div>
                      <div className="wco-sum-row bold"><span>Good Parts / Month</span><span>{fmtInt(calculations.totalGoodMonthly)}</span></div>
                      <div className="wco-sum-row red"><span>Scrap / Month</span><span>{fmtInt(calculations.totalScrapMonthly)}</span></div>
                      <div className="wco-sum-row"><span>Total Demand / Month</span><span>{fmtInt(calculations.totalDemandMonthly)}</span></div>
                      <div className="wco-sum-row bold" style={{ color: coverageColor(calculations.avgDemandCoverage) }}><span>Demand Coverage</span><span>{fmtPct(calculations.avgDemandCoverage)}</span></div>
                    </div>
                    <div className="wco-sum-section">
                      <h4>OEE Components</h4>
                      <div className="wco-sum-row"><span>Availability</span><span>{fmtPct(selectedWC.availability)}</span></div>
                      <div className="wco-sum-row"><span>Performance</span><span>{fmtPct(selectedWC.performance)}</span></div>
                      <div className="wco-sum-row"><span>Quality</span><span>{fmtPct(selectedWC.quality)}</span></div>
                      <div className="wco-sum-row bold" style={{ color: oeeColor(calculations.oee) }}><span>OEE</span><span>{fmtPct(calculations.oee)}</span></div>

                      {/* OEE donut chart */}
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                        <DonutChart
                          value={calculations.oee}
                          label="OEE"
                          size={72}
                          color={oeeColor(calculations.oee)}
                          details={[
                            { label: 'Availability', value: fmtPct(selectedWC.availability), color: '#3498db' },
                            { label: 'Performance', value: fmtPct(selectedWC.performance), color: '#27ae60' },
                            { label: 'Quality', value: fmtPct(selectedWC.quality), color: '#9b59b6' },
                            { label: 'Target', value: '85%', color: '#e67e22' },
                            { label: 'Gap to target', value: fmtPct(Math.max(0, 85 - calculations.oee)), color: '#e74c3c' },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="wco-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M2 20V8l5 3V8l5 3V8l5 3V4h5v16H2z" stroke="#ccc" strokeWidth="2" /></svg>
                <h3>No Work Center Selected</h3>
                <p>Select a work center or add a new one to start calculating output capacity.</p>
                <button type="button" className="wco-btn primary" onClick={() => setShowAddWC(true)}>+ Add Work Center</button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Modals ─────────────────────────────── */}

        {/* Add Work Center */}
        {showAddWC && (
          <div className="wco-modal-overlay" onClick={() => setShowAddWC(false)}>
            <div className="wco-modal" onClick={(e) => e.stopPropagation()}>
              <div className="wco-modal-header"><h3>Add Work Center</h3><button type="button" className="wco-modal-close" onClick={() => setShowAddWC(false)}>×</button></div>
              <div className="wco-modal-body">
                <div className="wco-mf-row">
                  <div className="wco-mf-group"><label>Name *</label><input type="text" value={newWC.name} onChange={(e) => setNewWC({ ...newWC, name: e.target.value })} placeholder="e.g., CNC Machine 3" /></div>
                  <div className="wco-mf-group"><label>Type</label>
                    <select value={newWC.type} onChange={(e) => setNewWC({ ...newWC, type: e.target.value })}>
                      <option>CNC Machining</option><option>Assembly</option><option>Injection Molding</option><option>Welding</option><option>Painting</option><option>Packaging</option><option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="wco-mf-row">
                  <div className="wco-mf-group"><label>Shifts / Day</label><input type="number" value={newWC.shiftsPerDay} onChange={(e) => setNewWC({ ...newWC, shiftsPerDay: parseNum(e.target.value) })} /></div>
                  <div className="wco-mf-group"><label>Hours / Shift</label><input type="number" value={newWC.hoursPerShift} onChange={(e) => setNewWC({ ...newWC, hoursPerShift: parseNum(e.target.value) })} /></div>
                </div>
                <div className="wco-mf-row">
                  <div className="wco-mf-group"><label>Working Days / Month</label><input type="number" value={newWC.workingDaysPerMonth} onChange={(e) => setNewWC({ ...newWC, workingDaysPerMonth: parseNum(e.target.value) })} /></div>
                  <div className="wco-mf-group"><label>Operators</label><input type="number" value={newWC.operators} onChange={(e) => setNewWC({ ...newWC, operators: parseNum(e.target.value) })} /></div>
                </div>
              </div>
              <div className="wco-modal-footer">
                <button type="button" className="wco-mbtn secondary" onClick={() => setShowAddWC(false)}>Cancel</button>
                <button type="button" className="wco-mbtn primary" onClick={handleAddWC}>Add Work Center</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Work Center */}
        {showEditWC && (
          <div className="wco-modal-overlay" onClick={() => setShowEditWC(false)}>
            <div className="wco-modal wco-modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="wco-modal-header"><h3>Edit Work Center</h3><button type="button" className="wco-modal-close" onClick={() => setShowEditWC(false)}>×</button></div>
              <div className="wco-modal-body">
                <div className="wco-mf-row">
                  <div className="wco-mf-group"><label>Name</label><input type="text" value={editWCData.name} onChange={(e) => setEditWCData({ ...editWCData, name: e.target.value })} /></div>
                  <div className="wco-mf-group"><label>Type</label>
                    <select value={editWCData.type} onChange={(e) => setEditWCData({ ...editWCData, type: e.target.value })}>
                      <option>CNC Machining</option><option>Assembly</option><option>Injection Molding</option><option>Welding</option><option>Painting</option><option>Packaging</option><option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="wco-mf-row">
                  <div className="wco-mf-group"><label>Working Days / Month</label><input type="number" value={editWCData.workingDaysPerMonth} onChange={(e) => setEditWCData({ ...editWCData, workingDaysPerMonth: parseNum(e.target.value) })} /></div>
                  <div className="wco-mf-group"><label>Working Days / Year</label><input type="number" value={editWCData.workingDaysPerYear} onChange={(e) => setEditWCData({ ...editWCData, workingDaysPerYear: parseNum(e.target.value) })} /></div>
                </div>
                <div className="wco-mf-row">
                  <div className="wco-mf-group"><label>Shifts / Day</label><input type="number" value={editWCData.shiftsPerDay} onChange={(e) => setEditWCData({ ...editWCData, shiftsPerDay: parseNum(e.target.value) })} /></div>
                  <div className="wco-mf-group"><label>Hours / Shift</label><input type="number" value={editWCData.hoursPerShift} onChange={(e) => setEditWCData({ ...editWCData, hoursPerShift: parseNum(e.target.value) })} step="0.5" /></div>
                </div>
                <div className="wco-mf-row">
                  <div className="wco-mf-group"><label>Break Time / Shift (min)</label><input type="number" value={editWCData.breakTime} onChange={(e) => setEditWCData({ ...editWCData, breakTime: parseNum(e.target.value) })} /></div>
                  <div className="wco-mf-group"><label>Changeover Time (min)</label><input type="number" value={editWCData.changeoverTime} onChange={(e) => setEditWCData({ ...editWCData, changeoverTime: parseNum(e.target.value) })} /></div>
                </div>
                <div className="wco-mf-row">
                  <div className="wco-mf-group"><label>Planned Maintenance / Day (min)</label><input type="number" value={editWCData.plannedMaintenanceTime} onChange={(e) => setEditWCData({ ...editWCData, plannedMaintenanceTime: parseNum(e.target.value) })} /></div>
                  <div className="wco-mf-group"><label>Unplanned Downtime / Day (min)</label><input type="number" value={editWCData.unplannedDowntime} onChange={(e) => setEditWCData({ ...editWCData, unplannedDowntime: parseNum(e.target.value) })} /></div>
                </div>
                <div className="wco-mf-row">
                  <div className="wco-mf-group"><label>Availability (%)</label><input type="number" value={editWCData.availability} onChange={(e) => setEditWCData({ ...editWCData, availability: parseNum(e.target.value) })} step="0.5" /></div>
                  <div className="wco-mf-group"><label>Performance (%)</label><input type="number" value={editWCData.performance} onChange={(e) => setEditWCData({ ...editWCData, performance: parseNum(e.target.value) })} step="0.5" /></div>
                </div>
                <div className="wco-mf-row">
                  <div className="wco-mf-group"><label>Quality Rate (%)</label><input type="number" value={editWCData.quality} onChange={(e) => setEditWCData({ ...editWCData, quality: parseNum(e.target.value) })} step="0.5" /></div>
                  <div className="wco-mf-group"><label>Scrap Rate (%)</label><input type="number" value={editWCData.scrapRate} onChange={(e) => setEditWCData({ ...editWCData, scrapRate: parseNum(e.target.value) })} step="0.1" /></div>
                </div>
                <div className="wco-mf-group"><label>Operators</label><input type="number" value={editWCData.operators} onChange={(e) => setEditWCData({ ...editWCData, operators: parseNum(e.target.value) })} /></div>
              </div>
              <div className="wco-modal-footer">
                <button type="button" className="wco-mbtn secondary" onClick={() => setShowEditWC(false)}>Cancel</button>
                <button type="button" className="wco-mbtn primary" onClick={handleSaveEditWC}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Delete WC */}
        {confirmDeleteWC && (
          <div className="wco-modal-overlay" onClick={() => setConfirmDeleteWC(null)}>
            <div className="wco-modal wco-modal-sm" onClick={(e) => e.stopPropagation()}>
              <div className="wco-modal-header"><h3>Delete Work Center</h3><button type="button" className="wco-modal-close" onClick={() => setConfirmDeleteWC(null)}>×</button></div>
              <div className="wco-modal-body">
                <p className="wco-confirm">Are you sure you want to delete <strong>{workCenters.find(w => w.id === confirmDeleteWC)?.name}</strong>?</p>
              </div>
              <div className="wco-modal-footer">
                <button type="button" className="wco-mbtn secondary" onClick={() => setConfirmDeleteWC(null)}>Cancel</button>
                <button type="button" className="wco-mbtn danger" onClick={() => handleDeleteWC(confirmDeleteWC)}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Product */}
        {showAddProduct && (
          <div className="wco-modal-overlay" onClick={() => setShowAddProduct(false)}>
            <div className="wco-modal" onClick={(e) => e.stopPropagation()}>
              <div className="wco-modal-header"><h3>Add Product to {selectedWC?.name}</h3><button type="button" className="wco-modal-close" onClick={() => setShowAddProduct(false)}>×</button></div>
              <div className="wco-modal-body">
                <div className="wco-mf-group"><label>Product Name *</label><input type="text" value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} placeholder="e.g., Housing Part B" /></div>
                <div className="wco-mf-row">
                  <div className="wco-mf-group"><label>Cycle Time (min/unit)</label><input type="number" value={newProd.cycleTime} onChange={(e) => setNewProd({ ...newProd, cycleTime: e.target.value })} step="0.01" placeholder="0.00" /></div>
                  <div className="wco-mf-group"><label>Setup Time (min)</label><input type="number" value={newProd.setupTime} onChange={(e) => setNewProd({ ...newProd, setupTime: e.target.value })} placeholder="0" /></div>
                </div>
                <div className="wco-mf-group"><label>Demand per Month (units)</label><input type="number" value={newProd.demandPerMonth} onChange={(e) => setNewProd({ ...newProd, demandPerMonth: e.target.value })} placeholder="0" /></div>
              </div>
              <div className="wco-modal-footer">
                <button type="button" className="wco-mbtn secondary" onClick={() => setShowAddProduct(false)}>Cancel</button>
                <button type="button" className="wco-mbtn primary" onClick={handleAddProduct}>Add Product</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default WorkCenterOutput
