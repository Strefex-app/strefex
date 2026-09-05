import useIatfControlStore from '../store/iatfControlStore'
import { COMMERCIAL_SPACE } from '../data/companyDatabaseSpaces'
import { companyDatabasePath } from './companyFolders'

/**
 * Ensure a Commercial space project binder document exists for an award.
 * Idempotent — reuses binderDocId on the award when present.
 */
export function ensureCommercialBinderForAward({
  award,
  projectId,
  title = '',
  buyerRef = '',
  rfqId = '',
} = {}) {
  if (!award?.id && !projectId) return { binderDocId: null, folderId: null, path: null }
  const store = useIatfControlStore.getState()
  store.ensureFolders()

  if (award?.binderDocId) {
    const existing = (store.documents || []).find((d) => d.id === award.binderDocId)
    if (existing) {
      return {
        binderDocId: existing.id,
        folderId: existing.folderId,
        path: companyDatabasePath(COMMERCIAL_SPACE, existing.folderId),
        already: true,
      }
    }
  }

  const binderTitle = title
    ? `Award binder · ${title}`
    : `Award binder · ${buyerRef || rfqId || projectId}`

  const doc = store.addDocument({
    title: binderTitle,
    type: 'project_binder',
    space: COMMERCIAL_SPACE,
    folderId: 'folder-com-01-active',
    department: 'Purchasing',
    status: 'approved',
    notes: [
      projectId ? `Project: ${projectId}` : '',
      rfqId ? `RFQ: ${rfqId}` : '',
      buyerRef ? `Buyer ref: ${buyerRef}` : '',
      award?.poId ? `PO: ${award.poId}` : '',
      award?.contractId ? `Contract: ${award.contractId}` : '',
    ].filter(Boolean).join(' · '),
  })

  if (award?.id) {
    store.updateAward(award.id, {
      binderDocId: doc.id,
      commercialFolderId: doc.folderId,
    })
  }

  return {
    binderDocId: doc.id,
    folderId: doc.folderId,
    path: companyDatabasePath(COMMERCIAL_SPACE, doc.folderId),
    already: false,
  }
}
