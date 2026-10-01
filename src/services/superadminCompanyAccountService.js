import { supabase, isSupabaseConfigured } from '../config/supabase'
import { companiesService, profilesService } from './supabaseService'
import { slugifyCompanyName } from '../utils/adminCreateSellerAccount'
import { isCompanyUuid } from '../utils/superadminAccountHydrate'

function asRecord(value) {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return typeof value === 'object' ? value : null
}

async function fallbackSave({ companyId, profileId, companyPayload, profilePatch }) {
  let company = null
  const cid = isCompanyUuid(companyId) ? String(companyId) : ''
  if (cid) {
    company = await companiesService.update(cid, companyPayload)
  } else {
    const name = String(companyPayload?.name || 'Company').trim() || 'Company'
    company = await companiesService.create({
      ...companyPayload,
      name,
      slug: `${slugifyCompanyName(name)}-${Date.now().toString(36)}`,
      status: companyPayload?.status || 'active',
    })
  }
  let profile = null
  if (isCompanyUuid(profileId) && profilePatch && Object.keys(profilePatch).length) {
    profile = await profilesService.updateProfilePrivileged({
      id: String(profileId),
      ...(isCompanyUuid(company?.id) ? { company_id: company.id } : {}),
      ...profilePatch,
    })
  }
  return { company, profile }
}

/**
 * Persist Super Admin account edits to Postgres (company row + optional profile).
 * Uses SECURITY DEFINER RPC when available so RLS cannot drop other tenants.
 */
export async function superadminSaveCompanyAccount({
  companyId = null,
  profileId = null,
  companyPayload = {},
  profilePatch = {},
} = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Database is not configured.')
  }
  const pCompanyId = isCompanyUuid(companyId) ? String(companyId) : null
  const pProfileId = isCompanyUuid(profileId) ? String(profileId) : null
  const { data, error } = await supabase.rpc('superadmin_save_company_account', {
    p_company_id: pCompanyId,
    p_profile_id: pProfileId,
    p_company: companyPayload || {},
    p_profile: profilePatch || {},
  })
  if (!error) {
    const parsed = asRecord(data) || {}
    const company = parsed.company || (parsed.id ? parsed : null)
    if (!company?.id) {
      throw new Error('Database save returned no company row.')
    }
    return { company, profile: parsed.profile || null }
  }
  const missingFn = /could not find the function|does not exist|schema cache/i.test(String(error.message || ''))
  if (missingFn) {
    return fallbackSave({
      companyId: pCompanyId,
      profileId: pProfileId,
      companyPayload,
      profilePatch,
    })
  }
  throw error
}
