import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import CompanyWorkflowRail from '../components/company/CompanyWorkflowRail'
import { COMPANY_WORKFLOW_CHAINS } from '../data/companyWorkflows'
import { useCompanyWorkflowContext, useCompanyWorkflowInstances } from '../hooks/useCompanyWorkflows'
import { evaluateChain } from '../utils/companyWorkflowCompute'
import './CompanyWorkflowsHub.css'
import '../styles/app-page.css'
import '../pages/IatfControl.css'
import '../pages/QualityExcellence.css'

export default function CompanyWorkflowsHub() {
  const ctx = useCompanyWorkflowContext()
  const instances = useCompanyWorkflowInstances()

  return (
    <AppLayout>
      <div className="cw-page">
        <header className="cw-page__head">
          <div className="min-width-0">
            <h1 className="app-page-title">Company workflows</h1>
            <p className="stx-text-caption stx-text-wrap">
              Existing tools in order: people, quality, sourcing, and production.
              Completing a step unlocks the next module — nothing is a separate silo.
            </p>
          </div>
        </header>

        {COMPANY_WORKFLOW_CHAINS.map((chain) => (
          <CompanyWorkflowRail key={chain.id} chainId={chain.id} />
        ))}

        <section className="app-page-card">
          <h2 className="stx-text-heading">Open work in sequence</h2>
          {instances.length === 0 ? (
            <p className="stx-text-caption">No open workflow items. Hire someone, contain a lot, or award an RFQ to start a chain.</p>
          ) : (
            <ul className="cw-list">
              {instances.map((row) => (
                <li key={row.id}>
                  <Link className="cw-list__link stx-click-feedback" to={row.path}>
                    <strong className="stx-text-wrap">{row.title}</strong>
                    <span className="stx-text-caption stx-text-wrap">
                      {row.hint} · {row.doneCount}/{row.total}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="app-page-card">
          <h2 className="stx-text-heading">People currently in the hire chain</h2>
          {(ctx.employees || []).length === 0 ? (
            <p className="stx-text-caption">No employees yet. Start from workforce planning.</p>
          ) : (
            <ul className="cw-list">
              {ctx.employees.map((employee) => {
                const progress = evaluateChain('people-hire', ctx, employee)
                const current = progress.steps[progress.currentIndex]
                return (
                  <li key={employee.id}>
                    <Link className="cw-list__link stx-click-feedback" to={current.path}>
                      <strong>{employee.name}</strong>
                      <span className="stx-text-caption stx-text-wrap">
                        {progress.complete ? 'HR chain complete' : current.label}
                        {' · '}
                        {employee.department || 'No department'}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
