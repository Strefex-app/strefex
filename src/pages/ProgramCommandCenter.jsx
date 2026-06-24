import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useProgramStore } from '../store/programStore'
import { useProjectStore } from '../store/projectStore'
import useProcurementStore from '../store/procurementStore'
import useVendorStore from '../store/vendorStore'
import ControlPageHeader from '../components/pm/ControlPageHeader'
import ProcurementTracePanel from '../components/pm/ProcurementRegisterTable'
import { ReferenceId } from '../components/pm/ProcurementRegisterTable'
import ProjectControlPlaybook from '../components/pm/ProjectControlPlaybook'
import { buildProcurementTraceRows } from '../utils/pmTraceability'
import '../styles/app-page.css'
import '../styles/projectControl.css'

export default function ProgramCommandCenter() {
  const { programId } = useParams()
  const navigate = useNavigate()
  const programs = useProgramStore((s) => s.programs)
  const storeProjects = useProjectStore((s) => s.projects)
  const getProgramRollup = useProgramStore((s) => s.getProgramRollup)
  const opportunities = useProcurementStore((s) => s.opportunities)
  const quotations = useProcurementStore((s) => s.quotations)
  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const vendors = useVendorStore((s) => s.vendors)

  const projects = useMemo(
    () => useProjectStore.getState().getSafeProjects(),
    [storeProjects],
  )

  const rollup = useMemo(
    () => getProgramRollup(programId, projects),
    [programId, projects, getProgramRollup],
  )

  const traceRows = useMemo(
    () => buildProcurementTraceRows({
      opportunities, quotations, purchaseOrders, programs, projects, programId, vendors,
    }),
    [opportunities, quotations, purchaseOrders, programs, projects, programId, vendors],
  )

  const program = programs.find((p) => p.id === programId) || rollup.program

  if (!program) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-page-card">
            <p className="app-page-body">Program not found.</p>
            <button type="button" className="app-page-btn-outline" onClick={() => navigate('/project-management')}>
              Back to portfolio
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const cur = program.currency || 'USD'

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <ControlPageHeader
            trail={[
              { label: 'Project Management', to: '/project-management' },
              { label: program.programNumber },
            ]}
            title={program.name}
            subtitle={`Program portfolio · ${rollup.activeCount} active projects`}
            program={{ number: program.programNumber, name: program.name }}
            stage={program.stage}
            actions={(
              <>
                <button
                  type="button"
                  className="app-page-btn-primary app-page-btn-sm"
                  onClick={() => navigate(`/project-management/new-project?programId=${programId}`)}
                >
                  Add project
                </button>
                <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/project-management?view=portfolio')}>
                  Portfolio
                </button>
              </>
            )}
          />

          <ProjectControlPlaybook />

          <div className="pcc-budget-panel" style={{ marginBottom: 24 }}>
            <div className="pcc-budget-panel__metrics">
              <div className="pcc-budget-metric">
                <span className="pcc-budget-metric__label">Program target</span>
                <span className="pcc-budget-metric__value">
                  {program.budgetTarget != null ? `${cur} ${Number(program.budgetTarget).toLocaleString()}` : '—'}
                </span>
              </div>
              <div className="pcc-budget-metric">
                <span className="pcc-budget-metric__label">Σ project baselines</span>
                <span className="pcc-budget-metric__value">{cur} {rollup.sumBaseline.toLocaleString()}</span>
              </div>
              <div className="pcc-budget-metric">
                <span className="pcc-budget-metric__label">Σ actuals</span>
                <span className="pcc-budget-metric__value">{cur} {rollup.sumSpent.toLocaleString()}</span>
              </div>
              <div className="pcc-budget-metric">
                <span className="pcc-budget-metric__label">Projects</span>
                <span className="pcc-budget-metric__value">{rollup.projectCount}</span>
              </div>
            </div>
          </div>

          <h2 className="pcc-panel__title">Projects</h2>
          {rollup.projects.length === 0 ? (
            <p className="app-page-body">No projects in this program yet.</p>
          ) : (
            <div className="stx-fluid-table-wrap" style={{ marginBottom: 24 }}>
              <table className="stx-fluid-table">
                <thead>
                  <tr>
                    <th>Project number</th>
                    <th>Name</th>
                    <th>Stage</th>
                    <th>Baseline</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rollup.projects.map((p) => (
                    <tr key={p.id}>
                      <td><ReferenceId variant="active">{p.projectNumber || '—'}</ReferenceId></td>
                      <td className="stx-text-wrap">{p.name}</td>
                      <td>{p.stage || '—'}</td>
                      <td>{p.currency || cur} {(p.costControl?.baselineBudget ?? p.budget ?? 0).toLocaleString()}</td>
                      <td>
                        <button
                          type="button"
                          className="app-page-btn-outline app-page-btn-sm"
                          onClick={() => navigate(`/project-management/project/${p.id}/control`)}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ProcurementTracePanel
            rows={traceRows}
            currencyDefault={cur}
            title="Program procurement register"
            description="All opportunities, quotations, and POs across projects in this program."
            emptyMessage="No procurement documents linked to this program yet."
          />
        </div>
      </div>
    </AppLayout>
  )
}
