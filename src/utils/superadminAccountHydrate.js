/**
 * Super Admin account editor: merge Postgres + registry + list stub so the
 * form never opens on empty rows when any source still has data.
 */

import { firstFilledArray, firstFilledObject, firstFilledText } from './keepExistingAccountFields'

export const COMPANY_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isCompanyUuid(value) {
  return COMPANY_UUID_RE.test(String(value || '').trim())
}

export function pickPrimaryProfile(list, email) {
  const rows = Array.isArray(list) ? list.filter(Boolean) : []
  if (!rows.length) return null
  const want = String(email || '').trim().toLowerCase()
  if (want) {
    const byEmail = rows.find((p) => String(p.email || '').trim().toLowerCase() === want)
    if (byEmail) return byEmail
  }
  const named = rows.find((p) => String(p.full_name || '').trim())
  return named || rows[0]
}

function layerText(layers, ...keys) {
  return firstFilledText(...layers.flatMap((s) => keys.map((k) => s?.[k])))
}

/**
 * Prefer filled scalars/maps from cloud, then registry-shaped, then dashboard stub.
 */
export function mergeCompanySources(cloud, localShaped, stubShaped, profile) {
  const layers = [cloud, localShaped, stubShaped].filter(Boolean)
  if (!layers.length && !profile) return null
  const mdLayers = layers.map((s) => (s?.metadata && typeof s.metadata === 'object' ? s.metadata : {}))
  const name = firstFilledText(
    ...layers.map((s) => s.name || s.company),
    profile?.metadata?.company_name,
    profile?.company_name,
  )
  const email = firstFilledText(
    ...layers.map((s) => s.email),
    profile?.email,
  )
  const phone = firstFilledText(
    ...layers.map((s) => s.phone),
    profile?.phone,
  )
  const id = [cloud?.id, localShaped?.id, stubShaped?.id].find((v) => isCompanyUuid(v)) || cloud?.id || localShaped?.id || null
  return {
    ...(stubShaped || {}),
    ...(localShaped || {}),
    ...(cloud || {}),
    id,
    name: name || cloud?.name || localShaped?.name || '',
    email: email || '',
    phone: phone || '',
    website: layerText(layers, 'website'),
    country: layerText(layers, 'country'),
    city: layerText(layers, 'city'),
    address: firstFilledText(...layers.map((s) => s.address), ...mdLayers.map((m) => m.address)),
    account_type: firstFilledText(...layers.map((s) => s.account_type || s.accountType), profile?.metadata?.account_type) || 'seller',
    account_types: firstFilledArray(
      ...layers.map((s) => s.account_types || s.accountTypes),
      profile?.metadata?.account_types,
    ),
    plan: firstFilledText(...layers.map((s) => s.plan)) || 'start',
    registration_code: firstFilledText(...layers.map((s) => s.registration_code || s.registrationCode)),
    visibility_tier: firstFilledText(...layers.map((s) => s.visibility_tier || s.visibilityTier)) || 'basic',
    industries: firstFilledArray(
      ...layers.map((s) => s.industries),
      ...mdLayers.map((m) => m.industries),
    ),
    categories: firstFilledObject(
      ...layers.map((s) => s.categories),
      ...mdLayers.map((m) => m.categories),
    ),
    productCategories: firstFilledObject(
      ...layers.map((s) => s.productCategories),
      ...mdLayers.map((m) => m.product_categories),
    ),
    equipmentSubcategories: firstFilledObject(
      ...layers.map((s) => s.equipmentSubcategories),
      ...mdLayers.map((m) => m.equipment_subcategories),
    ),
    productSubcategories: firstFilledObject(
      ...layers.map((s) => s.productSubcategories),
      ...mdLayers.map((m) => m.product_subcategories),
    ),
    serviceCategories: firstFilledArray(
      ...layers.map((s) => s.serviceCategories || s.service_categories),
      ...mdLayers.map((m) => m.service_categories),
    ),
    profile_attachments: firstFilledArray(...layers.map((s) => s.profile_attachments || s.profileAttachments)),
    metadata: {
      ...mdLayers.reduce((acc, m) => ({ ...acc, ...m }), {}),
    },
    _contactName: firstFilledText(
      ...layers.map((s) => s._contactName),
      profile?.full_name,
      stubShaped?.contactName,
      stubShaped?.name,
      localShaped?._contactName,
    ),
    _contactPhone: firstFilledText(
      ...layers.map((s) => s._contactPhone),
      profile?.phone,
      stubShaped?.phone,
    ),
    _profileId: firstFilledText(
      ...layers.map((s) => s._profileId),
      isCompanyUuid(profile?.id) ? profile.id : '',
      isCompanyUuid(stubShaped?._profileId) ? stubShaped._profileId : '',
    ),
    _registryKey: firstFilledText(
      ...layers.map((s) => s._registryKey || s.email),
      profile?.email,
    ),
    _local: !isCompanyUuid(id),
    _fromStub: Boolean(stubShaped) && !cloud,
  }
}
