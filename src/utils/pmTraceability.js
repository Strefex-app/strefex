/**
 * Flat procurement register — one row per quotation (plus orphan POs).
 * Makes program → project → OPP → QUO → supplier → PO fully transparent.
 */

import { resolveVendorDisplay } from './vendorLinkage'

const EMPTY = '—'

function indexById(items) {
  const map = new Map()
  ;(items || []).forEach((item) => {
    if (item?.id) map.set(item.id, item)
  })
  return map
}

/**
 * @param {object} params
 * @param {object[]} params.opportunities
 * @param {object[]} params.quotations
 * @param {object[]} params.purchaseOrders
 * @param {object[]} [params.programs]
 * @param {object[]} [params.projects]
 * @param {object[]} [params.vendors]
 * @param {string} [params.programId] — filter
 * @param {string} [params.projectId] — filter
 */
export function buildProcurementTraceRows({
  opportunities = [],
  quotations = [],
  purchaseOrders = [],
  programs = [],
  projects = [],
  vendors = [],
  programId = null,
  projectId = null,
} = {}) {
  const programById = indexById(programs)
  const projectById = indexById(projects)
  const oppById = indexById(opportunities)
  const poById = indexById(purchaseOrders)
  const rows = []
  const quotedPoIds = new Set()

  quotations.forEach((q) => {
    const opp = oppById.get(q.opportunityId)
    const project = projectById.get(q.projectId) || projectById.get(opp?.projectId)
    const progId = q.programId || opp?.programId || project?.programId
    const program = programById.get(progId)
    const po = q.linkedPOId ? poById.get(q.linkedPOId) : null
    if (po?.id) quotedPoIds.add(po.id)

    const vendorInfo = resolveVendorDisplay(vendors, {
      vendorId: q.vendorId || po?.vendorId,
      vendorName: q.vendor || po?.vendorName,
      vendorNumber: q.vendorNumber || po?.vendorNumber,
    })

    const row = {
      id: q.id,
      programNumber: program?.programNumber || q.programNumber || opp?.programNumber || EMPTY,
      projectNumber: project?.projectNumber || q.projectNumber || opp?.projectNumber || EMPTY,
      projectName: project?.name || EMPTY,
      opportunityNumber: opp?.opportunityNumber || EMPTY,
      rfqNumber: opp?.rfqNumber || opp?.opportunityNumber || EMPTY,
      opportunityTitle: opp?.title || EMPTY,
      quotationNumber: q.quotationNumber || EMPTY,
      supplier: vendorInfo.supplier,
      vendorId: vendorInfo.vendorId,
      vendorNumber: vendorInfo.vendorNumber !== '—' ? vendorInfo.vendorNumber : EMPTY,
      vendorStatus: vendorInfo.vendorStatus || '',
      supplierQuotationRef: q.supplierQuotationRef || EMPTY,
      poNumber: po?.id || EMPTY,
      amount: q.amount ?? po?.totalAmount ?? 0,
      currency: q.currency || po?.currency || 'USD',
      quoteStatus: q.status || EMPTY,
      poStatus: po?.status || EMPTY,
      programId: progId || null,
      projectId: q.projectId || opp?.projectId || null,
      opportunityId: q.opportunityId || null,
      quotationId: q.id,
    }

    if (programId && row.programId !== programId) return
    if (projectId && row.projectId !== projectId) return
    rows.push(row)
  })

  purchaseOrders.forEach((po) => {
    if (quotedPoIds.has(po.id)) return
    const project = projectById.get(po.projectId)
    const program = programById.get(po.programId || project?.programId)
    const opp = po.opportunityId ? oppById.get(po.opportunityId) : null
    const quo = po.quotationId ? quotations.find((q) => q.id === po.quotationId) : null

    const vendorInfo = resolveVendorDisplay(vendors, {
      vendorId: po.vendorId || quo?.vendorId,
      vendorName: po.vendorName || quo?.vendor,
      vendorNumber: po.vendorNumber || quo?.vendorNumber,
    })

    const row = {
      id: `po-row-${po.id}`,
      programNumber: program?.programNumber || po.programNumber || EMPTY,
      projectNumber: project?.projectNumber || po.projectNumber || EMPTY,
      projectName: project?.name || EMPTY,
      opportunityNumber: opp?.opportunityNumber || EMPTY,
      rfqNumber: opp?.rfqNumber || opp?.opportunityNumber || EMPTY,
      opportunityTitle: opp?.title || po.title || EMPTY,
      quotationNumber: quo?.quotationNumber || EMPTY,
      supplier: vendorInfo.supplier,
      vendorId: vendorInfo.vendorId,
      vendorNumber: vendorInfo.vendorNumber !== '—' ? vendorInfo.vendorNumber : EMPTY,
      vendorStatus: vendorInfo.vendorStatus || '',
      supplierQuotationRef: quo?.supplierQuotationRef || EMPTY,
      poNumber: po.id || EMPTY,
      amount: po.totalAmount ?? 0,
      currency: po.currency || 'USD',
      quoteStatus: quo?.status || EMPTY,
      poStatus: po.status || EMPTY,
      programId: po.programId || project?.programId || null,
      projectId: po.projectId || null,
      opportunityId: po.opportunityId || null,
      quotationId: po.quotationId || null,
    }

    if (programId && row.programId !== programId) return
    if (projectId && row.projectId !== projectId) return
    rows.push(row)
  })

  return rows.sort((a, b) => {
    const pa = a.programNumber + a.projectNumber + a.opportunityNumber + a.quotationNumber
    const pb = b.programNumber + b.projectNumber + b.opportunityNumber + b.quotationNumber
    return pa.localeCompare(pb)
  })
}

/** Opportunities with no quotations yet — for completeness. */
export function buildOpenOpportunityRows({
  opportunities = [],
  quotations = [],
  programs = [],
  projects = [],
  programId = null,
  projectId = null,
} = {}) {
  const programById = indexById(programs)
  const projectById = indexById(projects)
  const quoteCountByOpp = new Map()
  quotations.forEach((q) => {
    quoteCountByOpp.set(q.opportunityId, (quoteCountByOpp.get(q.opportunityId) || 0) + 1)
  })

  return opportunities
    .filter((o) => !quoteCountByOpp.get(o.id))
    .filter((o) => !programId || o.programId === programId)
    .filter((o) => !projectId || o.projectId === projectId)
    .map((o) => {
      const project = projectById.get(o.projectId)
      const program = programById.get(o.programId || project?.programId)
      return {
        id: o.id,
        programNumber: program?.programNumber || o.programNumber || EMPTY,
        projectNumber: project?.projectNumber || o.projectNumber || EMPTY,
        projectName: project?.name || EMPTY,
        opportunityNumber: o.opportunityNumber || EMPTY,
        opportunityTitle: o.title || EMPTY,
        estimatedValue: o.estimatedValue ?? 0,
        currency: o.currency || 'USD',
        status: o.status || 'open',
      }
    })
}
