import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './ProductionCertifications.css'

const ProductionCertifications = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialType = searchParams.get('type') || 'iso9001'
  
  const {
    iso9001,
    iatf16949,
    certificationHistory,
    addCertificationDocument,
    removeCertificationDocument,
  } = useProductionStore()

  const [activeTab, setActiveTab] = useState(initialType)
  const [selectedHistory, setSelectedHistory] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'audit_report',
    format: 'pdf',
  })

  const certifications = {
    iso9001: {
      name: 'ISO 9001:2015',
      fullName: 'Quality Management System',
      color: '#27ae60',
      data: iso9001,
      history: certificationHistory.iso9001,
    },
    iatf16949: {
      name: 'IATF 16949:2016',
      fullName: 'Automotive Quality Management System',
      color: '#e74c3c',
      data: iatf16949,
      history: certificationHistory.iatf16949,
    },
  }

  const currentCert = certifications[activeTab]

  const getAuditTypeLabel = (type) => {
    switch (type) {
      case 'initial_certification': return 'Initial Certification'
      case 'surveillance_audit': return 'Surveillance Audit'
      case 'recertification': return 'Recertification'
      case 'special_audit': return 'Special Audit'
      default: return type
    }
  }

  const getDocTypeLabel = (type) => {
    switch (type) {
      case 'certificate': return 'Certificate'
      case 'audit_report': return 'Audit Report'
      case 'action_plan': return 'Action Plan'
      case 'evidence': return 'Evidence Package'
      case 'assessment': return 'Assessment'
      case 'meeting_minutes': return 'Meeting Minutes'
      case 'report': return 'Report'
      default: return type
    }
  }

  const getDocIcon = (format) => {
    switch (format) {
      case 'pdf':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#e74c3c" strokeWidth="2" fill="rgba(231,76,60,0.1)" />
            <path d="M14 2v6h6M9 15h6M9 11h6" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )
      case 'xlsx':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#27ae60" strokeWidth="2" fill="rgba(39,174,96,0.1)" />
            <path d="M14 2v6h6M9 13l3 3 3-3M9 17l3-3 3 3" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )
      case 'zip':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#9b59b6" strokeWidth="2" fill="rgba(155,89,182,0.1)" />
            <path d="M14 2v6h6M10 10h1M10 12h1M10 14h1M10 16h1" stroke="#9b59b6" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#3498db" strokeWidth="2" fill="rgba(52,152,219,0.1)" />
            <path d="M14 2v6h6" stroke="#3498db" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )
    }
  }

  const handleUpload = (e) => {
    e.preventDefault()
    if (selectedHistory) {
      addCertificationDocument(activeTab, selectedHistory.id, {
        name: uploadForm.name,
        type: uploadForm.type,
        format: uploadForm.format,
        uploadDate: new Date().toISOString().split('T')[0],
        size: '---',
      })
      setShowUploadModal(false)
      setUploadForm({ name: '', type: 'audit_report', format: 'pdf' })
    }
  }

  const handleDeleteDocument = (docId) => {
    if (selectedHistory && window.confirm('Are you sure you want to delete this document?')) {
      removeCertificationDocument(activeTab, selectedHistory.id, docId)
    }
  }

  return (
    <AppLayout>
      <div className="cert-page">
        <div className="cert-header">
          <button type="button" className="cert-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="cert-title">Certification History & Documents</h1>
          <p className="cert-subtitle">View audit history and manage certification documents</p>
        </div>

        {/* Certification Tabs */}
        <div className="cert-tabs">
          {Object.entries(certifications).map(([key, cert]) => (
            <button
              key={key}
              type="button"
              className={`cert-tab ${activeTab === key ? 'active' : ''}`}
              style={{ '--tab-color': cert.color }}
              onClick={() => { setActiveTab(key); setSelectedHistory(null) }}
            >
              <span className="tab-badge" style={{ background: cert.color }}>{cert.name}</span>
              <span className="tab-label">{cert.fullName}</span>
            </button>
          ))}
        </div>

        {/* Current Certification Info */}
        <div className="cert-overview">
          <div className="cert-overview-card" style={{ borderLeftColor: currentCert.color }}>
            <div className="overview-header">
              <h2>{currentCert.name}</h2>
              <span className="cert-badge active">Certified</span>
            </div>
            <div className="overview-grid">
              <div className="overview-item">
                <span className="item-label">Certifying Body</span>
                <span className="item-value">{currentCert.data.certifyingBody}</span>
              </div>
              <div className="overview-item">
                <span className="item-label">Certification Date</span>
                <span className="item-value">{currentCert.data.certificationDate}</span>
              </div>
              <div className="overview-item">
                <span className="item-label">Expiry Date</span>
                <span className="item-value">{currentCert.data.expiryDate}</span>
              </div>
              <div className="overview-item">
                <span className="item-label">Last Audit</span>
                <span className="item-value">{currentCert.data.lastAuditDate}</span>
              </div>
              <div className="overview-item">
                <span className="item-label">Next Audit</span>
                <span className="item-value">{currentCert.data.nextAuditDate}</span>
              </div>
              <div className="overview-item">
                <span className="item-label">Total Audits</span>
                <span className="item-value">{currentCert.history.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="cert-content">
          {/* History Timeline */}
          <div className="cert-history-section">
            <h3 className="section-title">Audit History</h3>
            <div className="history-timeline">
              {currentCert.history.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`history-entry ${selectedHistory?.id === entry.id ? 'selected' : ''}`}
                  onClick={() => setSelectedHistory(entry)}
                >
                  <div className="entry-marker" style={{ background: currentCert.color }}>
                    {idx + 1}
                  </div>
                  <div className="entry-content">
                    <div className="entry-header">
                      <span className="entry-type">{getAuditTypeLabel(entry.type)}</span>
                      <span className="entry-date">{entry.date}</span>
                    </div>
                    <div className="entry-meta">
                      <span>Auditor: {entry.auditor}</span>
                      <span className={`entry-result ${entry.result}`}>{entry.result}</span>
                    </div>
                    <div className="entry-stats">
                      <span className="entry-score" style={{ color: entry.score >= 85 ? '#27ae60' : entry.score >= 70 ? '#f1c40f' : '#e74c3c' }}>
                        Score: {entry.score}%
                      </span>
                      <span className="entry-findings">{entry.findings} findings</span>
                      <span className="entry-docs">{entry.documents.length} docs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Panel */}
          <div className="cert-documents-section">
            {selectedHistory ? (
              <>
                <div className="docs-header">
                  <div>
                    <h3 className="section-title">Documents</h3>
                    <p className="docs-subtitle">{getAuditTypeLabel(selectedHistory.type)} - {selectedHistory.date}</p>
                  </div>
                  <button type="button" className="upload-btn" onClick={() => setShowUploadModal(true)}>
                    + Upload Document
                  </button>
                </div>

                {/* Audit Notes */}
                <div className="audit-notes">
                  <h4>Audit Notes</h4>
                  <p>{selectedHistory.notes}</p>
                </div>

                {/* Documents List */}
                <div className="documents-list">
                  {selectedHistory.documents.map((doc) => (
                    <div key={doc.id} className="document-item">
                      <div className="doc-icon">
                        {getDocIcon(doc.format)}
                      </div>
                      <div className="doc-info">
                        <div className="doc-name">{doc.name}</div>
                        <div className="doc-meta">
                          <span className="doc-type">{getDocTypeLabel(doc.type)}</span>
                          <span className="doc-format">.{doc.format}</span>
                          <span className="doc-size">{doc.size}</span>
                        </div>
                      </div>
                      <div className="doc-date">{doc.uploadDate}</div>
                      <div className="doc-actions">
                        <button type="button" className="doc-action download" title="Download">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button type="button" className="doc-action view" title="View">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        </button>
                        <button 
                          type="button" 
                          className="doc-action delete" 
                          title="Delete"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="no-selection">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#ccc" strokeWidth="2" />
                  <path d="M14 2v6h6" stroke="#ccc" strokeWidth="2" />
                </svg>
                <p>Select an audit from the history to view documents</p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="cert-modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="cert-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cert-modal-header">
                <h3>Upload Document</h3>
                <button type="button" className="cert-modal-close" onClick={() => setShowUploadModal(false)}>×</button>
              </div>
              <form onSubmit={handleUpload} className="cert-modal-form">
                <div className="form-group">
                  <label>Document Name</label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                    placeholder="e.g., Audit Report 2026"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Document Type</label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                  >
                    <option value="certificate">Certificate</option>
                    <option value="audit_report">Audit Report</option>
                    <option value="action_plan">Action Plan</option>
                    <option value="evidence">Evidence Package</option>
                    <option value="assessment">Assessment</option>
                    <option value="meeting_minutes">Meeting Minutes</option>
                    <option value="report">Report</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>File Format</label>
                  <select
                    value={uploadForm.format}
                    onChange={(e) => setUploadForm({ ...uploadForm, format: e.target.value })}
                  >
                    <option value="pdf">PDF</option>
                    <option value="xlsx">Excel (xlsx)</option>
                    <option value="docx">Word (docx)</option>
                    <option value="zip">ZIP Archive</option>
                    <option value="jpg">Image (jpg)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Select File</label>
                  <div className="file-upload-area">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p>Click or drag file to upload</p>
                    <span>Supported: PDF, XLSX, DOCX, ZIP, JPG</span>
                  </div>
                </div>
                <div className="cert-modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowUploadModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit">Upload Document</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ProductionCertifications
