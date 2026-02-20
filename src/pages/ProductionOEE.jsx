import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './ProductionMetrics.css'

const ProductionOEE = () => {
  const navigate = useNavigate()
  const { oeeData, equipment, addOEERecord, getAverageOEE } = useProductionStore()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    equipment: '',
    shift: 'Day',
    availability: 0,
    performance: 0,
    quality: 0,
    plannedTime: 480,
    actualRunTime: 0,
    idealCycleTime: 0,
    totalCount: 0,
    goodCount: 0,
  })

  const avgOEE = getAverageOEE()
  const avgAvailability = oeeData.length ? (oeeData.reduce((s, r) => s + r.availability, 0) / oeeData.length).toFixed(1) : 0
  const avgPerformance = oeeData.length ? (oeeData.reduce((s, r) => s + r.performance, 0) / oeeData.length).toFixed(1) : 0
  const avgQuality = oeeData.length ? (oeeData.reduce((s, r) => s + r.quality, 0) / oeeData.length).toFixed(1) : 0

  const getOEEClass = (value) => {
    if (value >= 85) return 'world-class'
    if (value >= 70) return 'good'
    if (value >= 55) return 'average'
    return 'poor'
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    addOEERecord({
      ...formData,
      date: new Date().toISOString().split('T')[0],
    })
    setShowModal(false)
    setFormData({
      equipment: '',
      shift: 'Day',
      availability: 0,
      performance: 0,
      quality: 0,
      plannedTime: 480,
      actualRunTime: 0,
      idealCycleTime: 0,
      totalCount: 0,
      goodCount: 0,
    })
  }

  return (
    <AppLayout>
      <div className="metrics-page">
        <div className="metrics-header">
          <button type="button" className="metrics-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="metrics-header-content">
            <div>
              <h1 className="metrics-title">OEE Dashboard</h1>
              <p className="metrics-subtitle">Overall Equipment Effectiveness monitoring</p>
            </div>
            <button type="button" className="metrics-add-btn" onClick={() => setShowModal(true)}>+ Record OEE</button>
          </div>
        </div>

        {/* OEE Formula */}
        <div className="oee-formula-card">
          <div className="formula-title">OEE = Availability × Performance × Quality</div>
          <div className="formula-components">
            <div className="formula-item">
              <div className={`formula-value ${getOEEClass(avgAvailability)}`}>{avgAvailability}%</div>
              <div className="formula-label">Availability</div>
              <div className="formula-desc">Run Time / Planned Time</div>
            </div>
            <div className="formula-operator">×</div>
            <div className="formula-item">
              <div className={`formula-value ${getOEEClass(avgPerformance)}`}>{avgPerformance}%</div>
              <div className="formula-label">Performance</div>
              <div className="formula-desc">Ideal Cycle / Actual Cycle</div>
            </div>
            <div className="formula-operator">×</div>
            <div className="formula-item">
              <div className={`formula-value ${getOEEClass(avgQuality)}`}>{avgQuality}%</div>
              <div className="formula-label">Quality</div>
              <div className="formula-desc">Good Count / Total Count</div>
            </div>
            <div className="formula-operator">=</div>
            <div className="formula-item result">
              <div className={`formula-value ${getOEEClass(avgOEE)}`}>{avgOEE.toFixed(1)}%</div>
              <div className="formula-label">OEE</div>
              <div className="formula-desc">Overall Effectiveness</div>
            </div>
          </div>
        </div>

        {/* OEE Benchmark */}
        <div className="oee-benchmark">
          <div className="benchmark-title">OEE Benchmark</div>
          <div className="benchmark-items">
            <div className="benchmark-item world-class"><span>≥85%</span> World Class</div>
            <div className="benchmark-item good"><span>70-84%</span> Good</div>
            <div className="benchmark-item average"><span>55-69%</span> Average</div>
            <div className="benchmark-item poor"><span>&lt;55%</span> Poor</div>
          </div>
        </div>

        {/* Equipment OEE */}
        <div className="metrics-card">
          <h3>Equipment OEE Summary</h3>
          <div className="oee-grid">
            {equipment.filter(eq => eq.status === 'running').map((eq) => {
              const eqOee = oeeData.filter(d => d.equipment === eq.name)
              const latestOee = eqOee[eqOee.length - 1]
              return (
                <div key={eq.id} className="oee-equipment-card">
                  <div className="eq-header">
                    <div className="eq-name">{eq.name}</div>
                    <div className={`eq-status ${eq.status}`}>{eq.status}</div>
                  </div>
                  {latestOee ? (
                    <>
                      <div className={`eq-oee ${getOEEClass(latestOee.oee)}`}>
                        {latestOee.oee.toFixed(1)}%
                      </div>
                      <div className="eq-components">
                        <div className="eq-comp">
                          <span className="comp-label">A</span>
                          <div className="comp-bar"><div className="comp-fill" style={{ width: `${latestOee.availability}%` }} /></div>
                          <span className="comp-value">{latestOee.availability}%</span>
                        </div>
                        <div className="eq-comp">
                          <span className="comp-label">P</span>
                          <div className="comp-bar"><div className="comp-fill" style={{ width: `${latestOee.performance}%` }} /></div>
                          <span className="comp-value">{latestOee.performance}%</span>
                        </div>
                        <div className="eq-comp">
                          <span className="comp-label">Q</span>
                          <div className="comp-bar"><div className="comp-fill" style={{ width: `${latestOee.quality}%` }} /></div>
                          <span className="comp-value">{latestOee.quality}%</span>
                        </div>
                      </div>
                      <div className="eq-date">Last: {latestOee.date}</div>
                    </>
                  ) : (
                    <div className="eq-no-data">No OEE data</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* OEE Records */}
        <div className="metrics-card">
          <h3>OEE Records</h3>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Equipment</th>
                <th>Shift</th>
                <th>Availability</th>
                <th>Performance</th>
                <th>Quality</th>
                <th>OEE</th>
                <th>Good/Total</th>
              </tr>
            </thead>
            <tbody>
              {oeeData.map((record) => (
                <tr key={record.id}>
                  <td>{record.date}</td>
                  <td>{record.equipment}</td>
                  <td>{record.shift}</td>
                  <td><span className={`metric-badge ${getOEEClass(record.availability)}`}>{record.availability}%</span></td>
                  <td><span className={`metric-badge ${getOEEClass(record.performance)}`}>{record.performance}%</span></td>
                  <td><span className={`metric-badge ${getOEEClass(record.quality)}`}>{record.quality}%</span></td>
                  <td><span className={`metric-badge oee ${getOEEClass(record.oee)}`}>{record.oee.toFixed(1)}%</span></td>
                  <td>{record.goodCount}/{record.totalCount}</td>
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
                <h3>Record OEE Data</h3>
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
                    <label>Shift</label>
                    <select value={formData.shift} onChange={(e) => setFormData({ ...formData, shift: e.target.value })}>
                      <option value="Day">Day</option>
                      <option value="Night">Night</option>
                      <option value="Afternoon">Afternoon</option>
                    </select>
                  </div>
                </div>

                <div className="oee-input-section">
                  <h4>OEE Components</h4>
                  <div className="form-row three">
                    <div className="form-group">
                      <label>Availability (%)</label>
                      <input type="number" min="0" max="100" value={formData.availability}
                        onChange={(e) => setFormData({ ...formData, availability: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="form-group">
                      <label>Performance (%)</label>
                      <input type="number" min="0" max="100" value={formData.performance}
                        onChange={(e) => setFormData({ ...formData, performance: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="form-group">
                      <label>Quality (%)</label>
                      <input type="number" min="0" max="100" value={formData.quality}
                        onChange={(e) => setFormData({ ...formData, quality: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                </div>

                <div className="oee-input-section">
                  <h4>Production Data</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Planned Time (min)</label>
                      <input type="number" min="0" value={formData.plannedTime}
                        onChange={(e) => setFormData({ ...formData, plannedTime: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="form-group">
                      <label>Actual Run Time (min)</label>
                      <input type="number" min="0" value={formData.actualRunTime}
                        onChange={(e) => setFormData({ ...formData, actualRunTime: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Total Count</label>
                      <input type="number" min="0" value={formData.totalCount}
                        onChange={(e) => setFormData({ ...formData, totalCount: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="form-group">
                      <label>Good Count</label>
                      <input type="number" min="0" value={formData.goodCount}
                        onChange={(e) => setFormData({ ...formData, goodCount: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                </div>

                <div className="oee-preview">
                  <div className="preview-label">Calculated OEE:</div>
                  <div className={`preview-value ${getOEEClass((formData.availability * formData.performance * formData.quality) / 10000)}`}>
                    {((formData.availability * formData.performance * formData.quality) / 10000).toFixed(1)}%
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

export default ProductionOEE
