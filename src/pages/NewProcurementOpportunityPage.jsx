import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useProjectStore } from '../store/projectStore'
import useProcurementStore from '../store/procurementStore'
import { ReferenceId } from '../components/pm/ProcurementRegisterTable'
import { currentYear, formatRfqNumber, nextSeqFromNumbers, rfqNumberPattern } from '../utils/pmNumbering'
import '../styles/app-page.css'
import '../styles/projectControl.css'
import '../styles/managementShell.css'

export default function NewProcurementOpportunityPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedProjectId = searchParams.get('projectId') || ''

  const storeProjects = useProjectStore((s) => s.projects)
  const createOpportunity = useProcurementStore((s) => s.createOpportunity)
  const opportunities = useProcurementStore((s) => s.opportunities)

  const projects = useMemo(
    () => useProjectStore.getState().getSafeProjects(),
    [storeProjects],
  )

  const [projectId, setProjectId] = useState(preselectedProjectId || '')
  const [title, setTitle] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [created, setCreated] = useState(null)

  const project = projects.find((p) => p.id === projectId)

  const rfqPreview = useMemo(() => {
    const year = currentYear()
    const seq = nextSeqFromNumbers(opportunities, rfqNumberPattern, year, 'rfqNumber')
    return formatRfqNumber(year, seq)
  }, [opportunities])

  const handleCreate = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const rfqId = createOpportunity({
      projectId: projectId || null,
      title: title.trim(),
      estimatedValue: Number(estimatedValue) || 0,
      currency: project?.currency || 'USD',
    })
    const opp = useProcurementStore.getState().getOpportunityById(rfqId)
    setCreated({
      rfqId,
      rfqNumber: opp?.rfqNumber || rfqPreview,
      opportunityNumber: opp?.opportunityNumber || '',
      projectId: projectId || null,
      projectNumber: project?.projectNumber || '',
    })
  }

  if (created) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-page-card">
            <h1 className="app-page-title">RFQ created</h1>
            <p className="app-page-subtitle">RFQ saved in Procurement. Link to a project anytime from project control or select project below on next RFQ.</p>
            <dl className="pcc-created-refs">
              <div className="pcc-created-refs__item">
                <dt>RFQ number</dt>
                <dd><ReferenceId variant="doc">{created.rfqNumber}</ReferenceId></dd>
              </div>
              <div className="pcc-created-refs__item">
                <dt>OPP number</dt>
                <dd><ReferenceId variant="doc">{created.opportunityNumber}</ReferenceId></dd>
              </div>
              {created.projectNumber ? (
                <div className="pcc-created-refs__item">
                  <dt>Linked project</dt>
                  <dd><ReferenceId variant="doc">{created.projectNumber}</ReferenceId></dd>
                </div>
              ) : null}
            </dl>
            <div className="pcc-toolbar-row">
              {created.projectId ? (
                <button type="button" className="app-page-btn-primary app-page-btn-sm" onClick={() => navigate(`/project-management/project/${created.projectId}/control`)}>
                  Open project
                </button>
              ) : null}
              <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/procurement?tab=traceability')}>
                Procurement register
              </button>
              <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/management/rfq/intelligence?tab=new')}>
                RFQ Intelligence
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
          <h1 className="app-page-title">New procurement RFQ</h1>
          <p className="app-page-subtitle">Official RFQ / OPP record in Procurement. Optionally link to a project — or estimate first in RFQ Intelligence.</p>

          <form onSubmit={handleCreate}>
            <div className="pcc-form-row">
              <label htmlFor="rfq-project">Link to project (optional)</label>
              <select id="rfq-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">— No project (link later) —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectNumber ? `${p.projectNumber} · ` : ''}{p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pcc-ref-header">
              <dl className="pcc-ref-header__grid">
                {project ? (
                  <div className="pcc-ref-header__item">
                    <dt>Project</dt>
                    <dd><ReferenceId variant="doc">{project.projectNumber || '—'}</ReferenceId></dd>
                  </div>
                ) : null}
                <div className="pcc-ref-header__item">
                  <dt>RFQ (preview)</dt>
                  <dd><ReferenceId variant="doc">{rfqPreview}</ReferenceId></dd>
                </div>
              </dl>
            </div>

            <div className="pcc-form-row">
              <label htmlFor="rfq-title">RFQ title *</label>
              <input id="rfq-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="What are you sourcing?" />
            </div>
            <div className="pcc-form-row">
              <label htmlFor="rfq-est">Estimated value</label>
              <input id="rfq-est" type="number" min="0" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
            </div>
            <div className="pcc-toolbar-row">
              <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate(SOURCING_CLUSTER_PATH)}>Cancel</button>
              <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/management/rfq/intelligence?tab=new')}>
                Estimate in Intelligence first
              </button>
              <button type="submit" className="app-page-btn-primary app-page-btn-sm">Create {rfqPreview}</button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
