import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import useAuditStore, { MODULES, SEVERITIES } from '../store/auditStore'
import { getCompanyContext } from '../utils/companyGuard'
import './AuditLogs.css'

const SEV_META = {
  info:     { label: 'Info',     color: '#2980b9', bg: 'rgba(41,128,185,.08)' },
  warning:  { label: 'Warning',  color: '#e67e22', bg: 'rgba(230,126,34,.08)' },
  critical: { label: 'Critical', color: '#e74c3c', bg: 'rgba(231,76,60,.08)' },
}

const fmtDate = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function AuditLogs() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const { companyName, isSuperAdmin } = getCompanyContext()
  const logs = useAuditStore((s) => s.logs)
  const storeStats = useAuditStore((s) => s.stats)
  const searchFn = useAuditStore((s) => s.search)

  const [moduleFilter, setModuleFilter] = useState('all')
  const [sevFilter, setSevFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  const stats = useMemo(() => storeStats(), [logs])

  const filtered = useMemo(() => {
    let r = search ? searchFn(search) : logs
    if (moduleFilter !== 'all') r = r.filter((l) => l.module === moduleFilter)
    if (sevFilter !== 'all') r = r.filter((l) => l.severity === sevFilter)
    return r
  }, [logs, moduleFilter, sevFilter, search])

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <AppLayout>
      <div className="aud-page">
        <div className="aud-header">
          <div>
            <button className="aud-back" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="aud-title">System Audit Logs</h1>
            <p className="aud-subtitle">{isSuperAdmin ? 'Platform-wide' : companyName} activity tracking — who did what, when, and where</p>
            {!isSuperAdmin && <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'rgba(0,8,136,.08)', color: '#000888' }}>Company: {companyName} — data isolated per organization</span>}
          </div>
        </div>

        {/* KPIs */}
        <div className="aud-kpis">
          <div className="aud-kpi"><span className="aud-kpi-n">{stats.total}</span>Total Events</div>
          <div className="aud-kpi"><span className="aud-kpi-n" style={{ color: '#2980b9' }}>{stats.today}</span>Today</div>
          <div className="aud-kpi"><span className="aud-kpi-n" style={{ color: '#e74c3c' }}>{stats.critical}</span>Critical</div>
          <div className="aud-kpi"><span className="aud-kpi-n" style={{ color: '#e67e22' }}>{stats.warnings}</span>Warnings</div>
          <div className="aud-kpi"><span className="aud-kpi-n">{stats.uniqueUsers}</span>Users</div>
          <div className="aud-kpi"><span className="aud-kpi-n">{Object.keys(stats.byModule).filter((k) => stats.byModule[k] > 0).length}</span>Modules</div>
        </div>

        {/* Module breakdown */}
        <div className="aud-module-bar">
          {MODULES.filter((m) => stats.byModule[m] > 0).map((m) => (
            <div key={m} className="aud-mod-chip" onClick={() => setModuleFilter(moduleFilter === m ? 'all' : m)} style={moduleFilter === m ? { background: 'rgba(0,8,136,.08)', borderColor: '#000888', color: '#000888' } : {}}>
              <span className="aud-mod-name">{m}</span>
              <span className="aud-mod-count">{stats.byModule[m]}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="aud-filters">
          <input className="aud-search" placeholder="Search by user, action, entity, description..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
          <div className="aud-filter-group">
            <label>Module:</label>
            <select value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setPage(0) }}>
              <option value="all">All Modules</option>
              {MODULES.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
          <div className="aud-filter-group">
            <label>Severity:</label>
            <div className="aud-sev-btns">
              <button className={`aud-sev-btn ${sevFilter === 'all' ? 'active' : ''}`} onClick={() => { setSevFilter('all'); setPage(0) }}>All</button>
              {SEVERITIES.map((s) => (
                <button key={s} className={`aud-sev-btn ${sevFilter === s ? 'active' : ''}`} style={sevFilter === s ? { color: SEV_META[s].color, background: SEV_META[s].bg } : {}} onClick={() => { setSevFilter(s); setPage(0) }}>
                  {SEV_META[s].label}
                </button>
              ))}
            </div>
          </div>
          <span className="aud-result-count">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Log table */}
        <div className="aud-table-wrap">
          <table className="aud-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Module</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Description</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="aud-empty">No audit log entries found.</td></tr>
              ) : paged.map((l) => {
                const sm = SEV_META[l.severity] || SEV_META.info
                return (
                  <tr key={l.id} className={`aud-row aud-row-${l.severity}`}>
                    <td className="aud-td-time">{fmtDate(l.timestamp)}</td>
                    <td className="aud-td-user">{l.user}</td>
                    <td className="aud-td-role">{l.role}</td>
                    <td><span className="aud-td-module">{l.module}</span></td>
                    <td className="aud-td-action">{l.action.replace(/_/g, ' ')}</td>
                    <td className="aud-td-entity">{l.entity}</td>
                    <td className="aud-td-desc">{l.description}</td>
                    <td><span className="aud-td-sev" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="aud-pagination">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>← Previous</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
