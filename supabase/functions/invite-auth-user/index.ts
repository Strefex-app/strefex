// deno-lint-ignore-file no-explicit-any
/**
 * invite-auth-user — send seller/team login invite via Resend.
 *
 * Client signUp while an admin is logged in does not reliably send GoTrue
 * confirmation mail. This function uses service-role generateLink + Resend
 * (same connection as send-seller-invite).
 *
 * Secrets: RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME, APP_ORIGIN
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'invites@strefex.pro'
const RESEND_FROM_NAME = Deno.env.get('RESEND_FROM_NAME') || 'STREFEX'
const APP_ORIGIN = (Deno.env.get('APP_ORIGIN') || 'https://strefex.pro').replace(/\/$/, '')

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' })
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { ok: false, error: 'Supabase env is missing' })
  }
  if (!RESEND_API_KEY) {
    return json(500, { ok: false, error: 'RESEND_API_KEY is not configured' })
  }

  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json(401, { ok: false, error: 'Sign in required to send login invites' })
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

  const email = normalizeEmail(body.email)
  if (!email.includes('@')) {
    return json(400, { ok: false, error: 'A valid email is required' })
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: profile } = await admin
    .from('profiles')
    .select('role, company_id, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const role = String(profile?.role || '').toLowerCase()
  if (role !== 'superadmin' && role !== 'admin') {
    return json(403, { ok: false, error: 'Only company admins can send login invites' })
  }

  const companyId = body.companyId ? String(body.companyId) : null
  if (role === 'admin' && companyId && profile?.company_id && profile.company_id !== companyId) {
    return json(403, { ok: false, error: 'You can only invite users to your own company' })
  }

  const fullName = String(body.fullName || '').trim()
  const invitedRole = String(body.role || 'admin').trim() || 'admin'
  const accountType = String(body.accountType || 'seller').trim() || 'seller'
  const redirectTo = `${APP_ORIGIN}/login?confirmed=true`
  const metadata = {
    full_name: fullName,
    account_type: accountType,
    company_id: companyId,
    invited: true,
    invited_by: user.id,
    invited_role: invitedRole,
  }

  let alreadyExists = false
  let linkType = 'invite'
  let gen = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: metadata, redirectTo },
  })

  if (gen.error) {
    const msg = String(gen.error.message || '').toLowerCase()
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      alreadyExists = true
      linkType = 'magiclink'
      gen = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      })
    }
  }

  if (gen.error) {
    return json(502, { ok: false, error: gen.error.message || 'Could not create login link' })
  }

  const actionLink = String((gen.data as any)?.properties?.action_link || (gen.data as any)?.action_link || '')
  if (!actionLink.startsWith('http')) {
    return json(502, { ok: false, error: 'Auth link was not returned by Supabase' })
  }

  const greeting = fullName || 'there'
  const subject = alreadyExists
    ? 'Your STREFEX login link'
    : 'Confirm your STREFEX seller account'
  const cta = alreadyExists ? 'Open STREFEX' : 'Confirm email and set login'
  const textBody = [
    'STREFEX Strategic Supplier Intelligence',
    '',
    `Hello ${greeting},`,
    '',
    alreadyExists
      ? 'Use this link to sign in to your STREFEX account:'
      : 'You were invited to take over a seller account on STREFEX. Confirm your email and set your password:',
    actionLink,
    '',
    `This link opens: ${APP_ORIGIN}`,
    '',
    'If you were not expecting this email, you can ignore it.',
  ].join('\n')

  const htmlBody = `
<div style="margin:0;padding:24px 12px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #ddd;">
        <tr><td style="padding:24px;">
          <p style="margin:0 0 16px;font-weight:700;color:#1a2b3c;">STREFEX Strategic Supplier Intelligence</p>
          <p style="margin:0 0 16px;">Hello ${escapeHtml(greeting)},</p>
          <p style="margin:0 0 20px;">
            ${alreadyExists
              ? 'Use this link to sign in to your STREFEX account.'
              : 'You were invited to take over a seller account on STREFEX. Confirm your email, then set your password.'}
          </p>
          <p style="margin:0 0 20px;">
            <a href="${escapeHtml(actionLink)}"
               style="background:#1a2b3c;color:#fff;padding:12px 16px;text-decoration:none;display:inline-block;font-weight:600;border-radius:6px;">
              ${escapeHtml(cta)}
            </a>
          </p>
          <p style="margin:0;font-size:12px;color:#555;word-break:break-all;">
            <a href="${escapeHtml(actionLink)}" style="color:#1a2b3c;">${escapeHtml(actionLink)}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: [email],
      subject,
      text: textBody,
      html: htmlBody,
    }),
  })
  const resendJson: any = await resendRes.json().catch(() => ({}))
  if (!resendRes.ok) {
    const errMsg = resendJson?.message || resendJson?.error || `Resend HTTP ${resendRes.status}`
    return json(502, { ok: false, error: String(errMsg), fallbackMailto: true, actionLink })
  }

  return json(200, {
    ok: true,
    delivered: true,
    channel: 'resend',
    alreadyExists,
    emailConfirmationPending: !alreadyExists,
    linkType,
    messageId: resendJson?.id || null,
    user: gen.data?.user || null,
  })
})
