import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './ProductionAuditHistory.css'

const ProductionAuditHistory = () => {
  const navigate = useNavigate()
  const { getAllAudits, fiveSAudits, vda63Audits, processAudits } = useProductionStore()
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAudit, setSelectedAudit] = useState(null)

  const allAudits = getAllAudits()

  const filteredAudits = allAudits.filter((audit) => {
    const matchesType = filterType === 'all' || audit.auditType === filterType
    const matchesStatus = filterStatus === 'all' || audit.status === filterStatus
    const matchesSearch = searchTerm === '' || 
      (audit.area && audit.area.toLowerCase().includes(searchTerm.toLowerCase())) ||
      audit.auditor?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesStatus && matchesSearch
  })

  const auditTypes = ['all', '5S', 'ISO 9001', 'VDA 6.3', 'IATF 16949', 'Product/Process', 'Supplier', 'Layered Process']
  const statusTypes = ['all', 'completed', 'in_progress', 'action_required', 'open']

  const getAuditDetails = (audit) => {
    switch (audit.auditType) {
      case '5S':
        return fiveSAudits.find(a => a.id === audit.auditId) || audit
      case 'VDA 6.3':
        return vda63Audits.find(a => a.id === audit.auditId) || audit
      case 'Product/Process':
        return processAudits.find(a => a.id === audit.auditId) || audit
      default:
        // For ISO 9001, IATF 16949, Supplier, Layered Process - use audit from history
        return audit
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case '5S': return '#3498db'
      case 'VDA 6.3': return '#9b59b6'
      case 'Product/Process': return '#16a085'
      case 'ISO 9001': return '#27ae60'
      case 'IATF 16949': return '#e74c3c'
      case 'Supplier': return '#e67e22'
      case 'Layered Process': return '#8e44ad'
      default: return '#666'
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="history-status completed">Completed</span>
      case 'in_progress': return <span className="history-status progress">In Progress</span>
      case 'action_required': return <span className="history-status action">Action Required</span>
      default: return <span className="history-status open">Open</span>
    }
  }

  const getScoreClass = (score) => {
    if (score >= 85) return 'excellent'
    if (score >= 70) return 'good'
    if (score >= 50) return 'average'
    return 'poor'
  }

  // Statistics
  const totalAudits = allAudits.length
  const completedAudits = allAudits.filter(a => a.status === 'completed').length
  const openFindings = allAudits.reduce((sum, a) => sum + (a.findingsCount || 0), 0)
  const avgScore = allAudits.length > 0 
    ? (allAudits.reduce((sum, a) => sum + (a.score || 0), 0) / allAudits.length).toFixed(1) 
    : 0

  return (
    <AppLayout>
      <div className="history-page">
        <div className="history-header">
          <button type="button" className="history-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="history-header-content">
            <div>
              <h1 className="history-title">Audit History</h1>
              <p className="history-subtitle">Complete audit records with tracking data and findings</p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="history-stats">
          <div className="history-stat-card">
            <div className="stat-value">{totalAudits}</div>
            <div className="stat-label">Total Audits</div>
          </div>
          <div className="history-stat-card">
            <div className="stat-value green">{completedAudits}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="history-stat-card">
            <div className="stat-value orange">{openFindings}</div>
            <div className="stat-label">Total Findings</div>
          </div>
          <div className="history-stat-card">
            <div className={`stat-value ${getScoreClass(avgScore)}`}>{avgScore}%</div>
            <div className="stat-label">Average Score</div>
          </div>
        </div>

        {/* Filters */}
        <div className="history-filters">
          <div className="filter-group">
            <label>Audit Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {auditTypes.map((type) => (
                <option key={type} value={type}>{type === 'all' ? 'All Types' : type}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              {statusTypes.map((status) => (
                <option key={status} value={status}>{status === 'all' ? 'All Status' : status.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="filter-group search">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by area or auditor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Audit Timeline */}
        <div className="history-content">
          <div className="history-list">
            <h3 className="list-title">Audit Records ({filteredAudits.length})</h3>
            <div className="audit-timeline">
              {filteredAudits.map((audit) => (
                <div
                  key={audit.id}
                  className={`timeline-audit-item ${selectedAudit?.id === audit.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAudit(selectedAudit?.id === audit.id ? null : audit)}
                >
                  <div className="timeline-marker" style={{ background: getTypeColor(audit.auditType) }} />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="type-badge" style={{ background: getTypeColor(audit.auditType) }}>{audit.auditType}</span>
                      <span className="timeline-date">{audit.date}</span>
                    </div>
                    <div className="timeline-area">{audit.area}</div>
                    <div className="timeline-meta">
                      <span>Auditor: {audit.auditor}</span>
                      <span>{audit.findingsCount || 0} findings</span>
                    </div>
                    <div className="timeline-footer">
                      {getStatusBadge(audit.status)}
                      <span className={`score-badge ${getScoreClass(audit.score)}`}>{audit.score}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedAudit && (
            <div className="history-detail">
              <div className="detail-header">
                <h3>Audit Details</h3>
                <button type="button" className="close-detail" onClick={() => setSelectedAudit(null)}>×</button>
              </div>
              
              <div className="detail-content">
                <div className="detail-section">
                  <h4>General Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Audit Type</span>
                      <span className="detail-value" style={{ color: getTypeColor(selectedAudit.auditType) }}>{selectedAudit.auditType}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Area / Product</span>
                      <span className="detail-value">{selectedAudit.area}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Date</span>
                      <span className="detail-value">{selectedAudit.date}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Auditor</span>
                      <span className="detail-value">{selectedAudit.auditor}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      {getStatusBadge(selectedAudit.status)}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Score</span>
                      <span className={`detail-value score ${getScoreClass(selectedAudit.score)}`}>{selectedAudit.score}%</span>
                    </div>
                  </div>
                </div>

                {/* Type-specific details */}
                {selectedAudit.auditType === '5S' && (() => {
                  const details = getAuditDetails(selectedAudit)
                  return details ? (
                    <div className="detail-section">
                      <h4>5S Scores</h4>
                      <div className="score-breakdown">
                        <div className="score-item"><span>Sort</span><span>{details.scores?.sort}/5</span></div>
                        <div className="score-item"><span>Set in Order</span><span>{details.scores?.setInOrder}/5</span></div>
                        <div className="score-item"><span>Shine</span><span>{details.scores?.shine}/5</span></div>
                        <div className="score-item"><span>Standardize</span><span>{details.scores?.standardize}/5</span></div>
                        <div className="score-item"><span>Sustain</span><span>{details.scores?.sustain}/5</span></div>
                      </div>
                      {details.findings?.length > 0 && (
                        <div className="detail-findings">
                          <h5>Findings</h5>
                          <ul>
                            {details.findings.map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                        </div>
                      )}
                      {details.actions?.length > 0 && (
                        <div className="detail-actions">
                          <h5>Corrective Actions</h5>
                          <ul>
                            {details.actions.map((a, i) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : null
                })()}

                {selectedAudit.auditType === 'VDA 6.3' && (() => {
                  const details = getAuditDetails(selectedAudit)
                  return details ? (
                    <div className="detail-section">
                      <h4>Process Element Scores</h4>
                      <div className="score-breakdown">
                        {details.elements?.map((el, i) => (
                          <div key={i} className="score-item">
                            <span>{el.element}</span>
                            <span>{el.score}%</span>
                          </div>
                        ))}
                      </div>
                      <div className="detail-item rating">
                        <span className="detail-label">Rating</span>
                        <span className={`rating-badge ${details.rating}`}>{details.rating}</span>
                      </div>
                    </div>
                  ) : null
                })()}

                {selectedAudit.auditType === 'Product/Process' && (() => {
                  const details = getAuditDetails(selectedAudit)
                  return details ? (
                    <div className="detail-section">
                      <h4>Audit Components</h4>
                      <div className="components-list">
                        <div className="component-item">
                          <span className="comp-name">Control Plan</span>
                          <span className={`comp-status ${details.controlPlan?.status}`}>{details.controlPlan?.status}</span>
                        </div>
                        <div className="component-item">
                          <span className="comp-name">PFMEA</span>
                          <span className={`comp-status ${details.pfmea?.status}`}>{details.pfmea?.status}</span>
                        </div>
                        <div className="component-item">
                          <span className="comp-name">Workflow</span>
                          <span className="comp-status">{details.workflow?.steps?.length || 0} steps</span>
                        </div>
                        <div className="component-item">
                          <span className="comp-name">MSA Studies</span>
                          <span className="comp-status">{details.msa?.studies?.length || 0}</span>
                        </div>
                        <div className="component-item">
                          <span className="comp-name">SPC Charts</span>
                          <span className="comp-status">{details.spc?.charts?.length || 0}</span>
                        </div>
                      </div>
                      {details.findings?.length > 0 && (
                        <div className="detail-findings">
                          <h5>Findings ({details.findings.length})</h5>
                          {details.findings.slice(0, 3).map((f) => (
                            <div key={f.id} className="finding-preview">
                              <span className={`severity ${f.severity}`}>{f.severity}</span>
                              <span className="finding-text">{f.description}</span>
                              <span className={`finding-status ${f.status}`}>{f.status}</span>
                            </div>
                          ))}
                          {details.findings.length > 3 && (
                            <button type="button" className="view-more-btn" onClick={() => navigate('/production/process-audit')}>
                              View all {details.findings.length} findings →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null
                })()}

                {/* Generic audit types (ISO 9001, IATF 16949, Supplier, Layered Process) */}
                {['ISO 9001', 'IATF 16949', 'Supplier', 'Layered Process'].includes(selectedAudit.auditType) && (() => {
                  const details = getAuditDetails(selectedAudit)
                  return details ? (
                    <div className="detail-section">
                      <h4>Questionnaire Results</h4>
                      {details.responses && Object.keys(details.responses).length > 0 ? (
                        <>
                          <div className="questionnaire-summary">
                            <p className="summary-note">Completed questionnaire with {Object.keys(details.responses).length} questions evaluated.</p>
                          </div>
                          {details.findings && details.findings.length > 0 && (
                            <div className="detail-findings">
                              <h5>Findings ({details.findings.length})</h5>
                              {details.findings.slice(0, 5).map((f, i) => (
                                <div key={f.id || i} className="finding-preview">
                                  <span className="finding-text">{f.description || f}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="no-data-note">No detailed questionnaire data available.</p>
                      )}
                    </div>
                  ) : null
                })()}

                <div className="detail-actions-bar">
                  <button
                    type="button"
                    className="action-btn primary"
                    onClick={() => {
                      if (selectedAudit.auditType === '5S') navigate('/production/5s')
                      else if (selectedAudit.auditType === 'VDA 6.3') navigate('/production/vda63')
                      else if (selectedAudit.auditType === 'Product/Process') navigate('/production/process-audit')
                      else navigate('/production')
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default ProductionAuditHistory
