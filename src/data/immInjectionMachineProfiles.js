/**
 * IMM-style criterion rows for supplier detail (plastic injection molding).
 * Reference: imm_supplier_full_dashboard.html — Engel, Arburg, Sumitomo·Demag columns.
 */

const CHIP = ['green', 'blue', 'amber', 'gray', 'red']

/**
 * @typedef {{ label: string, text?: string, chips?: { text: string, tone?: string }[] }} ImmCriterionRow
 */

/** @type {Record<string, ImmCriterionRow[]>} */
const IMM_PROFILE_BY_SUPPLIER_ID = {
  'sup-001': [
    { label: 'Founded', text: '1945' },
    { label: 'Employees', text: '~7,000+' },
    { label: 'Revenue (est.)', text: '~€1.5B' },
    { label: 'Clamp force range', text: '50–120,000 kN' },
    {
      label: 'Machine types',
      chips: [
        { text: 'All-electric', tone: 'green' },
        { text: 'Hybrid', tone: 'blue' },
        { text: 'Hydraulic', tone: 'gray' },
        { text: 'Tie-bar-less', tone: 'amber' },
      ],
    },
    { label: 'Key product lines', text: 'e-motion · victory · duo · e-cap' },
    { label: 'Electric range (tons)', text: '25–550 tons' },
    { label: 'Max tonnage (std)', text: '5,500+ metric ton' },
    {
      label: 'High-speed packaging',
      chips: [{ text: 'e-cap · e-speed', tone: 'green' }],
    },
    {
      label: 'Micro molding',
      chips: [{ text: 'e-motion 30T', tone: 'blue' }],
    },
    {
      label: 'Multi-component',
      chips: [{ text: 'combi M · duo combi', tone: 'green' }],
    },
    { label: 'Control system', text: 'CC300 / e-connect' },
    {
      label: 'Digital / IoT',
      chips: [{ text: 'iQ Suite · inject 4.0', tone: 'green' }],
    },
    {
      label: 'Energy saving',
      chips: [{ text: 'ecodrive servo-hyd', tone: 'green' }],
    },
    {
      label: 'Medical grade',
      chips: [{ text: 'e-motion medical', tone: 'green' }],
    },
    {
      label: 'Automotive',
      chips: [{ text: 'duo · victory large', tone: 'green' }],
    },
    { label: 'Certifications', text: 'ISO 9001 · ISO 14001 · CE' },
    { label: 'Global plants', text: 'AT · DE · KR · CN · US' },
    { label: 'Price entry (electric)', text: '~€50K (e-motion)' },
    { label: 'Price mid-range', text: '€120K–€450K' },
    { label: 'Price large', text: '€500K–€5M+' },
    {
      label: 'Best for',
      text: 'Large automotive · tie-bar-less · complete turnkey solutions',
    },
  ],
  'sup-002': [
    { label: 'Founded', text: '1923' },
    { label: 'Employees', text: '~3,400+' },
    { label: 'Revenue (est.)', text: '~€700M' },
    { label: 'Clamp force range', text: '250–50,000 kN' },
    {
      label: 'Machine types',
      chips: [
        { text: 'All-electric', tone: 'green' },
        { text: 'Hybrid', tone: 'blue' },
        { text: 'Hydraulic', tone: 'gray' },
        { text: 'Vertical', tone: 'amber' },
      ],
    },
    {
      label: 'Key product lines',
      text: 'ALLROUNDER S/A/H · Golden Electric · AlldRive · CUBE · MORE',
    },
    { label: 'Electric range (tons)', text: '25–500 tons' },
    { label: 'Max tonnage (std)', text: '5,000 kN (~500T)' },
    {
      label: 'High-speed packaging',
      chips: [{ text: 'CUBE series', tone: 'blue' }],
    },
    {
      label: 'Micro molding',
      chips: [{ text: 'ALLROUNDER 270 S', tone: 'blue' }],
    },
    {
      label: 'Multi-component',
      chips: [{ text: 'CUBE · MORE · modular', tone: 'green' }],
    },
    { label: 'Control system', text: 'GESTICA' },
    {
      label: 'Digital / IoT',
      chips: [{ text: 'arburgXworld · ARBURG Cloud', tone: 'blue' }],
    },
    {
      label: 'Energy saving',
      chips: [{ text: 'AES · up to −50% energy', tone: 'blue' }],
    },
    {
      label: 'Medical grade',
      chips: [{ text: 'ALLROUNDER ALLDRIVE', tone: 'green' }],
    },
    {
      label: 'Automotive',
      chips: [{ text: 'Hydraulic S 5000kN', tone: 'blue' }],
    },
    { label: 'Certifications', text: 'ISO 9001 · CE · UL' },
    { label: 'Global plants', text: 'DE · CN · US' },
    { label: 'Price entry (electric)', text: '~€45K (Golden E)' },
    { label: 'Price mid-range', text: '€120K–€380K' },
    { label: 'Price large', text: '€380K–€1.2M+' },
    {
      label: 'Best for',
      text: 'Modular flexibility · multi-component · medical precision',
    },
  ],
  'sup-003': [
    { label: 'Brand line', text: 'Sumitomo Heavy Industries · Demag injection molding' },
    { label: 'Founded', text: '1970 (Demag lineage; SHI merger 2008)' },
    { label: 'Employees (IMM)', text: '~3,100+' },
    { label: 'Revenue (est.)', text: '~$720M' },
    { label: 'Clamp force range', text: '500–15,000 kN' },
    {
      label: 'Machine types',
      chips: [
        { text: 'All-electric', tone: 'green' },
        { text: 'Hybrid', tone: 'blue' },
        { text: 'Hydraulic', tone: 'gray' },
      ],
    },
    {
      label: 'Key product lines',
      text: 'IntElect · El-Exis SP · Systec · PAC-E',
    },
    { label: 'Electric range (tons)', text: '8–936 US tons' },
    { label: 'Max tonnage (std)', text: '1,500 metric ton' },
    {
      label: 'High-speed packaging',
      chips: [{ text: 'El-Exis SP · 800mm/s', tone: 'green' }],
    },
    {
      label: 'Micro molding',
      chips: [{ text: 'SE7M (8T min)', tone: 'green' }],
    },
    {
      label: 'Multi-component',
      chips: [{ text: 'SE-HS-CI · Inject 2K', tone: 'blue' }],
    },
    { label: 'Control system', text: 'NC5 plus / N-9' },
    {
      label: 'Digital / IoT',
      chips: [{ text: 'myConnect · activeMelt', tone: 'blue' }],
    },
    {
      label: 'Energy saving',
      chips: [{ text: '95% all-electric fleet', tone: 'green' }],
    },
    {
      label: 'Medical grade',
      chips: [{ text: 'Clean-room ready', tone: 'green' }],
    },
    {
      label: 'Automotive',
      chips: [{ text: 'Systec SP', tone: 'blue' }],
    },
    { label: 'Certifications', text: 'ISO 9001 · CE · UL' },
    { label: 'Global plants', text: 'JP · DE · CN · US' },
    { label: 'Price entry (electric)', text: '~$23K (SE-DUZ)' },
    { label: 'Price mid-range', text: '$120K–$380K' },
    { label: 'Price large', text: '$380K–$1.5M+' },
    {
      label: 'Best for',
      text: 'High-speed packaging · micro molding · all-electric fleet',
    },
  ],
}

function toneClass(tone) {
  const t = CHIP.includes(tone) ? tone : 'gray'
  return `exec-imm-chip exec-imm-chip--${t}`
}

/**
 * Fallback criterion rows derived from supplier directory fields.
 * @param {Record<string, unknown>} supplier
 * @returns {ImmCriterionRow[]}
 */
function buildGenericImmRows(supplier) {
  const certs = supplier.certifications?.length
    ? supplier.certifications.join(' · ')
    : '—'
  const industries = supplier.industries?.join(', ') || '—'
  return [
    {
      label: 'Founded',
      text: supplier.established != null ? String(supplier.established) : '—',
    },
    {
      label: 'Employees',
      text:
        supplier.employees != null
          ? `~${Number(supplier.employees).toLocaleString()}`
          : '—',
    },
    {
      label: 'Machine types',
      chips: [
        { text: 'All-electric', tone: 'green' },
        { text: 'Hybrid', tone: 'blue' },
        { text: 'Hydraulic', tone: 'gray' },
      ],
    },
    {
      label: 'Lead time',
      text:
        supplier.leadTimeDays != null && supplier.leadTimeDays > 0
          ? `${supplier.leadTimeDays} days (typ.)`
          : '—',
    },
    {
      label: 'Delivery',
      text:
        supplier.deliveryTimeDays != null && supplier.deliveryTimeDays > 0
          ? `${supplier.deliveryTimeDays} days (typ.)`
          : '—',
    },
    {
      label: 'Price index',
      text:
        supplier.priceIndex != null
          ? `${supplier.priceIndex} (100 = market avg)`
          : '—',
    },
    { label: 'Certifications', text: certs },
    { label: 'Industries served', text: industries },
    {
      label: 'Notes',
      text: 'Directory profile — request detailed IMM specification from the supplier.',
    },
  ]
}

/**
 * IMM intelligence rows when supplier lists injection molding equipment.
 * @param {Record<string, unknown> | null | undefined} supplier
 * @returns {ImmCriterionRow[] | null}
 */
export function getInjectionMachineIntelRows(supplier) {
  if (!supplier?.categories?.includes('injection-machines')) return null
  const byId = IMM_PROFILE_BY_SUPPLIER_ID[supplier.id]
  if (byId?.length) return byId
  return buildGenericImmRows(supplier)
}

export { toneClass }
