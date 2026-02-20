import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './Production5S.css'

const Production5S = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { fiveSAudits, addFiveSAudit, updateFiveSAudit } = useProductionStore()
  const [showModal, setShowModal] = useState(searchParams.get('add') === 'true')
  const [selectedAudit, setSelectedAudit] = useState(null)
  const [formData, setFormData] = useState({
    area: '',
    auditor: '',
    scores: { sort: 0, setInOrder: 0, shine: 0, standardize: 0, sustain: 0 },
    findings: '',
    actions: '',
  })

  const pillars = [
    { key: 'sort', name: 'Sort (Seiri)', desc: 'Remove unnecessary items', color: '#e74c3c' },
    { key: 'setInOrder', name: 'Set in Order (Seiton)', desc: 'Organize remaining items', color: '#e67e22' },
    { key: 'shine', name: 'Shine (Seiso)', desc: 'Clean the workplace', color: '#f1c40f' },
    { key: 'standardize', name: 'Standardize (Seiketsu)', desc: 'Create standards', color: '#3498db' },
    { key: 'sustain', name: 'Sustain (Shitsuke)', desc: 'Maintain discipline', color: '#27ae60' },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    const totalScore = Object.values(formData.scores).reduce((a, b) => a + b, 0)
    const audit = {
      area: formData.area,
      date: new Date().toISOString().split('T')[0],
      auditor: formData.auditor,
      scores: formData.scores,
      totalScore,
      maxScore: 25,
      findings: formData.findings.split('\n').filter(f => f.trim()),
      actions: formData.actions.split('\n').filter(a => a.trim()),
      status: 'open',
    }

    if (selectedAudit) {
      updateFiveSAudit(selectedAudit.id, audit)
    } else {
      addFiveSAudit(audit)
    }
    setShowModal(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      area: '',
      auditor: '',
      scores: { sort: 0, setInOrder: 0, shine: 0, standardize: 0, sustain: 0 },
      findings: '',
      actions: '',
    })
    setSelectedAudit(null)
  }

  const openEdit = (audit) => {
    setSelectedAudit(audit)
    setFormData({
      area: audit.area,
      auditor: audit.auditor,
      scores: { ...audit.scores },
      findings: audit.findings.join('\n'),
      actions: audit.actions.join('\n'),
    })
    setShowModal(true)
  }

  const getScoreColor = (score, max) => {
    const pct = (score / max) * 100
    if (pct >= 80) return 'green'
    if (pct >= 60) return 'orange'
    return 'red'
  }

  const avgScore = fiveSAudits.length
    ? (fiveSAudits.reduce((s, a) => s + ((a.totalScore / a.maxScore) * 100), 0) / fiveSAudits.length).toFixed(1)
    : 0

  return (
    <AppLayout>
      <div className="fs-page">
        <div className="fs-header">
          <button type="button" className="fs-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="fs-header-content">
            <div>
              <h1 className="fs-title">5S Workplace Organization</h1>
              <p className="fs-subtitle">Sort, Set in order, Shine, Standardize, Sustain</p>
            </div>
            <button type="button" className="fs-add-btn" onClick={() => setShowModal(true)}>+ New Audit</button>
          </div>
        </div>

        {/* 5S Pillars Overview */}
        <div className="fs-pillars">
          {pillars.map((p) => (
            <div key={p.key} className="fs-pillar-card" style={{ borderLeftColor: p.color }}>
              <div className="pillar-header" style={{ color: p.color }}>{p.name}</div>
              <div className="pillar-desc">{p.desc}</div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="fs-summary-row">
          <div className="fs-summary-card">
            <div className="fs-sum-value">{fiveSAudits.length}</div>
            <div className="fs-sum-label">Total Audits</div>
          </div>
          <div className="fs-summary-card">
            <div className={`fs-sum-value ${getScoreColor(avgScore, 100)}`}>{avgScore}%</div>
            <div className="fs-sum-label">Average Score</div>
          </div>
          <div className="fs-summary-card">
            <div className="fs-sum-value green">{fiveSAudits.filter(a => a.status === 'completed').length}</div>
            <div className="fs-sum-label">Completed</div>
          </div>
          <div className="fs-summary-card">
            <div className="fs-sum-value orange">{fiveSAudits.filter(a => a.status !== 'completed').length}</div>
            <div className="fs-sum-label">In Progress</div>
          </div>
        </div>

        {/* Audits Table */}
        <div className="fs-card">
          <h2 className="fs-card-title">Audit Records</h2>
          <table className="fs-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Area</th>
                <th>Auditor</th>
                <th>Sort</th>
                <th>Set</th>
                <th>Shine</th>
                <th>Std</th>
                <th>Sustain</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fiveSAudits.map((a) => (
                <tr key={a.id}>
                  <td>{a.date}</td>
                  <td>{a.area}</td>
                  <td>{a.auditor}</td>
                  <td><span className={`score-badge ${a.scores.sort >= 4 ? 'good' : 'warn'}`}>{a.scores.sort}</span></td>
                  <td><span className={`score-badge ${a.scores.setInOrder >= 4 ? 'good' : 'warn'}`}>{a.scores.setInOrder}</span></td>
                  <td><span className={`score-badge ${a.scores.shine >= 4 ? 'good' : 'warn'}`}>{a.scores.shine}</span></td>
                  <td><span className={`score-badge ${a.scores.standardize >= 4 ? 'good' : 'warn'}`}>{a.scores.standardize}</span></td>
                  <td><span className={`score-badge ${a.scores.sustain >= 4 ? 'good' : 'warn'}`}>{a.scores.sustain}</span></td>
                  <td>
                    <span className={`score-total ${getScoreColor(a.totalScore, a.maxScore)}`}>
                      {a.totalScore}/{a.maxScore}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${a.status === 'completed' ? 'completed' : 'progress'}`}>
                      {a.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="fs-action-btn" onClick={() => openEdit(a)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fs-modal-overlay" onClick={() => { setShowModal(false); resetForm() }}>
            <div className="fs-modal" onClick={(e) => e.stopPropagation()}>
              <div className="fs-modal-header">
                <h3>{selectedAudit ? 'Edit Audit' : 'New 5S Audit'}</h3>
                <button type="button" className="fs-modal-close" onClick={() => { setShowModal(false); resetForm() }}>×</button>
              </div>
              <form onSubmit={handleSubmit} className="fs-modal-form">
                <div className="fs-form-row">
                  <div className="fs-form-group">
                    <label>Area / Location</label>
                    <input
                      type="text"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      required
                    />
                  </div>
                  <div className="fs-form-group">
                    <label>Auditor</label>
                    <input
                      type="text"
                      value={formData.auditor}
                      onChange={(e) => setFormData({ ...formData, auditor: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="fs-scores-grid">
                  {pillars.map((p) => (
                    <div key={p.key} className="fs-score-input">
                      <label style={{ color: p.color }}>{p.name.split(' ')[0]}</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={formData.scores[p.key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          scores: { ...formData.scores, [p.key]: parseInt(e.target.value) || 0 }
                        })}
                      />
                      <span className="score-hint">/ 5</span>
                    </div>
                  ))}
                </div>

                <div className="fs-form-group">
                  <label>Findings (one per line)</label>
                  <textarea
                    value={formData.findings}
                    onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="fs-form-group">
                  <label>Corrective Actions (one per line)</label>
                  <textarea
                    value={formData.actions}
                    onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="fs-modal-actions">
                  <button type="button" className="fs-btn-cancel" onClick={() => { setShowModal(false); resetForm() }}>Cancel</button>
                  <button type="submit" className="fs-btn-submit">{selectedAudit ? 'Update' : 'Save'} Audit</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default Production5S
