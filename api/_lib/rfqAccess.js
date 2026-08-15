/** Statuses the invited supplier may set on an RFQ link. */
export const SUPPLIER_LINK_STATUSES = new Set(['viewed', 'responded', 'rejected'])
/** Statuses the buying company may set on an RFQ link. */
export const BUYER_LINK_STATUSES = new Set(['invited', 'closed'])

export function isPlatformAdminProfile(profile) {
  const role = String(profile?.role || '').toLowerCase()
  return role === 'superadmin' || role === 'auditor_external'
}

/**
 * Decide whether the caller may perform a service-role RFQ write.
 * Mirrors RLS: suppliers submit responses; buyers close/re-invite; admins do both.
 */
export function authorizeRfqWrite({ isAdmin, isSupplierEditor, isBuyerMember, action, status }) {
  if (isAdmin) return { ok: true }
  if (action === 'respond') {
    if (isSupplierEditor) return { ok: true }
    return {
      ok: false,
      status: 403,
      error: 'Only the invited supplier can submit this response',
    }
  }
  if (action === 'status') {
    if (SUPPLIER_LINK_STATUSES.has(status) && isSupplierEditor) return { ok: true }
    if (BUYER_LINK_STATUSES.has(status) && isBuyerMember) return { ok: true }
    return {
      ok: false,
      status: 403,
      error: 'Not allowed to update this RFQ link',
    }
  }
  return { ok: false, status: 400, error: 'Unsupported action' }
}

/** True when the user is an admin/editor on the global supplier (via vendor membership). */
export async function canEditSupplier(supabaseAdmin, { userId, supplierId }) {
  if (!userId || !supplierId) return false
  const { data: supplier, error } = await supabaseAdmin
    .from('suppliers')
    .select('id, vendor_id')
    .eq('id', supplierId)
    .maybeSingle()
  if (error) throw error
  if (!supplier?.vendor_id) return false

  const { data: memberships, error: memErr } = await supabaseAdmin
    .from('supplier_users')
    .select('id')
    .eq('user_id', userId)
    .eq('supplier_id', supplier.vendor_id)
    .in('role', ['admin', 'editor'])
    .limit(1)
  if (memErr) throw memErr
  return Boolean(memberships?.[0])
}

export async function isBuyerOfRfq(supabaseAdmin, { userId, companyId, rfqId }) {
  if (!rfqId) return { rfq: null, isBuyer: false }
  const { data: rfq, error } = await supabaseAdmin
    .from('rfqs')
    .select('id, company_id, buyer_id')
    .eq('id', rfqId)
    .maybeSingle()
  if (error) throw error
  if (!rfq) return { rfq: null, isBuyer: false }

  if (companyId && rfq.company_id && companyId === rfq.company_id) {
    return { rfq, isBuyer: true }
  }
  if (rfq.buyer_id && userId) {
    const { data: members, error: memberErr } = await supabaseAdmin
      .from('buyer_users')
      .select('id')
      .eq('buyer_id', rfq.buyer_id)
      .eq('user_id', userId)
      .limit(1)
    if (memberErr) throw memberErr
    if (members?.[0]) return { rfq, isBuyer: true }
  }
  return { rfq, isBuyer: false }
}

export async function getRfqSupplierLink(supabaseAdmin, { rfqId, supplierId }) {
  const { data, error } = await supabaseAdmin
    .from('rfq_suppliers')
    .select('id')
    .eq('rfq_id', rfqId)
    .eq('supplier_id', supplierId)
    .limit(1)
  if (error) throw error
  return data?.[0] || null
}
