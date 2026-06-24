import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import ManagementBreadcrumb from '../components/management/ManagementBreadcrumb'
import {
  RFQ_HUB_PATH,
  RFQ_INTELLIGENCE_PATH,
  RFQ_PROCUREMENT_NEW_PATH,
} from '../constants/rfqPaths'
import '../styles/app-page.css'
import '../styles/managementShell.css'
import './RfqManagementHub.css'

const RFQ_MODULES = [
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
  },
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
  },
]

export default function RfqManagementHub() {
  const navigate = useNavigate()

  return (
    <AppLayout>
      <div className="app-page rfq-hub">
        <ManagementBreadcrumb trail={[{ label: 'RFQ' }]} />

        <div className="app-page-card rfq-hub__intro">
          <h1 className="app-page-title">RFQ</h1>
          <p className="app-page-subtitle">
            Two complementary tools — one official procurement register, one manufacturing intelligence workspace.
            Both stay in Management; choose the flow that matches your step in the sourcing cycle.
          </p>
        </div>

        <div className="rfq-hub__grid">
          {RFQ_MODULES.map((mod) => (
            <div key={mod.id} className={`rfq-hub-card rfq-hub-card--${mod.tone}`}>
              <div className="rfq-hub-card__head">
                <span className={`rfq-hub-card__icon rfq-hub-card__icon--${mod.tone}`}>
                  <Icon name={mod.icon} size={22} />
                </span>
                <div className="min-width-0">
                  <h2 className="rfq-hub-card__title">{mod.title}</h2>
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
                  onClick={() => navigate(mod.path)}
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
                ) : (
                  <button
                    type="button"
                    className="app-page-btn-outline app-page-btn-sm"
                    onClick={() => navigate(`${RFQ_INTELLIGENCE_PATH}?tab=quotes`)}
                  >
                    Saved quotes
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="app-page-card rfq-hub__compare">
          <h2 className="stx-text-section">How they work together</h2>
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
              <strong>Source &amp; trace</strong>
              {' — '}
              Add vendor quotations, link vendors from Vendor Master, and track through to PO in Procurement or project control.
            </li>
          </ol>
        </div>
      </div>
    </AppLayout>
  )
}
