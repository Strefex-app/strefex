/**
 * Super Admin: create a seller company without self-registration,
 * then transfer login rights to the real seller later.
 */
import { isSupabaseConfigured, companiesService } from '../services/supabaseService'
import { buildCompanyTaxonomyWrite } from './companyTaxonomyPayload'
import { publishAccountsToNetworkDirectory } from './accountSourcingCompleteness'

export const ADMIN_CREATED_EMAIL_DOMAIN = 'admin-created.strefex.local'

export function slugifyCompanyName(name) {
  return String(name || 'seller')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'seller'
}

export function buildAdminCreatedSellerEmail(companyName) {
  const slug = slugifyCompanyName(companyName)
  return `pending.${slug}.${Date.now().toString(36)}@${ADMIN_CREATED_EMAIL_DOMAIN}`
}

export function isAdminCreatedPlaceholderEmail(email) {
  return String(email || '').toLowerCase().endsWith(`@${ADMIN_CREATED_EMAIL_DOMAIN}`)
}

/**
 * Create a seller stub for sourcing (local registry + optional cloud company).
 * Does not create an auth user — Super Admin fills profile, then transfers rights.
 *
 * @param {object} input
 * @param {(account: object) => object} input.registerAccount
 */
export async function createAdminSellerAccount({
  companyName,
  email = '',
  country = '',
  city = '',
  address = '',
  phone = '',
  website = '',
  contactName = '',
  industryId = '',
  plan = 'start',
  registerAccount,
} = {}) {
  const name = String(companyName || '').trim()
  if (!name) throw new Error('Company name is required.')
  if (typeof registerAccount !== 'function') {
    throw new Error('Account registry is not available.')
  }

  const industry = String(industryId || '').trim()
  const industries = industry ? [industry] : []
  const normalizedEmail = String(email || '').trim().toLowerCase()
    || buildAdminCreatedSellerEmail(name)
  const taxonomy = buildCompanyTaxonomyWrite({
    industries,
    categories: {},
    productCategories: {},
    equipmentSubcategories: {},
    productSubcategories: {},
    serviceCategories: [],
    accountType: 'seller',
    accountTypes: ['seller'],
    existingMetadata: {
      address: String(address || '').trim() || null,
      admin_created: true,
      admin_created_at: new Date().toISOString(),
      pending_owner_transfer: isAdminCreatedPlaceholderEmail(normalizedEmail) || !String(email || '').trim(),
    },
  })

  const slug = `${slugifyCompanyName(name)}-${Date.now().toString(36)}`
  let company = null

  if (isSupabaseConfigured) {
    try {
      company = await companiesService.create({
        name,
        slug,
        email: normalizedEmail,
        phone: String(phone || '').trim() || null,
        website: String(website || '').trim() || null,
        country: String(country || '').trim() || null,
        city: String(city || '').trim() || null,
        address: String(address || '').trim() || null,
        account_type: 'seller',
        plan: plan || 'start',
        status: 'active',
        ...taxonomy.companyColumns,
        metadata: {
          ...taxonomy.metadataPatch,
          website: String(website || '').trim() || null,
          contact_name: String(contactName || '').trim() || null,
        },
      })
    } catch (err) {
      /* Fall back to local registry so Super Admin can still seed sellers offline. */
      console.warn('[adminCreateSeller] cloud company create failed:', err?.message || err)
      company = null
    }
  }

  const localId = company?.id || `admin-seller-${Date.now().toString(36)}`
  const account = registerAccount({
    id: localId,
    email: normalizedEmail,
    company: name,
    companyId: company?.id || null,
    name: String(contactName || '').trim() || undefined,
    contactName: String(contactName || '').trim() || undefined,
    phone: String(phone || '').trim() || '',
    website: String(website || '').trim() || '',
    country: String(country || '').trim() || '',
    city: String(city || '').trim() || '',
    address: String(address || '').trim() || '',
    accountType: 'seller',
    accountTypes: ['seller'],
    plan: plan || 'start',
    status: 'active',
    industries,
    categories: {},
    productCategories: {},
    equipmentSubcategories: {},
    productSubcategories: {},
    serviceCategories: [],
    registrationCode: company?.registration_code || undefined,
    visibilityTier: company?.visibility_tier || undefined,
    adminCreated: true,
    pendingOwnerTransfer: Boolean(taxonomy.metadataPatch.pending_owner_transfer),
    source: company ? 'database' : 'local',
    registeredAt: new Date().toISOString(),
  })

  try {
    publishAccountsToNetworkDirectory([account])
  } catch { /* best-effort */ }

  return {
    account,
    company,
    email: normalizedEmail,
    companyId: company?.id || null,
    usedPlaceholderEmail: isAdminCreatedPlaceholderEmail(normalizedEmail),
  }
}

/**
 * Point an admin-created seller at the real owner's email and optionally invite login.
 *
 * @param {object} opts
 * @param {(idOrEmail: string, updates: object) => object|null} opts.updateAccount
 * @param {(args: object) => Promise<object|null>} [opts.inviteTeamUser]
 */
export async function transferSellerAccountRights({
  companyId = null,
  registryKey = '',
  currentEmail = '',
  newEmail,
  contactName = '',
  sendInvite = true,
  updateAccount,
  inviteTeamUser = null,
  companiesUpdate = null,
  profilesUpdate = null,
  existingMetadata = {},
} = {}) {
  const nextEmail = String(newEmail || '').trim().toLowerCase()
  if (!nextEmail || !nextEmail.includes('@')) {
    throw new Error('Enter a valid seller email to transfer rights.')
  }
  if (isAdminCreatedPlaceholderEmail(nextEmail)) {
    throw new Error('Use the real seller email, not a placeholder.')
  }
  if (typeof updateAccount !== 'function') {
    throw new Error('Account registry is not available.')
  }

  const lookup = registryKey || currentEmail
  const transferMeta = {
    ...(existingMetadata && typeof existingMetadata === 'object' ? existingMetadata : {}),
    pending_owner_transfer: false,
    transferred_at: new Date().toISOString(),
    transferred_to: nextEmail,
    admin_created: true,
  }

  let company = null
  if (companyId && typeof companiesUpdate === 'function') {
    company = await companiesUpdate(companyId, {
      email: nextEmail,
      metadata: transferMeta,
    })
  }

  const registryPatch = {
    email: nextEmail,
    name: String(contactName || '').trim() || undefined,
    contactName: String(contactName || '').trim() || undefined,
    companyId: companyId || undefined,
    pendingOwnerTransfer: false,
    transferredAt: transferMeta.transferred_at,
    transferredTo: nextEmail,
  }
  let updated = lookup ? updateAccount(lookup, registryPatch) : null
  if (!updated && currentEmail) updated = updateAccount(currentEmail, registryPatch)
  if (!updated && companyId) updated = updateAccount(companyId, registryPatch)

  let invite = null
  if (sendInvite && typeof inviteTeamUser === 'function') {
    invite = await inviteTeamUser({
      email: nextEmail,
      fullName: String(contactName || '').trim() || undefined,
      role: 'admin',
      companyId: companyId || null,
      accountType: 'seller',
    })
    if (invite?.user?.id && companyId && typeof profilesUpdate === 'function') {
      try {
        await profilesUpdate({
          id: invite.user.id,
          company_id: companyId,
          full_name: String(contactName || '').trim() || null,
          role: 'admin',
          metadata: {
            account_type: 'seller',
            account_types: ['seller'],
            transferred_from_admin: true,
          },
        })
      } catch { /* privileged update may be restricted */ }
    }
  }

  return { company, account: updated, invite, email: nextEmail }
}
