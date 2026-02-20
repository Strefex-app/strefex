import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import { getCompanyContext } from '../utils/companyGuard'
import './ComplianceDashboard.css'

const ESG_CATEGORIES = [
  {
    id: 'environmental', label: 'Environmental', icon: '🌱', color: '#27ae60',
    checklists: [
      { id: 'env-1', title: 'Carbon Emissions Reporting', desc: 'Scope 1, 2, 3 emissions tracking per GHG Protocol', questions: [
        { id: 'q1', text: 'Company tracks Scope 1 (direct) emissions', status: 'completed' },
        { id: 'q2', text: 'Company tracks Scope 2 (energy) emissions', status: 'completed' },
        { id: 'q3', text: 'Company tracks Scope 3 (supply chain) emissions', status: 'in_progress' },
        { id: 'q4', text: 'Carbon reduction targets are set and published', status: 'pending' },
        { id: 'q5', text: 'Annual carbon footprint report available', status: 'pending' },
      ]},
      { id: 'env-2', title: 'Waste Management', desc: 'Zero waste initiatives and circular economy practices', questions: [
        { id: 'q6', text: 'Waste segregation and recycling program in place', status: 'completed' },
        { id: 'q7', text: 'Hazardous waste disposal complies with regulations', status: 'completed' },
        { id: 'q8', text: 'Waste reduction targets set (year-over-year)', status: 'in_progress' },
        { id: 'q9', text: 'Circular economy practices adopted', status: 'pending' },
      ]},
      { id: 'env-3', title: 'Energy Efficiency', desc: 'Energy consumption monitoring and optimization', questions: [
        { id: 'q10', text: 'Energy consumption monitoring system in place', status: 'completed' },
        { id: 'q11', text: 'Renewable energy sources used (% of total)', status: 'in_progress' },
        { id: 'q12', text: 'ISO 50001 Energy Management certification', status: 'pending' },
        { id: 'q13', text: 'Energy efficiency targets published', status: 'pending' },
      ]},
      { id: 'env-4', title: 'Water Management', desc: 'Water usage, treatment, and conservation', questions: [
        { id: 'q14', text: 'Water consumption monitoring in place', status: 'completed' },
        { id: 'q15', text: 'Wastewater treatment facilities compliant', status: 'completed' },
        { id: 'q16', text: 'Water conservation targets set', status: 'pending' },
      ]},
    ],
  },
  {
    id: 'social', label: 'Social', icon: '👥', color: '#2980b9',
    checklists: [
      { id: 'soc-1', title: 'Labor Rights & Fair Wages', desc: 'Compliance with ILO conventions and fair labor practices', questions: [
        { id: 'q17', text: 'No child labor in supply chain (verified)', status: 'completed' },
        { id: 'q18', text: 'No forced labor or modern slavery', status: 'completed' },
        { id: 'q19', text: 'Fair wages above minimum wage standards', status: 'completed' },
        { id: 'q20', text: 'Working hours comply with local regulations', status: 'completed' },
        { id: 'q21', text: 'Freedom of association guaranteed', status: 'in_progress' },
      ]},
      { id: 'soc-2', title: 'Health & Safety', desc: 'Workplace safety and occupational health standards', questions: [
        { id: 'q22', text: 'ISO 45001 or equivalent OHS certification', status: 'completed' },
        { id: 'q23', text: 'Regular safety training programs', status: 'completed' },
        { id: 'q24', text: 'Incident reporting and investigation system', status: 'completed' },
        { id: 'q25', text: 'Emergency response plans in place', status: 'completed' },
        { id: 'q26', text: 'Mental health support programs', status: 'in_progress' },
      ]},
      { id: 'soc-3', title: 'Diversity & Inclusion', desc: 'DEI policies and practices', questions: [
        { id: 'q27', text: 'DEI policy published and communicated', status: 'completed' },
        { id: 'q28', text: 'Gender diversity targets set', status: 'in_progress' },
        { id: 'q29', text: 'Anti-discrimination training conducted', status: 'completed' },
        { id: 'q30', text: 'Pay equity analysis completed', status: 'pending' },
      ]},
      { id: 'soc-4', title: 'Community Engagement', desc: 'Local community impact and social responsibility', questions: [
        { id: 'q31', text: 'Community impact assessment conducted', status: 'pending' },
        { id: 'q32', text: 'Local hiring and procurement policies', status: 'in_progress' },
        { id: 'q33', text: 'CSR programs and charitable contributions', status: 'completed' },
      ]},
    ],
  },
  {
    id: 'governance', label: 'Governance', icon: '⚖️', color: '#8e44ad',
    checklists: [
      { id: 'gov-1', title: 'Anti-Corruption & Bribery', desc: 'FCPA/UK Bribery Act compliance', questions: [
        { id: 'q34', text: 'Anti-corruption policy in place', status: 'completed' },
        { id: 'q35', text: 'Employee training on anti-bribery', status: 'completed' },
        { id: 'q36', text: 'Third-party due diligence process', status: 'in_progress' },
        { id: 'q37', text: 'Whistleblower mechanism available', status: 'completed' },
      ]},
      { id: 'gov-2', title: 'Data Protection (GDPR)', desc: 'GDPR and data privacy compliance', questions: [
        { id: 'q38', text: 'Data protection officer appointed', status: 'completed' },
        { id: 'q39', text: 'Privacy policy published and up-to-date', status: 'completed' },
        { id: 'q40', text: 'Data processing agreements with vendors', status: 'in_progress' },
        { id: 'q41', text: 'Data breach notification process in place', status: 'completed' },
        { id: 'q42', text: 'Regular data protection impact assessments', status: 'pending' },
      ]},
      { id: 'gov-3', title: 'Supply Chain Due Diligence', desc: 'German Supply Chain Act (LkSG) and EU CSDDD compliance', questions: [
        { id: 'q43', text: 'Supply chain risk analysis completed', status: 'in_progress' },
        { id: 'q44', text: 'Human rights due diligence process', status: 'in_progress' },
        { id: 'q45', text: 'Supplier code of conduct distributed', status: 'completed' },
        { id: 'q46', text: 'Complaint mechanism for affected parties', status: 'pending' },
        { id: 'q47', text: 'Annual supply chain report published', status: 'pending' },
      ]},
      { id: 'gov-4', title: 'Financial Reporting & SOX', desc: 'Sarbanes-Oxley compliance for financial controls', questions: [
        { id: 'q48', text: 'Internal controls over financial reporting', status: 'completed' },
        { id: 'q49', text: 'Independent audit committee established', status: 'completed' },
        { id: 'q50', text: 'Material weakness remediation process', status: 'in_progress' },
      ]},
    ],
  },
]

const REGULATORY_TEMPLATES = [
  { id: 'rt-1', title: 'ISO 9001:2015 — Quality Management', category: 'Quality', status: 'active', lastAudit: '2025-11-15', nextAudit: '2026-05-15' },
  { id: 'rt-2', title: 'ISO 14001:2015 — Environmental Management', category: 'Environmental', status: 'active', lastAudit: '2025-10-01', nextAudit: '2026-04-01' },
  { id: 'rt-3', title: 'ISO 45001:2018 — Occupational Health & Safety', category: 'Safety', status: 'active', lastAudit: '2025-09-20', nextAudit: '2026-03-20' },
  { id: 'rt-4', title: 'IATF 16949:2016 — Automotive Quality', category: 'Quality', status: 'active', lastAudit: '2025-12-01', nextAudit: '2026-06-01' },
  { id: 'rt-5', title: 'GDPR — Data Protection Regulation', category: 'Governance', status: 'active', lastAudit: '2026-01-10', nextAudit: '2026-07-10' },
  { id: 'rt-6', title: 'LkSG — Supply Chain Due Diligence', category: 'Governance', status: 'in_progress', lastAudit: '2025-08-15', nextAudit: '2026-02-15' },
  { id: 'rt-7', title: 'SOX — Financial Controls', category: 'Financial', status: 'active', lastAudit: '2025-12-15', nextAudit: '2026-06-15' },
  { id: 'rt-8', title: 'REACH — Chemical Substances', category: 'Environmental', status: 'pending', lastAudit: '', nextAudit: '2026-03-01' },
  { id: 'rt-9', title: 'RoHS — Restriction of Hazardous Substances', category: 'Environmental', status: 'active', lastAudit: '2025-11-01', nextAudit: '2026-05-01' },
]

export default function ComplianceDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [expandedChecklist, setExpandedChecklist] = useState(null)
  const [checklistStates, setChecklistStates] = useState({})

  const toggleQuestion = (qId) => {
    setChecklistStates((prev) => {
      const current = prev[qId] || 'pending'
      const next = current === 'pending' ? 'in_progress' : current === 'in_progress' ? 'completed' : 'pending'
      return { ...prev, [qId]: next }
    })
  }

  const getQStatus = (q) => checklistStates[q.id] || q.status

  const esgStats = useMemo(() => {
    const allQ = ESG_CATEGORIES.flatMap((c) => c.checklists.flatMap((cl) => cl.questions))
    const completed = allQ.filter((q) => getQStatus(q) === 'completed').length
    const inProgress = allQ.filter((q) => getQStatus(q) === 'in_progress').length
    const pending = allQ.filter((q) => getQStatus(q) === 'pending').length
    return { total: allQ.length, completed, inProgress, pending, pct: Math.round((completed / allQ.length) * 100) }
  }, [checklistStates])

  return (
    <AppLayout>
      <div className="comp-page">
        <div className="comp-header">
          <div>
            <button className="comp-back" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="comp-title">Compliance & ESG Dashboard</h1>
            <p className="comp-subtitle">ESG checklists, regulatory templates & compliance tracking</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="comp-kpis">
          <div className="comp-kpi"><span className="comp-kpi-n">{esgStats.pct}%</span>ESG Score</div>
          <div className="comp-kpi"><span className="comp-kpi-n" style={{ color: '#27ae60' }}>{esgStats.completed}</span>Completed</div>
          <div className="comp-kpi"><span className="comp-kpi-n" style={{ color: '#e67e22' }}>{esgStats.inProgress}</span>In Progress</div>
          <div className="comp-kpi"><span className="comp-kpi-n" style={{ color: '#e74c3c' }}>{esgStats.pending}</span>Pending</div>
          <div className="comp-kpi"><span className="comp-kpi-n">{esgStats.total}</span>Total Checks</div>
          <div className="comp-kpi"><span className="comp-kpi-n">{REGULATORY_TEMPLATES.length}</span>Reg. Standards</div>
        </div>

        {/* Progress bar */}
        <div className="comp-progress-bar">
          <div className="comp-progress-fill" style={{ width: `${esgStats.pct}%` }} />
          <span className="comp-progress-label">{esgStats.pct}% Overall ESG Compliance</span>
        </div>

        {/* Tabs */}
        <div className="comp-tabs">
          {[{ id: 'overview', label: 'Overview' }, { id: 'environmental', label: '🌱 Environmental' }, { id: 'social', label: '👥 Social' }, { id: 'governance', label: '⚖️ Governance' }, { id: 'regulatory', label: 'Regulatory Standards' }].map((t) => (
            <button key={t.id} className={`comp-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="comp-overview-grid">
            {ESG_CATEGORIES.map((cat) => {
              const allQ = cat.checklists.flatMap((cl) => cl.questions)
              const done = allQ.filter((q) => getQStatus(q) === 'completed').length
              const pct = Math.round((done / allQ.length) * 100)
              return (
                <div key={cat.id} className="comp-card comp-cat-card" style={{ borderTopColor: cat.color }}>
                  <div className="comp-cat-icon" style={{ color: cat.color }}>{cat.icon}</div>
                  <h4>{cat.label}</h4>
                  <div className="comp-cat-pct">{pct}%</div>
                  <div className="comp-mini-progress"><div className="comp-mini-fill" style={{ width: `${pct}%`, background: cat.color }} /></div>
                  <span className="comp-cat-count">{done}/{allQ.length} checks completed</span>
                  <button className="comp-btn" onClick={() => setTab(cat.id)}>View Details</button>
                </div>
              )
            })}
          </div>
        )}

        {/* ESG Category Detail */}
        {ESG_CATEGORIES.map((cat) => tab === cat.id && (
          <div key={cat.id} className="comp-checklists">
            {cat.checklists.map((cl) => {
              const done = cl.questions.filter((q) => getQStatus(q) === 'completed').length
              const pct = Math.round((done / cl.questions.length) * 100)
              const isExpanded = expandedChecklist === cl.id
              return (
                <div key={cl.id} className="comp-card comp-checklist-card">
                  <div className="comp-cl-header" onClick={() => setExpandedChecklist(isExpanded ? null : cl.id)}>
                    <div>
                      <h4>{cl.title}</h4>
                      <p className="comp-cl-desc">{cl.desc}</p>
                    </div>
                    <div className="comp-cl-stats">
                      <span className="comp-cl-pct" style={{ color: cat.color }}>{pct}%</span>
                      <span className="comp-cl-count">{done}/{cl.questions.length}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="comp-questions">
                      {cl.questions.map((q) => {
                        const st = getQStatus(q)
                        return (
                          <div key={q.id} className={`comp-q-row ${st}`} onClick={() => toggleQuestion(q.id)}>
                            <span className={`comp-q-check ${st}`}>{st === 'completed' ? '✓' : st === 'in_progress' ? '◐' : '○'}</span>
                            <span className="comp-q-text">{q.text}</span>
                            <span className={`comp-q-status ${st}`}>{st === 'completed' ? 'Done' : st === 'in_progress' ? 'In Progress' : 'Pending'}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Regulatory Standards */}
        {tab === 'regulatory' && (
          <div className="comp-card">
            <h4>Regulatory & Certification Standards</h4>
            <div className="comp-reg-table-wrap">
              <table className="comp-reg-table">
                <thead><tr><th>Standard</th><th>Category</th><th>Status</th><th>Last Audit</th><th>Next Audit</th></tr></thead>
                <tbody>
                  {REGULATORY_TEMPLATES.map((r) => (
                    <tr key={r.id}>
                      <td className="comp-reg-title">{r.title}</td>
                      <td>{r.category}</td>
                      <td><span className={`comp-reg-status ${r.status}`}>{r.status === 'active' ? 'Active' : r.status === 'in_progress' ? 'In Progress' : 'Pending'}</span></td>
                      <td>{r.lastAudit || '—'}</td>
                      <td>{r.nextAudit}</td>
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
