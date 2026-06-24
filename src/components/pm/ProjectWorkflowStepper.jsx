import { Link } from 'react-router-dom'
import { ReferenceId } from './ProcurementRegisterTable'
import '../../styles/projectControl.css'

/**
 * Kid-simple visual path: Project → RFQ → Vendor → Quotation → Audit → Contract → PO → Spend
 */
export default function ProjectWorkflowStepper({ steps = [] }) {
  if (!steps.length) return null

  return (
    <nav className="pcc-workflow" aria-label="Project workflow">
      <p className="pcc-workflow__intro">Follow the chain left to right — each step creates the next number automatically.</p>
      <ol className="pcc-workflow__list">
        {steps.map((step, i) => (
          <li key={step.id} className={`pcc-workflow__step${step.done ? ' is-done' : ''}`}>
            {i > 0 ? <span className="pcc-workflow__chev" aria-hidden>→</span> : null}
            <div className="pcc-workflow__card">
              <span className="pcc-workflow__label">{step.label}</span>
              {step.href && step.number && step.number !== '—' ? (
                <Link to={step.href} className="pcc-workflow__link">
                  <ReferenceId variant="doc">{step.number}</ReferenceId>
                </Link>
              ) : (
                <ReferenceId variant={step.number && step.number !== '—' ? 'doc' : 'empty'}>
                  {step.number || (step.done ? 'Done' : 'Next')}
                </ReferenceId>
              )}
              {step.done ? <span className="pcc-workflow__check" aria-label="Complete">✓</span> : null}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}
