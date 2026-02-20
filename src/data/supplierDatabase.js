/**
 * Comprehensive supplier database with location coordinates, metrics, and industry associations.
 * This serves as the source of truth for supplier mapping and RFQ matching.
 */

// Country coordinates for mapping
export const COUNTRY_COORDINATES = {
  AT: { name: 'Austria', coordinates: [14.5501, 47.5162] },
  DE: { name: 'Germany', coordinates: [10.4515, 51.1657] },
  US: { name: 'United States', coordinates: [-95.7129, 37.0902] },
  JP: { name: 'Japan', coordinates: [138.2529, 36.2048] },
  KR: { name: 'South Korea', coordinates: [127.7669, 35.9078] },
  NZ: { name: 'New Zealand', coordinates: [174.886, -40.9006] },
  IT: { name: 'Italy', coordinates: [12.5674, 41.8719] },
  CN: { name: 'China', coordinates: [104.1954, 35.8617] },
  SE: { name: 'Sweden', coordinates: [18.6435, 60.1282] },
  EU: { name: 'Europe', coordinates: [10.4515, 51.1657] },
  SA: { name: 'Saudi Arabia', coordinates: [45.0792, 23.8859] },
  NL: { name: 'Netherlands', coordinates: [5.2913, 52.1326] },
  BR: { name: 'Brazil', coordinates: [-51.9253, -14.235] },
  UK: { name: 'United Kingdom', coordinates: [-3.436, 55.3781] },
  LU: { name: 'Luxembourg', coordinates: [6.1296, 49.8153] },
  FI: { name: 'Finland', coordinates: [25.7482, 61.9241] },
  ES: { name: 'Spain', coordinates: [-3.7492, 40.4637] },
  CL: { name: 'Chile', coordinates: [-71.543, -35.6751] },
  TW: { name: 'Taiwan', coordinates: [121.5654, 23.6978] },
  IN: { name: 'India', coordinates: [78.9629, 20.5937] },
  MX: { name: 'Mexico', coordinates: [-102.5528, 23.6345] },
  RU: { name: 'Russia', coordinates: [105.3188, 61.524] },
  FR: { name: 'France', coordinates: [2.2137, 46.2276] },
  CH: { name: 'Switzerland', coordinates: [8.2275, 46.8182] },
  PL: { name: 'Poland', coordinates: [19.1451, 51.9194] },
  CZ: { name: 'Czech Republic', coordinates: [15.473, 49.8175] },
  HU: { name: 'Hungary', coordinates: [19.5033, 47.1625] },
  TR: { name: 'Turkey', coordinates: [35.2433, 38.9637] },
  TH: { name: 'Thailand', coordinates: [100.9925, 15.87] },
  VN: { name: 'Vietnam', coordinates: [108.2772, 14.0583] },
  MY: { name: 'Malaysia', coordinates: [101.9758, 4.2105] },
  SG: { name: 'Singapore', coordinates: [103.8198, 1.3521] },
  AU: { name: 'Australia', coordinates: [133.7751, -25.2744] },
  NO: { name: 'Norway', coordinates: [8.4689, 60.472] },
  DK: { name: 'Denmark', coordinates: [9.5018, 56.2639] },
}

// Comprehensive supplier database with all metrics
export const SUPPLIER_DATABASE = [
  // Automotive Industry Suppliers
  {
    id: 'sup-001',
    name: 'Engel Austria GmbH',
    country: 'AT',
    city: 'Schwertberg',
    coordinates: [14.5881, 48.2667],
    industries: ['automotive', 'medical', 'electronics'],
    categories: ['injection-machines'],
    source: 'database',
    rating: 4.8,
    riskLevel: 12,
    fitLevel: 95,
    capacityLevel: 85,
    certifications: ['ISO 9001', 'ISO 14001', 'IATF 16949'],
    leadTimeDays: 90,
    deliveryTimeDays: 14,
    priceIndex: 105, // 100 = market average
    established: 1945,
    employees: 7500,
  },
  {
    id: 'sup-002',
    name: 'Arburg GmbH',
    country: 'DE',
    city: 'Lossburg',
    coordinates: [8.4422, 48.4100],
    industries: ['automotive', 'medical', 'machinery'],
    categories: ['injection-machines', 'automation'],
    source: 'database',
    rating: 4.7,
    riskLevel: 8,
    fitLevel: 92,
    capacityLevel: 78,
    certifications: ['ISO 9001', 'ISO 14001', 'IATF 16949'],
    leadTimeDays: 85,
    deliveryTimeDays: 12,
    priceIndex: 110,
    established: 1923,
    employees: 3400,
  },
  {
    id: 'sup-003',
    name: 'Sumitomo Heavy Industries',
    country: 'JP',
    city: 'Tokyo',
    coordinates: [139.6917, 35.6895],
    industries: ['automotive', 'electronics'],
    categories: ['injection-machines'],
    source: 'database',
    rating: 4.6,
    riskLevel: 10,
    fitLevel: 88,
    capacityLevel: 92,
    certifications: ['ISO 9001', 'JIS Q 9001'],
    leadTimeDays: 120,
    deliveryTimeDays: 21,
    priceIndex: 95,
    established: 1888,
    employees: 24000,
  },
  {
    id: 'sup-004',
    name: 'FANUC Corporation',
    country: 'JP',
    city: 'Yamanashi',
    coordinates: [138.5681, 35.6642],
    industries: ['automotive', 'machinery', 'electronics'],
    categories: ['robots', 'automation', 'cnc'],
    source: 'database',
    rating: 4.9,
    riskLevel: 5,
    fitLevel: 96,
    capacityLevel: 88,
    certifications: ['ISO 9001', 'ISO 14001'],
    leadTimeDays: 60,
    deliveryTimeDays: 18,
    priceIndex: 115,
    established: 1956,
    employees: 8500,
  },
  {
    id: 'sup-005',
    name: 'DMG MORI',
    country: 'DE',
    city: 'Bielefeld',
    coordinates: [8.5333, 52.0333],
    industries: ['machinery', 'automotive'],
    categories: ['cnc', 'lathes', 'mills'],
    source: 'database',
    rating: 4.7,
    riskLevel: 7,
    fitLevel: 94,
    capacityLevel: 82,
    certifications: ['ISO 9001', 'ISO 14001'],
    leadTimeDays: 75,
    deliveryTimeDays: 14,
    priceIndex: 120,
    established: 1870,
    employees: 12000,
  },
  {
    id: 'sup-006',
    name: 'Haas Automation',
    country: 'US',
    city: 'Oxnard, CA',
    coordinates: [-119.1773, 34.1975],
    industries: ['machinery', 'automotive'],
    categories: ['cnc', 'lathes', 'mills'],
    source: 'database',
    rating: 4.5,
    riskLevel: 15,
    fitLevel: 85,
    capacityLevel: 75,
    certifications: ['ISO 9001'],
    leadTimeDays: 45,
    deliveryTimeDays: 10,
    priceIndex: 85,
    established: 1983,
    employees: 1500,
  },
  {
    id: 'sup-007',
    name: 'Yudo Group',
    country: 'KR',
    city: 'Hwaseong',
    coordinates: [127.0286, 37.1997],
    industries: ['automotive', 'electronics'],
    categories: ['hot-runner', 'mold-makers'],
    source: 'database',
    rating: 4.4,
    riskLevel: 18,
    fitLevel: 82,
    capacityLevel: 90,
    certifications: ['ISO 9001', 'IATF 16949'],
    leadTimeDays: 50,
    deliveryTimeDays: 16,
    priceIndex: 75,
    established: 1980,
    employees: 2000,
  },
  {
    id: 'sup-008',
    name: 'Covestro AG',
    country: 'DE',
    city: 'Leverkusen',
    coordinates: [6.9847, 51.0333],
    industries: ['automotive', 'electronics', 'medical'],
    categories: ['raw-materials'],
    source: 'database',
    rating: 4.6,
    riskLevel: 8,
    fitLevel: 90,
    capacityLevel: 95,
    certifications: ['ISO 9001', 'ISO 14001', 'ISCC'],
    leadTimeDays: 14,
    deliveryTimeDays: 7,
    priceIndex: 102,
    established: 2015,
    employees: 17500,
  },
  // Electronics Industry Suppliers
  {
    id: 'sup-009',
    name: 'ASM Pacific Technology',
    country: 'SG',
    city: 'Singapore',
    coordinates: [103.8198, 1.3521],
    industries: ['electronics'],
    categories: ['smt', 'automation'],
    source: 'database',
    rating: 4.6,
    riskLevel: 12,
    fitLevel: 91,
    capacityLevel: 85,
    certifications: ['ISO 9001', 'ISO 14001'],
    leadTimeDays: 60,
    deliveryTimeDays: 14,
    priceIndex: 105,
    established: 1975,
    employees: 16000,
  },
  {
    id: 'sup-010',
    name: 'Fuji Corporation',
    country: 'JP',
    city: 'Chiryu',
    coordinates: [137.0633, 34.9833],
    industries: ['electronics'],
    categories: ['smt', 'pcb'],
    source: 'database',
    rating: 4.5,
    riskLevel: 10,
    fitLevel: 88,
    capacityLevel: 80,
    certifications: ['ISO 9001', 'JIS Q 9001'],
    leadTimeDays: 75,
    deliveryTimeDays: 18,
    priceIndex: 100,
    established: 1959,
    employees: 3500,
  },
  // Medical Industry Suppliers
  {
    id: 'sup-011',
    name: 'Steris Corporation',
    country: 'US',
    city: 'Mentor, OH',
    coordinates: [-81.3396, 41.6661],
    industries: ['medical'],
    categories: ['sterilization', 'clean-room'],
    source: 'database',
    rating: 4.7,
    riskLevel: 6,
    fitLevel: 94,
    capacityLevel: 88,
    certifications: ['ISO 13485', 'FDA'],
    leadTimeDays: 45,
    deliveryTimeDays: 10,
    priceIndex: 108,
    established: 1985,
    employees: 13000,
  },
  {
    id: 'sup-012',
    name: 'Getinge AB',
    country: 'SE',
    city: 'Gothenburg',
    coordinates: [11.9746, 57.7089],
    industries: ['medical'],
    categories: ['sterilization', 'clean-room', 'automation'],
    source: 'database',
    rating: 4.6,
    riskLevel: 8,
    fitLevel: 92,
    capacityLevel: 82,
    certifications: ['ISO 13485', 'CE'],
    leadTimeDays: 60,
    deliveryTimeDays: 14,
    priceIndex: 112,
    established: 1904,
    employees: 10500,
  },
  // Additional suppliers for diversity
  {
    id: 'sup-013',
    name: 'Trumpf GmbH',
    country: 'DE',
    city: 'Ditzingen',
    coordinates: [9.0667, 48.8333],
    industries: ['machinery', 'automotive'],
    categories: ['automation', 'testing'],
    source: 'database',
    rating: 4.8,
    riskLevel: 5,
    fitLevel: 95,
    capacityLevel: 78,
    certifications: ['ISO 9001', 'ISO 14001'],
    leadTimeDays: 90,
    deliveryTimeDays: 14,
    priceIndex: 125,
    established: 1923,
    employees: 15000,
  },
  {
    id: 'sup-014',
    name: 'Mazak Corporation',
    country: 'JP',
    city: 'Oguchi',
    coordinates: [136.9167, 35.3333],
    industries: ['machinery'],
    categories: ['cnc', 'lathes', 'mills'],
    source: 'database',
    rating: 4.6,
    riskLevel: 9,
    fitLevel: 90,
    capacityLevel: 85,
    certifications: ['ISO 9001'],
    leadTimeDays: 80,
    deliveryTimeDays: 20,
    priceIndex: 105,
    established: 1919,
    employees: 8500,
  },
  {
    id: 'sup-015',
    name: 'Makino Milling',
    country: 'JP',
    city: 'Tokyo',
    coordinates: [139.7500, 35.6833],
    industries: ['machinery', 'automotive'],
    categories: ['cnc', 'mills', 'testing'],
    source: 'database',
    rating: 4.5,
    riskLevel: 11,
    fitLevel: 87,
    capacityLevel: 80,
    certifications: ['ISO 9001', 'JIS Q 9001'],
    leadTimeDays: 70,
    deliveryTimeDays: 18,
    priceIndex: 108,
    established: 1937,
    employees: 4500,
  },
  {
    id: 'sup-016',
    name: 'Husky Injection Molding',
    country: 'CA',
    city: 'Bolton, ON',
    coordinates: [-79.7333, 43.8833],
    industries: ['automotive', 'medical'],
    categories: ['injection-machines', 'hot-runner'],
    source: 'database',
    rating: 4.5,
    riskLevel: 12,
    fitLevel: 86,
    capacityLevel: 82,
    certifications: ['ISO 9001', 'ISO 14001'],
    leadTimeDays: 85,
    deliveryTimeDays: 12,
    priceIndex: 102,
    established: 1953,
    employees: 4000,
  },
  {
    id: 'sup-017',
    name: 'Krauss-Maffei',
    country: 'DE',
    city: 'Munich',
    coordinates: [11.5820, 48.1351],
    industries: ['automotive', 'medical'],
    categories: ['injection-machines', 'automation'],
    source: 'database',
    rating: 4.6,
    riskLevel: 9,
    fitLevel: 91,
    capacityLevel: 76,
    certifications: ['ISO 9001', 'ISO 14001', 'IATF 16949'],
    leadTimeDays: 95,
    deliveryTimeDays: 14,
    priceIndex: 115,
    established: 1838,
    employees: 5500,
  },
  {
    id: 'sup-018',
    name: 'Wittmann Battenfeld',
    country: 'AT',
    city: 'Kottingbrunn',
    coordinates: [16.2167, 47.9500],
    industries: ['automotive', 'electronics'],
    categories: ['injection-machines', 'robots', 'automation'],
    source: 'database',
    rating: 4.4,
    riskLevel: 14,
    fitLevel: 84,
    capacityLevel: 78,
    certifications: ['ISO 9001'],
    leadTimeDays: 70,
    deliveryTimeDays: 12,
    priceIndex: 95,
    established: 1976,
    employees: 2200,
  },
  // China suppliers
  {
    id: 'sup-019',
    name: 'Haitian International',
    country: 'CN',
    city: 'Ningbo',
    coordinates: [121.5500, 29.8683],
    industries: ['automotive', 'electronics'],
    categories: ['injection-machines'],
    source: 'database',
    rating: 4.2,
    riskLevel: 22,
    fitLevel: 78,
    capacityLevel: 95,
    certifications: ['ISO 9001'],
    leadTimeDays: 45,
    deliveryTimeDays: 25,
    priceIndex: 65,
    established: 1966,
    employees: 6000,
  },
  {
    id: 'sup-020',
    name: 'Chen Hsong Holdings',
    country: 'CN',
    city: 'Shenzhen',
    coordinates: [114.0579, 22.5431],
    industries: ['automotive', 'electronics'],
    categories: ['injection-machines'],
    source: 'database',
    rating: 4.1,
    riskLevel: 25,
    fitLevel: 75,
    capacityLevel: 92,
    certifications: ['ISO 9001'],
    leadTimeDays: 40,
    deliveryTimeDays: 22,
    priceIndex: 60,
    established: 1958,
    employees: 4500,
  },

  // Oil & Gas Industry Suppliers
  {
    id: 'sup-021',
    name: 'Schlumberger',
    country: 'US',
    city: 'Houston',
    coordinates: [-95.3698, 29.7604],
    industries: ['oil-gas'],
    categories: ['drilling', 'subsea', 'instrumentation'],
    source: 'database',
    rating: 4.9,
    riskLevel: 8,
    fitLevel: 97,
    capacityLevel: 95,
    certifications: ['ISO 9001', 'ISO 14001', 'API Q1', 'OHSAS 18001'],
    leadTimeDays: 60,
    deliveryTimeDays: 30,
    priceIndex: 120,
    established: 1926,
    employees: 80000,
  },
  {
    id: 'sup-022',
    name: 'Baker Hughes',
    country: 'US',
    city: 'Houston',
    coordinates: [-95.3698, 29.7604],
    industries: ['oil-gas', 'green-energy'],
    categories: ['drilling', 'pumps', 'valves'],
    source: 'database',
    rating: 4.7,
    riskLevel: 10,
    fitLevel: 94,
    capacityLevel: 90,
    certifications: ['ISO 9001', 'API Q1', 'ISO 14001'],
    leadTimeDays: 75,
    deliveryTimeDays: 35,
    priceIndex: 115,
    established: 1907,
    employees: 55000,
  },
  {
    id: 'sup-023',
    name: 'Cameron International',
    country: 'US',
    city: 'Houston',
    coordinates: [-95.3698, 29.7604],
    industries: ['oil-gas'],
    categories: ['valves', 'wellhead', 'safety-systems'],
    source: 'database',
    rating: 4.6,
    riskLevel: 12,
    fitLevel: 92,
    capacityLevel: 88,
    certifications: ['ISO 9001', 'API 6A', 'API Q1'],
    leadTimeDays: 90,
    deliveryTimeDays: 40,
    priceIndex: 110,
    established: 1920,
    employees: 25000,
  },
  {
    id: 'sup-024',
    name: 'Emerson Electric',
    country: 'US',
    city: 'St. Louis',
    coordinates: [-90.1994, 38.627],
    industries: ['oil-gas'],
    categories: ['instrumentation', 'valves', 'safety-systems'],
    source: 'database',
    rating: 4.5,
    riskLevel: 15,
    fitLevel: 90,
    capacityLevel: 85,
    certifications: ['ISO 9001', 'ISO 14001', 'SIL 3'],
    leadTimeDays: 45,
    deliveryTimeDays: 20,
    priceIndex: 105,
    established: 1890,
    employees: 86000,
  },
  {
    id: 'sup-025',
    name: 'Technip Energies',
    country: 'FR',
    city: 'Paris',
    coordinates: [2.3522, 48.8566],
    industries: ['oil-gas', 'green-energy'],
    categories: ['refining', 'pipelines', 'hydrogen'],
    source: 'database',
    rating: 4.6,
    riskLevel: 11,
    fitLevel: 93,
    capacityLevel: 88,
    certifications: ['ISO 9001', 'ISO 14001', 'ISO 45001'],
    leadTimeDays: 120,
    deliveryTimeDays: 60,
    priceIndex: 130,
    established: 1958,
    employees: 15000,
  },
  {
    id: 'sup-026',
    name: 'Aker Solutions',
    country: 'NO',
    city: 'Oslo',
    coordinates: [10.7522, 59.9139],
    industries: ['oil-gas'],
    categories: ['subsea', 'wellhead', 'drilling'],
    source: 'database',
    rating: 4.4,
    riskLevel: 14,
    fitLevel: 89,
    capacityLevel: 82,
    certifications: ['ISO 9001', 'NORSOK', 'API Q1'],
    leadTimeDays: 100,
    deliveryTimeDays: 45,
    priceIndex: 125,
    established: 1841,
    employees: 20000,
  },

  // Green Energy Industry Suppliers
  {
    id: 'sup-027',
    name: 'Vestas Wind Systems',
    country: 'DK',
    city: 'Aarhus',
    coordinates: [10.2039, 56.1629],
    industries: ['green-energy'],
    categories: ['wind-turbines', 'monitoring'],
    source: 'database',
    rating: 4.8,
    riskLevel: 9,
    fitLevel: 96,
    capacityLevel: 92,
    certifications: ['ISO 9001', 'ISO 14001', 'IEC 61400'],
    leadTimeDays: 180,
    deliveryTimeDays: 90,
    priceIndex: 140,
    established: 1945,
    employees: 29000,
  },
  {
    id: 'sup-028',
    name: 'SMA Solar Technology',
    country: 'DE',
    city: 'Niestetal',
    coordinates: [9.5553, 51.3046],
    industries: ['green-energy'],
    categories: ['inverters', 'monitoring', 'grid-equipment'],
    source: 'database',
    rating: 4.6,
    riskLevel: 12,
    fitLevel: 93,
    capacityLevel: 88,
    certifications: ['ISO 9001', 'ISO 14001', 'IEC 62109'],
    leadTimeDays: 30,
    deliveryTimeDays: 14,
    priceIndex: 95,
    established: 1981,
    employees: 4000,
  },
  {
    id: 'sup-029',
    name: 'CATL',
    country: 'CN',
    city: 'Ningde',
    coordinates: [119.5479, 26.6657],
    industries: ['green-energy', 'automotive'],
    categories: ['battery-storage', 'ev-charging'],
    source: 'database',
    rating: 4.7,
    riskLevel: 15,
    fitLevel: 94,
    capacityLevel: 96,
    certifications: ['ISO 9001', 'ISO 14001', 'IATF 16949'],
    leadTimeDays: 60,
    deliveryTimeDays: 30,
    priceIndex: 85,
    established: 2011,
    employees: 110000,
  },
  {
    id: 'sup-030',
    name: 'Siemens Gamesa',
    country: 'ES',
    city: 'Zamudio',
    coordinates: [-2.8722, 43.2886],
    industries: ['green-energy'],
    categories: ['wind-turbines', 'grid-equipment'],
    source: 'database',
    rating: 4.5,
    riskLevel: 13,
    fitLevel: 91,
    capacityLevel: 87,
    certifications: ['ISO 9001', 'ISO 14001', 'IEC 61400', 'ISO 45001'],
    leadTimeDays: 150,
    deliveryTimeDays: 75,
    priceIndex: 135,
    established: 2017,
    employees: 22000,
  },
  {
    id: 'sup-031',
    name: 'Enphase Energy',
    country: 'US',
    city: 'Fremont',
    coordinates: [-121.9886, 37.5485],
    industries: ['green-energy'],
    categories: ['inverters', 'monitoring', 'battery-storage'],
    source: 'database',
    rating: 4.5,
    riskLevel: 16,
    fitLevel: 90,
    capacityLevel: 82,
    certifications: ['ISO 9001', 'UL 1741', 'IEC 62109'],
    leadTimeDays: 21,
    deliveryTimeDays: 10,
    priceIndex: 90,
    established: 2006,
    employees: 3000,
  },
  {
    id: 'sup-032',
    name: 'Nel ASA',
    country: 'NO',
    city: 'Oslo',
    coordinates: [10.7522, 59.9139],
    industries: ['green-energy', 'oil-gas'],
    categories: ['hydrogen'],
    source: 'database',
    rating: 4.3,
    riskLevel: 20,
    fitLevel: 88,
    capacityLevel: 75,
    certifications: ['ISO 9001', 'ISO 14001', 'ATEX'],
    leadTimeDays: 120,
    deliveryTimeDays: 60,
    priceIndex: 110,
    established: 1927,
    employees: 600,
  },
]

/* ── Registry integration ─────────────────────────────────
 * Registered sellers from the account registry are merged into the supplier
 * database so that Executive Summary, equipment pages, and RFQ matching
 * always reference every seller for the related industry/equipment.
 * ──────────────────────────────────────────────────────── */
import { useAccountRegistry } from '../store/accountRegistry'

/**
 * Convert a registered seller account into the same shape as SUPPLIER_DATABASE entries.
 * Missing metrics get reasonable defaults so they render correctly in tables/maps.
 */
function registrySellerToSupplier(acct) {
  // Flatten all categories into a single array for backward compatibility
  const allCats = Object.values(acct.categories || {}).flat()
  return {
    id: acct.id,
    name: acct.company || acct.contactName || 'Unknown',
    country: acct.country || '—',
    city: acct.city || '—',
    coordinates: acct.coordinates || [0, 0],
    industries: acct.industries || [],
    categories: allCats,
    source: 'registered',          // distinguish from static 'database' entries
    rating: acct.rating ?? 0,      // new registrations start with 0 until rated
    riskLevel: acct.riskLevel ?? 50,
    fitLevel: acct.fitLevel ?? 50,
    capacityLevel: acct.capacityLevel ?? 50,
    certifications: acct.certifications || [],
    leadTimeDays: acct.leadTimeDays ?? 0,
    deliveryTimeDays: acct.deliveryTimeDays ?? 0,
    priceIndex: acct.priceIndex ?? 100,
    established: acct.established ?? new Date(acct.registeredAt).getFullYear(),
    employees: acct.employees ?? 0,
    // Extra fields for display
    email: acct.email,
    contactName: acct.contactName,
    plan: acct.plan,
    registeredAt: acct.registeredAt,
  }
}

/**
 * Get ALL suppliers: static database + registered sellers from the account registry.
 * De-duplicated by id.
 */
function getAllSuppliers() {
  const registry = useAccountRegistry.getState()
  const registeredSellers = registry.getRegisteredSellers()
  const registrySuppliers = registeredSellers.map(registrySellerToSupplier)

  // Merge: static first, then registry entries that aren't already in the static list
  const staticIds = new Set(SUPPLIER_DATABASE.map((s) => s.id))
  const unique = registrySuppliers.filter((s) => !staticIds.has(s.id))
  return [...SUPPLIER_DATABASE, ...unique]
}

// Get suppliers by industry (includes registered sellers)
export function getSuppliersByIndustry(industryId) {
  const all = getAllSuppliers()
  if (!industryId) return all
  return all.filter(s => s.industries.includes(industryId))
}

// Get suppliers by category (includes registered sellers)
export function getSuppliersByCategory(categoryId) {
  return getAllSuppliers().filter(s => s.categories.includes(categoryId))
}

/**
 * Get registered sellers for a specific industry AND equipment category.
 * Returns only sellers from the account registry (not the static database).
 */
export function getRegisteredSellersForCategory(industryId, categoryId) {
  const registry = useAccountRegistry.getState()
  return registry.getSellersByCategory(industryId, categoryId).map(registrySellerToSupplier)
}

/**
 * Get count of registered sellers per category within an industry.
 */
export function getSellerCountByCategory(industryId) {
  return useAccountRegistry.getState().getSellerCountByCategory(industryId)
}

/**
 * Get suppliers for a specific industry AND equipment category.
 * Merges static database with registered sellers.
 */
export function getSuppliersByIndustryAndCategory(industryId, categoryId) {
  if (!industryId || !categoryId) return getSuppliersByIndustry(industryId)
  return getAllSuppliers().filter(
    (s) => s.industries.includes(industryId) && s.categories.includes(categoryId)
  )
}

// Get supplier coordinates for mapping (includes registered sellers)
export function getSupplierLocations(industryId = null, categoryId = null) {
  let suppliers
  if (industryId && categoryId) {
    suppliers = getSuppliersByIndustryAndCategory(industryId, categoryId)
  } else if (industryId) {
    suppliers = getSuppliersByIndustry(industryId)
  } else {
    suppliers = getAllSuppliers()
  }
  return suppliers
    .filter(s => s.coordinates && s.coordinates[0] !== 0)
    .map(s => ({
      id: s.id,
      name: s.name,
      coordinates: s.coordinates,
      country: s.country,
      city: s.city,
      rating: s.rating,
      riskLevel: s.riskLevel,
      fitLevel: s.fitLevel,
      source: s.source || 'database',
    }))
}

// Calculate aggregate metrics (includes registered sellers)
// Supports optional categoryId to scope metrics to a specific equipment category.
export function getIndustryMetrics(industryId, categoryId = null) {
  let suppliers
  if (industryId && categoryId) {
    suppliers = getSuppliersByIndustryAndCategory(industryId, categoryId)
  } else {
    suppliers = industryId ? getSuppliersByIndustry(industryId) : getAllSuppliers()
  }
  // Only include suppliers with valid metrics (rating > 0) for averages
  const withMetrics = suppliers.filter(s => s.rating > 0)
  if (withMetrics.length === 0) {
    return {
      avgRating: 0, avgRisk: 0, avgFit: 0, avgCapacity: 0,
      avgLeadTime: 0, avgDeliveryTime: 0, avgPriceIndex: 0,
      totalSuppliers: suppliers.length,
    }
  }
  
  const sum = withMetrics.reduce((acc, s) => ({
    rating: acc.rating + s.rating,
    risk: acc.risk + s.riskLevel,
    fit: acc.fit + s.fitLevel,
    capacity: acc.capacity + s.capacityLevel,
    leadTime: acc.leadTime + s.leadTimeDays,
    deliveryTime: acc.deliveryTime + s.deliveryTimeDays,
    price: acc.price + s.priceIndex,
  }), { rating: 0, risk: 0, fit: 0, capacity: 0, leadTime: 0, deliveryTime: 0, price: 0 })
  
  const count = withMetrics.length
  return {
    avgRating: (sum.rating / count).toFixed(1),
    avgRisk: Math.round(sum.risk / count),
    avgFit: Math.round(sum.fit / count),
    avgCapacity: Math.round(sum.capacity / count),
    avgLeadTime: Math.round(sum.leadTime / count),
    avgDeliveryTime: Math.round(sum.deliveryTime / count),
    avgPriceIndex: Math.round(sum.price / count),
    totalSuppliers: suppliers.length,
  }
}

// Match suppliers to RFQ requirements (includes registered sellers)
export function matchSuppliersToRfq(rfq) {
  const { industryId, categoryId, requirements = {} } = rfq
  let suppliers = getAllSuppliers()
  
  if (industryId) {
    suppliers = suppliers.filter(s => s.industries.includes(industryId))
  }
  
  if (categoryId) {
    suppliers = suppliers.filter(s => s.categories.includes(categoryId))
  }
  
  // Score each supplier based on requirements
  return suppliers.map(s => {
    let score = s.fitLevel
    
    if (requirements.maxLeadTime && s.leadTimeDays > 0 && s.leadTimeDays <= requirements.maxLeadTime) {
      score += 5
    }
    if (requirements.maxPrice && s.priceIndex <= requirements.maxPrice) {
      score += 5
    }
    if (requirements.minRating && s.rating >= requirements.minRating) {
      score += 5
    }
    if (requirements.maxRisk && s.riskLevel <= requirements.maxRisk) {
      score += 5
    }
    
    return {
      ...s,
      matchScore: Math.min(100, score),
    }
  }).sort((a, b) => b.matchScore - a.matchScore)
}

// Industry labels
export const INDUSTRY_LABELS = {
  automotive: 'Automotive',
  machinery: 'Machinery',
  electronics: 'Electronics',
  medical: 'Medical',
  'raw-materials': 'Raw Materials',
  'oil-gas': 'Oil & Gas',
  'green-energy': 'Green Energy',
}

export default SUPPLIER_DATABASE
