import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import useIatfControlStore from '../store/iatfControlStore'
import useQualityExcellenceStore from '../store/qualityExcellenceStore'
import { coreToolsMaturity, liveStandardStatus } from '../utils/iatfControlCompute'
import './ProductionStandard.css'

const ProductionIATF16949 = () => {
  const navigate = useNavigate()
  const { iatf16949 } = useProductionStore()
  const certificates = useIatfControlStore((s) => s.certificates)
  const parts = useIatfControlStore((s) => s.parts)
  const qeRecords = useQualityExcellenceStore((s) => s.records)
  const liveIatf = useMemo(() => liveStandardStatus(certificates, 'iatf_16949'), [certificates])
  const liveTools = useMemo(() => coreToolsMaturity(qeRecords, parts), [qeRecords, parts])
  const avgMaturity = liveTools.length
    ? liveTools.reduce((s, t) => s + t.maturity, 0) / liveTools.length
    : 0
  const certClass = liveIatf.status === 'valid' ? 'certified' : 'pending'
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <AppLayout>
      <div className="std-page">
        <div className="std-header">
          <button type="button" className="std-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="std-header-content">
            <div className="std-header-info">
              <div className="std-badge iatf">IATF 16949:2016</div>
              <h1 className="std-title">Automotive Quality Management System</h1>
              <p className="std-subtitle">Automotive industry certification and core tools compliance</p>
            </div>
            <div className="std-cert-status">
              <div className={`cert-indicator ${certClass}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>{liveIatf.status === 'valid' ? 'Certificate valid' : liveIatf.label}</span>
              </div>
              <div className="cert-details">
                <div>Certifying Body: <strong>{liveIatf.cert?.certifyingBody || '—'}</strong></div>
                <div>Expires: <strong>{liveIatf.cert?.expiresAt || '—'}</strong></div>
                <button type="button" className="std-back" onClick={() => navigate('/management/ops/iatf-control')}>
                  Open IATF Control
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="std-tabs">
          <button type="button" className={`std-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button type="button" className={`std-tab ${activeTab === 'coretools' ? 'active' : ''}`} onClick={() => setActiveTab('coretools')}>Core Tools</button>
          <button type="button" className={`std-tab ${activeTab === 'csr' ? 'active' : ''}`} onClick={() => setActiveTab('csr')}>Customer Requirements</button>
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="std-content">
            <div className="std-grid">
              <div className="std-card score-card">
                <div className="score-circle">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" strokeWidth="8"/>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e74c3c" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(avgMaturity / 100) * 283} 283`} transform="rotate(-90 50 50)"/>
                  </svg>
                  <div className="score-value">{avgMaturity.toFixed(0)}%</div>
                </div>
                <div className="score-label">Core Tools Maturity</div>
              </div>

              <div className="std-card info-card">
                <h3>Certification Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Certificate number</span>
                    <span className="info-value">{liveIatf.cert?.number || 'Not on file'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Expiry Date</span>
                    <span className="info-value">{liveIatf.cert?.expiresAt || '—'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Audit</span>
                    <span className="info-value">{iatf16949.lastAuditDate}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Next Audit</span>
                    <span className="info-value highlight">{iatf16949.nextAuditDate}</span>
                  </div>
                </div>
              </div>

              <div className="std-card">
                <h3>IATF 16949 vs ISO 9001</h3>
                <ul className="req-list">
                  <li><span className="check">✓</span> All ISO 9001 requirements</li>
                  <li><span className="check">✓</span> Automotive core tools (APQP, PPAP, FMEA, MSA, SPC)</li>
                  <li><span className="check">✓</span> Customer-specific requirements</li>
                  <li><span className="check">✓</span> Product safety emphasis</li>
                  <li><span className="check">✓</span> Warranty management</li>
                  <li><span className="check">✓</span> Supplier development</li>
                </ul>
              </div>
            </div>

            <div className="std-card">
              <h3>Core Tools Overview</h3>
              <div className="tools-grid">
                {liveTools.map((tool) => (
                  <div key={tool.id} className="tool-card">
                    <div className="tool-header">
                      <span className="tool-name">{tool.name}</span>
                      <span className={`tool-status ${tool.maturity >= 80 ? 'green' : 'orange'}`}>
                        {tool.maturity >= 80 ? 'Evidenced' : tool.maturity > 0 ? 'In progress' : 'No records'}
                      </span>
                    </div>
                    <div className="tool-maturity">
                      <div className="maturity-bar">
                        <div className="maturity-fill" style={{ width: `${tool.maturity}%` }} />
                      </div>
                      <span className="maturity-value">{tool.maturity}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Core Tools */}
        {activeTab === 'coretools' && (
          <div className="std-content">
            <div className="std-card">
              <h3>Automotive Core Tools</h3>
              <div className="core-tools-detail">
                <div className="core-tool-item">
                  <div className="ct-header">
                    <div className="ct-icon">APQP</div>
                    <div className="ct-info">
                      <h4>Advanced Product Quality Planning</h4>
                      <p>Framework for developing products that satisfy customers</p>
                    </div>
                    <div className="ct-maturity">
                      <span className="ct-score">85%</span>
                      <span className="ct-label">Maturity</span>
                    </div>
                  </div>
                  <div className="ct-phases">
                    <div className="phase complete"><span>1</span> Plan & Define</div>
                    <div className="phase complete"><span>2</span> Product Design</div>
                    <div className="phase complete"><span>3</span> Process Design</div>
                    <div className="phase active"><span>4</span> Validation</div>
                    <div className="phase"><span>5</span> Feedback</div>
                  </div>
                </div>

                <div className="core-tool-item">
                  <div className="ct-header">
                    <div className="ct-icon">PPAP</div>
                    <div className="ct-info">
                      <h4>Production Part Approval Process</h4>
                      <p>Demonstrates design and production capability</p>
                    </div>
                    <div className="ct-maturity">
                      <span className="ct-score">90%</span>
                      <span className="ct-label">Maturity</span>
                    </div>
                  </div>
                </div>

                <div className="core-tool-item">
                  <div className="ct-header">
                    <div className="ct-icon">FMEA</div>
                    <div className="ct-info">
                      <h4>Failure Mode & Effects Analysis</h4>
                      <p>Systematic approach to identify potential failures</p>
                    </div>
                    <div className="ct-maturity">
                      <span className="ct-score">88%</span>
                      <span className="ct-label">Maturity</span>
                    </div>
                  </div>
                </div>

                <div className="core-tool-item">
                  <div className="ct-header">
                    <div className="ct-icon">MSA</div>
                    <div className="ct-info">
                      <h4>Measurement System Analysis</h4>
                      <p>Evaluates measurement system quality</p>
                    </div>
                    <div className="ct-maturity">
                      <span className="ct-score">82%</span>
                      <span className="ct-label">Maturity</span>
                    </div>
                  </div>
                </div>

                <div className="core-tool-item">
                  <div className="ct-header">
                    <div className="ct-icon">SPC</div>
                    <div className="ct-info">
                      <h4>Statistical Process Control</h4>
                      <p>Method for monitoring and controlling processes</p>
                    </div>
                    <div className="ct-maturity">
                      <span className="ct-score">78%</span>
                      <span className="ct-label">Maturity</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSR Tab */}
        {activeTab === 'csr' && (
          <div className="std-content">
            <div className="std-card">
              <h3>Customer-Specific Requirements (CSR)</h3>
              <table className="std-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Total Requirements</th>
                    <th>Compliant</th>
                    <th>Compliance Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {iatf16949.customerSpecificRequirements.map((csr, i) => (
                    <tr key={i}>
                      <td><strong>{csr.customer}</strong></td>
                      <td>{csr.requirements}</td>
                      <td>{csr.compliant}</td>
                      <td>
                        <div className="mini-progress">
                          <div className={`mini-fill ${csr.status === 'compliant' ? 'green' : 'orange'}`}
                            style={{ width: `${(csr.compliant / csr.requirements) * 100}%` }} />
                          <span>{((csr.compliant / csr.requirements) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${csr.status === 'compliant' ? 'green' : 'orange'}`}>
                          {csr.status === 'compliant' ? 'Compliant' : 'Minor Gap'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ProductionIATF16949
