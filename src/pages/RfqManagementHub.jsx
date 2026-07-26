import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import ManagementBreadcrumb from '../components/management/ManagementBreadcrumb'
import { useSubscriptionStore } from '../services/featureFlags'
import { useAuthStore } from '../store/authStore'
import {
  RFQ_INTELLIGENCE_PATH,
  RFQ_PROCUREMENT_NEW_PATH,
  SOURCING_CLUSTER_PATH,
} from '../constants/rfqPaths'
import { MANAGEMENT_OVERVIEW_PATH } from '../constants/managementPaths'
import '../styles/app-page.css'
import '../styles/managementShell.css'
import './RfqManagementHub.css'

const SOURCING_MODULES = [
  {
    id: 'intelligence',
    title: 'RFQ Intelligence',
    subtitle: 'Manufacturing estimate & quotes',
    description:
      'Wizard for part costing (process, material, tooling), saved quote library, incoming RFQ queue, and standalone calculator. Estimates can feed Enterprise CAPEX planning.',
    when: 'Use when you need should-cost / make-buy estimates before or alongside a formal RFQ.',
    path: RFQ_INTELLIGENCE_PATH,
    cta: 'Open RFQ Intelligence',
    icon: 'ai',
    tone: 'intel',
    featureKey: null,
  },
  {
    id: 'register',
    title: 'Procurement register',
    subtitle: 'Formal RFQ / OPP record',
    description:
      'Creates numbered RFQ and OPP entries in the Procurement database. Link to a project, then add vendor quotations and POs through project control or the procurement trace register.',
    when: 'Use when you need traceability: project → RFQ → quotation → PO.',
    path: RFQ_PROCUREMENT_NEW_PATH,
    cta: 'Create procurement RFQ',
    icon: 'procurement',
    tone: 'proc',
    featureKey: null,
  },
  {
    id: 'procurement',
    title: 'Procurement workspace',
    subtitle: 'Requisitions, POs & approvals',
    description:
      'Enterprise requisition intake, purchase orders, approval chains, and spend traceability. Connects register entries to vendor quotations and PO fulfillment.',
    when: 'Use when requisitions and PO workflows need manager approval and audit trail.',
    path: '/procurement',
    cta: 'Open procurement',
    icon: 'contracts',
    tone: 'proc',
    featureKey: 'procurement',
    planLabel: 'Enterprise',
  },
]

export default function RfqManagementHub() {
  const navigate = useNavigate()
  const hasFeature = useSubscriptionStore((s) => s.hasFeature)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')

  const isUnlocked = (mod) => !mod.featureKey || isSuperAdmin || hasFeature(mod.featureKey)

  return (
    <AppLayout>
      <div className="app-page rfq-hub">
        <ManagementBreadcrumb trail={[
          { label: 'Overview', to: MANAGEMENT_OVERVIEW_PATH },
          { label: 'Sourcing', to: SOURCING_CLUSTER_PATH },
          { label: 'Workspace' },
        ]} />

        <div className="app-page-card rfq-hub__intro">
          <h1 className="app-page-title">Sourcing</h1>
          <p className="app-page-subtitle">
            One flow for manufacturing intelligence, formal RFQ registration, and procurement operations.
            Start with an estimate, register the opportunity, then run requisitions and POs through to traceability.
          </p>
        </div>

        <div className="rfq-hub__grid">
          {SOURCING_MODULES.map((mod) => {
            const unlocked = isUnlocked(mod)
            return (
              <div key={mod.id} className={`rfq-hub-card rfq-hub-card--${mod.tone}`}>
                <div className="rfq-hub-card__head">
                  <span className={`rfq-hub-card__icon rfq-hub-card__icon--${mod.tone}`}>
                    <Icon name={mod.icon} size={22} />
                  </span>
                  <div className="min-width-0">
                    <h2 className="rfq-hub-card__title">
                      {mod.title}
                      {!unlocked && mod.planLabel ? (
                        <span className="rfq-hub-card__lock-badge">{mod.planLabel}+</span>
                      ) : null}
                    </h2>
                    <p className="rfq-hub-card__subtitle">{mod.subtitle}</p>
                  </div>
                </div>
                <p className="rfq-hub-card__body stx-text-wrap">{mod.description}</p>
                <p className="rfq-hub-card__when stx-text-wrap">
                  <strong>When:</strong>
                  {' '}
                  {mod.when}
                </p>
                <div className="rfq-hub-card__actions">
                  <button
                    type="button"
                    className="app-page-btn-primary app-page-btn-sm"
                    onClick={() => {
                      if (unlocked) navigate(mod.path)
                      else navigate('/plans')
                    }}
                  >
                    {mod.cta}
                  </button>
                  {mod.id === 'register' ? (
                    <button
                      type="button"
                      className="app-page-btn-outline app-page-btn-sm"
                      onClick={() => navigate('/procurement?tab=traceability')}
                    >
                      View register
                    </button>
                  ) : mod.id === 'intelligence' ? (
                    <button
                      type="button"
                      className="app-page-btn-outline app-page-btn-sm"
                      onClick={() => navigate(`${RFQ_INTELLIGENCE_PATH}?tab=quotes`)}
                    >
                      Saved quotes
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="app-page-btn-outline app-page-btn-sm"
                      onClick={() => navigate('/procurement?tab=requisitions')}
                    >
                      Requisitions
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="app-page-card rfq-hub__compare">
          <h2 className="stx-text-section">Sourcing cycle</h2>
          <ol className="rfq-hub__steps">
            <li>
              <strong>Estimate first (optional)</strong>
              {' — '}
              RFQ Intelligence builds part cost, tooling, and quote drafts from process and material inputs.
            </li>
            <li>
              <strong>Register the RFQ</strong>
              {' — '}
              Procurement register assigns RFQ / OPP numbers and stores the official record; optionally link a project.
            </li>
            <li>
              <strong>Source, approve &amp; trace</strong>
              {' — '}
              Run requisitions and POs in Procurement, link vendors from Vendor Master, and track through project control.
            </li>
          </ol>
        </div>
      </div>
    </AppLayout>
  )
}
