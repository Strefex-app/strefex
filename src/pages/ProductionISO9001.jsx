import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './ProductionStandard.css'

const ProductionISO9001 = () => {
  const navigate = useNavigate()
  const { iso9001 } = useProductionStore()
  const [activeTab, setActiveTab] = useState('overview')

  const overallScore = iso9001.clauses.reduce((s, c) => s + c.score, 0) / iso9001.clauses.length

  const getStatusColor = (status) => {
    switch (status) {
      case 'compliant': return 'green'
      case 'minor_nc': return 'orange'
      case 'major_nc': return 'red'
      default: return 'gray'
    }
  }

  return (
    <AppLayout>
      <div className="std-page">
        <div className="std-header">
          <button type="button" className="std-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="std-header-content">
            <div className="std-header-info">
              <div className="std-badge iso">ISO 9001:2015</div>
              <h1 className="std-title">Quality Management System</h1>
              <p className="std-subtitle">Certification status and compliance monitoring</p>
            </div>
            <div className="std-cert-status">
              <div className={`cert-indicator ${iso9001.status}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>Certified</span>
              </div>
              <div className="cert-details">
                <div>Certifying Body: <strong>{iso9001.certifyingBody}</strong></div>
                <div>Expires: <strong>{iso9001.expiryDate}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="std-tabs">
          <button
            type="button"
            className={`std-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`std-tab ${activeTab === 'clauses' ? 'active' : ''}`}
            onClick={() => setActiveTab('clauses')}
          >
            Clause Compliance
          </button>
          <button
            type="button"
            className={`std-tab ${activeTab === 'nc' ? 'active' : ''}`}
            onClick={() => setActiveTab('nc')}
          >
            Non-Conformities
          </button>
          <button
            type="button"
            className={`std-tab ${activeTab === 'audits' ? 'active' : ''}`}
            onClick={() => setActiveTab('audits')}
          >
            Audit Schedule
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="std-content">
            <div className="std-grid">
              <div className="std-card score-card">
                <div className="score-circle">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" strokeWidth="8"/>
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#27ae60"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(overallScore / 100) * 283} 283`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="score-value">{overallScore.toFixed(0)}%</div>
                </div>
                <div className="score-label">Overall Compliance Score</div>
              </div>

              <div className="std-card info-card">
                <h3>Certification Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Certification Date</span>
                    <span className="info-value">{iso9001.certificationDate}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Expiry Date</span>
                    <span className="info-value">{iso9001.expiryDate}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Audit</span>
                    <span className="info-value">{iso9001.lastAuditDate}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Next Audit</span>
                    <span className="info-value highlight">{iso9001.nextAuditDate}</span>
                  </div>
                </div>
              </div>

              <div className="std-card">
                <h3>Key Requirements</h3>
                <ul className="req-list">
                  <li><span className="check">✓</span> Quality Policy documented</li>
                  <li><span className="check">✓</span> Quality objectives established</li>
                  <li><span className="check">✓</span> Document control procedures</li>
                  <li><span className="check">✓</span> Internal audit program</li>
                  <li><span className="check">✓</span> Management review conducted</li>
                  <li><span className="check">✓</span> Continuous improvement process</li>
                </ul>
              </div>
            </div>

            <div className="std-card clause-overview">
              <h3>Clause Compliance Summary</h3>
              <div className="clause-bars">
                {iso9001.clauses.map((c) => (
                  <div key={c.id} className="clause-bar-item">
                    <div className="clause-bar-header">
                      <span className="clause-name">{c.clause}</span>
                      <span className={`clause-score ${getStatusColor(c.status)}`}>{c.score}%</span>
                    </div>
                    <div className="clause-bar-track">
                      <div
                        className={`clause-bar-fill ${getStatusColor(c.status)}`}
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Clauses Tab */}
        {activeTab === 'clauses' && (
          <div className="std-content">
            <div className="std-card">
              <h3>ISO 9001:2015 Clause Compliance</h3>
              <table className="std-table">
                <thead>
                  <tr>
                    <th>Clause</th>
                    <th>Description</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {iso9001.clauses.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id.replace('iso-', '')}</td>
                      <td>{c.clause.split(' - ')[1] || c.clause}</td>
                      <td>
                        <div className="mini-progress">
                          <div className={`mini-fill ${getStatusColor(c.status)}`} style={{ width: `${c.score}%` }} />
                          <span>{c.score}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${getStatusColor(c.status)}`}>
                          {c.status === 'compliant' ? 'Compliant' : c.status === 'minor_nc' ? 'Minor NC' : 'Major NC'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="std-btn-sm">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Non-Conformities Tab */}
        {activeTab === 'nc' && (
          <div className="std-content">
            <div className="std-summary-row">
              <div className="std-summary-card">
                <div className="std-sum-value">{iso9001.nonConformities.length}</div>
                <div className="std-sum-label">Total NCs</div>
              </div>
              <div className="std-summary-card">
                <div className="std-sum-value green">{iso9001.nonConformities.filter(n => n.status === 'closed').length}</div>
                <div className="std-sum-label">Closed</div>
              </div>
              <div className="std-summary-card">
                <div className="std-sum-value orange">{iso9001.nonConformities.filter(n => n.status === 'open').length}</div>
                <div className="std-sum-label">Open</div>
              </div>
            </div>

            <div className="std-card">
              <h3>Non-Conformity Register</h3>
              <table className="std-table">
                <thead>
                  <tr>
                    <th>NC ID</th>
                    <th>Clause</th>
                    <th>Description</th>
                    <th>Severity</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {iso9001.nonConformities.map((nc) => (
                    <tr key={nc.id}>
                      <td>{nc.id.toUpperCase()}</td>
                      <td>{nc.clause}</td>
                      <td>{nc.description}</td>
                      <td>
                        <span className={`severity-badge ${nc.severity}`}>{nc.severity}</span>
                      </td>
                      <td>{nc.dueDate}</td>
                      <td>
                        <span className={`status-pill ${nc.status === 'closed' ? 'green' : 'orange'}`}>
                          {nc.status === 'closed' ? 'Closed' : 'Open'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audits Tab */}
        {activeTab === 'audits' && (
          <div className="std-content">
            <div className="std-card">
              <h3>Audit Schedule</h3>
              <div className="audit-timeline">
                <div className="timeline-item completed">
                  <div className="timeline-marker" />
                  <div className="timeline-content">
                    <div className="timeline-date">{iso9001.certificationDate}</div>
                    <div className="timeline-title">Initial Certification</div>
                    <div className="timeline-desc">Full certification audit by {iso9001.certifyingBody}</div>
                  </div>
                </div>
                <div className="timeline-item completed">
                  <div className="timeline-marker" />
                  <div className="timeline-content">
                    <div className="timeline-date">{iso9001.lastAuditDate}</div>
                    <div className="timeline-title">Surveillance Audit</div>
                    <div className="timeline-desc">Annual surveillance audit completed</div>
                  </div>
                </div>
                <div className="timeline-item upcoming">
                  <div className="timeline-marker" />
                  <div className="timeline-content">
                    <div className="timeline-date">{iso9001.nextAuditDate}</div>
                    <div className="timeline-title">Next Surveillance Audit</div>
                    <div className="timeline-desc">Scheduled surveillance audit</div>
                  </div>
                </div>
                <div className="timeline-item future">
                  <div className="timeline-marker" />
                  <div className="timeline-content">
                    <div className="timeline-date">{iso9001.expiryDate}</div>
                    <div className="timeline-title">Recertification</div>
                    <div className="timeline-desc">Full recertification audit required</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ProductionISO9001
