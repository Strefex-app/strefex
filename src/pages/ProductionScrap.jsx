import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './ProductionMetrics.css'

const ProductionScrap = () => {
  const navigate = useNavigate()
  const { scrapRecords, equipment, addScrapRecord, deleteScrapRecord, getScrapRate } = useProductionStore()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    workCenter: '',
    product: '',
    quantity: 0,
    reason: '',
    rootCause: '',
    cost: 0,
    operator: '',
    shift: 'Day',
  })

  const totalScrap = scrapRecords.reduce((s, r) => s + r.quantity, 0)
  const totalCost = scrapRecords.reduce((s, r) => s + r.cost, 0)
  const scrapRate = getScrapRate()

  // Group scrap by reason
  const scrapByReason = scrapRecords.reduce((acc, r) => {
    acc[r.reason] = (acc[r.reason] || 0) + r.quantity
    return acc
  }, {})
  const maxScrap = Math.max(...Object.values(scrapByReason), 1)

  // Group scrap by work center
  const scrapByWorkCenter = scrapRecords.reduce((acc, r) => {
    acc[r.workCenter] = (acc[r.workCenter] || 0) + r.quantity
    return acc
  }, {})

  const handleSubmit = (e) => {
    e.preventDefault()
    addScrapRecord({
      ...formData,
      date: new Date().toISOString().split('T')[0],
    })
    setShowModal(false)
    setFormData({
      workCenter: '',
      product: '',
      quantity: 0,
      reason: '',
      rootCause: '',
      cost: 0,
      operator: '',
      shift: 'Day',
    })
  }

  return (
    <AppLayout>
      <div className="metrics-page">
        <div className="metrics-header">
          <button type="button" className="metrics-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="metrics-header-content">
            <div>
              <h1 className="metrics-title">Scrap & Waste Tracking</h1>
              <p className="metrics-subtitle">Monitor and analyze production scrap</p>
            </div>
            <button type="button" className="metrics-add-btn" onClick={() => setShowModal(true)}>+ Report Scrap</button>
          </div>
        </div>

        {/* Summary */}
        <div className="metrics-summary-row">
          <div className="metrics-summary-card">
            <div className="metrics-sum-value">{totalScrap}</div>
            <div className="metrics-sum-label">Total Scrap Units</div>
          </div>
          <div className="metrics-summary-card">
            <div className={`metrics-sum-value ${parseFloat(scrapRate) <= 1 ? 'green' : 'orange'}`}>{scrapRate}%</div>
            <div className="metrics-sum-label">Scrap Rate</div>
          </div>
          <div className="metrics-summary-card">
            <div className="metrics-sum-value red">${totalCost.toFixed(2)}</div>
            <div className="metrics-sum-label">Total Scrap Cost</div>
          </div>
          <div className="metrics-summary-card">
            <div className="metrics-sum-value">{Object.keys(scrapByReason).length}</div>
            <div className="metrics-sum-label">Unique Reasons</div>
          </div>
        </div>

        {/* Charts */}
        <div className="scrap-chart-section">
          <div className="scrap-by-reason">
            <h3>Scrap by Reason</h3>
            <div className="reason-bars">
              {Object.entries(scrapByReason).map(([reason, qty]) => (
                <div key={reason} className="reason-bar-item">
                  <span className="reason-label">{reason}</span>
                  <div className="reason-bar-track">
                    <div className="reason-bar-fill" style={{ width: `${(qty / maxScrap) * 100}%` }} />
                  </div>
                  <span className="reason-value">{qty}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="scrap-by-reason">
            <h3>Scrap by Work Center</h3>
            <div className="reason-bars">
              {Object.entries(scrapByWorkCenter).map(([wc, qty]) => (
                <div key={wc} className="reason-bar-item">
                  <span className="reason-label">{wc}</span>
                  <div className="reason-bar-track">
                    <div className="reason-bar-fill" style={{ width: `${(qty / maxScrap) * 100}%` }} />
                  </div>
                  <span className="reason-value">{qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Records */}
        <div className="metrics-card">
          <h3>Scrap Records</h3>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Work Center</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Reason</th>
                <th>Root Cause</th>
                <th>Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scrapRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.date}</td>
                  <td>{record.shift}</td>
                  <td>{record.workCenter}</td>
                  <td>{record.product}</td>
                  <td><strong>{record.quantity}</strong></td>
                  <td>{record.reason}</td>
                  <td>{record.rootCause}</td>
                  <td className="metrics-sum-value red">${record.cost.toFixed(2)}</td>
                  <td>
                    <button
                      type="button"
                      className="metrics-action-btn delete"
                      onClick={() => deleteScrapRecord(record.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="metrics-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="metrics-modal" onClick={(e) => e.stopPropagation()}>
              <div className="metrics-modal-header">
                <h3>Report Scrap</h3>
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

                <div className="form-row">
                  <div className="form-group">
                    <label>Product</label>
                    <input type="text" value={formData.product}
                      onChange={(e) => setFormData({ ...formData, product: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" min="1" value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Reason</label>
                    <select value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required>
                      <option value="">Select reason</option>
                      <option value="Dimensional out of spec">Dimensional out of spec</option>
                      <option value="Surface defects">Surface defects</option>
                      <option value="Component damage">Component damage</option>
                      <option value="Material defect">Material defect</option>
                      <option value="Assembly error">Assembly error</option>
                      <option value="Contamination">Contamination</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Root Cause</label>
                    <input type="text" value={formData.rootCause}
                      onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Cost ($)</label>
                    <input type="number" min="0" step="0.01" value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label>Operator</label>
                    <input type="text" value={formData.operator}
                      onChange={(e) => setFormData({ ...formData, operator: e.target.value })} />
                  </div>
                </div>

                <div className="metrics-modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit">Report Scrap</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ProductionScrap
