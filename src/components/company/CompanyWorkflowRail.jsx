import { Link } from 'react-router-dom'
import { useCompanyWorkflowProgress } from '../../hooks/useCompanyWorkflows'
import './CompanyWorkflowRail.css'

export default function CompanyWorkflowRail({
  chainId,
  subject,
  title,
}) {
  const progress = useCompanyWorkflowProgress(chainId, subject)
  if (!progress) return null
  const current = progress.steps[progress.currentIndex]
  return (
    <section className="cw-rail" aria-label={progress.label}>
      <div className="cw-rail__head">
        <div className="min-width-0">
          <h2 className="stx-text-heading">{title || progress.label}</h2>
          <p className="stx-text-caption stx-text-wrap">
            {progress.complete
              ? 'All steps in this chain are complete.'
              : `Next: ${current.label} · ${progress.doneCount} of ${progress.steps.length} done`}
          </p>
        </div>
        {!progress.complete && current?.path && (
          <Link className="cw-rail__continue" to={current.path}>Continue</Link>
        )}
      </div>
      <ol className="cw-rail__steps">
        {progress.steps.map((step, index) => {
          const state = step.done ? 'done' : (index === progress.currentIndex ? 'current' : 'todo')
          return (
            <li key={step.id} className={`cw-rail__step cw-rail__step--${state}`}>
              <Link to={step.path} className="cw-rail__link">
                <span className="cw-rail__index">{index + 1}</span>
                <span className="stx-text-caption stx-text-wrap">{step.label}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
