import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import { useSubscriptionStore } from '../services/featureFlags'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n/useTranslation'
import '../styles/app-page.css'
import './ManagementHub.css'
import AiInsightsCtaStrip from '../components/AiInsightsCtaStrip'
import ManagementDashboardMetrics from '../components/management/ManagementDashboardMetrics'
import '../styles/managementShell.css'

/* ── Management modules definition ─────────────────────── */
const MANAGEMENT_MODULES = [
  {
    id: 'team',
    label: 'Team Management',
    description: 'Team members, roles, and access permissions',
    path: '/team',
    icon: 'team',
    featureKey: 'teamManagement',
    planLabel: 'Basic',
    minRole: 'admin',
  },
  {
    id: 'hr-space',
    label: 'HR Space',
    description: 'Workforce dashboards, qualifications, goals, HR documents, and training',
    titleKey: 'management.module.hrSpace.title',
    descriptionKey: 'management.module.hrSpace.description',
    path: '/hr-space',
    icon: 'profile',
    featureKey: 'productionManagement',
    planLabel: 'Premium',
    minRole: 'manager',
  },
  /** Former Forge tile position — Forum; Forge stays at `/forge` via direct link only. */
  {
    id: 'forum',
    label: 'Forum',
    description: 'Organization discussions and announcements',
    path: '/forum',
    icon: 'clipboard',
    featureKey: 'productionManagement',
    planLabel: 'Premium',
    minRole: 'manager',
  },
  {
    id: 'project',
    label: 'Project Management',
    description: 'Projects, Gantt, portfolio, and budgets',
    path: '/project-management',
    icon: 'folder',
    featureKey: null,
  },
  {
    id: 'rfq',
    label: 'RFQ',
    description: 'Procurement register and RFQ Intelligence — estimates, formal RFQs, and traceability',
    path: '/management/rfq',
    icon: 'procurement',
    featureKey: null,
  },
  {
    id: 'production',
    label: 'Production Management',
    description: 'OEE, quality KPIs, floor layout, and audit questionnaires',
    path: '/production',
    icon: 'production',
    featureKey: 'productionManagement',
    planLabel: 'Premium',
  },
  {
    id: 'cost',
    label: 'Cost Management',
    description: 'Cost calculator, BOM, scenarios, and targets',
    path: '/cost-management',
    icon: 'cost',
    featureKey: 'costManagement',
    planLabel: 'Premium',
  },
  {
    id: 'enterprise',
    label: 'Enterprise Management',
    description: 'OPEX/CAPEX, personnel, financial analysis, and risk',
    path: '/enterprise',
    icon: 'enterprise',
    featureKey: 'enterpriseManagement',
    planLabel: 'Enterprise',
  },
  {
    id: 'vendors',
    label: 'Vendor Master',
    description: 'Supplier master records, contacts, and status',
    path: '/vendors',
    icon: 'vendors',
    featureKey: null,
  },
  {
    id: 'auditors-hub',
    label: 'Audit management',
    description: 'Audit plans, registries, risk matrix, logs, and reports',
    path: '/management/auditors',
    icon: 'audit',
    featureKey: null,
    planLabel: 'Enterprise',
    auditorHubOnly: true,
  },
  {
    id: 'procurement',
    label: 'Procurement',
    description: 'Requisitions, POs, approvals, and traceability',
    path: '/procurement',
    icon: 'procurement',
    featureKey: 'procurement',
    planLabel: 'Enterprise',
  },
  {
    id: 'contracts',
    label: 'Contract Management',
    description: 'Contract lifecycle, renewals, and milestones',
    path: '/contracts',
    icon: 'contracts',
    featureKey: 'contractManagement',
    planLabel: 'Enterprise',
  },
  {
    id: 'spend',
    label: 'Spend Analysis',
    description: 'Spend by vendor, category, and time',
    path: '/spend-analysis',
    icon: 'cost',
    featureKey: 'spendAnalysis',
    planLabel: 'Enterprise',
    minRole: 'manager',
  },
  {
    id: 'compliance',
    label: 'Compliance & ESG',
    description: 'ESG checklists and regulatory templates',
    path: '/compliance',
    icon: 'compliance',
    featureKey: 'complianceEsg',
    planLabel: 'Enterprise',
  },
  {
    id: 'erp',
    label: 'ERP Integrations',
    description: 'ERP sync for vendors and purchasing',
    path: '/erp-integrations',
    icon: 'erp',
    featureKey: 'erpIntegrations',
    planLabel: 'Enterprise',
    minRole: 'admin',
  },
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    description: 'System events and platform audit trails',
    path: '/audit-logs',
    icon: 'audit',
    featureKey: 'auditLogs',
    planLabel: 'Enterprise',
    minRole: 'admin',
  },
  {
    id: 'ai-insights',
    label: 'AI Insights',
    description: 'Risk analysis, recommendations, and simulations',
    path: '/ai-insights',
    icon: 'ai',
    featureKey: 'aiInsights',
    planLabel: 'Enterprise',
    minRole: 'manager',
  },
]

/* ── Icon/Lock helpers using centralised Icon component ── */
const ModuleIcon = ({ icon }) => <Icon name={icon} size={22} />
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
        <div className="page-header">
          <h1 className="page-title">Management</h1>
          <p className="page-subtitle">Dashboard, KPIs, and access to all management modules</p>
        </div>

        <ManagementDashboardMetrics />

        <AiInsightsCtaStrip context="management" />

        <h2 className="stx-text-section" style={{ margin: '0 0 8px' }}>Management tools</h2>

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
