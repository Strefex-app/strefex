import { COUNTRY_COORDINATES } from '../data/supplierDatabase'

/** ISO2 centers not already in COUNTRY_COORDINATES (same [lng, lat] as supplier DB). */
const EXTRA_COUNTRY_COORDINATES = {
  CA: { name: 'Canada', coordinates: [-106.3468, 56.1304] },
  BE: { name: 'Belgium', coordinates: [4.4699, 50.5039] },
  PT: { name: 'Portugal', coordinates: [-8.2245, 39.3999] },
  GR: { name: 'Greece', coordinates: [21.8243, 39.0742] },
  RO: { name: 'Romania', coordinates: [24.9668, 45.9432] },
  UA: { name: 'Ukraine', coordinates: [31.1656, 48.3794] },
  AE: { name: 'United Arab Emirates', coordinates: [53.8478, 23.4241] },
  IL: { name: 'Israel', coordinates: [34.8516, 31.0461] },
  AR: { name: 'Argentina', coordinates: [-63.6167, -38.4161] },
  ZA: { name: 'South Africa', coordinates: [22.9375, -30.5595] },
  EG: { name: 'Egypt', coordinates: [30.8025, 26.8206] },
  BG: { name: 'Bulgaria', coordinates: [25.4858, 42.7339] },
  SI: { name: 'Slovenia', coordinates: [14.9955, 46.1512] },
  HR: { name: 'Croatia', coordinates: [15.2000, 45.1000] },
  SK: { name: 'Slovakia', coordinates: [19.6990, 48.6690] },
  EE: { name: 'Estonia', coordinates: [25.0136, 58.5953] },
  LV: { name: 'Latvia', coordinates: [24.6032, 56.8796] },
  LT: { name: 'Lithuania', coordinates: [23.8813, 55.1694] },
  IE: { name: 'Ireland', coordinates: [-8.2437, 53.4129] },
  IS: { name: 'Iceland', coordinates: [-19.0208, 64.9631] },
  ID: { name: 'Indonesia', coordinates: [113.9213, -0.789275] },
  PH: { name: 'Philippines', coordinates: [121.7740, 12.8797] },
}

const MERGED = { ...COUNTRY_COORDINATES, ...EXTRA_COUNTRY_COORDINATES }

/** Lowercase English (and common variants) → ISO2 keys in MERGED. */
const COUNTRY_PHRASE_TO_CODE = {
  'united states': 'US',
  usa: 'US',
  'u.s.a': 'US',
  'u.s.a.': 'US',
  america: 'US',
  'united kingdom': 'UK',
  uk: 'UK',
  britain: 'UK',
  england: 'UK',
  scotland: 'UK',
  wales: 'UK',
  'great britain': 'UK',
  deutschland: 'DE',
  germany: 'DE',
  österreich: 'AT',
  austria: 'AT',
  schweiz: 'CH',
  switzerland: 'CH',
  suisse: 'CH',
  italia: 'IT',
  italy: 'IT',
  españa: 'ES',
  spain: 'ES',
  france: 'FR',
  nederland: 'NL',
  netherlands: 'NL',
  holland: 'NL',
  belgium: 'BE',
  polska: 'PL',
  poland: 'PL',
  česko: 'CZ',
  'czech republic': 'CZ',
  czechia: 'CZ',
  magyarország: 'HU',
  hungary: 'HU',
  românia: 'RO',
  romania: 'RO',
  българия: 'BG',
  slovensko: 'SK',
  slovenija: 'SI',
  hrvatska: 'HR',
  sverige: 'SE',
  sweden: 'SE',
  norge: 'NO',
  norway: 'NO',
  danmark: 'DK',
  denmark: 'DK',
  suomi: 'FI',
  finland: 'FI',
  ísland: 'IS',
  eesti: 'EE',
  latvija: 'LV',
  latvia: 'LV',
  lietuva: 'LT',
  lithuania: 'LT',
  ireland: 'IE',
  'united arab emirates': 'AE',
  uae: 'AE',
  israel: 'IL',
  india: 'IN',
  china: 'CN',
  japan: 'JP',
  'south korea': 'KR',
  korea: 'KR',
  taiwan: 'TW',
  singapore: 'SG',
  australia: 'AU',
  'new zealand': 'NZ',
  brazil: 'BR',
  mexico: 'MX',
  argentina: 'AR',
  chile: 'CL',
  russia: 'RU',
  'russian federation': 'RU',
  ukraine: 'UA',
  turkey: 'TR',
  türkiye: 'TR',
  thailand: 'TH',
  vietnam: 'VN',
  malaysia: 'MY',
  indonesia: 'ID',
  philippines: 'PH',
  'saudi arabia': 'SA',
  'south africa': 'ZA',
  egypt: 'EG',
  canada: 'CA',
  luxembourg: 'LU',
}

function hashString(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function normalizeCountryKey(raw) {
  if (raw == null) return null
  const t = String(raw).trim()
  if (!t || t === '—' || t === '-') return null
  const upper = t.toUpperCase()
  if (upper === 'GB') return 'UK'
  if (MERGED[upper]) return upper
  const two = upper.length === 2 ? upper : null
  if (two && MERGED[two]) return two
  const lower = t.toLowerCase()
  if (COUNTRY_PHRASE_TO_CODE[lower]) return COUNTRY_PHRASE_TO_CODE[lower]
  const compact = lower.replace(/[.\s]/g, '')
  if (COUNTRY_PHRASE_TO_CODE[compact]) return COUNTRY_PHRASE_TO_CODE[compact]
  if (MERGED[upper]) return upper
  const match = Object.entries(MERGED).find(([, v]) => v.name.toLowerCase() === lower)
  if (match) return match[0]
  const partial = Object.entries(MERGED).find(([, v]) => lower.includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(lower))
  if (partial) return partial[0]
  return null
}

/**
 * Approximate [lng, lat] for map markers from account fields (privacy-friendly; not street-level).
 * Stable jitter from country + city + address + seed so nearby accounts do not overlap exactly.
 *
 * @param {{ country?: string, city?: string, address?: string, seed?: string }} fields
 * @returns { [number, number] | null }
 */
export function getApproximateLngLat({ country, city, address, seed = '' } = {}) {
  const code = normalizeCountryKey(country)
  if (!code || !MERGED[code]) return null
  const [lngBase, latBase] = MERGED[code].coordinates
  const key = `${seed}|${country || ''}|${city || ''}|${address || ''}`
  const h = hashString(key)
  const jitterLng = (((h % 401) / 400) - 0.5) * 4
  const jitterLat = ((((h >>> 11) % 401) / 400) - 0.5) * 2.5
  return [lngBase + jitterLng, latBase + jitterLat]
}

/**
 * Like getApproximateLngLat, but always returns [lng, lat] so registered accounts
 * without a resolvable country still appear on the map (deterministic, non-precise).
 */
export function getApproximateLngLatOrFallback({ country, city, address, seed = '' } = {}) {
  const resolved = getApproximateLngLat({ country, city, address, seed })
  if (resolved) return resolved
  const h = hashString(`${seed}|${country || ''}|${city || ''}|${address || ''}|geo-fallback`)
  const lng = -178 + ((h % 35600) / 100)
  const lat = -54 + (((h >>> 15) % 24800) / 100)
  return [
    Math.max(-179.9, Math.min(179.9, lng)),
    Math.max(-55, Math.min(72, lat)),
  ]
}
