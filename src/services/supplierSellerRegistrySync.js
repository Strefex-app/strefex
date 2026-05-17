/**
 * Canonical write path for workspace sell-side counterparties merged into `getAllSuppliersIncludingRegistry()`
 * (`src/data/supplierDatabase.js`). Imports persist to **`useWorkspaceSellerCorpusStore`** — one corpus per tenant
 * (shared across buyer / seller access), layered with signup sellers from `useAccountRegistry` and optional
 * seeded directory when `VITE_SEED_SUPPLIER_DIRECTORY=true`.
 */

import { useWorkspaceSellerCorpusStore } from '../store/workspaceSellerCorpusStore'
import useVendorStore from '../store/vendorStore'

export function normSellerRegistryEmail(em) {
  return String(em || '').trim().toLowerCase()
}

/** Industry slugs used across equipment catalogs / RFQ flows. */
export const PLATFORM_INDUSTRY_SLUGS = new Set([
  'automotive',
  'machinery',
  'electronics',
  'medical',
  'raw-materials',
  'oil-gas',
  'green-energy',
  'household-products',
])

/** Audit Pro dropdown labels → platform slugs. */
const AUDIT_INDUSTRY_LABEL_TO_PLATFORM_ID = Object.fromEntries(
  [
    ['Automotive', 'automotive'],
    ['Medical', 'medical'],
    ['Aerospace', 'machinery'],
    ['Oil & Gas', 'oil-gas'],
  ].map(([label, id]) => [label.toLowerCase(), id]),
)

function sanitizeVmToken(id) {
  return String(id).trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 120) || 'unknown'
}

/** Stable placeholder when Vendor Master has no email (deduped by vendorMasterId). */
export function syntheticVendorMasterEmail(vmId) {
  return `vm.${sanitizeVmToken(vmId)}@vendor-master.strefex`
}

function isVendorMasterPlaceholderEmail(email) {
  return typeof email === 'string' && email.endsWith('@vendor-master.strefex')
}

export function resolveIndustryIdsFromAuditRow(industryRaw, existingIndustryIds = []) {
  const raw = String(industryRaw || '').trim().toLowerCase()
  const fromRow = []
  if (raw && PLATFORM_INDUSTRY_SLUGS.has(raw)) fromRow.push(raw)
  const fromAudit = AUDIT_INDUSTRY_LABEL_TO_PLATFORM_ID[raw]
  if (fromAudit) fromRow.push(fromAudit)
  return [...new Set([...(existingIndustryIds || []), ...fromRow])]
}

/** Audit label/string + optional `row.industryIds` from Add Supplier / imports. */
function resolveIndustryIdsFromSellerRow(row, existingIndustryIds = []) {
  const fromAudit = resolveIndustryIdsFromAuditRow(row?.industry, existingIndustryIds)
  const extra = Array.isArray(row?.industryIds)
    ? row.industryIds.filter((id) => PLATFORM_INDUSTRY_SLUGS.has(id))
    : []
  return [...new Set([...fromAudit, ...extra])]
}

/**
 * Upsert one Audit Pro–shaped supplier row into the **tenant workspace seller corpus** (buyer+seller shared).
 * @returns {{ ok: true }} | {{ ok: false, reason: string }}
 */
export function syncAuditSupplierRowToSellerRegistry(row) {
  const corpusApi = useWorkspaceSellerCorpusStore.getState()

  const name = String(row?.name || '').trim()
  if (!name) return { ok: false, reason: 'no_name' }

  const vmId =
    row?.vendorMasterId != null && String(row.vendorMasterId).trim() !== ''
      ? String(row.vendorMasterId).trim()
      : ''

  const rowEmail = normSellerRegistryEmail(row?.email)

  let existing = vmId ? corpusApi.getByVendorMasterId(vmId) || null : null
  if (!existing && rowEmail) existing = corpusApi.getByEmail(rowEmail) || null

  const synthetic = vmId ? syntheticVendorMasterEmail(vmId) : ''
  if (!existing && synthetic) existing = corpusApi.getByEmail(synthetic) || null

  let storedEmail = existing?.email || rowEmail || synthetic
  if (!storedEmail) return { ok: false, reason: 'no_contact_key' }

  if (rowEmail && existing?.email && isVendorMasterPlaceholderEmail(existing.email)) {
    storedEmail = rowEmail
  }

  const nowIso = new Date().toISOString()
  const industryIds = resolveIndustryIdsFromSellerRow(row, existing?.industries)
  const categories = { ...(existing?.categories || {}) }
  industryIds.forEach((industryId) => {
    if (!categories[industryId]) categories[industryId] = []
  })
  if (row?.categories && typeof row.categories === 'object') {
    for (const [k, v] of Object.entries(row.categories)) {
      if (!categories[k]) categories[k] = []
      const arr = Array.isArray(v) ? v : []
      categories[k] = [...new Set([...(categories[k] || []), ...arr])]
    }
  }

  const eqCats = Array.isArray(row?.equipmentCategoryIds) ? row.equipmentCategoryIds.filter(Boolean) : []
  const prodCats = Array.isArray(row?.productCategoryIds) ? row.productCategoryIds.filter(Boolean) : []
  const auditExtraCats = [...new Set([...eqCats, ...prodCats])]
  if (auditExtraCats.length && industryIds.length) {
    for (const ind of industryIds) {
      if (!categories[ind]) categories[ind] = []
      categories[ind] = [...new Set([...categories[ind], ...auditExtraCats])]
    }
  }

  const accountPayload = {
    company: name,
    email: storedEmail,
    contactName: String(row?.contact || '').trim() || existing?.contactName || '',
    accountType: 'seller',
    status: existing?.status || 'active',
    plan: existing?.plan || 'start',
    industries: industryIds.length ? industryIds : existing?.industries || [],
    categories,
    country: String(row?.country || '').trim() || existing?.country || '',
    city: String(row?.city || '').trim() || existing?.city || '',
    address: String(row?.address || '').trim() || existing?.address || '',
    rating: existing?.rating ?? 0,
    riskLevel: existing?.riskLevel ?? 50,
    fitLevel: existing?.fitLevel ?? 50,
    capacityLevel: existing?.capacityLevel ?? 50,
    certifications: existing?.certifications || [],
    leadTimeDays: existing?.leadTimeDays ?? 0,
    deliveryTimeDays: existing?.deliveryTimeDays ?? 0,
    priceIndex: existing?.priceIndex ?? 100,
    registeredAt: existing?.registeredAt || nowIso,
    ...((vmId || existing?.vendorMasterId) ? { vendorMasterId: vmId || existing.vendorMasterId } : {}),
  }

  const registryAccountId =
    existing?.id ||
    (vmId ? `vendor-vm-${sanitizeVmToken(vmId)}` : `audit-reg-${row.id}`)

  corpusApi.upsertSellerAccount({
    id: registryAccountId,
    ...accountPayload,
  })

  try {
    useVendorStore.getState().upsertVendorFromCounterparty({
      companyName: name,
      email: storedEmail,
      contactName: accountPayload.contactName,
      country: accountPayload.country,
      city: accountPayload.city,
      addressLine: accountPayload.address,
      industryIds: accountPayload.industries,
      vendorMasterId: vmId,
      corpusAccountId: registryAccountId,
    })
  } catch {
    /* non-fatal — vendor mirror is best-effort */
  }

  return { ok: true }
}

export function syncAuditSupplierRowsToSellerRegistry(rows) {
  let synced = 0
  let skipped = 0
  for (const r of rows || []) {
    if (syncAuditSupplierRowToSellerRegistry(r).ok) synced += 1
    else skipped += 1
  }
  return { synced, skipped }
}
