import { assertAllowedOrigin, requireAuthUser, setApiHeaders, supabaseForRequest } from '../_lib/platformApi.js'

function publicSupplier(row) {
  if (!row) return null
  return {
    id: row.id,
    legal_name: row.legal_name,
    display_name: row.display_name,
    country: row.country,
    industry: row.industry,
    website: row.website,
    description: row.description,
    source_confidence: row.source_confidence,
  }
}

function publicCapability(row) {
  return {
    id: row.id,
    process: row.process,
    capability: row.capability,
    material: row.material,
  }
}

function publicAudit(row) {
  return {
    id: row.id,
    audit_name: row.audit_name,
    auditor_name: row.auditor_name,
    audit_score: row.audit_score,
    risk_level: row.risk_level,
    audited_at: row.audited_at,
  }
}

function publicScore(row) {
  if (!row) return null
  return {
    quality_score: row.quality_score,
    risk_score: row.risk_score,
    delivery_score: row.delivery_score,
    esg_score: row.esg_score,
    overall_score: row.overall_score,
    calculated_at: row.calculated_at,
  }
}

export default async function handler(req, res) {
  setApiHeaders(req, res, 'GET,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!assertAllowedOrigin(req)) return res.status(403).json({ error: 'Origin is not allowed' })

  const user = await requireAuthUser(req)
  if (!user) return res.status(401).json({ error: 'Authentication required' })
  const db = supabaseForRequest(req)
  if (!db) return res.status(500).json({ error: 'Supabase is not configured' })

  const supplierId = String(req.query?.id || '').trim()
  if (!supplierId) return res.status(400).json({ error: 'Supplier id is required' })

  try {
    const [supplierResult, capabilitiesResult, auditsResult, scoresResult] = await Promise.all([
      db
        .from('suppliers')
        .select('id, legal_name, display_name, country, industry, website, description, source_confidence')
        .eq('id', supplierId)
        .maybeSingle(),
      db
        .from('supplier_capabilities')
        .select('id, process, capability, material')
        .eq('supplier_id', supplierId),
      db
        .from('supplier_audits')
        .select('id, audit_name, auditor_name, audit_score, risk_level, audited_at')
        .eq('supplier_id', supplierId)
        .order('audited_at', { ascending: false }),
      db
        .from('supplier_scores')
        .select('quality_score, risk_score, delivery_score, esg_score, overall_score, calculated_at')
        .eq('supplier_id', supplierId)
        .order('calculated_at', { ascending: false })
        .limit(1),
    ])
    if (supplierResult.error) throw supplierResult.error
    if (capabilitiesResult.error) throw capabilitiesResult.error
    if (auditsResult.error) throw auditsResult.error
    if (scoresResult.error) throw scoresResult.error

    if (!supplierResult.data) {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    return res.status(200).json({
      supplier: publicSupplier(supplierResult.data),
      capabilities: (capabilitiesResult.data || []).map(publicCapability),
      audits: (auditsResult.data || []).map(publicAudit),
      score: publicScore(scoresResult.data && scoresResult.data[0]),
    })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Failed to load supplier profile' })
  }
}
