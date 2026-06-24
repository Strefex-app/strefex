/**
 * Manual cross-module links — each database stays separate; user picks records from dropdowns.
 */
import { useProjectStore } from '../store/projectStore'
import useProcurementStore from '../store/procurementStore'
import useContractStore from '../store/contractStore'

function projectContext(projectId) {
  const project = useProjectStore.getState().getProjectById(projectId)
  if (!project) return null
  return {
    projectId: project.id,
    projectNumber: project.projectNumber || '',
    currency: project.currency || 'USD',
  }
}

/** Link existing RFQ (opportunity) from procurement DB to a project. */
export function linkRfqToProject(rfqId, projectId) {
  const ctx = projectContext(projectId)
  if (!ctx || !rfqId) return false
  const store = useProcurementStore.getState()
  const opp = store.getOpportunityById(rfqId)
  if (!opp) return false
  store.updateOpportunity(rfqId, {
    projectId: ctx.projectId,
    projectNumber: ctx.projectNumber,
    programId: null,
    programNumber: '',
  })
  useProjectStore.getState().appendProjectLink(projectId, 'opportunityIds', rfqId)
  return true
}

/** Link existing PO from procurement DB to a project. */
export function linkPoToProject(poId, projectId) {
  const ctx = projectContext(projectId)
  if (!ctx || !poId) return false
  const store = useProcurementStore.getState()
  const po = store.purchaseOrders.find((p) => p.id === poId)
  if (!po) return false
  store.updatePurchaseOrder(poId, {
    projectId: ctx.projectId,
    projectNumber: ctx.projectNumber,
    programId: null,
    programNumber: '',
  })
  useProjectStore.getState().appendProjectLink(projectId, 'procurementIds', poId)
  return true
}

/** Link existing contract from contract DB to a project. */
export function linkContractToProject(contractId, projectId) {
  const ctx = projectContext(projectId)
  if (!ctx || !contractId) return false
  useContractStore.getState().updateContract(contractId, {
    projectId: ctx.projectId,
    projectNumber: ctx.projectNumber,
    programId: null,
  })
  useProjectStore.getState().appendProjectLink(projectId, 'contractIds', contractId)
  return true
}

/** RFQs not yet assigned to any project (available to link). */
export function listUnlinkedRfqs(opportunities = []) {
  return opportunities.filter((o) => !o.projectId)
}

/** POs not yet assigned to a project. */
export function listUnlinkedPurchaseOrders(purchaseOrders = []) {
  return purchaseOrders.filter((po) => !po.projectId)
}

/** Contracts not yet assigned to a project. */
export function listUnlinkedContracts(contracts = []) {
  return contracts.filter((c) => !c.projectId)
}
