import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useProgramStore } from '../store/programStore'
import { useProjectStore } from '../store/projectStore'
import useProcurementStore from '../store/procurementStore'
import useVendorStore from '../store/vendorStore'
import ControlHubShell from '../components/pm/ControlHubShell'
import ControlPageHeader from '../components/pm/ControlPageHeader'
import ProcurementTracePanel from '../components/pm/ProcurementRegisterTable'
import ProjectControlPlaybook from '../components/pm/ProjectControlPlaybook'
import { buildProcurementTraceRows, buildOpenOpportunityRows } from '../utils/pmTraceability'
import '../styles/app-page.css'
import '../styles/projectControl.css'

export default function ControlHubOverview() {
  const navigate = useNavigate()
  const programs = useProgramStore((s) => s.programs)
  const storeProjects = useProjectStore((s) => s.projects)
  const opportunities = useProcurementStore((s) => s.opportunities)
  const quotations = useProcurementStore((s) => s.quotations)
  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const vendors = useVendorStore((s) => s.vendors)

  const projects = useMemo(
    () => useProjectStore.getState().getSafeProjects(),
    [storeProjects],
  )

  const traceRows = useMemo(
    () => buildProcurementTraceRows({
      opportunities, quotations, purchaseOrders, programs, projects, vendors,
    }),
    [opportunities, quotations, purchaseOrders, programs, projects, vendors],
  )

  const openOpps = useMemo(
    () => buildOpenOpportunityRows({ opportunities, quotations, programs, projects }),
    [opportunities, quotations, programs, projects],
  )

  const stats = useMemo(() => ({
    programs: programs.length,
    projects: projects.length,
    opportunities: opportunities.length,
    quotations: quotations.length,
    withPo: traceRows.filter((r) => r.poNumber !== '—').length,
    signedNoPo: traceRows.filter((r) => r.quoteStatus === 'signed' && r.poNumber === '—').length,
  }), [programs, projects, opportunities, quotations, traceRows])

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <ControlPageHeader
            trail={[{ label: 'Control hub' }]}
            title="Program & project control hub"
            subtitle="One place to see where data belongs — Project Management owns programs and budgets; Procurement owns sourcing documents."
            actions={(
              <>
                <button type="button" className="app-page-btn-primary app-page-btn-sm" onClick={() => navigate('/project-management/new-program')}>
                  New program
                </button>
                <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/procurement/new-opportunity')}>
                  New opportunity
                </button>
              </>
            )}
          />

          <ControlHubShell
            module="control-hub"
            scope={{ type: 'company', label: 'Company-wide' }}
            activeTab="overview"
          >
            <div className="pch-overview-grid">
              <section className="pch-overview-card pch-overview-card--pm">
                <h2 className="pch-overview-card__title">
                  <span className="pch-module-badge pch-module-badge--pm">Project Management</span>
                </h2>
                <p className="pch-overview-card__desc">
                  Programs ({stats.programs}), projects ({stats.projects}), budget baseline, schedule, and cost monitoring.
                </p>
                <ul className="pch-overview-card__list">
                  <li><strong>Program #</strong> — portfolio container (PGM-YYYY-NNN)</li>
                  <li><strong>Project #</strong> — deliverable under a program ({'{program}'}-P{'{NN}'})</li>
                  <li><strong>Budget &amp; baseline</strong> — locked at project command center</li>
                </ul>
                <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/project-management?view=portfolio')}>
                  Open portfolio
                </button>
              </section>

              <section className="pch-overview-card pch-overview-card--proc">
                <h2 className="pch-overview-card__title">
                  <span className="pch-module-badge pch-module-badge--proc">Procurement</span>
                </h2>
                <p className="pch-overview-card__desc">
                  {stats.opportunities} opportunities, {stats.quotations} quotations, {stats.withPo} linked POs.
                </p>
                <ul className="pch-overview-card__list">
                  <li><strong>OPP</strong> — sourcing request tied to a project</li>
                  <li><strong>QUO</strong> — supplier quotation with vendor reference</li>
                  <li><strong>PO</strong> — committed spend after signature</li>
                </ul>
                <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/procurement?tab=traceability')}>
                  Procurement register
                </button>
              </section>
            </div>

            <div className="pch-kpi-strip">
              <div className="pch-kpi">
                <span className="pch-kpi__label">Trace rows</span>
                <span className="pch-kpi__value">{traceRows.length}</span>
              </div>
              <div className="pch-kpi">
                <span className="pch-kpi__label">Open opportunities (no quote)</span>
                <span className="pch-kpi__value">{openOpps.length}</span>
              </div>
              <div className="pch-kpi">
                <span className="pch-kpi__label">Signed, awaiting PO</span>
                <span className="pch-kpi__value">{stats.signedNoPo}</span>
              </div>
            </div>

            <ProjectControlPlaybook />

            <ProcurementTracePanel
              rows={traceRows}
              title="Unified traceability register"
              description="Sort columns, filter by stage, export CSV, or click any row for module links and document detail."
              exportFilename="control-hub-traceability.csv"
              emptyMessage="No linked procurement yet. Create a program and project, then add an opportunity from Procurement or project control."
            />
          </ControlHubShell>
        </div>
      </div>
    </AppLayout>
  )
}
