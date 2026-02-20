import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './ProductionStandard.css'

const ProductionVDA63 = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { vda63Audits, addVDA63Audit } = useProductionStore()
  const [showModal, setShowModal] = useState(searchParams.get('add') === 'true')
  const [formData, setFormData] = useState({
    processName: '',
    auditor: '',
    elements: [
      { element: 'P2 - Project Management', score: 0 },
      { element: 'P3 - Planning Product/Process', score: 0 },
      { element: 'P4 - Realization Product/Process', score: 0 },
      { element: 'P5 - Supplier Management', score: 0 },
      { element: 'P6 - Process Analysis', score: 0 },
      { element: 'P7 - Customer Care', score: 0 },
    ],
    findings: 0,
  })

  const getRating = (score) => {
    if (score >= 90) return { letter: 'A', color: 'green', desc: 'Quality capable' }
    if (score >= 80) return { letter: 'B', color: 'blue', desc: 'Conditionally capable' }
    if (score >= 60) return { letter: 'C', color: 'orange', desc: 'Not quality capable' }
    return { letter: 'D', color: 'red', desc: 'Insufficient' }
  }

  const avgScore = vda63Audits.length
    ? (vda63Audits.reduce((s, a) => s + a.overallScore, 0) / vda63Audits.length).toFixed(1)
    : 0

  const handleSubmit = (e) => {
    e.preventDefault()
    const overallScore = Math.round(formData.elements.reduce((s, e) => s + e.score, 0) / formData.elements.length)
    const rating = getRating(overallScore)
    addVDA63Audit({
      ...formData,
      date: new Date().toISOString().split('T')[0],
      overallScore,
      rating: rating.letter,
      status: overallScore >= 80 ? 'completed' : 'action_required',
    })
    setShowModal(false)
    setFormData({
      processName: '',
      auditor: '',
      elements: [
        { element: 'P2 - Project Management', score: 0 },
        { element: 'P3 - Planning Product/Process', score: 0 },
        { element: 'P4 - Realization Product/Process', score: 0 },
        { element: 'P5 - Supplier Management', score: 0 },
        { element: 'P6 - Process Analysis', score: 0 },
        { element: 'P7 - Customer Care', score: 0 },
      ],
      findings: 0,
    })
  }

  return (
    <AppLayout>
      <div className="std-page">
        <div className="std-header">
          <button type="button" className="std-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="std-header-content">
            <div className="std-header-info">
              <div className="std-badge vda">VDA 6.3</div>
              <h1 className="std-title">Process Audit</h1>
              <p className="std-subtitle">German automotive industry process audit standard</p>
            </div>
            <button type="button" className="std-add-btn" onClick={() => setShowModal(true)}>+ New Audit</button>
          </div>
        </div>

        {/* Rating Legend */}
        <div className="vda-legend">
          <div className="legend-title">VDA 6.3 Rating Scale</div>
          <div className="legend-items">
            <div className="legend-item">
              <span className="rating-badge green">A</span>
              <span>≥90% Quality capable</span>
            </div>
            <div className="legend-item">
              <span className="rating-badge blue">B</span>
              <span>80-89% Conditionally capable</span>
            </div>
            <div className="legend-item">
              <span className="rating-badge orange">C</span>
              <span>60-79% Not quality capable</span>
            </div>
            <div className="legend-item">
              <span className="rating-badge red">D</span>
              <span>&lt;60% Insufficient</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="std-summary-row">
          <div className="std-summary-card">
            <div className="std-sum-value">{vda63Audits.length}</div>
            <div className="std-sum-label">Total Audits</div>
          </div>
          <div className="std-summary-card">
            <div className={`std-sum-value ${getRating(avgScore).color}`}>{avgScore}%</div>
            <div className="std-sum-label">Average Score</div>
          </div>
          <div className="std-summary-card">
            <div className="std-sum-value green">{vda63Audits.filter(a => a.rating === 'A' || a.rating === 'B').length}</div>
            <div className="std-sum-label">Passing Audits</div>
          </div>
          <div className="std-summary-card">
            <div className="std-sum-value orange">{vda63Audits.filter(a => a.status === 'action_required').length}</div>
            <div className="std-sum-label">Actions Required</div>
          </div>
        </div>

        {/* Audits */}
        <div className="std-card">
          <h3>Process Audit Records</h3>
          <div className="vda-audits">
            {vda63Audits.map((audit) => {
              const rating = getRating(audit.overallScore)
              return (
                <div key={audit.id} className="vda-audit-card">
                  <div className="vda-audit-header">
                    <div className="vda-audit-info">
                      <h4>{audit.processName}</h4>
                      <p>{audit.date} • {audit.auditor}</p>
                    </div>
                    <div className={`vda-rating ${rating.color}`}>
                      <span className="rating-letter">{audit.rating}</span>
                      <span className="rating-score">{audit.overallScore}%</span>
                    </div>
                  </div>
                  <div className="vda-elements">
                    {audit.elements.map((el, i) => (
                      <div key={i} className="vda-element">
                        <span className="el-name">{el.element.split(' - ')[0]}</span>
                        <div className="el-bar">
                          <div className="el-fill" style={{ width: `${el.score}%` }} />
                        </div>
                        <span className="el-score">{el.score}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="vda-audit-footer">
                    <span className="findings-count">{audit.findings} findings</span>
                    <span className={`vda-status ${audit.status === 'completed' ? 'completed' : 'action'}`}>
                      {audit.status === 'completed' ? 'Completed' : 'Action Required'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="std-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="std-modal" onClick={(e) => e.stopPropagation()}>
              <div className="std-modal-header">
                <h3>New VDA 6.3 Audit</h3>
                <button type="button" className="std-modal-close" onClick={() => setShowModal(false)}>×</button>
              </div>
              <form onSubmit={handleSubmit} className="std-modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Process Name</label>
                    <input type="text" value={formData.processName}
                      onChange={(e) => setFormData({ ...formData, processName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Auditor</label>
                    <input type="text" value={formData.auditor}
                      onChange={(e) => setFormData({ ...formData, auditor: e.target.value })} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Process Elements Scores (0-100%)</label>
                  <div className="element-scores">
                    {formData.elements.map((el, i) => (
                      <div key={i} className="element-input">
                        <span>{el.element}</span>
                        <input type="number" min="0" max="100" value={el.score}
                          onChange={(e) => {
                            const newElements = [...formData.elements]
                            newElements[i].score = parseInt(e.target.value) || 0
                            setFormData({ ...formData, elements: newElements })
                          }} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Number of Findings</label>
                  <input type="number" min="0" value={formData.findings}
                    onChange={(e) => setFormData({ ...formData, findings: parseInt(e.target.value) || 0 })} />
                </div>

                <div className="std-modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit">Save Audit</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ProductionVDA63
