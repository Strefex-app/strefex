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
      {
        id: 'env-1',
        title: 'Carbon Emissions Reporting',
        desc: 'Starter checklist. Replace with your company-specific ESG control list.',
        questions: [
          { id: 'q1', text: 'Company tracks Scope 1 emissions', status: 'pending' },
          { id: 'q2', text: 'Company tracks Scope 2 emissions', status: 'pending' },
          { id: 'q3', text: 'Annual carbon report is approved', status: 'pending' },
        ],
      },
    ],
  },
]

const REGULATORY_TEMPLATES = [
  {
    id: 'rt-1',
    title: 'ISO 9001:2015 - Quality Management',
    category: 'Quality',
    status: 'pending',
    lastAudit: '',
    nextAudit: '',
  },
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
          {[
            { id: 'overview', label: 'Overview' },
            ...ESG_CATEGORIES.map((c) => ({ id: c.id, label: `${c.icon} ${c.label}` })),
            { id: 'regulatory', label: 'Regulatory Standards' },
          ].map((t) => (
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
