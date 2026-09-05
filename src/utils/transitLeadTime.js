/**
 * Distance-based transit lead times (reference only) — same rules as
 * Intelligent Sourcing `transitFor` (air / rail / road / sea).
 */

export const MAP_TRANSPORT_MODES = [
  { id: 'sea', label: 'Sea' },
  { id: 'rail', label: 'Rail' },
  { id: 'road', label: 'Road' },
  { id: 'air', label: 'Air' },
]

const CONT_BY_CC = {
  DE: 'EU', CZ: 'EU', SE: 'EU', PL: 'EU', PT: 'EU', TR: 'EU', FR: 'EU', IE: 'EU',
  LT: 'EU', ES: 'EU', GB: 'EU', UK: 'EU', UA: 'EU', MA: 'EU', DK: 'EU', IT: 'EU',
  NL: 'EU', BE: 'EU', AT: 'EU', CH: 'EU', HU: 'EU', RO: 'EU', SK: 'EU', SI: 'EU',
  HR: 'EU', FI: 'EU', NO: 'EU', US: 'NA', MX: 'NA', CA: 'NA', CN: 'APAC', JP: 'APAC',
  IN: 'APAC', KR: 'APAC', MY: 'APAC', TW: 'APAC', TH: 'APAC', SG: 'APAC', AU: 'APAC',
}

export function countryCodeFromName(country) {
  const c = String(country || '').trim()
  if (!c || c === '—') return 'XX'
  if (/^[A-Za-z]{2}$/.test(c)) return c.toUpperCase() === 'UK' ? 'GB' : c.toUpperCase()
  const map = {
    germany: 'DE', france: 'FR', italy: 'IT', spain: 'ES', poland: 'PL',
    'united states': 'US', usa: 'US', mexico: 'MX', china: 'CN', japan: 'JP',
    india: 'IN', 'south korea': 'KR', 'united kingdom': 'GB', uk: 'GB',
    czechia: 'CZ', 'czech republic': 'CZ', sweden: 'SE', portugal: 'PT',
    turkey: 'TR', türkiye: 'TR', canada: 'CA', austria: 'AT', switzerland: 'CH',
    netherlands: 'NL', belgium: 'BE', romania: 'RO', hungary: 'HU',
  }
  return map[c.toLowerCase()] || 'XX'
}

export function continentFromCountry(countryOrCc) {
  const cc = countryCodeFromName(countryOrCc)
  return CONT_BY_CC[cc] || ''
}

/** Haversine distance in km between { lat, lon } points. */
export function kmBetween(a, b) {
  if (!a || !b) return null
  const lat1 = Number(a.lat)
  const lon1 = Number(a.lon)
  const lat2 = Number(b.lat)
  const lon2 = Number(b.lon)
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null
  const R = 6371
  const r = Math.PI / 180
  const dLat = (lat2 - lat1) * r
  const dLon = (lon2 - lon1) * r
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

function coordsToPoint(coords) {
  if (!coords || coords.length < 2) return null
  const lon = Number(coords[0])
  const lat = Number(coords[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return { lat, lon }
}

/**
 * @param {{ lat: number, lon: number } | null} from
 * @param {{ lat: number, lon: number } | null} to
 * @param {string} [fromCont] continent code EU|NA|APAC|…
 * @param {string} [toCont]
 * @returns {{ dist: number|null, modes: Record<string, number|null>, preferred: string|null }}
 */
export function transitFor(from, to, fromCont = '', toCont = '') {
  const dist = kmBetween(from, to)
  if (dist == null) {
    return { dist: null, modes: { air: null, rail: null, road: null, sea: null }, preferred: null }
  }
  const same = Boolean(fromCont && toCont && fromCont === toCont)
  const eurasia = (fromCont === 'EU' && toCont === 'APAC') || (fromCont === 'APAC' && toCont === 'EU')

  const air = Math.max(2, Math.round(dist / 7000) + (same ? 2 : 4))
  const rail = same
    ? Math.max(3, Math.round(dist / 500) + 2)
    : (eurasia ? Math.round(dist / 1100) + 6 : null)
  const road = same ? Math.max(1, Math.round(dist / 650) + 1) : null
  const sea = same && dist < 1500 ? null : Math.round(dist / 620) + (same ? 6 : 11)

  const modes = { air, rail, road, sea }
  const preferred = ['sea', 'rail', 'road', 'air'].find((id) => typeof modes[id] === 'number') || null
  return { dist, modes, preferred }
}

/** Days for a specific mode, or null if not feasible. */
export function transitDaysForMode(fromCoords, toCoords, modeId, fromCont = '', toCont = '') {
  const from = coordsToPoint(fromCoords)
  const to = coordsToPoint(toCoords)
  const { modes } = transitFor(from, to, fromCont, toCont)
  const key = String(modeId || '').toLowerCase()
  const days = modes[key]
  return typeof days === 'number' ? days : null
}

export function formatTransitLabel(days, modeId) {
  if (typeof days !== 'number') return 'n/a'
  const mode = MAP_TRANSPORT_MODES.find((m) => m.id === modeId)
  const name = mode?.label || modeId || 'Transit'
  return `${name} · ${days} d`
}
