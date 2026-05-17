import { useNavigate, Navigate, NavLink } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import { useAuditProProgramAccess } from '../utils/auditProgramAccess'
import AiInsightsCtaStrip from '../components/AiInsightsCtaStrip'
import './ProductionManagement.css'
import './AuditManagementHub.css'
import '../styles/auditPro.css'

const BASE = '/management/auditors'

const PROGRAM_PAGES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'KPIs, active audits, and program overview',
    path: `${BASE}/dashboard`,
    icon: 'chart',
  },
  {
    id: 'new-audit',
    label: '+ New audit',
    description: 'Create a new audit plan against standards and supplier scope',
    path: `${BASE}/new-audit`,
    icon: 'plus',
  },
  {
    id: 'plans',
    label: 'Audit plans',
    description: 'Browse planned and active engagements',
    path: `${BASE}/plans`,
    icon: 'clipboard',
  },
]

const OPERATIONS_PAGES = [
  {
    id: 'calendar',
    label: 'Calendar & reminders',
    description: 'Due dates, CAPA follow-ups, and open reminders',
    path: `${BASE}/calendar`,
    icon: 'calendar',
  },
  {
    id: 'auditors',
    label: 'Auditor registry',
    description: 'Lead and supporting auditors, certifications, contacts',
    path: `${BASE}/auditors`,
    icon: 'team',
  },
  {
    id: 'suppliers',
    label: 'Supplier registry',
    description:
      'Register auditees or import from marketplace, B2B directory, vendors, or Supabase — supplier list starts empty until you add or import',
    path: `${BASE}/suppliers`,
    icon: 'vendors',
  },
]

const ANALYTICS_PAGES = [
  {
    id: 'risk-matrix',
    label: 'Risk matrix',
    description: 'Heat map of exposure by standard and site',
    path: `${BASE}/risk-matrix`,
    icon: 'alert',
  },
  {
    id: 'logs',
    label: 'Audit activity logs',
    description: 'Chronological events, exports, and traceability',
    path: `${BASE}/logs`,
    icon: 'audit',
  },
  {
    id: 'reports',
    label: 'Analytics & reports',
    description: 'Program metrics, nonconformance trends, completion',
    path: `${BASE}/reports`,
    icon: 'quality',
  },
]

function PageRow({ page, navigate, getIcon }) {
  return (
    <div
      className="production-page-item stx-click-feedback"
      onClick={() => navigate(page.path)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(page.path)}
    >
      <div className="page-item-icon audit-hub-module-icon">{getIcon(page.icon)}</div>
      <div className="page-item-info">
        <div className="page-item-name">{page.label}</div>
        <div className="page-item-desc audit-mgmt-page-desc">{page.description}</div>
      </div>
      <span className="page-item-arrow">
        <Icon name="chevron-right" size={16} />
      </span>
    </div>
  )
}

export default function AuditManagementHub() {
  const navigate = useNavigate()
  const canUse = useAuditProProgramAccess()

  const getIcon = (name, size = 20) => <Icon name={name} size={size} />

  if (!canUse) {
    return <Navigate to="/management" replace />
  }

  return (
    <AppLayout>
      <div className="production-page">
        <div className="production-header">
          <a
            className="production-back-link stx-click-feedback"
            href="/management"
            onClick={(e) => {
              e.preventDefault()
              navigate('/management')
            }}
          >
            <Icon name="arrow-left" size={16} /> Back to Management
          </a>
          <h1 className="production-title audit-mgmt-hub-title">Audit management</h1>
          <p className="production-subtitle audit-mgmt-hub-subtitle">
            Program home is the{' '}
            <NavLink to="/management/auditors/dashboard" className="audit-mgmt-hub-inline-link">
              audit dashboard
            </NavLink>{' '}
            (KPIs and shortcuts). This page lists every module in one scrollable map.
          </p>
          <div style={{ marginTop: 14 }}>
            <NavLink
              to="/management/auditors/dashboard"
              className="am-prog-btn am-prog-btn--primary"
              style={{ maxWidth: 420 }}
            >
              <span className="am-prog-btn__icon-wrap">
                <Icon name="chart" size={18} />
              </span>
              <span className="am-prog-btn__stack">
                <span className="am-prog-btn__label">Open program dashboard</span>
                <span className="am-prog-btn__desc">KPIs, module shortcuts, and live activity</span>
              </span>
            </NavLink>
          </div>
        </div>

        <AiInsightsCtaStrip context="management" />

        <div className="audit-mgmt-hub-main">
          <div className="production-card">
            <h2 className="production-card-title">Program &amp; audits</h2>
            <p className="production-card-subtitle">Create plans and track the live audit program</p>
            <div className="production-pages-list">
              {PROGRAM_PAGES.map((page) => (
                <PageRow key={page.id} page={page} navigate={navigate} getIcon={getIcon} />
              ))}
            </div>
          </div>

          <div className="production-card">
            <h2 className="production-card-title">Registry &amp; schedule</h2>
            <p className="production-card-subtitle">People, sites, and time-based follow-ups</p>
            <div className="production-pages-list">
              {OPERATIONS_PAGES.map((page) => (
                <PageRow key={page.id} page={page} navigate={navigate} getIcon={getIcon} />
              ))}
            </div>
          </div>

          <div className="production-card production-sidebar">
            <h2 className="production-card-title">Risk &amp; reporting</h2>
            <p className="production-card-subtitle">Evidence, analytics, and oversight</p>
            <div className="production-pages-list">
              {ANALYTICS_PAGES.map((page) => (
                <PageRow key={page.id} page={page} navigate={navigate} getIcon={getIcon} />
              ))}
            </div>
            <button
              type="button"
              className="production-action-item stx-click-feedback audit-mgmt-hub-footer-cta"
              style={{ marginTop: 12 }}
              onClick={() => navigate(`${BASE}/dashboard`)}
            >
              <span className="action-icon">{getIcon('audit')}</span>
              Program dashboard
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
