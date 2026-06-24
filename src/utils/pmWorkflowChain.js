/**
 * Project → RFQ (OPP) → Vendor → Quotation → Contract → PO chain orchestration.
 * Keeps project.links and cross-module IDs in sync.
 */
import { useProgramStore } from '../store/programStore'
import { useProjectStore } from '../store/projectStore'
import useProcurementStore from '../store/procurementStore'
import useContractStore from '../store/contractStore'
import useVendorStore from '../store/vendorStore'
import { ensureVendorFromProcurement } from './vendorLinkage'

export function ensureDefaultProgram() {
  const store = useProgramStore.getState()
  if (store.programs.length > 0) return store.programs[0].id
  return store.addProgram({ name: 'General portfolio', stage: 'active' })
}

export function appendProjectLink(projectId, entityType, entityId) {
  const fieldMap = {
    opportunity: 'opportunityIds',
    rfq: 'opportunityIds',
    quotation: 'quotationIds',
    po: 'procurementIds',
    contract: 'contractIds',
  }
  const field = fieldMap[entityType]
  if (!field) return
  useProjectStore.getState().appendProjectLink(projectId, field, entityId)
}

/**
 * Create project and auto-create linked RFQ (OPP).
 */
export function createProjectWithRfq(projectData = {}, rfqData = {}) {
  const programId = projectData.programId || ensureDefaultProgram()
  const projectId = useProjectStore.getState().addProject({ ...projectData, programId })
  const project = useProjectStore.getState().getProjectById(projectId)

  const rfqId = useProcurementStore.getState().createOpportunity({
    projectId,
    title: rfqData.title || `RFQ — ${project?.name || projectData.name || 'New project'}`,
    description: rfqData.description || 'Auto-created with project — add vendors and quotations next.',
    estimatedValue: rfqData.estimatedValue ?? projectData.budget ?? 0,
    currency: project?.currency || projectData.currency || 'USD',
    category: rfqData.category || 'General',
  })

  const opp = useProcurementStore.getState().getOpportunityById(rfqId)
  useProjectStore.getState().updateProject(projectId, {
    primaryRfqId: rfqId,
  })

  return {
    projectId,
    projectNumber: project?.projectNumber || '',
    rfqId,
    rfqNumber: opp?.rfqNumber || opp?.opportunityNumber || '',
    opportunityNumber: opp?.opportunityNumber || '',
  }
}

/**
 * Create RFQ; if no projectId, create project first.
 */
export function createRfqWithProject({
  projectId = null,
  projectName = '',
  programId = null,
  title,
  estimatedValue = 0,
  currency = 'USD',
  category = 'General',
} = {}) {
  if (projectId) {
    const rfqId = useProcurementStore.getState().createOpportunity({
      projectId,
      title,
      estimatedValue,
      currency,
      category,
    })
    const project = useProjectStore.getState().getProjectById(projectId)
    const opp = useProcurementStore.getState().getOpportunityById(rfqId)
    return {
      projectId,
      projectNumber: project?.projectNumber || '',
      rfqId,
      rfqNumber: opp?.rfqNumber || opp?.opportunityNumber || '',
      createdProject: false,
    }
  }

  const name = (projectName || title || 'New project').trim()
  const result = createProjectWithRfq(
    {
      name,
      programId: programId || ensureDefaultProgram(),
      budget: estimatedValue,
      currency,
      stage: 'charter',
    },
    { title, estimatedValue, currency, category },
  )
  return { ...result, createdProject: true }
}

/** Attach vendor PDF/file to quotation and vendor master. */
export function attachQuotationDocument(quotationId, fileMeta) {
  const store = useProcurementStore.getState()
  const q = store.getQuotationById(quotationId)
  if (!q || !fileMeta?.name) return null

  const attachment = {
    id: `att-${Date.now()}`,
    name: fileMeta.name,
    type: fileMeta.type || 'application/pdf',
    size: fileMeta.size || 0,
    dataUrl: fileMeta.dataUrl || '',
    uploadedAt: new Date().toISOString(),
  }

  store.updateQuotation(quotationId, {
    attachments: [...(q.attachments || []), attachment],
  })

  if (q.vendorId) {
    useVendorStore.getState().addDocument(q.vendorId, {
      name: fileMeta.name,
      type: fileMeta.type || 'quotation',
      size: fileMeta.size,
      refType: 'quotation',
      refId: quotationId,
      refLabel: q.quotationNumber,
    })
  }

  return attachment.id
}

export function createContractFromQuotation(quotationId) {
  const q = useProcurementStore.getState().getQuotationById(quotationId)
  if (!q) return null
  const opp = useProcurementStore.getState().getOpportunityById(q.opportunityId)
  const project = useProjectStore.getState().getProjectById(q.projectId)

  const contractId = useContractStore.getState().addContract({
    title: `Supply — ${q.vendor || project?.name || q.quotationNumber}`,
    type: 'supply',
    status: 'draft',
    vendorId: q.vendorId || '',
    vendorName: q.vendor || '',
    value: q.amount ?? 0,
    currency: q.currency || 'USD',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    projectId: q.projectId,
    projectNumber: q.projectNumber || project?.projectNumber || '',
    programId: q.programId || project?.programId || '',
    opportunityId: q.opportunityId,
    rfqNumber: opp?.rfqNumber || opp?.opportunityNumber || '',
    quotationId: q.id,
    quotationNumber: q.quotationNumber,
    notes: `Created from signed quotation ${q.quotationNumber}.`,
  })

  if (contractId && q.projectId) {
    appendProjectLink(q.projectId, 'contract', contractId)
    useProcurementStore.getState().updateQuotation(quotationId, { linkedContractId: contractId })
  }

  return contractId
}

export function getProjectWorkflowSteps(project, { opportunities = [], quotations = [], purchaseOrders = [], contracts = [] } = {}) {
  const projectOpps = opportunities.filter((o) => o.projectId === project?.id)
  const projectQuotes = quotations.filter((q) => q.projectId === project?.id)
  const projectPos = purchaseOrders.filter((po) => po.projectId === project?.id)
  const projectContracts = contracts.filter((c) => c.projectId === project?.id)

  const hasRfq = projectOpps.length > 0
  const hasVendor = projectQuotes.some((q) => q.vendor && q.vendor !== '—')
  const hasQuote = projectQuotes.length > 0
  const signedQuote = projectQuotes.some((q) => q.status === 'signed')
  const hasContract = projectContracts.length > 0
  const hasPo = projectPos.length > 0
  const approvedPo = projectPos.some((po) => po.status === 'approved' || po.status === 'completed')

  return [
    { id: 'project', label: 'Project', number: project?.projectNumber, done: Boolean(project?.projectNumber), href: project?.id ? `/project-management/project/${project.id}/control` : null },
    { id: 'rfq', label: 'RFQ', number: projectOpps[0]?.rfqNumber || projectOpps[0]?.opportunityNumber, done: hasRfq, href: project?.id ? `/management/rfq/new?projectId=${project.id}` : '/management/rfq/new' },
    { id: 'vendor', label: 'Vendor', number: projectQuotes.find((q) => q.vendorNumber)?.vendorNumber, done: hasVendor, href: '/vendors' },
    { id: 'quotation', label: 'Quotation', number: projectQuotes[0]?.quotationNumber, done: hasQuote, href: project?.id ? `/project-management/project/${project.id}/control` : null },
    { id: 'audit', label: 'Audit', number: signedQuote ? 'Ready' : '—', done: signedQuote, href: '/management/auditors' },
    { id: 'contract', label: 'Contract', number: projectContracts[0]?.id, done: hasContract, href: '/contracts' },
    { id: 'po', label: 'PO', number: projectPos[0]?.id, done: hasPo, href: '/procurement?tab=purchase-orders' },
    { id: 'spend', label: 'Spend', number: approvedPo ? 'Tracked' : '—', done: approvedPo, href: '/spend-analysis' },
  ]
}
