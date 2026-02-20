import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import { useSubscriptionStore } from '../services/featureFlags'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n/useTranslation'
import '../styles/app-page.css'
import './ManagementHub.css'

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
    id: 'project',
    label: 'Project Management',
    description: 'Create, track, and manage projects with tasks, Gantt charts, and resource allocation',
    path: '/project-management',
    icon: 'folder',
    featureKey: null, // available for all plans
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
    id: 'production',
    label: 'Production Management',
    description: 'OEE, quality KPIs, floor layout, certifications, audit questionnaires, and system management',
    path: '/production',
    icon: 'production',
    featureKey: 'productionManagement',
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
    id: 'ai-insights',
    label: 'AI Insights',
    description: 'Risk prediction, smart recommendations, spend anomalies, and procurement forecasting',
    path: '/ai-insights',
    icon: 'ai',
    featureKey: 'aiInsights',
    planLabel: 'Enterprise',
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
  const { t } = useTranslation()

  // Filter modules by role requirement (e.g. Team Management requires admin)
  const visibleModules = MANAGEMENT_MODULES.filter(
    (mod) => !mod.minRole || isSuperAdmin || hasRole(mod.minRole)
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

        <div className="mgmt-hub-grid">
          {visibleModules.map((mod) => {
            const isUnlocked = !mod.featureKey || isSuperAdmin || hasFeature(mod.featureKey)
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
                    {mod.label}
                    {!isUnlocked && <LockIcon />}
                  </div>
                  <p className="mgmt-hub-card-desc">{mod.description}</p>
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
