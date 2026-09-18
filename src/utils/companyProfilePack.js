import { PROFILE_ATTACHMENT_SLOT, PROFILE_ATTACHMENT_SLOT_LABELS } from '../constants/companyProfileDirectory'

/** Buyer-facing company pack — one file per slot. */
export const COMPANY_PACK_SLOTS = [
  {
    id: PROFILE_ATTACHMENT_SLOT.COMPANY_PRESENTATION,
    shortLabel: 'Presentation',
    label: PROFILE_ATTACHMENT_SLOT_LABELS[PROFILE_ATTACHMENT_SLOT.COMPANY_PRESENTATION],
    hint: 'PDF or PowerPoint deck purchasing can open before RFQ.',
    accept: '.pdf,.ppt,.pptx,application/pdf',
    required: true,
  },
  {
    id: PROFILE_ATTACHMENT_SLOT.COMPANY_PROFILE_DOC,
    shortLabel: 'Company profile',
    label: PROFILE_ATTACHMENT_SLOT_LABELS[PROFILE_ATTACHMENT_SLOT.COMPANY_PROFILE_DOC],
    hint: 'One-pager or profile PDF / PowerPoint.',
    accept: '.pdf,.ppt,.pptx,application/pdf',
    required: false,
  },
  {
    id: PROFILE_ATTACHMENT_SLOT.PRODUCT_PORTFOLIO_DOC,
    shortLabel: 'Product portfolio',
    label: PROFILE_ATTACHMENT_SLOT_LABELS[PROFILE_ATTACHMENT_SLOT.PRODUCT_PORTFOLIO_DOC],
    hint: 'Product / capability portfolio PDF or PowerPoint.',
    accept: '.pdf,.ppt,.pptx,application/pdf',
    required: false,
  },
]

export const COMPANY_PACK_SLOT_IDS = COMPANY_PACK_SLOTS.map((s) => s.id)

export function normalizeProfileAttachments(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((f) => f && typeof f.path === 'string' && f.path.length > 0)
    .map((f) => ({
      ...f,
      profile_slot: f.profile_slot || PROFILE_ATTACHMENT_SLOT.OTHER,
    }))
}

export function pickLatestForSlot(list, slot) {
  const matches = normalizeProfileAttachments(list).filter((a) => a.profile_slot === slot)
  return matches.length ? matches[matches.length - 1] : null
}

export function attachmentsWithoutSlot(list, slot) {
  return normalizeProfileAttachments(list).filter((a) => a.profile_slot !== slot)
}

export function replacePackSlot(list, slot, meta) {
  const without = attachmentsWithoutSlot(list, slot)
  if (!meta) return without
  return [...without, { ...meta, profile_slot: slot }]
}

export function isPackDocumentFile(file) {
  const name = String(file?.name || '').toLowerCase()
  const t = String(file?.type || '').toLowerCase()
  return (
    /\.(pdf|ppt|pptx)$/i.test(name)
    || t === 'application/pdf'
    || t.includes('powerpoint')
    || t.includes('presentation')
  )
}

/** Lightweight flags for sourcing cards / compare (no signed URLs). */
export function companyPackSummary(list) {
  const files = normalizeProfileAttachments(list)
  const items = COMPANY_PACK_SLOTS.map((slot) => {
    const file = pickLatestForSlot(files, slot.id)
    return {
      slot: slot.id,
      shortLabel: slot.shortLabel,
      name: file?.name || null,
    }
  })
  const catalogue = files
    .filter((a) => a.profile_slot === PROFILE_ATTACHMENT_SLOT.PACK_CATALOGUE)
    .slice()
    .sort((a, b) => {
      const sa = String(a.pack_source_slot || '')
      const sb = String(b.pack_source_slot || '')
      if (sa !== sb) return sa.localeCompare(sb)
      return (Number(a.page) || 0) - (Number(b.page) || 0)
    })
    .map((file) => ({
      path: file.path,
      caption: (COMPANY_PACK_SLOTS.find((s) => s.id === file.pack_source_slot)?.shortLabel || 'Catalogue')
        + (file.page ? ` · ${file.page}` : ''),
      page: Number(file.page) || 1,
      slot: file.pack_source_slot || '',
    }))
  return {
    hasPresentation: Boolean(items[0]?.name),
    hasProfile: Boolean(items[1]?.name),
    hasPortfolio: Boolean(items[2]?.name),
    hasCatalogue: catalogue.length > 0,
    catalogue,
    items,
  }
}

export function companyPackRegistryPayload(list) {
  return normalizeProfileAttachments(list).map((f) => ({
    id: f.id || null,
    path: f.path,
    name: f.name || f.path,
    mime_type: f.mime_type || null,
    size_bytes: f.size_bytes || null,
    uploaded_at: f.uploaded_at || null,
    profile_slot: f.profile_slot,
  }))
}
