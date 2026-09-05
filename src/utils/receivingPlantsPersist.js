/**
 * Persist buyer receiving plants onto the signed-in account (registry + company metadata).
 */
import { isSupabaseConfigured, companiesService } from '../services/supabaseService'

const CONT_BY_CC = {
  DE: 'EU', CZ: 'EU', SE: 'EU', PL: 'EU', PT: 'EU', TR: 'EU', FR: 'EU', IE: 'EU',
  LT: 'EU', ES: 'EU', GB: 'EU', UK: 'EU', UA: 'EU', MA: 'EU', DK: 'EU', IT: 'EU',
  NL: 'EU', BE: 'EU', AT: 'EU', CH: 'EU', HU: 'EU', RO: 'EU', SK: 'EU', SI: 'EU',
  HR: 'EU', FI: 'EU', NO: 'EU', US: 'NA', MX: 'NA', CA: 'NA', CN: 'APAC', JP: 'APAC',
  IN: 'APAC', KR: 'APAC', MY: 'APAC', TW: 'APAC', TH: 'APAC', SG: 'APAC', AU: 'APAC',
}

const CC_TO_COUNTRY = {
  DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain', PL: 'Poland',
  US: 'United States', MX: 'Mexico', CN: 'China', JP: 'Japan', IN: 'India',
  KR: 'South Korea', GB: 'United Kingdom', UK: 'United Kingdom', CZ: 'Czechia',
  SE: 'Sweden', PT: 'Portugal', TR: 'Türkiye', CA: 'Canada', AT: 'Austria',
  CH: 'Switzerland', NL: 'Netherlands', BE: 'Belgium', RO: 'Romania', HU: 'Hungary',
}

export function normalizeReceivingPlant(raw, index = 0) {
  const id = String(raw?.id || `plant-${index + 1}`).trim() || `plant-${index + 1}`
  const name = String(raw?.name || 'Receiving plant').trim() || 'Receiving plant'
  let cc = String(raw?.cc || raw?.country || 'XX').trim().toUpperCase()
  if (cc === 'UK') cc = 'GB'
  if (cc.length > 2) cc = cc.slice(0, 2)
  if (!/^[A-Z]{2}$/.test(cc)) cc = 'XX'
  const lat = Number(raw?.lat)
  const lon = Number(raw?.lon)
  return {
    id,
    name,
    cc,
    lat: Number.isFinite(lat) ? lat : 0,
    lon: Number.isFinite(lon) ? lon : 0,
    cont: raw?.cont || CONT_BY_CC[cc] || 'EU',
    platform: true,
  }
}

export function normalizeReceivingPlants(list) {
  if (!Array.isArray(list)) return []
  return list.map((p, i) => normalizeReceivingPlant(p, i)).filter((p) => p.id)
}

export function readReceivingPlantsFromAccount(account, tenant) {
  const fromAccount = account?.receivingPlants
  const fromTenant = tenant?.receivingPlants || tenant?.metadata?.receiving_plants
  if (Array.isArray(fromAccount) && fromAccount.length) return normalizeReceivingPlants(fromAccount)
  if (Array.isArray(fromTenant) && fromTenant.length) return normalizeReceivingPlants(fromTenant)
  return []
}

/** Derive primary country/city/address/coordinates from the first plant for map/registry compatibility. */
export function primaryGeoFromPlants(plants) {
  const list = normalizeReceivingPlants(plants)
  const home = list[0]
  if (!home) {
    return { country: '', city: '', address: '', coordinates: null }
  }
  const cityFromName = String(home.name || '')
    .replace(/\s*plant\s*$/i, '')
    .trim()
  return {
    country: CC_TO_COUNTRY[home.cc] || home.cc || '',
    city: cityFromName || '',
    address: '',
    coordinates: { lat: home.lat, lon: home.lon, lng: home.lon },
  }
}

/**
 * Dual-write receiving plants to account registry + optional Supabase company.
 * @returns {{ ok: boolean, plants: object[], error?: string }}
 */
export async function saveReceivingPlantsToAccount({
  plants,
  email,
  companyId,
  accountId,
  updateAccount,
  setTenant,
  tenant,
} = {}) {
  const normalized = normalizeReceivingPlants(plants)
  if (!normalized.length) {
    return { ok: false, plants: [], error: 'Keep at least one receiving plant.' }
  }
  const geo = primaryGeoFromPlants(normalized)
  const emailKey = String(email || '').trim().toLowerCase()

  if (typeof updateAccount === 'function' && (emailKey || accountId)) {
    updateAccount(accountId || emailKey, {
      receivingPlants: normalized,
      country: geo.country,
      city: geo.city,
      address: geo.address || undefined,
      coordinates: geo.coordinates,
    })
  }

  const nextMeta = {
    ...(tenant?.metadata || {}),
    receiving_plants: normalized,
    address: geo.address || tenant?.metadata?.address || null,
  }

  if (typeof setTenant === 'function' && tenant) {
    setTenant({
      ...tenant,
      country: geo.country || tenant.country,
      city: geo.city || tenant.city,
      address: geo.address || tenant.address,
      coordinates: geo.coordinates || tenant.coordinates,
      receivingPlants: normalized,
      metadata: nextMeta,
    })
  }

  const cid = companyId || tenant?.id
  if (cid && isSupabaseConfigured) {
    try {
      await companiesService.update(cid, {
        country: geo.country || null,
        city: geo.city || null,
        address: geo.address || null,
        coordinates: geo.coordinates,
        metadata: nextMeta,
      })
    } catch (err) {
      return {
        ok: true,
        plants: normalized,
        error: err?.message || 'Saved locally; cloud sync failed.',
      }
    }
  }

  return { ok: true, plants: normalized }
}
