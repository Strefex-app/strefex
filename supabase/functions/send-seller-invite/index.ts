// deno-lint-ignore-file no-explicit-any
/**
 * send-seller-invite — Phase 1 enterprise delivery via Resend.
 *
 * Secrets (supabase secrets set):
 *   RESEND_API_KEY
 *   RESEND_FROM_EMAIL=invites@strefex.pro
 *   RESEND_FROM_NAME=STREFEX   (optional)
 *   APP_ORIGIN=https://strefex.pro  (fallback if register_url omitted)
 *
 * Auto-provided by Supabase:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'invites@strefex.pro'
const RESEND_FROM_NAME = Deno.env.get('RESEND_FROM_NAME') || 'STREFEX'
const APP_ORIGIN = (Deno.env.get('APP_ORIGIN') || '').replace(/\/$/, '')
const DAILY_LIMIT = Number(Deno.env.get('SELLER_INVITE_DAILY_LIMIT') || 40)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildRegisterUrl(token: string, registerUrl?: string) {
  if (registerUrl && String(registerUrl).startsWith('http')) return String(registerUrl)
  if (!APP_ORIGIN || !token) return registerUrl || ''
  return `${APP_ORIGIN}/register?type=seller&invite=${encodeURIComponent(token)}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' })
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { ok: false, error: 'Supabase env is missing' })
  }
  if (!RESEND_API_KEY) {
    return json(500, { ok: false, error: 'RESEND_API_KEY is not configured' })
  }

  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json(401, { ok: false, error: 'Sign in required to send invites' })
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  const user = userData?.user
  if (userErr || !user) {
    return json(401, { ok: false, error: 'Invalid or expired session' })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body' })
  }

  const inviteeEmail = normalizeEmail(body.email || body.inviteeEmail)
  const token = String(body.token || '').trim()
  if (!inviteeEmail.includes('@') || !token) {
    return json(400, { ok: false, error: 'invitee email and token are required' })
  }

  const inviteeName = String(body.inviteeName || '').trim()
  const inviterName = String(body.inviterName || '').trim()
  const inviterCompany = String(body.inviterCompany || '').trim()
  const inviterEmail = normalizeEmail(body.inviterEmail || user.email || '')
  const source = ['manual', 'rfq', 'messenger', 'admin'].includes(String(body.source || ''))
    ? String(body.source)
    : 'manual'
  const rfqId = body.rfqId ? String(body.rfqId) : null
  const rfqTitle = String(body.rfqTitle || '').trim()
  const message = String(body.message || '').trim()
  const registerUrl = buildRegisterUrl(token, body.registerUrl)
  if (!registerUrl) {
    return json(400, { ok: false, error: 'registerUrl or APP_ORIGIN is required' })
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('seller_growth_invites')
    .select('id', { count: 'exact', head: true })
    .eq('inviter_user_id', user.id)
    .gte('created_at', since)
  if ((count || 0) >= DAILY_LIMIT) {
    return json(429, {
      ok: false,
      error: `Daily invite limit reached (${DAILY_LIMIT}). Try again tomorrow or use copy-link.`,
    })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('company_id, email, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const fromLabel = inviterCompany || inviterName || profile?.full_name || inviterEmail || 'A STREFEX partner'
  const subject = `${fromLabel} invited you to join STREFEX`
  const greeting = inviteeName || 'Supplier'
  const siteUrl = (Deno.env.get('APP_ORIGIN') || 'https://strefex.pro').replace(/\/$/, '')
  const safeRegisterUrl = escapeHtml(registerUrl)
  const textBody = [
    'STREFEX Strategic Supplier Intelligence',
    '',
    `Hello ${greeting},`,
    '',
    `${fromLabel} invited you to join STREFEX as a manufacturer / seller.`,
    'You will create and own your own company account (this is not a team seat).',
    '',
    message || null,
    rfqTitle ? `Related RFQ: ${rfqTitle}` : null,
    '',
    'Create your seller account:',
    registerUrl,
    '',
    'This invite link expires in 14 days.',
    '',
    'If you were not expecting this invitation, you can ignore this email.',
    '',
    'STREFEX Strategic Supplier Intelligence',
    siteUrl,
  ].filter((line) => line !== null).join('\n')

  const htmlBody = `
<div style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#222222;">
  <!--[if mso]>
  <style type="text/css">
    .stx-btn { background:#1a2b3c !important; color:#ffffff !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    .stx-btn {
      background:#1a2b3c !important;
      color:#ffffff !important;
    }
    @media (prefers-color-scheme: dark) {
      .stx-wrap { background:#0b1220 !important; }
      .stx-card { background:#111827 !important; border-color:#243044 !important; }
      .stx-text { color:#e8eef5 !important; }
      .stx-muted { color:#9aa8b8 !important; }
      .stx-btn {
        background:#00d4ff !important;
        color:#0b1f33 !important;
      }
      .stx-link { color:#00d4ff !important; }
    }
  </style>
  <table role="presentation" class="stx-wrap" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="stx-card" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dddddd;">
          <tr>
            <td style="padding:24px 24px 8px 24px;font-size:16px;line-height:1.5;">
              <p class="stx-text" style="margin:0 0 16px 0;font-size:15px;line-height:1.4;font-weight:700;color:#1a2b3c;">
                STREFEX Strategic Supplier Intelligence
              </p>
              <p class="stx-text" style="margin:0 0 16px 0;color:#222222;">Hello ${escapeHtml(greeting)},</p>
              <p class="stx-text" style="margin:0 0 16px 0;color:#222222;">
                <strong>${escapeHtml(fromLabel)}</strong> invited you to join STREFEX as a manufacturer / seller.
                You will create and own your own company account (this is not a team seat).
              </p>
              ${message ? `<p class="stx-text" style="margin:0 0 16px 0;color:#222222;">${escapeHtml(message)}</p>` : ''}
              ${rfqTitle ? `<p class="stx-text" style="margin:0 0 16px 0;color:#222222;">Related RFQ: <strong>${escapeHtml(rfqTitle)}</strong></p>` : ''}
              <p style="margin:0 0 24px 0;">
                <a class="stx-btn" href="${safeRegisterUrl}"
                   style="background:#1a2b3c;color:#ffffff;padding:12px 16px;text-decoration:none;display:inline-block;font-size:14px;font-weight:600;border-radius:6px;">
                  Create seller account
                </a>
              </p>
              <p class="stx-muted" style="margin:0 0 8px 0;font-size:13px;color:#555555;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 16px 0;font-size:12px;line-height:1.5;word-break:break-all;">
                <a class="stx-link" href="${safeRegisterUrl}" style="color:#1a2b3c;">${safeRegisterUrl}</a>
              </p>
              <p class="stx-muted" style="margin:0;font-size:13px;color:#555555;">
                This invite expires in 14 days. If you were not expecting this invitation, you can ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px 24px;border-top:1px solid #eeeeee;font-size:12px;line-height:1.5;color:#777777;">
              <p class="stx-muted" style="margin:0 0 4px 0;">STREFEX Strategic Supplier Intelligence</p>
              <p class="stx-muted" style="margin:0;"><a class="stx-link" href="${escapeHtml(siteUrl)}" style="color:#555555;">${escapeHtml(siteUrl)}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
  `

  const row = {
    token,
    invitee_email: inviteeEmail,
    invitee_name: inviteeName || null,
    inviter_user_id: user.id,
    inviter_email: inviterEmail || profile?.email || user.email || null,
    inviter_company: inviterCompany || null,
    company_id: profile?.company_id || null,
    source,
    rfq_id: rfqId,
    rfq_title: rfqTitle || null,
    message: message || null,
    register_url: registerUrl,
    status: 'pending',
    provider: 'resend',
    updated_at: new Date().toISOString(),
  }

  const { data: upserted, error: upsertErr } = await admin
    .from('seller_growth_invites')
    .upsert(row, { onConflict: 'token' })
    .select('id, token')
    .maybeSingle()

  if (upsertErr) {
    return json(500, { ok: false, error: `Invite store failed: ${upsertErr.message}` })
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: [inviteeEmail],
      subject,
      text: textBody,
      html: htmlBody,
      reply_to: inviterEmail || undefined,
    }),
  })

  const resendJson: any = await resendRes.json().catch(() => ({}))
  if (!resendRes.ok) {
    const errMsg = resendJson?.message || resendJson?.error || `Resend HTTP ${resendRes.status}`
    await admin.from('seller_growth_invites').update({
      last_error: String(errMsg).slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq('token', token)
    return json(502, {
      ok: false,
      error: errMsg,
      fallbackMailto: true,
      inviteId: upserted?.id || null,
    })
  }

  const providerMessageId = resendJson?.id || null
  await admin.from('seller_growth_invites').update({
    status: 'sent',
    provider_message_id: providerMessageId,
    sent_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('token', token)

  return json(200, {
    ok: true,
    delivered: true,
    channel: 'resend',
    messageId: providerMessageId,
    inviteId: upserted?.id || null,
    token,
    registerUrl,
    from: RESEND_FROM_EMAIL,
  })
})
