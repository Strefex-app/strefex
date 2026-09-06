import useRfqStore from '../store/rfqStore'
import {
  DEFAULT_ASK_REQUIREMENTS,
  QUALITY_LEVELS,
} from './standardRfqSchema'
import { platformIndustryFromSourcing } from './intelligentSourcingData'
import { SUPPLIER_DATABASE } from '../data/supplierDatabase'
import { isSeededSupplierDirectoryEnabled } from '../config/supplierDataMode'
import { getIndustryQualityProfile } from '../data/industryQualityProfiles'

/**
 * Resolve invitee ids for rfqStore.sendRfq from Intelligent Sourcing shortlist.
 * Prefers platformId; falls back to supplier DB / registry name match; else stable invite id.
 */
export function resolveSourcingInvitees(payload = {}, registryAccounts = []) {
  const listed = Array.isArray(payload.suppliers) ? payload.suppliers : []
  const names = Array.isArray(payload.sel) && payload.sel.length
    ? payload.sel
    : listed.map((s) => s.name).filter(Boolean)

  const byName = new Map()
  registryAccounts.forEach((a) => {
    const n = String(a.company || a.name || '').trim().toLowerCase()
    if (n) byName.set(n, a.id || a.email)
  })
  if (isSeededSupplierDirectoryEnabled()) {
    SUPPLIER_DATABASE.forEach((s) => {
      const n = String(s.name || '').trim().toLowerCase()
      if (n && !byName.has(n)) byName.set(n, s.id)
    })
  }

  const ids = []
  const seen = new Set()
  const push = (id) => {
    const key = String(id || '').trim()
    if (!key || seen.has(key)) return
    seen.add(key)
    ids.push(key)
  }

  listed.forEach((s) => {
    if (s?.platformId) push(s.platformId)
    else if (s?.name) {
      const hit = byName.get(String(s.name).trim().toLowerCase())
      if (hit) push(hit)
      else push(`invite:${String(s.name).trim().toLowerCase().replace(/\s+/g, '-')}`)
    }
  })

  names.forEach((name) => {
    const hit = byName.get(String(name).trim().toLowerCase())
    if (hit) push(hit)
    else push(`invite:${String(name).trim().toLowerCase().replace(/\s+/g, '-')}`)
  })

  return ids
}

export function defaultQualityLevelForIndustry(industryId) {
  if (industryId === 'aerospace') return 'as9100'
  const primary = getIndustryQualityProfile(industryId).primaryStandardId
  return QUALITY_LEVELS.some((q) => q.id === primary) ? primary : 'iso_9001'
}

/** Build create-form initial draft from Network context (Sourcing / ES). */
export function buildBuyerRfqInitialDraft({
  industryId = '',
  categoryId = '',
  rfqType = 'product',
  title = '',
  supplierIds = [],
  itemName = '',
  targetUnitPrice = '',
  extraRequirements = {},
} = {}) {
  const covered = industryId ? [industryId] : []
  return {
    title,
    rfqType,
    categoryId: categoryId || '',
    supplierIds,
    requirements: {
      ...DEFAULT_ASK_REQUIREMENTS,
      ...(extraRequirements || {}),
      coveredIndustries: covered,
      qualityLevel: industryId
        ? (extraRequirements.qualityLevel || defaultQualityLevelForIndustry(industryId))
        : (extraRequirements.qualityLevel || ''),
      itemName: itemName || (categoryId ? String(categoryId).replace(/-/g, ' ') : ''),
      targetUnitPrice: targetUnitPrice || '',
    },
  }
}

export function buildNetworkRfqFromDraft(draft, {
  industryId,
  buyerEmail = '',
  buyerCompany = 'Buyer',
  plant = null,
  source = 'intelligent-sourcing',
} = {}) {
  const covered = Array.isArray(draft.requirements?.coveredIndustries)
    && draft.requirements.coveredIndustries.length
    ? draft.requirements.coveredIndustries
    : (draft.industryId || industryId ? [draft.industryId || industryId] : [])
  return {
    title: draft.title,
    rfqType: draft.rfqType || 'product',
    categoryId: draft.categoryId || '',
    requirements: {
      ...DEFAULT_ASK_REQUIREMENTS,
      ...(draft.requirements || {}),
      coveredIndustries: covered,
    },
    description: draft.description || '',
    deadline: draft.deadline || '',
    dueDate: draft.deadline || draft.dueDate || '',
    industryId: draft.industryId || industryId || covered[0] || '',
    suppliers: draft.supplierIds || [],
    attachments: (draft.attachments || []).map((a) => (typeof a === 'string' ? a : a.name)).filter(Boolean),
    buyerEmail,
    buyerCompany,
    requestSource: source,
    receivingPlant: plant
      ? { id: plant.id, name: plant.name, cc: plant.cc, lat: plant.lat, lon: plant.lon }
      : null,
  }
}

/**
 * Persist Network RFQ through the same store path as Executive Summary / Buyer Workspace.
 * @returns {{ ok: true, rfq: object } | { ok: false, error: string }}
 */
export function createAndSendNetworkRfq(draft, ctx = {}) {
  const rfqPayload = buildNetworkRfqFromDraft(draft, ctx)
  if (!rfqPayload.title?.trim()) {
    return { ok: false, error: 'Title is required.' }
  }
  if (!rfqPayload.industryId) {
    return { ok: false, error: 'Industry is required.' }
  }
  if (!rfqPayload.categoryId) {
    return { ok: false, error: 'Category is required.' }
  }
  if (!Array.isArray(rfqPayload.suppliers) || rfqPayload.suppliers.length === 0) {
    return { ok: false, error: 'Select at least one manufacturer.' }
  }
  const { addRfq, sendRfq, getRfqById } = useRfqStore.getState()
  const created = addRfq(rfqPayload)
  if (!created?.id) return { ok: false, error: 'Could not create RFQ.' }
  sendRfq(created.id)
  const sent = getRfqById(created.id) || created
  return { ok: true, rfq: sent }
}

export function sourcingContextFromPayload(payload = {}) {
  const industryId = platformIndustryFromSourcing(payload.industry) || payload.industry || ''
  const domain = payload.domain || 'product'
  const rfqType = domain === 'service' ? 'service' : domain === 'equipment' ? 'equipment' : 'product'
  const categoryId = payload.category || payload.subcat || ''
  const titleBits = [
    industryId ? String(industryId).replace(/-/g, ' ') : '',
    categoryId ? String(categoryId) : '',
  ].filter(Boolean)
  return {
    industryId,
    domain,
    rfqType,
    categoryId,
    suggestedTitle: titleBits.length
      ? `RFQ — ${titleBits.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(' / ')}`
      : 'Network RFQ',
    targetUnitPrice: payload.targetUnitPrice || payload.targetPrice || '',
  }
}

/** Full open-form context from a sourcing bridge payload. */
export function sourcingRfqOpenContext(payload = {}, registryAccounts = []) {
  const ctx = sourcingContextFromPayload(payload)
  const supplierIds = resolveSourcingInvitees(payload, registryAccounts)
  const shortlisted = (payload.suppliers || []).map((s, i) => ({
    id: s.platformId || supplierIds[i] || `invite:${s.name}`,
    name: s.name,
    country: s.cc,
    city: s.city,
  }))
  supplierIds.forEach((id) => {
    if (!shortlisted.some((s) => s.id === id)) {
      shortlisted.push({ id, name: id.startsWith('invite:') ? id.slice(7) : id })
    }
  })
  return {
    ...ctx,
    supplierIds,
    shortlisted,
    plant: payload.buyer || null,
    initialDraft: buildBuyerRfqInitialDraft({
      industryId: ctx.industryId,
      categoryId: ctx.categoryId,
      rfqType: ctx.rfqType,
      title: ctx.suggestedTitle,
      supplierIds,
      targetUnitPrice: ctx.targetUnitPrice,
    }),
  }
}
