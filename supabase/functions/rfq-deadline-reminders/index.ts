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

function getReminderType(hoursLeft: number) {
  if (hoursLeft <= 1) return '1h'
  if (hoursLeft <= 6) return '6h'
  return '24h'
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

  const { data: links, error } = await supabase
    .from('rfq_suppliers')
    .select('id, rfq_id, supplier_id, status, last_reminder_at')
    .in('status', ['invited', 'viewed'])
    .limit(500)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS })
  }

  let remindersSent = 0
  for (const link of links || []) {
    const { data: rfq } = await supabase.from('rfqs').select('id,title,deadline,company_id').eq('id', link.rfq_id).maybeSingle()
    if (!rfq?.deadline) continue
    const msLeft = new Date(rfq.deadline).getTime() - Date.now()
    if (msLeft <= 0) continue
    const hoursLeft = msLeft / 3_600_000
    if (hoursLeft > 24) continue

    const reminderType = getReminderType(hoursLeft)
    const { data: existing } = await supabase
      .from('rfq_deadline_reminders')
      .select('id')
      .eq('rfq_id', link.rfq_id)
      .eq('supplier_id', link.supplier_id)
      .eq('reminder_type', reminderType)
      .limit(1)
    if (existing && existing.length > 0) continue

    await supabase.from('rfq_deadline_reminders').insert({
      rfq_id: link.rfq_id,
      supplier_id: link.supplier_id,
      reminder_type: reminderType,
    })
    await supabase.from('rfq_suppliers').update({ last_reminder_at: new Date().toISOString() }).eq('id', link.id)
    await supabase.from('notifications').insert({
      company_id: rfq.company_id,
      type: 'rfq_deadline_reminder',
      request_id: link.rfq_id,
      title: `RFQ reminder: ${rfq.title}`,
      message: `RFQ deadline is approaching (${Math.max(1, Math.round(hoursLeft))}h left).`,
    })
    remindersSent += 1
  }

  return new Response(JSON.stringify({ checked: (links || []).length, remindersSent }), {
    status: 200,
    headers: CORS_HEADERS,
  })
})
