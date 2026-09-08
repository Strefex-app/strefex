/**
 * Audit services taxonomy — shared by Service Hub, Register, Profile,
 * Audit Request, and sourcing shortlists.
 *
 * Auditors and service providers who offer audits register these categories.
 * Buyers request audits by industry (+ optional audit type / preferred provider).
 */

/** Hub-level category id (alongside project-management, supplier-services, …). */
export const AUDIT_SERVICES_CATEGORY_ID = 'audit-services'

/** Legacy single-option id kept for older requests and auditor defaults. */
export const LEGACY_SUPPLIER_AUDIT_ID = 'supplier-audit'

export const AUDIT_SERVICE_ITEMS = [
  { id: 'supplier-audit', label: 'Supplier / second-party audit' },
  { id: 'process-audit', label: 'Process audit (VDA 6.3 / similar)' },
  { id: 'system-audit', label: 'Quality system audit (ISO / IATF)' },
  { id: 'product-audit', label: 'Product / dimensional audit' },
  { id: 'environmental-audit', label: 'Environmental / HSE audit' },
  { id: 'social-compliance-audit', label: 'Social / compliance audit' },
  { id: 'pre-shipment-audit', label: 'Pre-shipment / buy-off audit' },
  { id: 'special-process-audit', label: 'Special process audit (CQI / plating / heat treat)' },
]

export const AUDIT_SERVICE_ITEM_IDS = AUDIT_SERVICE_ITEMS.map((i) => i.id)

export const AUDIT_SERVICES_HUB_GROUP = {
  id: AUDIT_SERVICES_CATEGORY_ID,
  name: 'Audit Services',
  description: 'Supplier, process, system, product, and compliance audits by industry',
  items: AUDIT_SERVICE_ITEMS.map((s) => ({
    id: `svc:audit:${s.id}`,
    name: s.label,
  })),
}

/** Hub / register / profile checkbox options (category-level + legacy). */
export const AUDIT_AND_SERVICE_EXPERTISE_OPTIONS = [
  { id: 'project-management', label: 'Project Management' },
  { id: 'supplier-services', label: 'Supplier Services' },
  { id: 'quality-services', label: 'Quality & Compliance' },
  { id: AUDIT_SERVICES_CATEGORY_ID, label: 'Audit Services' },
]

/** Auditor registration / profile — all audit kinds (multi-select). */
export const AUDITOR_EXPERTISE_OPTIONS = [
  { id: AUDIT_SERVICES_CATEGORY_ID, label: 'Audit Services (all kinds)' },
  ...AUDIT_SERVICE_ITEMS.map((i) => ({ id: i.id, label: i.label })),
]

export function isAuditServiceCategoryId(id) {
  const key = String(id || '').toLowerCase()
  if (!key) return false
  if (key === AUDIT_SERVICES_CATEGORY_ID || key === LEGACY_SUPPLIER_AUDIT_ID) return true
  if (AUDIT_SERVICE_ITEM_IDS.includes(key)) return true
  if (key.startsWith('svc:audit:')) return true
  if (key.includes('audit')) return true
  return false
}

/** Categories that mean “this account delivers audits”. */
export function accountOffersAuditServices(account) {
  const cats = Array.isArray(account?.serviceCategories) ? account.serviceCategories : []
  if (cats.some((c) => isAuditServiceCategoryId(c))) return true
  const types = new Set()
  const primary = String(account?.accountType || '').toLowerCase()
  if (primary) types.add(primary)
  ;(Array.isArray(account?.accountTypes) ? account.accountTypes : []).forEach((t) => {
    const id = String(t || '').toLowerCase()
    if (id) types.add(id)
  })
  // Pure auditors always offer audit services (default expertise).
  return types.has('auditor')
}

/**
 * Default service_categories for a newly registered auditor.
 */
export function defaultAuditorServiceCategories(selected = []) {
  const picked = Array.isArray(selected) ? selected.filter(Boolean) : []
  const set = new Set([AUDIT_SERVICES_CATEGORY_ID, LEGACY_SUPPLIER_AUDIT_ID, ...picked])
  return [...set]
}

export function auditServiceLabel(id) {
  const key = String(id || '').toLowerCase()
  if (key === AUDIT_SERVICES_CATEGORY_ID) return 'Audit Services'
  const hit = AUDIT_SERVICE_ITEMS.find((i) => i.id === key)
  return hit?.label || (key ? String(id) : 'Audit')
}
