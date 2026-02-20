import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './ProductionProcessAudit.css'

const ProductionProcessAudit = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { processAudits, addProcessAudit, updateProcessAudit, addProcessAuditFinding, updateProcessAuditFinding } = useProductionStore()
  
  const [selectedAudit, setSelectedAudit] = useState(processAudits[0] || null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showNewAuditModal, setShowNewAuditModal] = useState(searchParams.get('add') === 'true')
  const [showFindingModal, setShowFindingModal] = useState(false)
  const [editingFinding, setEditingFinding] = useState(null)
  
  const [newAuditForm, setNewAuditForm] = useState({
    productName: '',
    processName: '',
    auditor: '',
  })

  const [findingForm, setFindingForm] = useState({
    category: 'Control Plan',
    description: '',
    severity: 'minor',
    status: 'open',
    dueDate: '',
    responsible: '',
    improvement: '',
    linkedItems: [],
  })

  const handleCreateAudit = (e) => {
    e.preventDefault()
    const newAudit = {
      productName: newAuditForm.productName,
      processName: newAuditForm.processName,
      date: new Date().toISOString().split('T')[0],
      auditor: newAuditForm.auditor,
      status: 'in_progress',
      overallScore: 0,
      controlPlan: {
        id: `cp-${Date.now()}`,
        version: '1.0',
        lastUpdated: new Date().toISOString().split('T')[0],
        status: 'draft',
        characteristics: [],
        findings: [],
      },
      pfmea: {
        id: `pfmea-${Date.now()}`,
        version: '1.0',
        lastUpdated: new Date().toISOString().split('T')[0],
        status: 'draft',
        failureModes: [],
        findings: [],
      },
      workflow: {
        id: `wf-${Date.now()}`,
        version: '1.0',
        steps: [],
        findings: [],
      },
      msa: {
        id: `msa-${Date.now()}`,
        studies: [],
        findings: [],
      },
      spc: {
        id: `spc-${Date.now()}`,
        charts: [],
        findings: [],
      },
      findings: [],
    }
    addProcessAudit(newAudit)
    setShowNewAuditModal(false)
    setNewAuditForm({ productName: '', processName: '', auditor: '' })
  }

  const handleAddFinding = (e) => {
    e.preventDefault()
    if (selectedAudit) {
      addProcessAuditFinding(selectedAudit.id, findingForm)
      setShowFindingModal(false)
      setFindingForm({
        category: 'Control Plan',
        description: '',
        severity: 'minor',
        status: 'open',
        dueDate: '',
        responsible: '',
        improvement: '',
        linkedItems: [],
      })
    }
  }

  const handleUpdateFindingStatus = (findingId, newStatus) => {
    if (selectedAudit) {
      updateProcessAuditFinding(selectedAudit.id, findingId, { status: newStatus })
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#e74c3c'
      case 'major': return '#e67e22'
      case 'minor': return '#f1c40f'
      default: return '#95a5a6'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'closed': return 'green'
      case 'in_progress': return 'blue'
      case 'open': return 'orange'
      default: return 'gray'
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'control-plan', label: 'Control Plan' },
    { id: 'pfmea', label: 'PFMEA' },
    { id: 'workflow', label: 'Workflow' },
    { id: 'msa', label: 'MSA' },
    { id: 'spc', label: 'SPC' },
    { id: 'findings', label: 'Findings' },
  ]

  return (
    <AppLayout>
      <div className="ppa-page">
        <div className="ppa-header">
          <button type="button" className="ppa-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="ppa-header-content">
            <div>
              <h1 className="ppa-title">Product / Process Audit</h1>
              <p className="ppa-subtitle">Control Plan, PFMEA, Production Workflow Analysis</p>
            </div>
            <button type="button" className="ppa-add-btn" onClick={() => setShowNewAuditModal(true)}>+ New Audit</button>
          </div>
        </div>

        <div className="ppa-layout">
          {/* Sidebar - Audit List */}
          <div className="ppa-sidebar">
            <h3 className="ppa-sidebar-title">Audits</h3>
            <div className="ppa-audit-list">
              {processAudits.map((audit) => (
                <div
                  key={audit.id}
                  className={`ppa-audit-item ${selectedAudit?.id === audit.id ? 'active' : ''}`}
                  onClick={() => setSelectedAudit(audit)}
                >
                  <div className="audit-item-header">
                    <span className="audit-product">{audit.productName}</span>
                    <span className={`audit-status ${audit.status}`}>{audit.status.replace('_', ' ')}</span>
                  </div>
                  <div className="audit-item-meta">
                    <span>{audit.processName}</span>
                    <span>{audit.date}</span>
                  </div>
                  <div className="audit-item-stats">
                    <span className="findings-count">{audit.findings?.length || 0} findings</span>
                    <span className="audit-score">{audit.overallScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="ppa-main">
            {selectedAudit ? (
              <>
                {/* Tabs */}
                <div className="ppa-tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`ppa-tab ${activeTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                      {tab.id === 'findings' && selectedAudit.findings?.length > 0 && (
                        <span className="tab-badge">{selectedAudit.findings.length}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="ppa-content">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="ppa-overview">
                      <div className="overview-grid">
                        <div className="overview-card">
                          <h4>Audit Information</h4>
                          <div className="info-rows">
                            <div className="info-row"><span>Product:</span><strong>{selectedAudit.productName}</strong></div>
                            <div className="info-row"><span>Process:</span><strong>{selectedAudit.processName}</strong></div>
                            <div className="info-row"><span>Auditor:</span><strong>{selectedAudit.auditor}</strong></div>
                            <div className="info-row"><span>Date:</span><strong>{selectedAudit.date}</strong></div>
                            <div className="info-row"><span>Status:</span><span className={`status-badge ${selectedAudit.status}`}>{selectedAudit.status.replace('_', ' ')}</span></div>
                          </div>
                        </div>

                        <div className="overview-card">
                          <h4>Score Overview</h4>
                          <div className="score-display">
                            <div className="big-score">{selectedAudit.overallScore}%</div>
                            <div className="score-label">Overall Score</div>
                          </div>
                          <div className="component-scores">
                            <div className="comp-score"><span>Control Plan</span><span>{selectedAudit.controlPlan?.status}</span></div>
                            <div className="comp-score"><span>PFMEA</span><span>{selectedAudit.pfmea?.status}</span></div>
                            <div className="comp-score"><span>Workflow</span><span>{selectedAudit.workflow?.steps?.length || 0} steps</span></div>
                          </div>
                        </div>

                        <div className="overview-card findings-summary">
                          <h4>Findings Summary</h4>
                          <div className="findings-stats">
                            <div className="finding-stat">
                              <span className="stat-value">{selectedAudit.findings?.filter(f => f.status === 'open').length || 0}</span>
                              <span className="stat-label">Open</span>
                            </div>
                            <div className="finding-stat">
                              <span className="stat-value">{selectedAudit.findings?.filter(f => f.status === 'in_progress').length || 0}</span>
                              <span className="stat-label">In Progress</span>
                            </div>
                            <div className="finding-stat">
                              <span className="stat-value">{selectedAudit.findings?.filter(f => f.status === 'closed').length || 0}</span>
                              <span className="stat-label">Closed</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Linked Items Diagram */}
                      <div className="linked-diagram-card">
                        <h4>Document Linkage</h4>
                        <div className="linkage-flow">
                          <div className="link-node cp">Control Plan</div>
                          <div className="link-arrow">↔</div>
                          <div className="link-node pfmea">PFMEA</div>
                          <div className="link-arrow">↔</div>
                          <div className="link-node wf">Workflow</div>
                          <div className="link-arrow">↔</div>
                          <div className="link-node msa">MSA</div>
                          <div className="link-arrow">↔</div>
                          <div className="link-node spc">SPC</div>
                        </div>
                        <p className="linkage-note">Findings are automatically linked between related documents for traceability</p>
                      </div>
                    </div>
                  )}

                  {/* Control Plan Tab */}
                  {activeTab === 'control-plan' && (
                    <div className="ppa-section">
                      <div className="section-header">
                        <div>
                          <h3>Control Plan</h3>
                          <p>Version {selectedAudit.controlPlan?.version} • Last updated: {selectedAudit.controlPlan?.lastUpdated}</p>
                        </div>
                        <span className={`doc-status ${selectedAudit.controlPlan?.status}`}>{selectedAudit.controlPlan?.status}</span>
                      </div>
                      
                      <table className="ppa-table">
                        <thead>
                          <tr>
                            <th>Characteristic</th>
                            <th>Type</th>
                            <th>Specification</th>
                            <th>Method</th>
                            <th>Frequency</th>
                            <th>Reaction Plan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAudit.controlPlan?.characteristics?.map((char) => (
                            <tr key={char.id}>
                              <td>{char.name}</td>
                              <td><span className={`type-badge ${char.type.toLowerCase()}`}>{char.type}</span></td>
                              <td>{char.spec}</td>
                              <td>{char.method}</td>
                              <td>{char.frequency}</td>
                              <td>{char.reaction}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {selectedAudit.controlPlan?.findings?.length > 0 && (
                        <div className="section-findings">
                          <h4>Control Plan Findings</h4>
                          {selectedAudit.controlPlan.findings.map((f) => (
                            <div key={f.id} className="finding-item" style={{ borderLeftColor: getSeverityColor(f.severity) }}>
                              <span className="finding-desc">{f.description}</span>
                              {f.linkedTo && <span className="finding-link">Linked to: {f.linkedTo}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PFMEA Tab */}
                  {activeTab === 'pfmea' && (
                    <div className="ppa-section">
                      <div className="section-header">
                        <div>
                          <h3>Process FMEA</h3>
                          <p>Version {selectedAudit.pfmea?.version} • Last updated: {selectedAudit.pfmea?.lastUpdated}</p>
                        </div>
                        <span className={`doc-status ${selectedAudit.pfmea?.status}`}>{selectedAudit.pfmea?.status}</span>
                      </div>
                      
                      <table className="ppa-table">
                        <thead>
                          <tr>
                            <th>Process Step</th>
                            <th>Failure Mode</th>
                            <th>Effect</th>
                            <th>S</th>
                            <th>O</th>
                            <th>D</th>
                            <th>RPN</th>
                            <th>Recommended Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAudit.pfmea?.failureModes?.map((fm) => (
                            <tr key={fm.id} className={fm.rpn >= 100 ? 'high-rpn' : ''}>
                              <td>{fm.processStep}</td>
                              <td>{fm.failureMode}</td>
                              <td>{fm.effect}</td>
                              <td>{fm.severity}</td>
                              <td>{fm.occurrence}</td>
                              <td>{fm.detection}</td>
                              <td><strong className={fm.rpn >= 100 ? 'rpn-high' : fm.rpn >= 50 ? 'rpn-med' : 'rpn-low'}>{fm.rpn}</strong></td>
                              <td>{fm.actions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {selectedAudit.pfmea?.findings?.length > 0 && (
                        <div className="section-findings">
                          <h4>PFMEA Findings</h4>
                          {selectedAudit.pfmea.findings.map((f) => (
                            <div key={f.id} className="finding-item" style={{ borderLeftColor: getSeverityColor(f.severity) }}>
                              <span className="finding-desc">{f.description}</span>
                              {f.linkedTo && <span className="finding-link">Linked to: {f.linkedTo}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Workflow Tab */}
                  {activeTab === 'workflow' && (
                    <div className="ppa-section">
                      <div className="section-header">
                        <div>
                          <h3>Production Workflow</h3>
                          <p>Version {selectedAudit.workflow?.version}</p>
                        </div>
                      </div>
                      
                      <div className="workflow-steps">
                        {selectedAudit.workflow?.steps?.map((step, idx) => (
                          <div key={step.id} className="workflow-step">
                            <div className="step-number">{idx + 1}</div>
                            <div className="step-content">
                              <div className="step-name">{step.name}</div>
                              <div className="step-meta">
                                <span>{step.department}</span>
                                <span>{step.duration}</span>
                              </div>
                            </div>
                            <span className={`step-status ${step.status}`}>{step.status}</span>
                            {idx < selectedAudit.workflow.steps.length - 1 && <div className="step-connector" />}
                          </div>
                        ))}
                      </div>

                      {selectedAudit.workflow?.findings?.length > 0 && (
                        <div className="section-findings">
                          <h4>Workflow Findings</h4>
                          {selectedAudit.workflow.findings.map((f) => (
                            <div key={f.id} className="finding-item" style={{ borderLeftColor: getSeverityColor(f.severity) }}>
                              <span className="finding-desc">{f.description}</span>
                              {f.linkedTo && <span className="finding-link">Linked to: {f.linkedTo}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* MSA Tab */}
                  {activeTab === 'msa' && (
                    <div className="ppa-section">
                      <div className="section-header">
                        <div>
                          <h3>Measurement System Analysis</h3>
                          <p>Gage R&R and measurement capability studies</p>
                        </div>
                      </div>
                      
                      <table className="ppa-table">
                        <thead>
                          <tr>
                            <th>Characteristic</th>
                            <th>Gage R&R (%)</th>
                            <th>NDC</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAudit.msa?.studies?.map((study) => (
                            <tr key={study.id}>
                              <td>{study.characteristic}</td>
                              <td className={study.gageRR <= 10 ? 'acceptable' : study.gageRR <= 30 ? 'marginal' : 'unacceptable'}>
                                {study.gageRR}%
                              </td>
                              <td>{study.ndc}</td>
                              <td><span className={`status-pill ${study.status}`}>{study.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="msa-legend">
                        <span className="legend-item acceptable">≤10% Acceptable</span>
                        <span className="legend-item marginal">10-30% Marginal</span>
                        <span className="legend-item unacceptable">&gt;30% Unacceptable</span>
                      </div>
                    </div>
                  )}

                  {/* SPC Tab */}
                  {activeTab === 'spc' && (
                    <div className="ppa-section">
                      <div className="section-header">
                        <div>
                          <h3>Statistical Process Control</h3>
                          <p>Process capability analysis</p>
                        </div>
                      </div>
                      
                      <table className="ppa-table">
                        <thead>
                          <tr>
                            <th>Characteristic</th>
                            <th>Cpk</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAudit.spc?.charts?.map((chart) => (
                            <tr key={chart.id}>
                              <td>{chart.characteristic}</td>
                              <td className={chart.cpk >= 1.33 ? 'capable' : chart.cpk >= 1.0 ? 'marginal-cpk' : 'not-capable'}>
                                {chart.cpk}
                              </td>
                              <td><span className={`status-pill ${chart.status}`}>{chart.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="spc-legend">
                        <span className="legend-item capable">Cpk ≥ 1.33 Capable</span>
                        <span className="legend-item marginal-cpk">1.0 ≤ Cpk &lt; 1.33 Marginal</span>
                        <span className="legend-item not-capable">Cpk &lt; 1.0 Not Capable</span>
                      </div>
                    </div>
                  )}

                  {/* Findings Tab */}
                  {activeTab === 'findings' && (
                    <div className="ppa-section">
                      <div className="section-header">
                        <div>
                          <h3>All Findings</h3>
                          <p>{selectedAudit.findings?.length || 0} total findings</p>
                        </div>
                        <button type="button" className="add-finding-btn" onClick={() => setShowFindingModal(true)}>+ Add Finding</button>
                      </div>
                      
                      <div className="findings-list">
                        {selectedAudit.findings?.map((finding) => (
                          <div key={finding.id} className="finding-card" style={{ borderLeftColor: getSeverityColor(finding.severity) }}>
                            <div className="finding-header">
                              <span className={`severity-badge ${finding.severity}`}>{finding.severity}</span>
                              <span className="finding-category">{finding.category}</span>
                              <select
                                className="status-select"
                                value={finding.status}
                                onChange={(e) => handleUpdateFindingStatus(finding.id, e.target.value)}
                              >
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="closed">Closed</option>
                              </select>
                            </div>
                            <p className="finding-description">{finding.description}</p>
                            <div className="finding-details">
                              <div><strong>Responsible:</strong> {finding.responsible}</div>
                              <div><strong>Due Date:</strong> {finding.dueDate}</div>
                            </div>
                            <div className="finding-improvement">
                              <strong>Improvement Suggestion:</strong>
                              <p>{finding.improvement}</p>
                            </div>
                            {finding.linkedItems?.length > 0 && (
                              <div className="finding-links">
                                <strong>Linked to:</strong>
                                {finding.linkedItems.map((link, i) => (
                                  <span key={i} className="link-tag">{link}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="no-audit-selected">
                <p>Select an audit from the list or create a new one</p>
                <button type="button" className="ppa-add-btn" onClick={() => setShowNewAuditModal(true)}>+ New Audit</button>
              </div>
            )}
          </div>
        </div>

        {/* New Audit Modal */}
        {showNewAuditModal && (
          <div className="ppa-modal-overlay" onClick={() => setShowNewAuditModal(false)}>
            <div className="ppa-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ppa-modal-header">
                <h3>New Product/Process Audit</h3>
                <button type="button" className="ppa-modal-close" onClick={() => setShowNewAuditModal(false)}>×</button>
              </div>
              <form onSubmit={handleCreateAudit} className="ppa-modal-form">
                <div className="form-group">
                  <label>Product Name</label>
                  <input
                    type="text"
                    value={newAuditForm.productName}
                    onChange={(e) => setNewAuditForm({ ...newAuditForm, productName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Process Name</label>
                  <input
                    type="text"
                    value={newAuditForm.processName}
                    onChange={(e) => setNewAuditForm({ ...newAuditForm, processName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Auditor</label>
                  <input
                    type="text"
                    value={newAuditForm.auditor}
                    onChange={(e) => setNewAuditForm({ ...newAuditForm, auditor: e.target.value })}
                    required
                  />
                </div>
                <div className="ppa-modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowNewAuditModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit">Create Audit</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Finding Modal */}
        {showFindingModal && (
          <div className="ppa-modal-overlay" onClick={() => setShowFindingModal(false)}>
            <div className="ppa-modal wide" onClick={(e) => e.stopPropagation()}>
              <div className="ppa-modal-header">
                <h3>Add Finding</h3>
                <button type="button" className="ppa-modal-close" onClick={() => setShowFindingModal(false)}>×</button>
              </div>
              <form onSubmit={handleAddFinding} className="ppa-modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select value={findingForm.category} onChange={(e) => setFindingForm({ ...findingForm, category: e.target.value })}>
                      <option value="Control Plan">Control Plan</option>
                      <option value="PFMEA">PFMEA</option>
                      <option value="Workflow">Workflow</option>
                      <option value="MSA">MSA</option>
                      <option value="SPC">SPC</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Severity</label>
                    <select value={findingForm.severity} onChange={(e) => setFindingForm({ ...findingForm, severity: e.target.value })}>
                      <option value="minor">Minor</option>
                      <option value="major">Major</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    value={findingForm.description}
                    onChange={(e) => setFindingForm({ ...findingForm, description: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Responsible Person</label>
                    <input
                      type="text"
                      value={findingForm.responsible}
                      onChange={(e) => setFindingForm({ ...findingForm, responsible: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={findingForm.dueDate}
                      onChange={(e) => setFindingForm({ ...findingForm, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Improvement Suggestion</label>
                  <textarea
                    rows={3}
                    value={findingForm.improvement}
                    onChange={(e) => setFindingForm({ ...findingForm, improvement: e.target.value })}
                    placeholder="Describe the recommended corrective action or improvement..."
                  />
                </div>
                <div className="ppa-modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowFindingModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit">Add Finding</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ProductionProcessAudit
