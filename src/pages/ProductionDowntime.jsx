import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './ProductionMetrics.css'

const ProductionDowntime = () => {
  const navigate = useNavigate()
  const { downtimeRecords, equipment, addDowntimeRecord, deleteDowntimeRecord } = useProductionStore()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    equipment: '',
    category: 'Breakdown',
    reason: '',
    description: '',
    corrective: '',
    startTime: '',
    endTime: '',
    duration: 0,
    operator: '',
  })

  const totalDowntime = downtimeRecords.reduce((s, r) => s + r.duration, 0)
  const breakdown = downtimeRecords.filter(r => r.category === 'Breakdown').reduce((s, r) => s + r.duration, 0)
  const changeover = downtimeRecords.filter(r => r.category === 'Changeover').reduce((s, r) => s + r.duration, 0)
  const planned = downtimeRecords.filter(r => r.category === 'Planned').reduce((s, r) => s + r.duration, 0)
  const other = totalDowntime - breakdown - changeover - planned

  const handleSubmit = (e) => {
    e.preventDefault()
    addDowntimeRecord({
      ...formData,
      date: new Date().toISOString().split('T')[0],
    })
    setShowModal(false)
    setFormData({
      equipment: '',
      category: 'Breakdown',
      reason: '',
      description: '',
      corrective: '',
      startTime: '',
      endTime: '',
      duration: 0,
      operator: '',
    })
  }

  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <AppLayout>
      <div className="metrics-page">
        <div className="metrics-header">
          <button type="button" className="metrics-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="metrics-header-content">
            <div>
              <h1 className="metrics-title">Downtime Tracking</h1>
              <p className="metrics-subtitle">Equipment downtime and loss monitoring</p>
            </div>
            <button type="button" className="metrics-add-btn" onClick={() => setShowModal(true)}>+ Log Downtime</button>
          </div>
        </div>

        {/* Summary */}
        <div className="metrics-summary-row">
          <div className="metrics-summary-card">
            <div className="metrics-sum-value">{formatDuration(totalDowntime)}</div>
            <div className="metrics-sum-label">Total Downtime</div>
          </div>
          <div className="metrics-summary-card">
            <div className="metrics-sum-value red">{formatDuration(breakdown)}</div>
            <div className="metrics-sum-label">Breakdowns</div>
          </div>
          <div className="metrics-summary-card">
            <div className="metrics-sum-value blue">{formatDuration(changeover)}</div>
            <div className="metrics-sum-label">Changeovers</div>
          </div>
          <div className="metrics-summary-card">
            <div className="metrics-sum-value green">{formatDuration(planned)}</div>
            <div className="metrics-sum-label">Planned</div>
          </div>
        </div>

        {/* Categories */}
        <div className="downtime-categories">
          <div className="dt-category-card breakdown">
            <div className="dt-cat-value">{((breakdown / totalDowntime) * 100 || 0).toFixed(0)}%</div>
            <div className="dt-cat-label">Breakdown</div>
          </div>
          <div className="dt-category-card changeover">
            <div className="dt-cat-value">{((changeover / totalDowntime) * 100 || 0).toFixed(0)}%</div>
            <div className="dt-cat-label">Changeover</div>
          </div>
          <div className="dt-category-card planned">
            <div className="dt-cat-value">{((planned / totalDowntime) * 100 || 0).toFixed(0)}%</div>
            <div className="dt-cat-label">Planned</div>
          </div>
          <div className="dt-category-card other">
            <div className="dt-cat-value">{((other / totalDowntime) * 100 || 0).toFixed(0)}%</div>
            <div className="dt-cat-label">Other</div>
          </div>
        </div>

        {/* Records Table */}
        <div className="metrics-card">
          <h3>Downtime Records</h3>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Equipment</th>
                <th>Category</th>
                <th>Reason</th>
                <th>Start</th>
                <th>End</th>
                <th>Duration</th>
                <th>Operator</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {downtimeRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.date}</td>
                  <td>{record.equipment}</td>
                  <td>
                    <span className={`category-badge ${record.category.toLowerCase()}`}>
                      {record.category}
                    </span>
                  </td>
                  <td>{record.reason}</td>
                  <td>{record.startTime}</td>
                  <td>{record.endTime}</td>
                  <td><strong>{formatDuration(record.duration)}</strong></td>
                  <td>{record.operator}</td>
                  <td>
                    <button
                      type="button"
                      className="metrics-action-btn delete"
                      onClick={() => deleteDowntimeRecord(record.id)}
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
                <h3>Log Downtime</h3>
                <button type="button" className="metrics-modal-close" onClick={() => setShowModal(false)}>×</button>
              </div>
              <form onSubmit={handleSubmit} className="metrics-modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Equipment</label>
                    <select value={formData.equipment} onChange={(e) => setFormData({ ...formData, equipment: e.target.value })} required>
                      <option value="">Select equipment</option>
                      {equipment.map(eq => (
                        <option key={eq.id} value={eq.name}>{eq.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                      <option value="Breakdown">Breakdown</option>
                      <option value="Changeover">Changeover</option>
                      <option value="Planned">Planned</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason</label>
                  <input type="text" value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={2} value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>

                <div className="form-row three">
                  <div className="form-group">
                    <label>Start Time</label>
                    <input type="time" value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input type="time" value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Duration (min)</label>
                    <input type="number" min="0" value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Corrective Action</label>
                    <input type="text" value={formData.corrective}
                      onChange={(e) => setFormData({ ...formData, corrective: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Operator</label>
                    <input type="text" value={formData.operator}
                      onChange={(e) => setFormData({ ...formData, operator: e.target.value })} />
                  </div>
                </div>

                <div className="metrics-modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit">Log Downtime</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ProductionDowntime
