import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useProjectStore } from '../store/projectStore'
import ManagementBreadcrumb from '../components/management/ManagementBreadcrumb'
import { ReferenceId } from '../components/pm/ProcurementRegisterTable'
import { currentYear, formatStandaloneProjectNumber, nextSeqFromNumbers, standaloneProjectNumberPattern } from '../utils/pmNumbering'
import '../styles/app-page.css'
import '../styles/projectControl.css'
import '../styles/managementShell.css'

export default function NewProjectPage() {
  const navigate = useNavigate()

  const addProject = useProjectStore((s) => s.addProject)
  const lockCostBaseline = useProjectStore((s) => s.lockCostBaseline)
  const projects = useProjectStore((s) => s.projects)

  const [name, setName] = useState('')
  const [sponsor, setSponsor] = useState('')
  const [budget, setBudget] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [lockBaseline, setLockBaseline] = useState(false)
  const [created, setCreated] = useState(null)

  const previewNumber = useMemo(() => {
    const year = currentYear()
    const seq = nextSeqFromNumbers(projects, standaloneProjectNumberPattern, year, 'projectNumber')
    return formatStandaloneProjectNumber(year, seq)
  }, [projects])

  const handleCreate = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const budgetNum = Number(budget) || 0
    const id = addProject({
      name: name.trim(),
      sponsor: sponsor.trim(),
      budget: budgetNum,
      currency,
      stage: lockBaseline ? 'baseline' : 'charter',
      costControl: {
        baselineBudget: budgetNum,
        baselineLockedAt: null,
        baselineLockedBy: null,
        contingencyPct: 10,
        approvedChanges: 0,
        otherActuals: 0,
      },
    })
    if (lockBaseline) lockCostBaseline(id)
    const project = useProjectStore.getState().getProjectById(id)
    setCreated({ projectId: id, projectNumber: project?.projectNumber || previewNumber })
  }

  if (created) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-page-card">
            <ManagementBreadcrumb trail={[{ label: 'Project Management', to: '/project-management' }, { label: 'New project' }]} />
            <h1 className="app-page-title">Project created</h1>
            <p className="app-page-subtitle">Project number assigned. Link RFQ, vendors, and other records from project control when ready.</p>
            <dl className="pcc-created-refs">
              <div className="pcc-created-refs__item">
                <dt>Project number</dt>
                <dd><ReferenceId variant="doc">{created.projectNumber}</ReferenceId></dd>
              </div>
            </dl>
            <div className="pcc-toolbar-row">
              <button type="button" className="app-page-btn-primary app-page-btn-sm" onClick={() => navigate(`/project-management/project/${created.projectId}/control`)}>
                Open project
              </button>
              <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/management/rfq/new')}>
                Create RFQ separately
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <ManagementBreadcrumb trail={[{ label: 'Project Management', to: '/project-management' }, { label: 'New project' }]} />
          <h1 className="app-page-title">New project</h1>
          <p className="app-page-subtitle">Creates a project record only. Link RFQ and other modules later via dropdown.</p>

          <form onSubmit={handleCreate}>
            <div className="pcc-form-row">
              <label>Project number (next)</label>
              <input type="text" value={previewNumber} readOnly aria-readonly />
            </div>
            <div className="pcc-form-row">
              <label htmlFor="proj-name">Project name *</label>
              <input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="pcc-form-row">
              <label htmlFor="proj-sponsor">Sponsor</label>
              <input id="proj-sponsor" value={sponsor} onChange={(e) => setSponsor(e.target.value)} />
            </div>
            <div className="pcc-form-row">
              <label htmlFor="proj-budget">Baseline budget</label>
              <input id="proj-budget" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div className="pcc-form-row">
              <label htmlFor="proj-currency">Currency</label>
              <select id="proj-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <label className="app-page-body">
              <input type="checkbox" checked={lockBaseline} onChange={(e) => setLockBaseline(e.target.checked)} />
              {' '}Lock baseline at Gate G2 on create (admin can unlock later)
            </label>
            <div className="pcc-wizard-actions">
              <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/management')}>Cancel</button>
              <button type="submit" className="app-page-btn-primary app-page-btn-sm">Create project</button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
