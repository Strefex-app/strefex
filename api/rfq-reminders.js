import { assertAllowedOrigin, setApiHeaders, supabaseAdmin } from './_lib/platformApi.js'

function getReminderType(hoursLeft) {
  if (hoursLeft <= 1) return '1h'
  if (hoursLeft <= 6) return '6h'
  return '24h'
}

export default async function handler(req, res) {
  setApiHeaders(req, res, 'POST,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!assertAllowedOrigin(req)) return res.status(403).json({ error: 'Origin is not allowed' })
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase is not configured' })

  const secret = req.headers['x-cron-secret'] || ''
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { data: links, error } = await supabaseAdmin
      .from('rfq_suppliers')
      .select('id, rfq_id, supplier_id, status')
      .in('status', ['invited', 'viewed'])
      .limit(500)
    if (error) throw error

    let remindersSent = 0
    for (const link of links || []) {
      const { data: rfq } = await supabaseAdmin
        .from('rfqs')
        .select('id,title,deadline,company_id')
        .eq('id', link.rfq_id)
        .maybeSingle()
      if (!rfq?.deadline) continue
      const msLeft = new Date(rfq.deadline).getTime() - Date.now()
      if (msLeft <= 0) continue
      const hoursLeft = msLeft / 3_600_000
      if (hoursLeft > 24) continue
      const reminderType = getReminderType(hoursLeft)
      const { data: existing } = await supabaseAdmin
        .from('rfq_deadline_reminders')
        .select('id')
        .eq('rfq_id', link.rfq_id)
        .eq('supplier_id', link.supplier_id)
        .eq('reminder_type', reminderType)
        .limit(1)
      if (existing && existing.length > 0) continue

      await supabaseAdmin.from('rfq_deadline_reminders').insert({
        rfq_id: link.rfq_id,
        supplier_id: link.supplier_id,
        reminder_type: reminderType,
      })
      await supabaseAdmin.from('rfq_suppliers').update({ last_reminder_at: new Date().toISOString() }).eq('id', link.id)
      await supabaseAdmin.from('notifications').insert({
        company_id: rfq.company_id,
        type: 'rfq_deadline_reminder',
        request_id: link.rfq_id,
        title: `RFQ reminder: ${rfq.title}`,
        message: `RFQ deadline is approaching (${Math.max(1, Math.round(hoursLeft))}h left).`,
      })
      remindersSent += 1
    }

    return res.status(200).json({ checked: (links || []).length, remindersSent })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Failed to process reminders' })
  }
}
