import { assertAllowedOrigin, setApiHeaders, supabaseAdmin } from '../_lib/platformApi.js'

export default async function handler(req, res) {
  setApiHeaders(req, res, 'GET,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!assertAllowedOrigin(req)) return res.status(403).json({ error: 'Origin is not allowed' })
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase is not configured' })

  const supplierId = String(req.query?.id || '').trim()
  if (!supplierId) return res.status(400).json({ error: 'Supplier id is required' })

  try {
    const [supplierResult, capabilitiesResult, auditsResult, scoresResult] = await Promise.all([
      supabaseAdmin.from('suppliers').select('*').eq('id', supplierId).maybeSingle(),
      supabaseAdmin.from('supplier_capabilities').select('*').eq('supplier_id', supplierId),
      supabaseAdmin.from('supplier_audits').select('*').eq('supplier_id', supplierId).order('audited_at', { ascending: false }),
      supabaseAdmin.from('supplier_scores').select('*').eq('supplier_id', supplierId).order('calculated_at', { ascending: false }).limit(1),
    ])
    if (supplierResult.error) throw supplierResult.error
    if (capabilitiesResult.error) throw capabilitiesResult.error
    if (auditsResult.error) throw auditsResult.error
    if (scoresResult.error) throw scoresResult.error

    if (!supplierResult.data) {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    return res.status(200).json({
      supplier: supplierResult.data,
      capabilities: capabilitiesResult.data || [],
      audits: auditsResult.data || [],
      score: (scoresResult.data && scoresResult.data[0]) || null,
    })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Failed to load supplier profile' })
  }
}
