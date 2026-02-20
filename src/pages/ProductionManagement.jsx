import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import DonutChart from '../components/DonutChart'
import useProductionStore from '../store/productionStore'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n/useTranslation'
import './ProductionManagement.css'

const EMPTY_SUMMARY = {
  avgOEE: 0, fpy: 0, scrapRate: '0', iso9001Score: 0,
  equipmentStatus: { running: 0, idle: 0, maintenance: 0 },
}

const ProductionManagement = () => {
  const navigate = useNavigate()
  const qualityKPIs = useProductionStore((s) => s.qualityKPIs)
  const auditTypes = useProductionStore((s) => s.auditTypes)
  const iso9001 = useProductionStore((s) => s.iso9001) ?? { expiryDate: 'N/A' }
  const iatf16949 = useProductionStore((s) => s.iatf16949) ?? { expiryDate: 'N/A' }
  const getProductionSummary = useProductionStore((s) => s.getProductionSummary)
  const getAllAudits = useProductionStore((s) => s.getAllAudits)
  const summary = getProductionSummary?.() ?? EMPTY_SUMMARY
  const allAudits = getAllAudits?.() ?? []
  const [showAuditModal, setShowAuditModal] = useState(false)
  const { t } = useTranslation()
  const role = useAuthStore((s) => s.role)
  const canEdit = role === 'manager' || role === 'admin' || role === 'superadmin'
  const [editModal, setEditModal] = useState(null)

  const standardsPages = [
    { id: '5s', label: '5S Workplace Organization', description: 'Sort, Set in order, Shine, Standardize, Sustain', path: '/production/5s', icon: 'grid', color: '#3498db' },
    { id: 'iso9001', label: 'ISO 9001', description: 'Quality Management System certification', path: '/production/iso9001', icon: 'certificate', color: '#27ae60' },
    { id: 'iatf16949', label: 'IATF 16949', description: 'Automotive Quality Management System', path: '/production/iatf16949', icon: 'car', color: '#e74c3c' },
    { id: 'vda63', label: 'VDA 6.3', description: 'Process Audit standard for automotive', path: '/production/vda63', icon: 'audit', color: '#9b59b6' },
    { id: 'process-audit', label: 'Product/Process Audit', description: 'Control Plan, PFMEA, Workflow analysis', path: '/production/process-audit', icon: 'process', color: '#16a085' },
    { id: 'audit-history', label: 'Audit History', description: 'View all audit records and tracking data', path: '/production/audit-history', icon: 'history', color: '#34495e' },
  ]

  const metricsPages = [
    { id: 'oee', label: 'OEE Dashboard', description: 'Overall Equipment Effectiveness monitoring', path: '/production/oee', icon: 'gauge', color: '#16a085' },
    { id: 'downtime', label: 'Downtime Tracking', description: 'Equipment downtime and losses', path: '/production/downtime', icon: 'clock', color: '#e67e22' },
    { id: 'scrap', label: 'Scrap & Waste', description: 'Scrap rate and waste management', path: '/production/scrap', icon: 'trash', color: '#c0392b' },
    { id: 'output', label: 'Production Output', description: 'Daily production tracking and efficiency', path: '/production/output', icon: 'chart', color: '#2980b9' },
    { id: 'quality', label: 'Quality KPIs', description: 'FPY, DPMO, and quality metrics', path: '/production/quality-kpis', icon: 'quality', color: '#8e44ad' },
    { id: 'workcenter', label: 'Work Center Output', description: 'Capacity, cycle time & output calculations', path: '/production/workcenter-output', icon: 'factory', color: '#2c3e50' },
  ]

  const systemPages = [
    { id: 'ases-ses', label: 'ASES / SES', description: 'Alliance Supplier Evaluation Standard', path: '/production/system/ases-ses', icon: 'layers', color: '#0b5394' },
    { id: 'stf', label: 'STF (Supplier Technical File)', description: 'PPAP, traceability & validation deliverables', path: '/production/system/stf', icon: 'document', color: '#134f5c' },
    { id: 'monozukuri', label: 'Monozukuri', description: 'Manufacturing excellence philosophy', path: '/production/system/monozukuri', icon: 'settings', color: '#7f6000' },
    { id: 'kaizen', label: 'Kaizen', description: 'Continuous improvement — PDCA, Gemba walks', path: '/production/system/kaizen', icon: 'trend', color: '#cc0000' },
    { id: 'rule-2-24', label: 'Rule 2-24', description: '2h containment, 24h root cause response', path: '/production/system/rule-2-24', icon: 'clock', color: '#e65100' },
    { id: 'four-boxes', label: '4 Boxes (QRQC)', description: 'Quick Response Quality Control methodology', path: '/production/system/four-boxes', icon: 'boxes', color: '#6a329f' },
    { id: 'qms', label: 'Quality Management System', description: 'QMS framework — policy, processes, review', path: '/production/system/qms', icon: 'quality', color: '#1e8449' },
    { id: 'apqp', label: 'APQP / PPAP', description: 'Advanced Product Quality Planning', path: '/production/system/apqp', icon: 'flag', color: '#1a5276' },
    { id: 'fmea', label: 'FMEA', description: 'Failure Mode & Effects Analysis', path: '/production/system/fmea', icon: 'alert', color: '#922b21' },
    { id: 'spc', label: 'SPC / MSA', description: 'Statistical Process & Measurement Analysis', path: '/production/system/spc', icon: 'chart', color: '#7d3c98' },
    { id: '8d', label: '8D Problem Solving', description: '8 Disciplines team-based methodology', path: '/production/system/8d', icon: 'document', color: '#0e6655' },
    { id: 'lean', label: 'Lean Manufacturing', description: 'Waste elimination — VSM, JIT, Kanban', path: '/production/system/lean', icon: 'factory', color: '#2c3e50' },
    { id: 'tpm', label: 'TPM', description: 'Total Productive Maintenance', path: '/production/system/tpm', icon: 'settings', color: '#d4ac0d' },
    { id: 'poka-yoke', label: 'Poka-Yoke', description: 'Mistake-proofing & error prevention', path: '/production/system/poka-yoke', icon: 'quality', color: '#2874a6' },
  ]

  const quickActions = [
    { id: 'start-audit', label: 'Start Audit', icon: 'audit', action: () => setShowAuditModal(true) },
    { id: 'process-audit', label: 'Product/Process Audit', icon: 'process', path: '/production/process-audit?add=true' },
    { id: 'oee-entry', label: 'Record OEE Data', icon: 'plus', path: '/production/oee?add=true' },
    { id: 'downtime-entry', label: 'Log Downtime', icon: 'clock', path: '/production/downtime?add=true' },
    { id: 'scrap-entry', label: 'Report Scrap', icon: 'trash', path: '/production/scrap?add=true' },
  ]

  const auditTypeOptions = [
    { id: '5s', name: '5S', path: '/production/audit-questionnaire?type=5S', color: '#3498db' },
    { id: 'iso9001', name: 'ISO 9001', path: '/production/audit-questionnaire?type=ISO 9001', color: '#27ae60' },
    { id: 'vda63', name: 'VDA 6.3', path: '/production/audit-questionnaire?type=VDA 6.3', color: '#9b59b6' },
    { id: 'iatf16949', name: 'IATF 16949', path: '/production/audit-questionnaire?type=IATF 16949', color: '#e74c3c' },
    { id: 'process', name: 'Product/Process', path: '/production/audit-questionnaire?type=Product/Process', color: '#16a085' },
    { id: 'supplier', name: 'Supplier Audit', path: '/production/audit-questionnaire?type=Supplier', color: '#e67e22' },
    { id: 'layered', name: 'Layered Process (LPA)', path: '/production/audit-questionnaire?type=Layered Process', color: '#8e44ad' },
  ]

  const getIcon = (iconName, size = 20) => <Icon name={iconName} size={size} />

  const getOEEColor = (value) => {
    if (value >= 85) return 'green'
    if (value >= 70) return 'orange'
    return 'red'
  }

  const saveIndicatorEdit = useCallback(() => {
    if (!editModal) return
    setEditModal(null)
  }, [editModal])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="audit-status-badge completed">Completed</span>
      case 'in_progress': return <span className="audit-status-badge progress">In Progress</span>
      case 'action_required': return <span className="audit-status-badge action">Action Required</span>
      default: return <span className="audit-status-badge open">Open</span>
    }
  }

  return (
    <AppLayout>
      <div className="production-page">
        {/* Header */}
        <div className="production-header">
          <a 
            className="production-back-link stx-click-feedback" 
            href="/management" 
            onClick={(e) => { e.preventDefault(); navigate(-1) }}
          >
            <Icon name="arrow-left" size={16} /> Back
          </a>
          <h1 className="production-title">{t('production.title')}</h1>
          <p className="production-subtitle">{t('production.subtitle')}</p>
        </div>

        {/* Top Indicators */}
        <div className="production-indicators">
          <div className="production-indicator-card production-indicator-clickable" onClick={() => navigate('/production/oee')}>
            <DonutChart
              value={summary.avgOEE ?? 0}
              label="Average OEE"
              size={56}
              color={summary.avgOEE >= 85 ? '#27ae60' : summary.avgOEE >= 70 ? '#e67e22' : '#e74c3c'}
              details={[
                { label: 'Availability', value: `${(summary.availability ?? 92).toFixed(1)}%`, color: '#3498db' },
                { label: 'Performance', value: `${(summary.performance ?? 88).toFixed(1)}%`, color: '#27ae60' },
                { label: 'Quality', value: `${(summary.quality ?? 96).toFixed(1)}%`, color: '#9b59b6' },
                { label: 'Target', value: '85%', color: '#e67e22' },
                { label: 'Gap to target', value: `${Math.max(0, 85 - (summary.avgOEE ?? 0)).toFixed(1)}%`, color: '#e74c3c' },
              ]}
            />
            <div>
              <div className="indicator-value">{(summary.avgOEE ?? 0).toFixed(1)}%</div>
              <div className="indicator-label">{t('production.averageOEE')}</div>
            </div>
            {canEdit && (
              <button type="button" className="production-indicator-edit" onClick={(e) => { e.stopPropagation(); setEditModal('oee') }} aria-label="Edit">
                <Icon name="edit" size={14} />
              </button>
            )}
          </div>
          <div className="production-indicator-card production-indicator-clickable" onClick={() => navigate('/production/quality-kpis')}>
            <div className="indicator-icon green">
              <Icon name="star" size={24} />
            </div>
            <div>
              <div className="indicator-value">{summary.fpy}%</div>
              <div className="indicator-label">{t('production.firstPassYield')}</div>
            </div>
            {canEdit && (
              <button type="button" className="production-indicator-edit" onClick={(e) => { e.stopPropagation(); setEditModal('fpy') }} aria-label="Edit">
                <Icon name="edit" size={14} />
              </button>
            )}
          </div>
          <div className="production-indicator-card production-indicator-clickable" onClick={() => navigate('/production/scrap')}>
            <div className={`indicator-icon ${parseFloat(summary.scrapRate) <= 1 ? 'green' : 'orange'}`}>
              <Icon name="trash" size={24} />
            </div>
            <div>
              <div className="indicator-value">{summary.scrapRate}%</div>
              <div className="indicator-label">{t('production.scrapRate')}</div>
            </div>
            {canEdit && (
              <button type="button" className="production-indicator-edit" onClick={(e) => { e.stopPropagation(); setEditModal('scrap') }} aria-label="Edit">
                <Icon name="edit" size={14} />
              </button>
            )}
          </div>
          <div className="production-indicator-card production-indicator-clickable" onClick={() => navigate('/production/iso9001')}>
            <div className="indicator-icon blue">
              <Icon name="certificate" size={24} />
            </div>
            <div>
              <div className="indicator-value">{(summary.iso9001Score ?? 0).toFixed(0)}%</div>
              <div className="indicator-label">ISO 9001 Score</div>
            </div>
            {canEdit && (
              <button type="button" className="production-indicator-edit" onClick={(e) => { e.stopPropagation(); setEditModal('iso9001') }} aria-label="Edit">
                <Icon name="edit" size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Certification Status */}
        <div className="cert-status-row">
          <div 
            className="cert-status-card clickable stx-click-feedback"
            onClick={() => navigate('/production/certifications?type=iso9001')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/production/certifications?type=iso9001')}
          >
            <div className="cert-badge iso">ISO 9001:2015</div>
            <div className="cert-info">
              <span className="cert-status certified">{t('production.certified')}</span>
              <span className="cert-expiry">{t('production.expires')}: {iso9001.expiryDate}</span>
            </div>
            <span className="cert-view-hint">{t('production.viewHistory')} →</span>
          </div>
          <div 
            className="cert-status-card clickable stx-click-feedback"
            onClick={() => navigate('/production/certifications?type=iatf16949')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/production/certifications?type=iatf16949')}
          >
            <div className="cert-badge iatf">IATF 16949:2016</div>
            <div className="cert-info">
              <span className="cert-status certified">{t('production.certified')}</span>
              <span className="cert-expiry">{t('production.expires')}: {iatf16949.expiryDate}</span>
            </div>
            <span className="cert-view-hint">{t('production.viewHistory')} →</span>
          </div>
          <div 
            className="cert-status-card equipment-status clickable stx-click-feedback"
            onClick={() => navigate('/production/floor-layout')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/production/floor-layout')}
          >
            <div className="equipment-label">
              {t('production.equipmentStatus')}
              <span className="view-layout-hint">{t('production.viewFloorLayout')} →</span>
            </div>
            <div className="equipment-stats">
              <span className="eq-stat running">{summary.equipmentStatus?.running ?? 0} {t('production.running')}</span>
              <span className="eq-stat idle">{summary.equipmentStatus?.idle ?? 0} {t('production.idle')}</span>
              <span className="eq-stat maintenance">{summary.equipmentStatus?.maintenance ?? 0} {t('production.maintenance')}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="production-main">
          {/* Standards Section — col 1 */}
          <div className="production-card">
            <h2 className="production-card-title">{t('production.qualityStandards')}</h2>
            <p className="production-card-subtitle">{t('production.qualityStandardsDesc')}</p>
            <div className="production-pages-list">
              {standardsPages.map((page) => (
                <div
                  key={page.id}
                  className="production-page-item stx-click-feedback"
                  onClick={() => navigate(page.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(page.path)}
                >
                  <div className="page-item-icon" style={{ background: `${page.color}15`, color: page.color }}>
                    {getIcon(page.icon)}
                  </div>
                  <div className="page-item-info">
                    <div className="page-item-name">{page.label}</div>
                    <div className="page-item-desc">{page.description}</div>
                  </div>
                  <span className="page-item-arrow"><Icon name="chevron-right" size={16} /></span>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics Section — col 2 */}
          <div className="production-card">
            <h2 className="production-card-title">{t('production.operationalMetrics')}</h2>
            <p className="production-card-subtitle">{t('production.operationalMetricsDesc')}</p>
            <div className="production-pages-list">
              {metricsPages.map((page) => (
                <div
                  key={page.id}
                  className="production-page-item stx-click-feedback"
                  onClick={() => navigate(page.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(page.path)}
                >
                  <div className="page-item-icon" style={{ background: `${page.color}15`, color: page.color }}>
                    {getIcon(page.icon)}
                  </div>
                  <div className="page-item-info">
                    <div className="page-item-name">{page.label}</div>
                    <div className="page-item-desc">{page.description}</div>
                  </div>
                  <span className="page-item-arrow"><Icon name="chevron-right" size={16} /></span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions — col 3 (aligned top with Metrics) */}
          <div className="production-card production-sidebar">
            <h2 className="production-card-title">+ {t('production.quickActions')}</h2>
            <p className="production-card-subtitle">{t('production.quickActionsDesc')}</p>
            <div className="production-actions-list">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="production-action-item stx-click-feedback"
                  onClick={() => action.action ? action.action() : navigate(action.path)}
                >
                  <span className="action-icon">{getIcon(action.icon)}</span>
                  {action.label}
                </button>
              ))}
            </div>

            {/* Recent Audits */}
            <div className="recent-audits-section">
              <h3 className="trend-title">{t('production.recentAudits')}</h3>
              <div className="recent-audits-list">
                {allAudits.slice(0, 4).map((audit) => (
                  <div key={audit.id} className="recent-audit-item" onClick={() => navigate('/production/audit-history')}>
                    <div className="audit-type-badge" style={{ background: auditTypeOptions.find(at => at.name === audit.auditType)?.color || '#666' }}>
                      {audit.auditType}
                    </div>
                    <div className="audit-item-info">
                      <span className="audit-area">{audit.area}</span>
                      <span className="audit-date">{audit.date}</span>
                    </div>
                    <span className="audit-score">{audit.score}%</span>
                  </div>
                ))}
              </div>
              <button type="button" className="view-all-btn" onClick={() => navigate('/production/audit-history')}>
                {t('production.viewAllAudits')} →
              </button>
            </div>
          </div>

          {/* System Management — spans col 1-2 */}
          <div className="production-card production-system-card">
            <h2 className="production-card-title">{t('production.systemManagement')}</h2>
            <p className="production-card-subtitle">{t('production.systemManagementDesc')}</p>
            <div className="production-pages-list production-system-grid">
              {systemPages.slice(0, 6).map((page) => (
                <div
                  key={page.id}
                  className="production-page-item stx-click-feedback"
                  onClick={() => navigate(page.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(page.path)}
                >
                  <div className="page-item-icon" style={{ background: `${page.color}15`, color: page.color }}>
                    {getIcon(page.icon)}
                  </div>
                  <div className="page-item-info">
                    <div className="page-item-name">{page.label}</div>
                    <div className="page-item-desc">{page.description}</div>
                  </div>
                  <span className="page-item-arrow"><Icon name="chevron-right" size={16} /></span>
                </div>
              ))}
            </div>
            <button type="button" className="view-all-btn" style={{ marginTop: 12 }} onClick={() => navigate('/production/system-management')}>
              {t('production.viewAllSystems')} ({systemPages.length}) →
            </button>
          </div>

          {/* Headcount Management — spans col 1-3 (full width) */}
          <div className="production-card production-headcount-card">
            <h2 className="production-card-title">
              <Icon name="team" size={20} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
              Headcount Management
            </h2>
            <p className="production-card-subtitle">Workforce management, qualifications, goals, reviews &amp; HR documentation</p>
            <div className="production-headcount-grid">
              {[
                { id: 'qualification', label: 'Qualification Matrix', desc: '5-level star rating for employee skills', path: '/production/headcount/qualification-matrix', color: '#3498db', icon: 'quality' },
                { id: 'goals', label: 'Employee Goals', desc: 'Goal tracking and KPI management', path: '/production/headcount/goals', color: '#27ae60', icon: 'flag' },
                { id: 'dialogue', label: 'Employee Dialogue', desc: 'Yearly reviews and development talks', path: '/production/headcount/dialogue', color: '#e67e22', icon: 'document' },
                { id: 'hr-docs', label: 'HR Documentation', desc: 'Contracts, policies and HR documents', path: '/production/headcount/hr-docs', color: '#9b59b6', icon: 'document' },
                { id: 'training', label: 'Training Records', desc: 'Training history and certifications', path: '/production/headcount/training', color: '#16a085', icon: 'certificate' },
                { id: 'workforce', label: 'Workforce Planning', desc: 'Headcount planning and scheduling', path: '/production/headcount/workforce', color: '#2c3e50', icon: 'chart' },
              ].map((item) => (
                <div
                  key={item.id}
                  className="production-page-item stx-click-feedback"
                  onClick={() => navigate(item.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(item.path)}
                >
                  <div className="page-item-icon" style={{ background: `${item.color}15`, color: item.color }}>
                    {getIcon(item.icon)}
                  </div>
                  <div className="page-item-info">
                    <div className="page-item-name">{item.label}</div>
                    <div className="page-item-desc">{item.desc}</div>
                  </div>
                  <span className="page-item-arrow"><Icon name="chevron-right" size={16} /></span>
                </div>
              ))}
            </div>
            <button type="button" className="view-all-btn" style={{ marginTop: 12 }} onClick={() => navigate('/production/headcount')}>
              View All Headcount Management →
            </button>
          </div>
        </div>

        {/* Audit Type Selection Modal */}
        {showAuditModal && (
          <div className="audit-modal-overlay" onClick={() => setShowAuditModal(false)}>
            <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="audit-modal-header">
                <h3>{t('production.selectAuditType')}</h3>
                <button type="button" className="audit-modal-close" onClick={() => setShowAuditModal(false)}>×</button>
              </div>
              <div className="audit-types-grid">
                {auditTypeOptions.map((type) => (
                  <div
                    key={type.id}
                    className="audit-type-card"
                    onClick={() => { setShowAuditModal(false); navigate(type.path) }}
                    style={{ borderColor: type.color }}
                  >
                    <div className="audit-type-icon" style={{ background: `${type.color}15`, color: type.color }}>
                      {getIcon(type.id === '5s' ? 'grid' : type.id === 'iso9001' ? 'certificate' : type.id === 'vda63' ? 'audit' : type.id === 'iatf16949' ? 'car' : 'process')}
                    </div>
                    <span className="audit-type-name">{type.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Edit indicator modal (managers) */}
        {editModal && (
          <div className="audit-modal-overlay" onClick={() => setEditModal(null)}>
            <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="audit-modal-header">
                <h3>Edit indicator</h3>
                <button type="button" className="audit-modal-close" onClick={() => setEditModal(null)}>×</button>
              </div>
              <div style={{ padding: 24 }}>
                <p style={{ margin: '0 0 16px', color: 'var(--color-secondary)' }}>Editing: {editModal}</p>
                <button type="button" className="view-all-btn" onClick={saveIndicatorEdit}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ProductionManagement
