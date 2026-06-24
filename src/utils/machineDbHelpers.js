/** Shared helpers for STREFEX Machine Intelligence catalogues (EDMDB, TurnDB, AutoDB, IMMDB). */

const PRICE_LABELS = {
  '€': 'Budget',
  '€€': 'Value',
  '€€€': 'Mid-Range',
  '€€€€': 'Premium',
  '€€€€€': 'Ultra-Premium',
}

export const TIER_TAG_CLASS = {
  'Global Leader': 'tag-green',
  'Major Player': 'tag-blue',
  'Regional Leader': 'tag-amber',
  Specialist: 'tag-gold',
  Emerging: 'tag-gray',
}

export function stars(n) {
  const rounded = Math.round(Number(n) || 0)
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded)
}

export function priceLabel(p) {
  return PRICE_LABELS[p] || p || '—'
}

export function getSupplier(db, id) {
  return db.suppliers.find((x) => x.id === id) || {}
}

export function getSupplierName(db, id) {
  return getSupplier(db, id).name || id
}

export function getSupplierFlag(db, id) {
  return getSupplier(db, id).logo || '🏭'
}

export function machineSupplierId(m) {
  return m.s || m.supplier
}

export function machineModel(m) {
  return m.model || m.m || m.id
}

export function machineSeries(m) {
  return m.series || m.sr || ''
}

export function machineRating(m) {
  return m.r ?? m.rating ?? 0
}

export function machineNote(m) {
  return m.n || m.note || '—'
}

export function machineFeatures(m) {
  return m?.feats || m?.features || m?.ft || []
}

export function machineApps(m) {
  return m?.apps || m?.ap || []
}

export function machineDrive(m) {
  return m?.dr || m?.drive || ''
}

export function machineControl(m) {
  return m?.ctrl || m?.ct || '—'
}

function formatRange(val, unit = '') {
  if (val == null) return null
  if (Array.isArray(val)) {
    const [a, b] = val
    if (a == null && b == null) return null
    if (b == null || a === b) return `${a}${unit}`
    return `${a}–${b}${unit}`
  }
  return `${val}${unit}`
}

/** @param {object} m @param {'edm'|'turn'|'auto'|'imm'} type */
export function buildSpecPairs(m, type) {
  const pairs = []
  if (type === 'edm') {
    if (m.travel_x) pairs.push(['X Travel', `${m.travel_x} mm`])
    if (m.travel_y) pairs.push(['Y Travel', `${m.travel_y} mm`])
    if (m.travel_z) pairs.push(['Z Travel', `${m.travel_z} mm`])
    if (m.work_area) pairs.push(['Work Area', m.work_area])
    if (m.wire_dia) pairs.push(['Wire Diameter', m.wire_dia])
    if (m.surface_ra !== undefined) pairs.push(['Surface Finish', `Ra ${m.surface_ra} μm`])
    if (m.accuracy_um !== undefined) pairs.push(['Accuracy', `±${m.accuracy_um} μm`])
    if (m.max_workpiece_kg) pairs.push(['Max Workpiece', `${m.max_workpiece_kg} kg`])
    if (m.power_kw) pairs.push(['Power', `${m.power_kw} kW`])
    if (m.weight) pairs.push(['Machine Weight', `${Number(m.weight).toLocaleString()} kg`])
    if (m.footprint) pairs.push(['Footprint', m.footprint])
    if (m.ctrl) pairs.push(['Control', m.ctrl])
  } else if (type === 'imm') {
    const clamp = formatRange(m.cf, ' T')
    if (clamp) pairs.push(['Clamp Force', clamp])
    const volume = formatRange(m.iv, ' cm³')
    if (volume) pairs.push(['Injection Volume', volume])
    if (m.sd) pairs.push(['Screw Diameter', m.sd])
    if (m.tb) pairs.push(['Tie Bar Spacing', m.tb])
    if (m.dr) pairs.push(['Drive Type', m.dr])
    if (m.dc != null) pairs.push(['Dry Cycle', `${m.dc} s`])
    if (m.es) pairs.push(['Energy Saving', m.es])
    const power = formatRange(m.kw, ' kW')
    if (power) pairs.push(['Power', power])
    const weight = formatRange(m.wt, ' t')
    if (weight) pairs.push(['Machine Weight', weight])
    if (m.noise) pairs.push(['Noise Level', m.noise])
    if (m.pl) pairs.push(['Platen Size', m.pl])
    if (m.ct) pairs.push(['Control', m.ct])
  } else if (type === 'turn') {
    if (m.chuck_dia) pairs.push(['Chuck / Bar', `${m.chuck_dia} mm`])
    if (m.bar_dia) pairs.push(['Bar Capacity', `${m.bar_dia} mm`])
    if (m.max_length) pairs.push(['Max Length', `${m.max_length} mm`])
    if (m.spindle_rpm) pairs.push(['Spindle RPM', `${Number(m.spindle_rpm).toLocaleString()} rpm`])
    if (m.spindle_kw) pairs.push(['Spindle Power', `${m.spindle_kw} kW`])
    if (m.axes) pairs.push(['Axes', `${m.axes}-axis`])
    if (m.tool_stations) pairs.push(['Tool Stations', String(m.tool_stations)])
    if (m.live_tools !== undefined) pairs.push(['Live Tooling', m.live_tools ? 'Yes' : 'No'])
    if (m.sub_spindle !== undefined) pairs.push(['Sub Spindle', m.sub_spindle ? 'Yes' : 'No'])
    if (m.weight) pairs.push(['Machine Weight', `${Number(m.weight).toLocaleString()} kg`])
    if (m.footprint) pairs.push(['Footprint', m.footprint])
    if (m.ctrl) pairs.push(['Control', m.ctrl])
  } else {
    if (m.payload !== undefined && m.payload !== null) pairs.push(['Payload (kg)', `${m.payload} kg`])
    if (m.reach !== undefined && m.reach !== null) pairs.push(['Reach (mm)', `${m.reach} mm`])
    if (m.axes !== undefined && m.axes !== null) pairs.push(['Axes', `${m.axes}-axis`])
    if (m.repeatability !== undefined && m.repeatability !== null) {
      pairs.push(['Repeatability', `±${m.repeatability} mm`])
    }
    if (m.weight !== undefined && m.weight !== null) pairs.push(['Robot Weight', `${m.weight} kg`])
    if (m.ip !== undefined) pairs.push(['IP Rating', m.ip])
    if (m.footprint) pairs.push(['Footprint', m.footprint])
    if (m.ctrl) pairs.push(['Controller', m.ctrl])
  }
  return pairs
}

export function countSupplierMachines(db, supplierId) {
  return db.machines.filter((m) => machineSupplierId(m) === supplierId).length
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort()
}
