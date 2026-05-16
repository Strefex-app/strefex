import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import { useSubscriptionStore } from '../services/featureFlags'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n/useTranslation'
import '../styles/app-page.css'
import './ManagementHub.css'
import AiInsightsCtaStrip from '../components/AiInsightsCtaStrip'
import { FORGE_BASE } from '../constants/forgeSpaceRoutes'

/* ── Management modules definition ─────────────────────── */
const MANAGEMENT_MODULES = [
  {
    id: 'team',
    label: 'Team Management',
    description: 'Invite and manage team members, assign roles, and control access permissions',
    path: '/team',
    icon: 'team',
    featureKey: 'teamManagement',
    planLabel: 'Basic',
    minRole: 'admin',
  },
  {
    id: 'hr-space',
    label: 'HR Space',
    description:
      'Workforce dashboards, qualifications, goals, performance dialogue, HR documents, training, onboarding, attendance, enterprise personnel, templates, and future job-board integrations',
    titleKey: 'management.module.hrSpace.title',
    descriptionKey: 'management.module.hrSpace.description',
    path: '/hr-space',
    icon: 'profile',
    featureKey: 'productionManagement',
    planLabel: 'Premium',
    minRole: 'manager',
  },
  {
    id: 'forge',
    label: 'Forge',
    description:
      'Community hub: registration, member and committee rosters, membership onboarding scorecards, pipeline stats, and future committee and analytics modules',
    path: FORGE_BASE,
    icon: 'clipboard',
    featureKey: 'productionManagement',
    planLabel: 'Premium',
    minRole: 'manager',
    superadminOnly: true,
  },
  {
    id: 'project',
    label: 'Project Management',
    description: 'Create, track, and manage projects with tasks, Gantt charts, and resource allocation',
    path: '/project-management',
    icon: 'folder',
    featureKey: null, // available for all plans
  },
  {
    id: 'production',
    label: 'Production Management',
    description: 'OEE, quality KPIs, floor layout, certifications, audit questionnaires, and system management',
    path: '/production',
    icon: 'production',
    featureKey: 'productionManagement',
    planLabel: 'Premium',
  },
  {
    id: 'cost',
    label: 'Cost Management',
    description: 'Cost calculator, BOM analysis, cost breakdown, scenario comparison, and target management',
    path: '/cost-management',
    icon: 'cost',
    featureKey: 'costManagement',
    planLabel: 'Premium',
  },
  {
    id: 'enterprise',
    label: 'Enterprise Management',
    description: 'Cost categories, OPEX/CAPEX, personnel, financial analysis, risk management, and product calculation',
    path: '/enterprise',
    icon: 'enterprise',
    featureKey: 'enterpriseManagement',
    planLabel: 'Enterprise',
  },
  {
    id: 'vendors',
    label: 'Vendor Master',
    description: 'Create and maintain supplier master records, classifications, contact data, and status controls',
    path: '/vendors',
    icon: 'vendors',
    featureKey: null,
  },
  {
    id: 'auditors-hub',
    label: 'Audit management',
    description:
      'Dashboard, new audit, audit plans, calendar & reminders, auditor and supplier registries, risk matrix, activity logs, and analytics',
    path: '/management/auditors',
    icon: 'audit',
    featureKey: null,
    planLabel: 'Enterprise',
    auditorHubOnly: true,
  },
  {
    id: 'procurement',
    label: 'Procurement',
    description: 'Purchase requisitions, purchase orders, multi-level approval workflows, and spend tracking',
    path: '/procurement',
    icon: 'procurement',
    featureKey: 'procurement',
    planLabel: 'Enterprise',
  },
  {
    id: 'contracts',
    label: 'Contract Management',
    description: 'Contract tracking, renewal alerts, lifecycle management, and milestone monitoring',
    path: '/contracts',
    icon: 'contracts',
    featureKey: 'contractManagement',
    planLabel: 'Enterprise',
  },
  {
    id: 'spend',
    label: 'Spend Analysis',
    description: 'Procurement spend by vendor, category, department, and time with visual analytics',
    path: '/spend-analysis',
    icon: 'cost',
    featureKey: 'spendAnalysis',
    planLabel: 'Enterprise',
    minRole: 'manager',
  },
  {
    id: 'compliance',
    label: 'Compliance & ESG',
    description: 'ESG checklists, regulatory templates (ISO, GDPR, SOX, LkSG), and compliance tracking',
    path: '/compliance',
    icon: 'compliance',
    featureKey: 'complianceEsg',
    planLabel: 'Enterprise',
  },
  {
    id: 'erp',
    label: 'ERP Integrations',
    description: 'Connect and sync with ERP systems for vendors, purchasing data, and transaction workflows',
    path: '/erp-integrations',
    icon: 'erp',
    featureKey: 'erpIntegrations',
    planLabel: 'Enterprise',
    minRole: 'admin',
  },
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    description: 'Review system events, user actions, and platform-level audit trails for compliance and controls',
    path: '/audit-logs',
    icon: 'audit',
    featureKey: 'auditLogs',
    planLabel: 'Enterprise',
    minRole: 'admin',
  },
  {
    id: 'ai-insights',
    label: 'AI Insights',
    description: 'Risk analysis, recommendations, Ops/finance/HR simulations; banner on this page or ?tab=operations',
    path: '/ai-insights',
    icon: 'ai',
    featureKey: 'aiInsights',
    planLabel: 'Enterprise',
    minRole: 'manager',
  },
]

/* ── Icon/Lock helpers using centralised Icon component ── */
const ModuleIcon = ({ icon }) => <Icon name={icon} size={28} />
const LockIcon = () => <Icon name="lock" size={16} className="mgmt-lock-icon" />

/* ── Main component ─────────────────────────────────────── */
export default function ManagementHub() {
  const navigate = useNavigate()
  const hasFeature = useSubscriptionStore((s) => s.hasFeature)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const hasRole = useAuthStore((s) => s.hasRole)
  const isAuditor = useAuthStore((s) => s.isAuditor)
  const { t } = useTranslation()

  // Audit Pro hub: Enterprise plan, internal/external auditors, or superadmin (production audits still use `auditManagement`).
  const visibleModules = MANAGEMENT_MODULES.filter(
    (mod) =>
      (!mod.auditorHubOnly || isSuperAdmin || isAuditor() || hasFeature('auditProProgram')) &&
      (!mod.superadminOnly || isSuperAdmin) &&
      (!mod.minRole || isSuperAdmin || hasRole(mod.minRole)),
  )

  return (
    <AppLayout>
      <div className="app-page">
        <a
          className="app-page-back-link stx-click-feedback"
          href="/main-menu"
          onClick={(e) => { e.preventDefault(); navigate(-1) }}
        >
          <Icon name="arrow-left" size={16} /> Back
        </a>
        <div className="page-header">
          <h1 className="page-title">Management</h1>
          <p className="page-subtitle">Access all management modules from one place</p>
        </div>

        <AiInsightsCtaStrip context="management" />

        <div className="mgmt-hub-grid">
          {visibleModules.map((mod) => {
            const isUnlocked =
              mod.id === 'auditors-hub'
                ? isSuperAdmin || isAuditor() || hasFeature('auditProProgram')
                : !mod.featureKey || isSuperAdmin || hasFeature(mod.featureKey)
            return (
              <button
                key={mod.id}
                type="button"
                className={`mgmt-hub-card stx-click-feedback ${isUnlocked ? '' : 'mgmt-hub-locked'}`}
                onClick={() => {
                  if (isUnlocked) {
                    navigate(mod.path)
                  } else {
                    navigate('/plans')
                  }
                }}
              >
                <div className="mgmt-hub-card-icon">
                  <ModuleIcon icon={mod.icon} />
                </div>
                <div className="mgmt-hub-card-info">
                  <div className="mgmt-hub-card-title">
                    {mod.titleKey ? t(mod.titleKey) : mod.label}
                    {!isUnlocked && <LockIcon />}
                  </div>
                  <p className="mgmt-hub-card-desc">{mod.descriptionKey ? t(mod.descriptionKey) : mod.description}</p>
                </div>
                {!isUnlocked && (
                  <div className="mgmt-hub-card-badge">
                    {mod.planLabel}+ Plan
                  </div>
                )}
                {isUnlocked && (
                  <div className="mgmt-hub-card-arrow">
                    <Icon name="chevron-right" size={20} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
