import { useProjectStore } from '../store/projectStore'
import useIatfControlStore from '../store/iatfControlStore'
import useRfqStore from '../store/rfqStore'
import useProcurementStore from '../store/procurementStore'
import { createContractFromQuotation } from './pmWorkflowChain'
import { ensureCommercialBinderForAward } from './awardCommercialBinder'

function sellerOnRfq(rfq, sellerId) {
  return (rfq?.sellerResponses || []).find((row) => String(row.sellerId) === String(sellerId)) || null
}

export function createCommercialSpineFromAward({ projectId, rfq, seller } = {}) {
  if (!projectId) return { opportunityId: null, quotationId: null, poId: null, contractId: null }
  const title = rfq?.title || `Awarded RFQ ${rfq?.buyerRefDisplay || rfq?.id || ''}`
  const opportunityId = useProcurementStore.getState().createOpportunity({
    projectId,
    title,
    estimatedValue: Number(seller?.price) || 0,
    category: rfq?.categoryId || 'General',
    description: `Created from marketplace award ${rfq?.buyerRefDisplay || rfq?.id || ''}`.trim(),
  })
  const quotationId = useProcurementStore.getState().addQuotation(opportunityId, {
    vendor: seller?.sellerName || seller?.sellerEmail || 'Awarded supplier',
    amount: Number(seller?.price) || 0,
    status: 'received',
  })
  if (!quotationId) return { opportunityId, quotationId: null, poId: null, contractId: null }
  useProcurementStore.getState().signQuotation(quotationId)
  const poId = useProcurementStore.getState().createPOFromQuotation(quotationId)
  const contractId = createContractFromQuotation(quotationId)
  return { opportunityId, quotationId, poId: poId || null, contractId: contractId || null }
}

function attachCommercial(projectId, rfqLike, sellerLike, award) {
  if (award?.poId && award?.contractId) {
    return {
      opportunityId: award.opportunityId,
      quotationId: award.quotationId,
      poId: award.poId,
      contractId: award.contractId,
    }
  }
  const commercial = createCommercialSpineFromAward({
    projectId,
    rfq: rfqLike,
    seller: sellerLike,
  })
  if (award?.id && (commercial.opportunityId || commercial.poId || commercial.contractId)) {
    useIatfControlStore.getState().updateAward(award.id, commercial)
  }
  return commercial
}

function attachBinder(result, { title = '', buyerRef = '', rfqId = '' } = {}) {
  if (!result?.ok || !result.projectId) return result
  const binder = ensureCommercialBinderForAward({
    award: result.award,
    projectId: result.projectId,
    title,
    buyerRef,
    rfqId,
  })
  const award = result.award?.id
    ? (useIatfControlStore.getState().awards || []).find((row) => row.id === result.award.id) || result.award
    : result.award
  return { ...result, award, binder }
}

export function createPlantProjectFromAward({
  rfqId,
  sellerId,
  sellerName = '',
  title = '',
  buyerRef = '',
  partId = '',
  price = 0,
  rfq = null,
} = {}) {
  if (!rfqId) return { ok: false, error: 'Missing RFQ' }
  const sellerLike = { sellerName, sellerId, price, sellerEmail: rfq?.sellerEmail }
  const rfqLike = rfq || { id: rfqId, title, buyerRefDisplay: buyerRef }

  const existing = (useIatfControlStore.getState().awards || []).find(
    (row) => row.rfqId === rfqId && row.projectId,
  )
  if (existing) {
    const commercial = attachCommercial(existing.projectId, rfqLike, sellerLike, existing)
    return attachBinder(
      { ok: true, already: true, projectId: existing.projectId, award: { ...existing, ...commercial }, ...commercial },
      { title, buyerRef, rfqId },
    )
  }

  const projectId = useProjectStore.getState().addProject({
    name: title ? `Award · ${title}` : `Award · ${buyerRef || rfqId}`,
    tags: ['rfq-award'],
    stage: 'charter',
    benefitNote: sellerName ? `Awarded to ${sellerName}` : '',
    links: { opportunityIds: [rfqId] },
  })

  const commercial = createCommercialSpineFromAward({
    projectId,
    rfq: rfqLike,
    seller: sellerLike,
  })

  const award = useIatfControlStore.getState().addAward({
    rfqId,
    sellerId,
    sellerName,
    projectId,
    partId,
    title,
    buyerRef,
    price,
    ...commercial,
  })

  return attachBinder(
    { ok: true, projectId, award, ...commercial },
    { title, buyerRef, rfqId },
  )
}

/** Buyer comparison: mark winner on the RFQ, then open a project binder in this tenant. */
export function awardRfqToProject({ rfqId, sellerId, partId = '' } = {}) {
  const rfq = useRfqStore.getState().awardRfq(rfqId, sellerId)
  if (!rfq) return { ok: false, error: 'RFQ or seller response not found' }
  const seller = sellerOnRfq(rfq, sellerId)
  return createPlantProjectFromAward({
    rfqId,
    sellerId,
    sellerName: seller?.sellerName || seller?.sellerEmail || '',
    title: rfq.title || '',
    buyerRef: rfq.buyerRefDisplay || '',
    partId,
    price: seller?.price || 0,
    rfq,
  })
}

/** Manufacturer: bind an already-awarded received RFQ to a plant project. */
export function bindReceivedAwardToPlant({ receivedRfqId, partId = '' } = {}) {
  const received = (useRfqStore.getState().receivedRfqs || []).find((row) => row.id === receivedRfqId)
  if (!received) return { ok: false, error: 'Received RFQ not found' }
  if (received.status !== 'awarded') return { ok: false, error: 'Not an awarded request' }
  return createPlantProjectFromAward({
    rfqId: received.rfqId,
    sellerId: received.sellerId,
    sellerName: received.sellerName || received.sellerCompany || '',
    title: received.title || '',
    buyerRef: received.buyerSplitRef || received.buyerRefDisplay || '',
    partId,
    rfq: {
      id: received.rfqId,
      title: received.title,
      buyerRefDisplay: received.buyerSplitRef || received.buyerRefDisplay,
      categoryId: received.categoryId,
      industryId: received.industryId,
    },
  })
}
