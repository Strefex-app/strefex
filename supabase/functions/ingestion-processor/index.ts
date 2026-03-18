// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function normalizeSupplierPayload(raw: Record<string, unknown>) {
  return {
    legal_name: normalizeText(raw.legal_name || raw.legalName || raw.company_name || raw.companyName),
    display_name: normalizeText(raw.display_name || raw.displayName || raw.company_name || raw.companyName),
    country: normalizeText(raw.country),
    industry: normalizeText(raw.industry),
    website: normalizeText(raw.website),
    description: normalizeText(raw.description),
  }
}

async function processSingleRaw(row: any) {
  const normalized = normalizeSupplierPayload(row?.raw_json || {})
  if (!normalized.legal_name || !normalized.display_name) {
    throw new Error('Missing required fields in raw payload')
  }

  const { data: existing } = await supabase
    .from('suppliers')
    .select('*')
    .eq('legal_name', normalized.legal_name)
    .eq('country', normalized.country || '')
    .limit(1)

  let supplier = existing?.[0] || null
  if (!supplier) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        legal_name: normalized.legal_name,
        display_name: normalized.display_name,
        country: normalized.country || null,
        industry: normalized.industry || null,
        website: normalized.website || null,
        description: normalized.description || null,
        source_confidence: 60,
      })
      .select()
      .single()
    if (error) throw error
    supplier = data
  } else {
    const { error } = await supabase
      .from('suppliers')
      .update({
        display_name: normalized.display_name || supplier.display_name,
        industry: normalized.industry || supplier.industry,
        website: normalized.website || supplier.website,
        description: normalized.description || supplier.description,
      })
      .eq('id', supplier.id)
    if (error) throw error
  }

  const { error: markError } = await supabase
    .from('supplier_raw_data')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('id', row.id)
  if (markError) throw markError
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS_HEADERS })
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase env is missing' }), { status: 500, headers: CORS_HEADERS })
  }
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS })
  }

  const { data: queue, error } = await supabase
    .from('supplier_raw_data')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS })
  }

  let processed = 0
  let failed = 0
  for (const row of queue || []) {
    try {
      await processSingleRaw(row)
      processed += 1
    } catch {
      failed += 1
    }
  }

  return new Response(
    JSON.stringify({
      queued: (queue || []).length,
      processed,
      failed,
    }),
    { status: 200, headers: CORS_HEADERS }
  )
})
