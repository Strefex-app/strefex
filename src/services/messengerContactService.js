/**
 * Resolve whether an email or phone belongs to a platform user the current user may see.
 * Uses company-scoped profiles (RLS): same-company directory only unless backend adds global lookup.
 */
import { isSupabaseConfigured, profilesService } from './supabaseService'

function normalizeEmail(e) {
  return String(e || '').trim().toLowerCase()
}

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '')
}

function profileMatchesQuery(p, emailQuery, phoneDigits) {
  const pe = normalizeEmail(p.email)
  if (emailQuery && pe === emailQuery) return true
  const pp = digitsOnly(p.phone)
  if (phoneDigits && pp.length >= 7 && pp === phoneDigits) return true
  return false
}

/**
 * @param {{ email?: string, phone?: string }} query
 * @param {string|null} companyId - profiles.company_id
 * @returns {Promise<{ found: boolean, profile?: object, reason?: string }>}
 */
export async function lookupContactInCompany(query, companyId) {
  const emailQ = normalizeEmail(query.email)
  const phoneD = digitsOnly(query.phone)

  if (!emailQ && (!phoneD || phoneD.length < 7)) {
    return { found: false, reason: 'Enter a valid email or phone number.' }
  }

  if (!isSupabaseConfigured || !companyId) {
    return {
      found: false,
      reason: 'Directory lookup needs Supabase and company context. Use Register link to invite.',
    }
  }

  try {
    const rows = await profilesService.getCompanyProfiles(companyId)
    const hit = (rows || []).find((p) => profileMatchesQuery(p, emailQ, phoneD))
    if (hit) {
      return {
        found: true,
        profile: {
          id: hit.id,
          email: hit.email,
          fullName: hit.full_name || hit.fullName,
          phone: hit.phone,
          role: hit.role,
          companyId: hit.company_id,
        },
      }
    }
    return { found: false, reason: 'No user in your company matches this email or phone.' }
  } catch {
    return { found: false, reason: 'Lookup failed. Check connection and try again.' }
  }
}

export function buildRegisterInviteUrl() {
  if (typeof window === 'undefined') return '/register'
  return `${window.location.origin}/register`
}

export function buildMailtoInvite(email, bodyExtra = '') {
  const url = buildRegisterInviteUrl()
  const subject = encodeURIComponent('Join me on STREFEX')
  const body = encodeURIComponent(
    `Hi,\n\nI’d like to connect with you on STREFEX.\nCreate a free account here: ${url}\n\n${bodyExtra}`,
  )
  return `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`
}
