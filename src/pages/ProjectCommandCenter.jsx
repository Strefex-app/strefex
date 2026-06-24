import { useMemo, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import ManagementBreadcrumb from '../components/management/ManagementBreadcrumb'
import { useAuthStore } from '../store/authStore'
import { useProjectStore } from '../store/projectStore'
import { useProgramStore } from '../store/programStore'
import useProcurementStore from '../store/procurementStore'
import useContractStore from '../store/contractStore'
import useVendorStore from '../store/vendorStore'
import ControlPageHeader from '../components/pm/ControlPageHeader'
import BudgetSummaryPanel from '../components/pm/BudgetSummaryPanel'
import ProcurementTracePanel, { ReferenceId } from '../components/pm/ProcurementRegisterTable'
import EntityLinkPanel from '../components/pm/EntityLinkPanel'
import { buildProcurementTraceRows } from '../utils/pmTraceability'
import { cadenceLabel, computeMonitoringState } from '../utils/pmEscalation'
import { attachQuotationDocument } from '../utils/pmWorkflowChain'
import '../styles/app-page.css'
import '../styles/projectControl.css'

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ProjectCommandCenter() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const isAdmin = role === 'admin' || role === 'superadmin'

  const project = useProjectStore((s) => s.getProjectById(projectId))
  const programs = useProgramStore((s) => s.programs)
  const storeProjects = useProjectStore((s) => s.projects)
  const getProjectStats = useProjectStore((s) => s.getProjectStats)
  const lockCostBaseline = useProjectStore((s) => s.lockCostBaseline)
  const unlockCostBaseline = useProjectStore((s) => s.unlockCostBaseline)
  const recordProjectReview = useProjectStore((s) => s.recordProjectReview)

  const opportunities = useProcurementStore((s) => s.opportunities)
  const quotations = useProcurementStore((s) => s.quotations)
  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const getCommittedForProject = useProcurementStore((s) => s.getCommittedForProject)
  const signQuotation = useProcurementStore((s) => s.signQuotation)
  const createPOFromQuotation = useProcurementStore((s) => s.createPOFromQuotation)
  const addQuotation = useProcurementStore((s) => s.addQuotation)
  const vendors = useVendorStore((s) => s.vendors)
  const contracts = useContractStore((s) => s.contracts)

  const [selectedRfqId, setSelectedRfqId] = useState('')
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [quoRef, setQuoRef] = useState('')
  const [quoAmount, setQuoAmount] = useState('')
  const [quoFile, setQuoFile] = useState(null)
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [flash, setFlash] = useState('')

  const projects = useMemo(
    () => useProjectStore.getState().getSafeProjects(),
    [storeProjects],
  )

  const projectRfqs = useMemo(
    () => opportunities.filter((o) => o.projectId === projectId),
    [opportunities, projectId],
  )

  const traceRows = useMemo(
    () => buildProcurementTraceRows({
      opportunities, quotations, purchaseOrders, programs, projects, projectId, vendors,
    }),
    [opportunities, quotations, purchaseOrders, programs, projects, projectId, vendors],
  )

  const stats = useMemo(() => (project ? getProjectStats(projectId) : null), [project, projectId, getProjectStats])
  const committed = useMemo(
    () => getCommittedForProject(projectId),
    [projectId, getCommittedForProject, quotations, purchaseOrders],
  )
  const monitoring = useMemo(
    () => (project ? computeMonitoringState(project) : null),
    [project],
  )

  const showFlash = useCallback((msg) => {
    setFlash(msg)
    setTimeout(() => setFlash(''), 3500)
  }, [])

  if (!project) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-page-card">
            <ManagementBreadcrumb trail={[{ label: 'Project Management', to: '/project-management' }, { label: 'Project not found' }]} />
            <p className="app-page-body">Project not found.</p>
            <Link to="/project-management" className="app-page-btn-outline app-page-btn-sm">Project Management</Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  const cur = project.currency || 'USD'
  const baseline = project.costControl?.baselineBudget ?? project.budget ?? 0
  const actuals = (stats?.totalCost || 0) + (project.costControl?.otherActuals || 0)
  const locked = Boolean(project.costControl?.baselineLockedAt)

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId)

  const handleAddQuotation = async () => {
    const oppId = selectedRfqId || projectRfqs[0]?.id
    if (!oppId) {
      showFlash('Link or create an RFQ first')
      return
    }
    const vendorName = selectedVendor?.general?.companyName || ''
    if (!vendorName.trim()) {
      showFlash('Select a vendor from Vendor Master')
      return
    }

    const quoId = addQuotation(oppId, {
      vendor: vendorName.trim(),
      vendorId: selectedVendorId,
      vendorNumber: selectedVendor?.vendorNumber || '',
      supplierQuotationRef: quoRef.trim(),
      amount: Number(quoAmount) || 0,
    })

    if (quoId && quoFile) {
      try {
        const dataUrl = await readFileAsDataUrl(quoFile)
        attachQuotationDocument(quoId, {
          name: quoFile.name,
          type: quoFile.type,
          size: quoFile.size,
          dataUrl,
        })
      } catch {
        showFlash('Quotation saved; file attachment failed')
        return
      }
    }

    setSelectedVendorId('')
    setQuoRef('')
    setQuoAmount('')
    setQuoFile(null)
    setShowQuoteForm(false)
    showFlash(quoFile ? 'Quotation and vendor document saved' : 'Quotation recorded')
  }

  const reviewLabel = monitoring
    ? `${cadenceLabel(monitoring.effectiveCadence)}${monitoring.nextReviewDue ? ` · due ${monitoring.nextReviewDue}` : ''}`
    : null

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <ControlPageHeader
            trail={[
              { label: 'Project Management', to: '/project-management' },
              { label: project.projectNumber || project.name },
            ]}
            title={project.name}
            subtitle={`Project ${project.projectNumber || '—'} — budget and linked records`}
            project={{ number: project.projectNumber || '—', name: project.name }}
            stage={project.stage}
            rag={project.portfolioRag}
            reviewLabel={reviewLabel}
            reviewOverdue={monitoring?.reviewOverdue}
            actions={(
              <>
                <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/project-management')}>
                  Schedule (Gantt)
                </button>
                <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/management/rfq/new?projectId=' + projectId)}>
                  New RFQ
                </button>
                <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => { recordProjectReview(projectId); showFlash('Status review recorded') }}>
                  Record review
                </button>
              </>
            )}
          />

          {flash ? <p className="pcc-flash" role="status">{flash}</p> : null}

          <div className="pcc-project-id-banner">
            <span className="pcc-project-id-banner__label">Project number</span>
            <ReferenceId variant="doc">{project.projectNumber || '—'}</ReferenceId>
          </div>

          {monitoring && monitoring.escalationLevel > 0 ? (
            <div className={`pcc-escalation${monitoring.escalationLevel >= 2 ? ' pcc-escalation--level2' : ''}`}>
              <p className="pcc-escalation__title">
                Risk escalation — {monitoring.escalationLevel >= 2 ? 'sponsor review required' : 'weekly monitoring active'}
              </p>
              <p className="pcc-escalation__body stx-text-wrap">{monitoring.escalationReason}</p>
            </div>
          ) : null}

          <EntityLinkPanel
            projectId={projectId}
            opportunities={opportunities}
            purchaseOrders={purchaseOrders}
            contracts={contracts}
            onLinked={showFlash}
          />

          <BudgetSummaryPanel
            currency={cur}
            baseline={baseline}
            actuals={actuals}
            committed={committed.total}
            locked={locked}
            lockedAt={project.costControl?.baselineLockedAt}
          />

          <div className="pcc-toolbar-row">
            {!locked ? (
              <button type="button" className="app-page-btn-primary app-page-btn-sm" onClick={() => { lockCostBaseline(projectId); showFlash('Baseline locked at Gate G2') }}>
                Lock baseline
              </button>
            ) : isAdmin ? (
              <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => { unlockCostBaseline(projectId); showFlash('Baseline unlocked') }}>
                Unlock baseline (admin)
              </button>
            ) : null}
            <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => setShowQuoteForm((v) => !v)}>
              Add quotation
            </button>
            <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/vendors')}>
              Vendor master
            </button>
            <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate('/contracts')}>
              Contracts
            </button>
          </div>

          {showQuoteForm ? (
            <div className="pcc-form-section">
              <h3 className="pcc-form-section__title">Record supplier quotation</h3>
              <p className="pcc-panel__desc">Select RFQ and vendor from their registers. Attach vendor PDF if available.</p>
              <div className="pcc-form-grid">
                <div className="pcc-form-row">
                  <label>RFQ *</label>
                  <select value={selectedRfqId || projectRfqs[0]?.id || ''} onChange={(e) => setSelectedRfqId(e.target.value)} required>
                    <option value="">Select RFQ…</option>
                    {projectRfqs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.rfqNumber || o.opportunityNumber} · {o.title}
                      </option>
                    ))}
                  </select>
                  {projectRfqs.length === 0 ? (
                    <span className="pcc-file-hint">No RFQ linked — use Link records above or create RFQ in Management.</span>
                  ) : null}
                </div>
                <div className="pcc-form-row">
                  <label>Vendor (Vendor Master) *</label>
                  <select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)} required>
                    <option value="">Select vendor…</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vendorNumber} · {v.general?.companyName || 'Unnamed'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pcc-form-row">
                  <label>Vendor quotation number</label>
                  <input value={quoRef} onChange={(e) => setQuoRef(e.target.value)} placeholder="Supplier's reference" />
                </div>
                <div className="pcc-form-row">
                  <label>Quoted amount ({cur})</label>
                  <input type="number" min="0" value={quoAmount} onChange={(e) => setQuoAmount(e.target.value)} />
                </div>
                <div className="pcc-form-row">
                  <label>Vendor document (PDF, etc.)</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    onChange={(e) => setQuoFile(e.target.files?.[0] || null)}
                  />
                  {quoFile ? <span className="pcc-file-hint stx-text-wrap">{quoFile.name}</span> : null}
                </div>
              </div>
              <div className="pcc-toolbar-row">
                <button type="button" className="app-page-btn-primary app-page-btn-sm" onClick={handleAddQuotation} disabled={!selectedVendorId && !projectRfqs.length}>
                  Save quotation
                </button>
                <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => setShowQuoteForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <ProcurementTracePanel
            rows={traceRows}
            currencyDefault={cur}
            showActions
            title="Linked procurement records"
            description="Trace view for records linked to this project. Create and link each module separately, then connect via dropdown above."
            onSignQuotation={(id) => { signQuotation(id); showFlash('Quotation marked signed') }}
            onCreatePO={(id) => {
              const poId = createPOFromQuotation(id)
              showFlash(poId ? `Purchase order ${poId} created` : 'Unable to create PO')
            }}
            emptyMessage="No linked records yet. Use Link records to connect RFQ, PO, or contract from their modules."
          />
        </div>
      </div>
    </AppLayout>
  )
}
