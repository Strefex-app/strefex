import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import useRfqStore from '../store/rfqStore'
import { useAuthStore } from '../store/authStore'
import AppLayout from '../components/AppLayout'
import industrialIntelligenceService from '../services/industrialIntelligenceService'
import { useTranslation } from '../i18n/useTranslation'
import './BuyerDashboard.css'

/* ── Status badge helper ──────────────────────────────────── */
function StatusBadge({ status, t }) {
  const label = t(`buyerDashboard.status.${status}`, status)
  const colors = {
    draft: { color: '#888', bg: 'rgba(136,136,136,.08)' },
    sent: { color: '#00d4ff', bg: 'rgba(0, 212, 255,.08)' },
    active: { color: '#e65100', bg: 'rgba(230,81,0,.08)' },
    completed: { color: '#2e7d32', bg: 'rgba(46,125,50,.08)' },
  }
  const s = colors[status] || colors.draft
  return (
    <span className="bd-badge" style={{ color: s.color, background: s.bg }}>
      {label}
    </span>
  )
}

export default function BuyerDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const allProjects = useProjectStore((s) => s.projects)
  const getProjectStats = useProjectStore((s) => s.getProjectStats)

  const allRfqs = useRfqStore((s) => s.getSafeRfqs())

  const isSuperAdmin = role === 'superadmin'
  const userEmail = user?.email?.toLowerCase()

  /* ── Data isolation: filter by user, superadmin sees all ── */
  const projects = isSuperAdmin
    ? allProjects
    : allProjects.filter(p => !p.createdBy || p.createdBy.toLowerCase() === userEmail)

  const rfqs = isSuperAdmin
    ? allRfqs
    : allRfqs.filter(r => !r.buyerEmail || r.buyerEmail.toLowerCase() === userEmail)

  const rfqStats = {
    total: rfqs.length,
    sent: rfqs.filter(r => r.status === 'sent' || r.status === 'active').length,
    active: rfqs.filter(r => r.status === 'active').length,
    draft: rfqs.filter(r => r.status === 'draft').length,
    completed: rfqs.filter(r => r.status === 'completed').length,
    responses: rfqs.reduce((sum, r) => sum + (r.responses || 0), 0),
  }

  const [activeTab, setActiveTab] = useState('all')
  const [rfqTracking, setRfqTracking] = useState([])

  useEffect(() => {
    void industrialIntelligenceService
      .listBuyerRfqTracking()
      .then((rows) => setRfqTracking(rows || []))
      .catch(() => setRfqTracking([]))
  }, [])

  const filteredRfqs = activeTab === 'all'
    ? rfqs
    : rfqs.filter(r => r.status === activeTab)

  /* ── Project stats ──────────────────────────────────────── */
  const totalProjects = projects.length
  const allTasks = projects.flatMap(p => {
    const flat = []
    const flatten = (tasks) => (tasks || []).forEach(t => { flat.push(t); if (t.children) flatten(t.children) })
    flatten(p.tasks)
    return flat
  })
  const overallProgress = allTasks.length > 0
    ? Math.round(allTasks.reduce((s, t) => s + (t.progressPercent || 0), 0) / allTasks.length)
    : 0

  const totalResponses = rfqs.reduce((sum, r) => sum + (r.responses || 0), 0)

  return (
    <AppLayout>
      <div className="bd-page">
        <div className="bd-header">
          <div>
            <h1 className="bd-title">{t('buyerDashboard.title')}</h1>
            <p className="bd-subtitle">
              {isSuperAdmin
                ? t('buyerDashboard.subtitleSuperadmin')
                : user?.fullName
                  ? t('buyerDashboard.welcomeWithName').replace('{name}', user.fullName)
                  : t('buyerDashboard.welcomeNoName')}
            </p>
          </div>
          {isSuperAdmin && (
            <span style={{
              padding: '5px 14px', borderRadius: 20, background: 'rgba(198,40,40,.08)',
              color: '#c62828', fontSize: 12, fontWeight: 600, alignSelf: 'flex-start',
            }}>
              {t('buyerDashboard.superadminView')}
            </span>
          )}
        </div>

        {/* ── KPI Cards ───────────────────────────────────── */}
        <div className="bd-kpis">
          <div className="bd-kpi-card">
            <div className="bd-kpi-icon blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="bd-kpi-body">
              <span className="bd-kpi-value">{totalProjects}</span>
              <span className="bd-kpi-label">{t('buyerDashboard.kpiTotalProjects')}</span>
            </div>
          </div>
          <div className="bd-kpi-card">
            <div className="bd-kpi-icon green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="bd-kpi-body">
              <span className="bd-kpi-value">{overallProgress}%</span>
              <span className="bd-kpi-label">{t('buyerDashboard.kpiAvgCompletion')}</span>
            </div>
          </div>
          <div className="bd-kpi-card">
            <div className="bd-kpi-icon purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="bd-kpi-body">
              <span className="bd-kpi-value">{rfqStats.sent}</span>
              <span className="bd-kpi-label">{t('buyerDashboard.kpiRfqsSent')}</span>
            </div>
          </div>
          <div className="bd-kpi-card">
            <div className="bd-kpi-icon orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="bd-kpi-body">
              <span className="bd-kpi-value">{totalResponses}</span>
              <span className="bd-kpi-label">{t('buyerDashboard.kpiResponsesReceived')}</span>
            </div>
          </div>
          <div className="bd-kpi-card">
            <div className="bd-kpi-icon teal">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22c5.5-3 8-7.5 8-12V5l-8-3-8 3v5c0 4.5 2.5 9 8 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="bd-kpi-body">
              <span className="bd-kpi-value">{rfqStats.active}</span>
              <span className="bd-kpi-label">{t('buyerDashboard.kpiActiveRfqs')}</span>
            </div>
          </div>
        </div>

        {/* ── Two-column layout ───────────────────────────── */}
        <div className="bd-columns">
          {/* ── Left: Projects Overview ───────────────────── */}
          <div className="bd-card">
            <div className="bd-card-header">
              <h2 className="bd-card-title">{t('buyerDashboard.projectsCardTitle')}</h2>
              <button type="button" className="bd-link-btn" onClick={() => navigate('/project-management')}>
                {t('buyerDashboard.viewAll')}
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="bd-empty">{t('buyerDashboard.noProjects')}</div>
            ) : (
              <div className="bd-project-list">
                {projects.map((p) => {
                  const stats = getProjectStats(p.id)
                  const budgetStr = `$${(p.budget || 0).toLocaleString()}`
                  const meta = t('buyerDashboard.projectMeta')
                    .replace('{done}', String(stats?.completedTasks ?? 0))
                    .replace('{total}', String(stats?.totalTasks ?? 0))
                    .replace('{budget}', budgetStr)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="bd-project-row"
                      onClick={() => navigate(`/project-management/project/${p.id}`)}
                    >
                      <div className="bd-project-info">
                        <span className="bd-project-name">{p.name}</span>
                        <span className="bd-project-meta">
                          {meta}
                        </span>
                      </div>
                      <div className="bd-progress-bar-wrap">
                        <div className="bd-progress-bar">
                          <div className="bd-progress-fill" style={{ width: `${stats?.avgProgress ?? 0}%` }} />
                        </div>
                        <span className="bd-progress-pct">{stats?.avgProgress ?? 0}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Right: RFQs Sent ─────────────────────────── */}
          <div className="bd-card bd-card-wide">
            <div className="bd-card-header">
              <h2 className="bd-card-title">{t('buyerDashboard.myRfqs')}</h2>
              <div className="bd-rfq-tab-pills">
                {[
                  { id: 'all', labelKey: 'buyerDashboard.tabAll', count: rfqStats.total },
                  { id: 'sent', labelKey: 'buyerDashboard.tabSent', count: rfqStats.sent },
                  { id: 'active', labelKey: 'buyerDashboard.tabActive', count: rfqStats.active },
                  { id: 'draft', labelKey: 'buyerDashboard.tabDraft', count: rfqStats.draft },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`bd-tab-pill ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {t(tab.labelKey)} <span className="bd-tab-count">{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {filteredRfqs.length === 0 ? (
              <div className="bd-empty">{t('buyerDashboard.noRfqsCategory')}</div>
            ) : (
              <div className="bd-rfq-list">
                {filteredRfqs.map((rfq) => {
                  const responseCount = rfq.sellerResponses?.length || rfq.responses || 0
                  const sentTo = t('buyerDashboard.sentToSuppliers').replace('{n}', String(rfq.suppliers?.length || 0))
                  return (
                    <div key={rfq.id} className="bd-rfq-item">
                      <div className="bd-rfq-row">
                        <div className="bd-rfq-left">
                          <span className="bd-rfq-title">{rfq.title}</span>
                          <span className="bd-rfq-meta">
                            {rfq.buyerRefDisplay ? `${rfq.buyerRefDisplay} · ` : ''}
                            {rfq.industryId} · {sentTo} · {t('buyerDashboard.due')} {rfq.dueDate || '—'}
                          </span>
                        </div>
                        <div className="bd-rfq-right">
                          <StatusBadge status={rfq.status} t={t} />
                          <span className="bd-rfq-responses">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            {responseCount} {responseCount === 1 ? t('buyerDashboard.response') : t('buyerDashboard.responses')}
                          </span>
                          {responseCount > 0 && (
                            <button
                              type="button"
                              className="bd-compare-btn"
                              onClick={() => navigate(`/rfq-comparison/${rfq.id}`)}
                            >
                              {t('buyerDashboard.compareSellers')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bd-card" style={{ marginTop: 16 }}>
          <div className="bd-card-header">
            <h2 className="bd-card-title">{t('buyerDashboard.trackingTitle')}</h2>
          </div>
          {rfqTracking.length === 0 ? (
            <div className="bd-empty">{t('buyerDashboard.noTracking')}</div>
          ) : (
            <div className="stx-fluid-table-wrap">
              <table className="bd-rfq-track-table stx-fluid-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>{t('buyerDashboard.thRfq')}</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>{t('buyerDashboard.thInvited')}</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>{t('buyerDashboard.thViewed')}</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>{t('buyerDashboard.thResponded')}</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>{t('buyerDashboard.thClosed')}</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 8 }}>{t('buyerDashboard.thDeadline')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rfqTracking.map((row) => (
                    <tr key={row.id}>
                      <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{row.title}</td>
                      <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{row.invited_count || 0}</td>
                      <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{row.viewed_count || 0}</td>
                      <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{row.responded_count || 0}</td>
                      <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{row.closed_count || 0}</td>
                      <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{row.deadline || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
