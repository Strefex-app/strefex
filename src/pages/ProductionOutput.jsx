import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './ProductionMetrics.css'

const ProductionOutput = () => {
  const navigate = useNavigate()
  const { productionOutput, equipment, addProductionOutput } = useProductionStore()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    workCenter: '',
    product: '',
    shift: 'Day',
    planned: 0,
    actual: 0,
  })

  const totalPlanned = productionOutput.reduce((s, r) => s + r.planned, 0)
  const totalActual = productionOutput.reduce((s, r) => s + r.actual, 0)
  const avgEfficiency = totalPlanned > 0 ? ((totalActual / totalPlanned) * 100).toFixed(1) : 0

  // Group by work center
  const byWorkCenter = productionOutput.reduce((acc, r) => {
    if (!acc[r.workCenter]) {
      acc[r.workCenter] = { planned: 0, actual: 0 }
    }
    acc[r.workCenter].planned += r.planned
    acc[r.workCenter].actual += r.actual
    return acc
  }, {})

  const getEfficiencyColor = (eff) => {
    if (eff >= 95) return 'world-class'
    if (eff >= 85) return 'good'
    if (eff >= 70) return 'average'
    return 'poor'
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    addProductionOutput({
      ...formData,
      date: new Date().toISOString().split('T')[0],
    })
    setShowModal(false)
    setFormData({
      workCenter: '',
      product: '',
      shift: 'Day',
      planned: 0,
      actual: 0,
    })
  }

  return (
    <AppLayout>
      <div className="metrics-page">
        <div className="metrics-header">
          <button type="button" className="metrics-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="metrics-header-content">
            <div>
              <h1 className="metrics-title">Production Output</h1>
              <p className="metrics-subtitle">Daily production tracking and efficiency monitoring</p>
            </div>
            <button type="button" className="metrics-add-btn" onClick={() => setShowModal(true)}>+ Record Output</button>
          </div>
        </div>

        {/* Summary */}
        <div className="metrics-summary-row">
          <div className="metrics-summary-card">
            <div className="metrics-sum-value">{totalPlanned.toLocaleString()}</div>
            <div className="metrics-sum-label">Total Planned</div>
          </div>
          <div className="metrics-summary-card">
            <div className="metrics-sum-value blue">{totalActual.toLocaleString()}</div>
            <div className="metrics-sum-label">Total Actual</div>
          </div>
          <div className="metrics-summary-card">
            <div className={`metrics-sum-value ${getEfficiencyColor(avgEfficiency)}`}>{avgEfficiency}%</div>
            <div className="metrics-sum-label">Overall Efficiency</div>
          </div>
          <div className="metrics-summary-card">
            <div className="metrics-sum-value">{productionOutput.length}</div>
            <div className="metrics-sum-label">Records</div>
          </div>
        </div>

        {/* Work Center Summary */}
        <div className="metrics-card">
          <h3>Output by Work Center</h3>
          <div className="oee-grid">
            {Object.entries(byWorkCenter).map(([wc, data]) => {
              const eff = ((data.actual / data.planned) * 100).toFixed(1)
              return (
                <div key={wc} className="oee-equipment-card">
                  <div className="eq-header">
                    <div className="eq-name">{wc}</div>
                  </div>
                  <div className={`eq-oee ${getEfficiencyColor(eff)}`}>{eff}%</div>
                  <div className="eq-components">
                    <div className="eq-comp">
                      <span className="comp-label">Planned</span>
                      <span className="comp-value" style={{ marginLeft: 'auto' }}>{data.planned.toLocaleString()}</span>
                    </div>
                    <div className="eq-comp">
                      <span className="comp-label">Actual</span>
                      <span className="comp-value" style={{ marginLeft: 'auto' }}>{data.actual.toLocaleString()}</span>
                    </div>
                    <div className="eq-comp">
                      <span className="comp-label">Variance</span>
                      <span className={`comp-value ${data.actual >= data.planned ? 'green' : 'red'}`} style={{ marginLeft: 'auto' }}>
                        {data.actual - data.planned}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Records */}
        <div className="metrics-card">
          <h3>Production Records</h3>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Work Center</th>
                <th>Product</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {productionOutput.map((record) => {
                const variance = record.actual - record.planned
                return (
                  <tr key={record.id}>
                    <td>{record.date}</td>
                    <td>{record.shift}</td>
                    <td>{record.workCenter}</td>
                    <td>{record.product}</td>
                    <td>{record.planned.toLocaleString()}</td>
                    <td>{record.actual.toLocaleString()}</td>
                    <td className={variance >= 0 ? 'metrics-sum-value green' : 'metrics-sum-value red'}>
                      {variance >= 0 ? '+' : ''}{variance}
                    </td>
                    <td>
                      <span className={`metric-badge ${getEfficiencyColor(record.efficiency)}`}>
                        {record.efficiency}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="metrics-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="metrics-modal" onClick={(e) => e.stopPropagation()}>
              <div className="metrics-modal-header">
                <h3>Record Production Output</h3>
                <button type="button" className="metrics-modal-close" onClick={() => setShowModal(false)}>×</button>
              </div>
              <form onSubmit={handleSubmit} className="metrics-modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Work Center</label>
                    <select value={formData.workCenter} onChange={(e) => setFormData({ ...formData, workCenter: e.target.value })} required>
                      <option value="">Select work center</option>
                      {equipment.map(eq => (
                        <option key={eq.id} value={eq.name}>{eq.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Shift</label>
                    <select value={formData.shift} onChange={(e) => setFormData({ ...formData, shift: e.target.value })}>
                      <option value="Day">Day</option>
                      <option value="Night">Night</option>
                      <option value="Afternoon">Afternoon</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Product</label>
                  <input type="text" value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Planned Quantity</label>
                    <input type="number" min="0" value={formData.planned}
                      onChange={(e) => setFormData({ ...formData, planned: parseInt(e.target.value) || 0 })} required />
                  </div>
                  <div className="form-group">
                    <label>Actual Quantity</label>
                    <input type="number" min="0" value={formData.actual}
                      onChange={(e) => setFormData({ ...formData, actual: parseInt(e.target.value) || 0 })} required />
                  </div>
                </div>

                <div className="oee-preview">
                  <div className="preview-label">Efficiency:</div>
                  <div className={`preview-value ${getEfficiencyColor(formData.planned > 0 ? (formData.actual / formData.planned) * 100 : 0)}`}>
                    {formData.planned > 0 ? ((formData.actual / formData.planned) * 100).toFixed(1) : 0}%
                  </div>
                </div>

                <div className="metrics-modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit">Save Record</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ProductionOutput
