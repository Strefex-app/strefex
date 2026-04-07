/**
 * Webull-style market groups + full ISO country list from `countries-list`.
 * Cities: capital + optional major hubs (World Bank uses country-level series; city is for report headline).
 */
import { countries } from 'countries-list'

/** Extra cities beyond capital for larger economies (headline / UX). */
const EXTRA_CITIES = {
  US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'],
  CA: ['Toronto', 'Vancouver', 'Montreal'],
  GB: ['London', 'Manchester', 'Birmingham'],
  DE: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg'],
  FR: ['Paris', 'Lyon', 'Marseille'],
  IT: ['Milan', 'Rome', 'Turin', 'Naples'],
  ES: ['Madrid', 'Barcelona', 'Valencia'],
  NL: ['Amsterdam', 'Rotterdam'],
  CH: ['Zurich', 'Geneva', 'Basel'],
  AT: ['Vienna', 'Salzburg'],
  PL: ['Warsaw', 'Krakow'],
  SE: ['Stockholm', 'Gothenburg'],
  NO: ['Oslo', 'Bergen'],
  FI: ['Helsinki', 'Tampere'],
  DK: ['Copenhagen', 'Aarhus'],
  PT: ['Lisbon', 'Porto'],
  GR: ['Athens', 'Thessaloniki'],
  TR: ['Istanbul', 'Ankara', 'Izmir'],
  RU: ['Moscow', 'Saint Petersburg'],
  UA: ['Kyiv', 'Lviv'],
  CN: ['Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou'],
  JP: ['Tokyo', 'Osaka', 'Yokohama'],
  KR: ['Seoul', 'Busan'],
  IN: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai'],
  AU: ['Sydney', 'Melbourne', 'Brisbane'],
  NZ: ['Auckland', 'Wellington'],
  SG: ['Singapore'],
  HK: ['Hong Kong'],
  TW: ['Taipei', 'Kaohsiung'],
  MY: ['Kuala Lumpur', 'Penang'],
  TH: ['Bangkok', 'Chiang Mai'],
  VN: ['Ho Chi Minh City', 'Hanoi'],
  ID: ['Jakarta', 'Surabaya'],
  PH: ['Manila', 'Cebu'],
  AE: ['Dubai', 'Abu Dhabi'],
  SA: ['Riyadh', 'Jeddah'],
  IL: ['Tel Aviv', 'Jerusalem'],
  ZA: ['Johannesburg', 'Cape Town'],
  EG: ['Cairo', 'Alexandria'],
  NG: ['Lagos', 'Abuja'],
  KE: ['Nairobi', 'Mombasa'],
  BR: ['São Paulo', 'Rio de Janeiro', 'Brasília'],
  MX: ['Mexico City', 'Monterrey', 'Guadalajara'],
  AR: ['Buenos Aires', 'Córdoba'],
  CL: ['Santiago', 'Valparaíso'],
  CO: ['Bogotá', 'Medellín'],
}

const MIDDLE_EAST_AS = new Set([
  'AE', 'SA', 'IL', 'JO', 'LB', 'KW', 'QA', 'BH', 'OM', 'YE', 'IQ', 'IR', 'SY', 'PS',
])

/**
 * Map countries-list continent + ISO to Webull-style market id.
 */
export function resolveMarketId(iso2, info) {
  const c = info.continent
  if (c === 'NA') return 'north-america'
  if (c === 'SA') return 'latin-america'
  if (c === 'EU') return 'europe'
  if (c === 'OC') return 'oceania'
  if (c === 'AN') return 'polar'
  if (MIDDLE_EAST_AS.has(iso2)) return 'middle-east'
  if (c === 'AS') return 'asia'
  if (c === 'AF') return 'africa'
  return 'global'
}

export const MARKET_TABS = [
  { id: 'all', name: 'Global', tag: 'ALL' },
  { id: 'north-america', name: 'North America', tag: 'US' },
  { id: 'latin-america', name: 'Latin America', tag: 'LATAM' },
  { id: 'europe', name: 'Europe', tag: 'EU' },
  { id: 'asia', name: 'Asia', tag: 'AS' },
  { id: 'middle-east', name: 'Middle East', tag: 'ME' },
  { id: 'africa', name: 'Africa', tag: 'AF' },
  { id: 'oceania', name: 'Oceania', tag: 'OC' },
  { id: 'polar', name: 'Polar', tag: 'AN' },
]

function buildCities(code, capital) {
  const cap = capital || ''
  const extra = EXTRA_CITIES[code]
  const set = new Set()
  if (cap) set.add(cap)
  if (extra) extra.forEach((x) => set.add(x))
  return Array.from(set)
}

/** Sorted list of { code, name, capital, marketId, cities }. */
export const ALL_COUNTRIES = Object.entries(countries)
  .filter(([code]) => code && code.length === 2)
  .map(([code, info]) => ({
    code,
    name: info.name,
    capital: info.capital || '',
    marketId: resolveMarketId(code, info),
    cities: buildCities(code, info.capital),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'))

export function getCountriesFiltered(marketTabId) {
  if (!marketTabId || marketTabId === 'all') return ALL_COUNTRIES
  return ALL_COUNTRIES.filter((c) => c.marketId === marketTabId)
}

export function getCountryByCode(iso2) {
  return ALL_COUNTRIES.find((c) => c.code === iso2) || null
}

export function getDefaultCityForCountry(iso2) {
  const c = getCountryByCode(iso2)
  if (!c?.cities?.length) return ''
  return c.cities[0]
}
