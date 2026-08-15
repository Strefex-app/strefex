import { useMemo } from 'react'
import { Navigate, NavLink, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import ManagementBreadcrumb from '../components/management/ManagementBreadcrumb'
import { useAuditProProgramAccess } from '../utils/auditProgramAccess'
import useAuditProStore from '../store/auditProStore'
import {
  getQuestionnaire,
  getTotalQuestions,
  INDUSTRIES,
} from '../data/auditManagementDetailedData'
import './ProductionManagement.css'
import './AuditManagementHub.css'
import '../styles/auditPro.css'

const PLATFORM_INDUSTRY = 'Platform / SaaS'
const PLATFORM_AUDIT_TYPE = 'Cybersecurity / IT'
const PLATFORM_STANDARD = 'STREFEX Platform Security Audit'

const PLATFORM_STANDARDS = [
  {
    id: 'strefex-platform',
    label: PLATFORM_STANDARD,
    description: 'Whole-platform assessment — auth, tenant isolation, Supabase RLS, Stripe, CI/CD, and deployment readiness',
    standard: PLATFORM_STANDARD,
  },
  {
    id: 'iso27001',
    label: 'ISO 27001',
    description: 'Information security management system controls and Annex A coverage',
    standard: 'ISO 27001',
  },
  {
    id: 'nist-csf',
    label: 'NIST CSF',
    description: 'NIST Cybersecurity Framework 2.0 — Govern, Identify, Protect, Detect, Respond, Recover',
    standard: 'NIST CSF',
  },
  {
    id: 'soc2',
    label: 'SOC 2 Type II',
    description: 'Trust Services Criteria — Security, Availability, Processing Integrity, Confidentiality, Privacy',
    standard: 'SOC 2 Type II',
  },
]

function newAuditUrl(standard) {
  const params = new URLSearchParams({
    industry: PLATFORM_INDUSTRY,
    auditType: PLATFORM_AUDIT_TYPE,
    standard,
    title: `${standard} — Platform Assessment`,
  })
  return `/management/auditors/new-audit?${params.toString()}`
}

export default function PlatformSecurityAuditHub() {
  const navigate = useNavigate()
  const canUse = useAuditProProgramAccess()
  const audits = useAuditProStore((s) => s.audits)

  const platformAudits = useMemo(
    () =>
      (audits || []).filter(
        (a) =>
          a.industry === PLATFORM_INDUSTRY ||
          a.standard === PLATFORM_STANDARD ||
          (a.auditType || '').includes('Cyber'),
      ),
    [audits],
  )

  const platformQuestionnaire = getQuestionnaire(PLATFORM_STANDARD, PLATFORM_AUDIT_TYPE)
  const platformQuestionCount = getTotalQuestions(platformQuestionnaire)

  if (!canUse) {
    return <Navigate to="/management" replace />
  }

  return (
    <AppLayout>
      <div className="production-page">
        <div className="production-header">
          <ManagementBreadcrumb
            trail={[
              { label: 'Platform', to: '/management/platform' },
              { label: 'Platform security audit' },
            ]}
          />
          <h1 className="production-title audit-mgmt-hub-title">Platform security audit</h1>
          <p className="production-subtitle audit-mgmt-hub-subtitle">
            Whole-platform cybersecurity assessment for STREFEX — covering authentication, multi-tenant
            isolation, Supabase RLS, Stripe billing, dependency scanning, deployment readiness, and
            incident response across every management module.
          </p>
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <NavLink
              to={newAuditUrl(PLATFORM_STANDARD)}
              className="am-prog-btn am-prog-btn--primary"
              style={{ maxWidth: 440 }}
            >
              <span className="am-prog-btn__icon-wrap">
                <Icon name="audit" size={18} />
              </span>
              <span className="am-prog-btn__stack">
                <span className="am-prog-btn__label">Start whole-platform audit</span>
                <span className="am-prog-btn__desc">
                  {platformQuestionCount} questions · {platformQuestionnaire.length} sections
                </span>
              </span>
            </NavLink>
            <button
              type="button"
              className="am-prog-btn am-prog-btn--secondary"
              style={{ maxWidth: 280 }}
              onClick={() => navigate('/management/auditors/dashboard')}
            >
              <span className="am-prog-btn__icon-wrap">
                <Icon name="chart" size={18} />
              </span>
              <span className="am-prog-btn__stack">
                <span className="am-prog-btn__label">Audit program dashboard</span>
                <span className="am-prog-btn__desc">KPIs and all audit plans</span>
              </span>
            </button>
          </div>
        </div>

        <div className="audit-mgmt-hub-main">
          <div className="production-card">
            <h2 className="production-card-title">Platform frameworks</h2>
            <p className="production-card-subtitle">
              Choose a standard for {PLATFORM_INDUSTRY} · {PLATFORM_AUDIT_TYPE}
            </p>
            <div className="production-pages-list">
              {PLATFORM_STANDARDS.map((item) => {
                const q = getQuestionnaire(item.standard, PLATFORM_AUDIT_TYPE)
                const count = getTotalQuestions(q)
                return (
                  <div
                    key={item.id}
                    className="production-page-item stx-click-feedback"
                    onClick={() => navigate(newAuditUrl(item.standard))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(newAuditUrl(item.standard))}
                  >
                    <div className="page-item-icon audit-hub-module-icon">
                      <Icon name="audit" size={20} />
                    </div>
                    <div className="page-item-info" style={{ minWidth: 0 }}>
                      <div className="page-item-name">{item.label}</div>
                      <div className="page-item-desc audit-mgmt-page-desc stx-text-wrap">{item.description}</div>
                      <div className="stx-text-caption ap-text-muted" style={{ marginTop: 4 }}>
                        {count} questions · {q.length} sections
                      </div>
                    </div>
                    <span className="page-item-arrow">
                      <Icon name="chevron-right" size={16} />
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="production-card production-sidebar">
            <h2 className="production-card-title">Coverage scope</h2>
            <p className="production-card-subtitle">What the whole-platform audit assesses</p>
            <ul className="stx-text-small ap-text-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Authentication, sessions, and email verification</li>
              <li>Multi-tenant isolation and Supabase RLS</li>
              <li>Rate limits, input validation, and API hardening</li>
              <li>Secrets, HTTPS, CORS, and Stripe webhooks</li>
              <li>Dependency scanning (npm, pip) and CI gates</li>
              <li>Enterprise plan gates and workspace cloud sync</li>
              <li>Activity logging, Sentry, and incident response</li>
              <li>Deployment blockers, migrations, and rollback</li>
            </ul>
            <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginTop: 14 }}>
              Mapped from{' '}
              <code style={{ fontSize: 'var(--text-caption)' }}>docs/DEPLOYMENT_AUDIT.md</code> §5
              security checklist. Industry:{' '}
              {INDUSTRIES.includes(PLATFORM_INDUSTRY) ? PLATFORM_INDUSTRY : '—'}.
            </p>
          </div>

          {platformAudits.length > 0 && (
            <div className="production-card">
              <h2 className="production-card-title">Recent platform audits</h2>
              <p className="production-card-subtitle">{platformAudits.length} plan(s) in your program</p>
              <div className="production-pages-list">
                {platformAudits.slice(0, 6).map((audit) => (
                  <div
                    key={audit.id}
                    className="production-page-item stx-click-feedback"
                    onClick={() => navigate(`/management/auditors/conduct/${audit.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/management/auditors/conduct/${audit.id}`)}
                  >
                    <div className="page-item-info" style={{ minWidth: 0 }}>
                      <div className="page-item-name stx-text-wrap">{audit.title || audit.standard}</div>
                      <div className="page-item-desc audit-mgmt-page-desc">
                        {audit.standard} · {audit.status} · {audit.plannedDate || 'TBD'}
                      </div>
                    </div>
                    <span className="page-item-arrow">
                      <Icon name="chevron-right" size={16} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
