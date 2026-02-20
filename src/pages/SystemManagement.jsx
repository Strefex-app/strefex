import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import './SystemManagement.css'

/* ── System pages catalogue ─────────────────────────────────── */
const SYSTEM_PAGES = [
  { id: 'ases-ses', label: 'ASES / SES', description: 'Alliance Supplier Evaluation Standard — supplier self-assessment & evaluation', path: '/production/system/ases-ses', icon: 'ases', color: '#0b5394' },
  { id: 'stf', label: 'STF (Supplier Technical File)', description: 'Supplier Technical File — deliverables, PPAP, traceability & validation', path: '/production/system/stf', icon: 'stf', color: '#134f5c' },
  { id: 'monozukuri', label: 'Monozukuri', description: 'Manufacturing excellence philosophy — process, people, product mastery', path: '/production/system/monozukuri', icon: 'mono', color: '#7f6000' },
  { id: 'kaizen', label: 'Kaizen', description: 'Continuous improvement — PDCA, Gemba walks, suggestion systems', path: '/production/system/kaizen', icon: 'kaizen', color: '#cc0000' },
  { id: 'rule-2-24', label: 'Rule 2-24', description: '2-hour containment, 24-hour root cause — rapid quality response', path: '/production/system/rule-2-24', icon: 'rule', color: '#e65100' },
  { id: 'four-boxes', label: '4 Boxes (QRQC)', description: 'Quick Response Quality Control — Problem, Cause, Escape, Learning', path: '/production/system/four-boxes', icon: 'boxes', color: '#6a329f' },
  { id: 'qms', label: 'Quality Management System', description: 'QMS framework — policy, objectives, documentation, management review', path: '/production/system/qms', icon: 'qms', color: '#1e8449' },
  { id: 'apqp', label: 'APQP / PPAP', description: 'Advanced Product Quality Planning & Production Part Approval Process', path: '/production/system/apqp', icon: 'apqp', color: '#1a5276' },
  { id: 'fmea', label: 'FMEA', description: 'Failure Mode & Effects Analysis — risk identification and mitigation', path: '/production/system/fmea', icon: 'fmea', color: '#922b21' },
  { id: 'spc', label: 'SPC / MSA', description: 'Statistical Process Control & Measurement Systems Analysis', path: '/production/system/spc', icon: 'spc', color: '#7d3c98' },
  { id: '8d', label: '8D Problem Solving', description: '8 Disciplines — team-based structured problem solving methodology', path: '/production/system/8d', icon: 'eightd', color: '#0e6655' },
  { id: 'lean', label: 'Lean Manufacturing', description: 'Waste elimination — Value Stream Mapping, Pull systems, JIT, Kanban', path: '/production/system/lean', icon: 'lean', color: '#2c3e50' },
  { id: 'tpm', label: 'TPM', description: 'Total Productive Maintenance — autonomous, planned, focused improvement', path: '/production/system/tpm', icon: 'tpm', color: '#d4ac0d' },
  { id: 'poka-yoke', label: 'Poka-Yoke / Error Proofing', description: 'Mistake-proofing devices and system-level error prevention', path: '/production/system/poka-yoke', icon: 'poka', color: '#2874a6' },
]

const SystemManagement = () => {
  const navigate = useNavigate()

  return (
    <AppLayout>
      <div className="sysmgmt-page">
        <div className="sysmgmt-header">
          <button type="button" className="sysmgmt-back stx-click-feedback" onClick={() => navigate(-1)}><Icon name="arrow-left" size={16} /> Back</button>
          <h1 className="sysmgmt-title">System Management</h1>
          <p className="sysmgmt-subtitle">Manufacturing system standards, quality methodologies and continuous improvement frameworks</p>
        </div>

        <div className="sysmgmt-grid">
          {SYSTEM_PAGES.map((page) => (
            <div
              key={page.id}
              className="sysmgmt-card stx-click-feedback"
              onClick={() => navigate(page.path)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(page.path)}
            >
              <div className="sysmgmt-card-icon" style={{ background: `${page.color}15`, color: page.color }}>
                <Icon name={page.icon} size={22} />
              </div>
              <div className="sysmgmt-card-body">
                <h3 className="sysmgmt-card-name">{page.label}</h3>
                <p className="sysmgmt-card-desc">{page.description}</p>
              </div>
              <span className="sysmgmt-card-arrow"><Icon name="chevron-right" size={16} /></span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}

export default SystemManagement
