import {
  assertAllowedOrigin,
  requireAuthUser,
  setApiHeaders,
  supabaseAdmin,
} from './_lib/platformApi.js'
import { resolveApiKeyContext } from './_lib/apiKeyAuth.js'
import { checkRateLimit } from './_lib/rateLimit.js'

async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, company_id, role')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function getBuyerByCompany(companyId) {
  if (!companyId) return null
  const { data, error } = await supabaseAdmin
    .from('buyers')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()
  if (error) throw error
  return data
}

export default async function handler(req, res) {
  setApiHeaders(req, res, 'GET,POST,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!assertAllowedOrigin(req)) return res.status(403).json({ error: 'Origin is not allowed' })
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase is not configured' })
  const apiKeyContext = await resolveApiKeyContext(req)
  if (process.env.ENFORCE_API_KEYS === 'true' && !apiKeyContext) {
    return res.status(401).json({ error: 'Valid API key required' })
  }
  const limitKey = apiKeyContext?.id || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon'
  const rl = checkRateLimit({ key: `rfq:${limitKey}`, windowMs: 60_000, max: 120 })
  if (!rl.allowed) return res.status(429).json({ error: 'Rate limit exceeded' })

  const user = await requireAuthUser(req)
  if (!user) return res.status(401).json({ error: 'Authentication required' })

  try {
    const profile = await getProfile(user.id)
    if (!profile) return res.status(403).json({ error: 'Profile is not registered' })

    if (req.method === 'GET') {
      const buyer = await getBuyerByCompany(profile.company_id)
      if (!buyer) return res.status(200).json({ items: [] })
      const { data, error } = await supabaseAdmin
        .from('rfqs')
        .select('*')
        .eq('buyer_id', buyer.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ items: data || [] })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const action = String(body.action || 'create').toLowerCase()

    if (action === 'create') {
      const buyer = await getBuyerByCompany(profile.company_id)
      if (!buyer) return res.status(400).json({ error: 'Buyer workspace not found' })
      const title = String(body.title || '').trim()
      if (!title) return res.status(400).json({ error: 'title is required' })
      const supplierIds = Array.isArray(body.supplierIds) ? [...new Set(body.supplierIds.filter(Boolean))] : []

      const { data: rfq, error: rfqErr } = await supabaseAdmin
        .from('rfqs')
        .insert({
          company_id: profile.company_id,
          buyer_id: buyer.id,
          project_id: body.projectId || null,
          created_by: profile.id,
          title,
          description: String(body.description || '').trim() || null,
          deadline: body.deadline || null,
          status: 'sent',
        })
        .select()
        .single()
      if (rfqErr) throw rfqErr

      if (supplierIds.length > 0) {
        const links = supplierIds.map((supplierId) => ({
          rfq_id: rfq.id,
          supplier_id: supplierId,
          status: 'invited',
        }))
        const { error: linkErr } = await supabaseAdmin.from('rfq_suppliers').insert(links)
        if (linkErr) throw linkErr
      }
      return res.status(200).json({ rfqId: rfq.id })
    }

    if (action === 'respond') {
      const rfqId = String(body.rfqId || '').trim()
      const supplierId = String(body.supplierId || '').trim()
      if (!rfqId || !supplierId) return res.status(400).json({ error: 'rfqId and supplierId are required' })

      const payload = {
        rfq_id: rfqId,
        supplier_id: supplierId,
        price: body.price ?? null,
        lead_time: body.leadTime ?? null,
        currency: body.currency || 'USD',
        warranty_months: body.warrantyMonths ?? null,
        moq: body.moq ?? null,
        payment_terms: body.paymentTerms || null,
        attachment_urls: Array.isArray(body.attachments) ? body.attachments : [],
        response_fields: body.responseFields && typeof body.responseFields === 'object' ? body.responseFields : {},
        notes: String(body.notes || '').trim() || null,
      }
      const { error: responseErr } = await supabaseAdmin.from('rfq_responses').upsert(payload, {
        onConflict: 'rfq_id,supplier_id',
      })
      if (responseErr) throw responseErr

      const { data: linkRows, error: linkReadErr } = await supabaseAdmin
        .from('rfq_suppliers')
        .select('id')
        .eq('rfq_id', rfqId)
        .eq('supplier_id', supplierId)
        .limit(1)
      if (linkReadErr) throw linkReadErr
      if (linkRows && linkRows[0]) {
        const { error: linkUpdateErr } = await supabaseAdmin
          .from('rfq_suppliers')
          .update({ status: 'responded', responded_at: new Date().toISOString() })
          .eq('id', linkRows[0].id)
        if (linkUpdateErr) throw linkUpdateErr
      }
      return res.status(200).json({ ok: true })
    }

    if (action === 'status') {
      const rfqId = String(body.rfqId || '').trim()
      const supplierId = String(body.supplierId || '').trim()
      const status = String(body.status || '').trim().toLowerCase()
      if (!rfqId || !supplierId || !status) return res.status(400).json({ error: 'rfqId, supplierId and status are required' })
      if (!['invited', 'viewed', 'responded', 'rejected', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }
      const { data: links, error: readErr } = await supabaseAdmin
        .from('rfq_suppliers')
        .select('id')
        .eq('rfq_id', rfqId)
        .eq('supplier_id', supplierId)
        .limit(1)
      if (readErr) throw readErr
      if (!links || !links[0]) return res.status(404).json({ error: 'RFQ supplier link not found' })

      const updates = { status }
      if (status === 'viewed') updates.viewed_at = new Date().toISOString()
      if (status === 'closed') updates.closed_at = new Date().toISOString()

      const { error: updateErr } = await supabaseAdmin
        .from('rfq_suppliers')
        .update(updates)
        .eq('id', links[0].id)
      if (updateErr) throw updateErr
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unsupported action' })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'RFQ API error' })
  }
}
