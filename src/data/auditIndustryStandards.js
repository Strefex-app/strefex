export const STANDARD_INDUSTRY_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'Automotive', label: 'Automotive' },
  { id: 'Aerospace', label: 'Aerospace' },
  { id: 'Electronics', label: 'Electronics' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'Medical', label: 'Medical device' },
  { id: 'special', label: 'Special process' },
]

/** Display modules offered on Standards & questionnaires, in screenshot order. */
export const STANDARD_MODULES = [
  {
    id: 'iso-9001',
    name: 'ISO 9001:2015',
    family: 'ISO',
    lead: 'Quality management system baseline. Applied under every industry as the system layer beneath the sector module.',
    structure: 'Clauses 4 Context · 5 Leadership · 6 Planning · 7 Support · 8 Operation · 9 Performance · 10 Improvement',
    industries: ['Automotive', 'Aerospace', 'Electronics', 'industrial', 'Medical', 'special'],
  },
  {
    id: 'iatf-16949',
    name: 'IATF 16949:2016',
    family: 'IATF',
    lead: 'Automotive QMS overlay on ISO 9001. Customer-specific requirements, product safety, and manufacturing process control.',
    structure: 'ISO 9001 clauses plus IATF automotive overlays (product safety, contingency, supplier QMS, manufacturing).',
    industries: ['Automotive', 'Electronics'],
  },
  {
    id: 'vda-63',
    name: 'VDA 6.3 process audit',
    family: 'VDA',
    lead: 'German automotive process audit of product realisation, from project planning through series production.',
    structure: 'P2–P7 process elements with potential analysis where a new supplier is being qualified.',
    industries: ['Automotive'],
  },
  {
    id: 'as9100',
    name: 'AS9100D / EN 9100',
    family: 'IAQG',
    lead: 'Aviation, space and defence QMS. Configuration, FOD, first article and special-process control sit on the ISO 9001 spine.',
    structure: 'AS9100 Rev D clauses 4–10 with aerospace supplements (FAI, FOD, counterfeit, key characteristics).',
    industries: ['Aerospace'],
  },
  {
    id: 'iso-13485',
    name: 'ISO 13485:2016',
    family: 'ISO',
    lead: 'Medical-device QMS covering design, production, sterility, UDI and post-market surveillance.',
    structure: 'Clauses 4 QMS · 7 Product realisation · 8 Measurement, CAPA and PMS.',
    industries: ['Medical'],
  },
  {
    id: 'eu-mdr',
    name: 'EU MDR 2017/745 readiness',
    family: 'EU',
    lead: 'Readiness of the technical file, GSPR, UDI, PMS and notified-body path for CE marking of medical devices.',
    structure: 'Classification · GSPR · Technical documentation · UDI · PMS / vigilance.',
    industries: ['Medical'],
  },
  {
    id: 'iec-62304',
    name: 'IEC 62304 device software',
    family: 'IEC',
    lead: 'Software life-cycle processes for medical device software, including safety classification and SOUP control.',
    structure: 'Software safety class · planning · architecture · verification · problem resolution.',
    industries: ['Medical'],
  },
  {
    id: 'machinery-ce',
    name: 'Machinery CE conformity',
    family: 'EU',
    lead: 'Machinery Directive 2006/42/EC essential health and safety requirements, technical file and Declaration of Conformity.',
    structure: 'EHSR · risk assessment · technical file · DoC · residual-risk information.',
    industries: ['industrial'],
  },
  {
    id: 'iso-3834',
    name: 'ISO 3834 welding quality',
    family: 'ISO',
    lead: 'Quality requirements for fusion welding of metallic materials — personnel, WPS/PQR and production records.',
    structure: 'Welding coordination · WPS/PQR · welder qualification · inspection · traceability.',
    industries: ['Aerospace', 'industrial', 'special'],
  },
  {
    id: 'special-process',
    name: 'Special process control',
    family: 'Nadcap-aligned',
    lead: 'Heat treat, NDT, coatings, plating and similar processes that cannot be fully verified by inspection of the finished part.',
    structure: 'Process qualification · personnel · monitoring · product release.',
    industries: ['Automotive', 'Aerospace', 'special'],
  },
  {
    id: 'departmental',
    name: 'Company-wide departmental audit',
    family: 'STREFEX',
    lead: 'Walk of quality, production, logistics, purchasing, HR, maintenance and HSE against the same clause spine.',
    structure: 'Quality · Production · Incoming / warehouse · Purchasing · People · Maintenance · HSE.',
    industries: ['Automotive', 'Aerospace', 'Electronics', 'industrial', 'Medical', 'special'],
  },
  {
    id: 'due-diligence',
    name: 'Social & environmental due diligence',
    family: 'STREFEX',
    lead: 'Labour, environment and supply-chain due diligence expected of manufacturers selling into the EU and OEM programmes.',
    structure: 'Policy · labour · environment · supply chain · grievances · evidence.',
    industries: ['Automotive', 'Electronics', 'industrial'],
  },
]

export const INDUSTRY_MODULE_ORDER = {
  Automotive: ['iso-9001', 'iatf-16949', 'vda-63', 'special-process', 'departmental', 'due-diligence'],
  Aerospace: ['iso-9001', 'as9100', 'special-process', 'iso-3834', 'departmental'],
  Electronics: ['iso-9001', 'iatf-16949', 'departmental', 'due-diligence'],
  industrial: ['iso-9001', 'machinery-ce', 'iso-3834', 'departmental', 'due-diligence'],
  Medical: ['iso-9001', 'iso-13485', 'eu-mdr', 'iec-62304', 'departmental'],
  special: ['iso-9001', 'special-process', 'iso-3834', 'departmental'],
}

export function moduleByName(name) {
  const n = String(name || '').trim().toLowerCase()
  return STANDARD_MODULES.find((row) => {
    const aliases = [row.name, row.id, ...(row.aliases || [])].map((x) => String(x).toLowerCase())
    return aliases.some((a) => a === n || n.includes(a) || a.includes(n))
  }) || null
}

export function modulesForIndustry(filterId) {
  if (!filterId || filterId === 'ALL') {
    const seen = new Set()
    const out = []
    for (const id of [
      ...INDUSTRY_MODULE_ORDER.Automotive,
      ...INDUSTRY_MODULE_ORDER.Aerospace,
      ...INDUSTRY_MODULE_ORDER.Electronics,
      ...INDUSTRY_MODULE_ORDER.industrial,
      ...INDUSTRY_MODULE_ORDER.Medical,
      ...INDUSTRY_MODULE_ORDER.special,
    ]) {
      if (seen.has(id)) continue
      seen.add(id)
      const row = STANDARD_MODULES.find((m) => m.id === id)
      if (row) out.push(row)
    }
    return out
  }
  const order = INDUSTRY_MODULE_ORDER[filterId] || []
  return order.map((id) => STANDARD_MODULES.find((m) => m.id === id)).filter(Boolean)
}
