/**
 * Organic growth: invite potential sellers to join STREFEX under their own company.
 * Distinct from team invite (same company) and Super Admin create-seller (ops).
 */
import { emailService } from '../services/emailService'

const STORAGE_KEY = 'strefex-seller-growth-invites'
const TOKEN_BYTES = 12

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function generateToken() {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(TOKEN_BYTES)
      crypto.getRandomValues(bytes)
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    }
  } catch { /* */ }
  return `inv${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch { /* quota */ }
}

export function listSellerGrowthInvites() {
  return readAll()
}

export function listSellerGrowthInvitesByInviter(inviterEmail) {
  const email = normalizeEmail(inviterEmail)
  if (!email) return []
  return readAll()
    .filter((row) => normalizeEmail(row.inviterEmail) === email)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export function getSellerGrowthInviteByToken(token) {
  const key = String(token || '').trim()
  if (!key) return null
  return readAll().find((row) => row.token === key) || null
}

/**
 * Build public register URL for a growth invite.
 * @param {string} token
 * @param {{ origin?: string }} [opts]
 */
export function buildSellerInviteRegisterUrl(token, opts = {}) {
  const key = String(token || '').trim()
  if (!key) {
    const origin = opts.origin || (typeof window !== 'undefined' ? window.location.origin : '')
    return `${origin}/register?type=seller`
  }
  const origin = opts.origin || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${origin}/register?type=seller&invite=${encodeURIComponent(key)}`
}

/**
 * Create (or reuse pending) invite for an email.
 */
export function createSellerGrowthInvite({
  inviteeEmail,
  inviteeName = '',
  inviterEmail = '',
  inviterCompany = '',
  inviterUserId = '',
  source = 'manual',
  rfqId = null,
  rfqTitle = '',
  message = '',
} = {}) {
  const email = normalizeEmail(inviteeEmail)
  if (!email || !email.includes('@')) {
    throw new Error('Enter a valid seller email to invite.')
  }
  const inviter = normalizeEmail(inviterEmail)
  const all = readAll()
  const existing = all.find(
    (row) => normalizeEmail(row.inviteeEmail) === email
      && row.status === 'pending'
      && normalizeEmail(row.inviterEmail) === inviter,
  )
  if (existing) {
    const patched = {
      ...existing,
      inviteeName: String(inviteeName || existing.inviteeName || '').trim(),
      rfqId: rfqId || existing.rfqId || null,
      rfqTitle: rfqTitle || existing.rfqTitle || '',
      message: message || existing.message || '',
      source: source || existing.source,
      updatedAt: new Date().toISOString(),
    }
    writeAll(all.map((row) => (row.token === existing.token ? patched : row)))
    return { invite: patched, reused: true }
  }

  const invite = {
    token: generateToken(),
    inviteeEmail: email,
    inviteeName: String(inviteeName || '').trim(),
    inviterEmail: inviter,
    inviterCompany: String(inviterCompany || '').trim(),
    inviterUserId: String(inviterUserId || '').trim(),
    source: String(source || 'manual'),
    rfqId: rfqId || null,
    rfqTitle: String(rfqTitle || '').trim(),
    message: String(message || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    acceptedAt: null,
    acceptedEmail: null,
    acceptedCompanyId: null,
  }
  writeAll([...all, invite])
  return { invite, reused: false }
}

export function acceptSellerGrowthInvite(token, {
  acceptedEmail = '',
  companyId = null,
} = {}) {
  const key = String(token || '').trim()
  if (!key) return null
  const all = readAll()
  const idx = all.findIndex((row) => row.token === key)
  if (idx < 0) return null
  const next = {
    ...all[idx],
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
    acceptedEmail: normalizeEmail(acceptedEmail) || all[idx].inviteeEmail,
    acceptedCompanyId: companyId || null,
  }
  const copy = [...all]
  copy[idx] = next
  writeAll(copy)
  return next
}

/**
 * Create invite + send via Resend (Edge Function) when available.
 * Falls back to mailto / copy-link if delivery is not configured or fails.
 */
export async function inviteSellerToPlatform(opts = {}) {
  const { invite, reused } = createSellerGrowthInvite(opts)
  const registerUrl = buildSellerInviteRegisterUrl(invite.token)
  const mail = await emailService.sendSellerGrowthInvite({
    email: invite.inviteeEmail,
    inviteeName: invite.inviteeName,
    inviterName: opts.inviterName || invite.inviterCompany || invite.inviterEmail,
    inviterCompany: invite.inviterCompany,
    inviterEmail: invite.inviterEmail || opts.inviterEmail || '',
    registerUrl,
    rfqTitle: invite.rfqTitle,
    message: invite.message,
    token: invite.token,
    source: invite.source,
    rfqId: invite.rfqId,
  })

  const all = readAll()
  const patched = {
    ...invite,
    deliveryChannel: mail?.channel || null,
    delivered: Boolean(mail?.delivered),
    providerMessageId: mail?.messageId || null,
    lastDeliveryError: mail?.delivered ? null : (mail?.error || null),
    updatedAt: new Date().toISOString(),
  }
  writeAll(all.map((row) => (row.token === invite.token ? patched : row)))

  return {
    invite: patched,
    reused,
    registerUrl,
    mail,
    delivered: Boolean(mail?.delivered),
    fallbackMailto: Boolean(mail?.fallbackMailto && !mail?.delivered),
  }
}

/**
 * After Network RFQ send: invite unregistered email recipients to join STREFEX.
 */
export async function dispatchRfqSellerGrowthInvites({
  manualInvitees = [],
  supplierIds = [],
  rfq = null,
  inviterEmail = '',
  inviterCompany = '',
  inviterUserId = '',
  inviterName = '',
} = {}) {
  const fromManual = (Array.isArray(manualInvitees) ? manualInvitees : [])
    .map((row) => ({
      email: normalizeEmail(row?.email || (String(row?.id || '').startsWith('invite:') ? String(row.id).slice(7) : '')),
      name: String(row?.name || '').trim(),
    }))
    .filter((row) => row.email.includes('@'))

  const fromIds = (Array.isArray(supplierIds) ? supplierIds : [])
    .filter((id) => String(id).startsWith('invite:') && String(id).includes('@'))
    .map((id) => ({
      email: normalizeEmail(String(id).slice('invite:'.length)),
      name: '',
    }))

  const byEmail = new Map()
  ;[...fromManual, ...fromIds].forEach((row) => {
    if (!row.email) return
    if (!byEmail.has(row.email)) byEmail.set(row.email, row)
  })

  const results = []
  for (const row of byEmail.values()) {
    try {
      const out = await inviteSellerToPlatform({
        inviteeEmail: row.email,
        inviteeName: row.name,
        inviterEmail,
        inviterCompany,
        inviterUserId,
        inviterName,
        source: 'rfq',
        rfqId: rfq?.id || null,
        rfqTitle: rfq?.title || rfq?.buyerRefDisplay || '',
        message: rfq?.title
          ? `You were invited to respond to RFQ “${rfq.title}” on STREFEX.`
          : '',
      })
      results.push({ ok: true, ...out })
    } catch (err) {
      results.push({ ok: false, email: row.email, error: err?.message || 'Invite failed' })
    }
  }
  return results
}

export function buildMailtoSellerGrowthInvite(invite) {
  const url = buildSellerInviteRegisterUrl(invite.token)
  const subject = encodeURIComponent('Join me on STREFEX as a seller')
  const who = invite.inviterCompany || invite.inviterEmail || 'A STREFEX partner'
  const body = encodeURIComponent(
    `Hi${invite.inviteeName ? ` ${invite.inviteeName}` : ''},\n\n`
    + `${who} invited you to join STREFEX as a manufacturer/seller.\n`
    + `Create your company account here (free to start):\n${url}\n\n`
    + (invite.rfqTitle ? `Related RFQ: ${invite.rfqTitle}\n\n` : '')
    + 'You will own your own company profile — this is not a team seat under their account.\n',
  )
  return `mailto:${encodeURIComponent(invite.inviteeEmail)}?subject=${subject}&body=${body}`
}
