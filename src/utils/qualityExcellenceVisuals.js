export const FISHBONE_6M = [
  { key: 'Man / People', short: 'Man', side: 'top', slot: 0 },
  { key: 'Machine', short: 'Machine', side: 'top', slot: 1 },
  { key: 'Method', short: 'Method', side: 'top', slot: 2 },
  { key: 'Material', short: 'Material', side: 'bottom', slot: 0 },
  { key: 'Measurement', short: 'Measure', side: 'bottom', slot: 1 },
  { key: 'Mother Nature / Environment', short: 'Environment', side: 'bottom', slot: 2 },
]

export const QUALITY_VISUAL_KIND = {
  't1-5-whys': 'chain',
  't2-ishikawa': 'fishbone',
  't3-pdca': 'cycle',
  't4-8d': 'stepper',
  't5-a3': 'a3',
  't6-pareto': 'pareto',
  't7-spc': 'control-chart',
  't8-gage-rr': 'gauge',
  't9-cpk-ppk': 'capability',
  't10-fmea': 'rpn',
  't11-fta': 'tree',
  't12-tolerance': 'stack',
  't13-poka-yoke': 'shield',
  't14-doe': 'matrix',
  't15-vsm': 'flow',
  't16-smed': 'setup',
  't17-tpm-oee': 'oee',
  't18-control-plan': 'controls',
  't19-lpa': 'layers',
  't20-kpi-dashboard': 'kpis',
  't21-frequency-reduction': 'before-after',
  't22-skip-lot': 'funnel',
  't23-inspection-matrix': 'matrix-2x2',
  't24-cp-rightsizing': 'trim',
  't25-gauge-rationalisation': 'inventory',
  't26-lpa-rightsizing': 'before-after',
  't27-supplier-rightsizing': 'traffic',
  't28-simplification-register': 'savings',
  't29-apqp': 'gates',
  't30-coq': 'buckets',
}

export function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function groupFishboneCauses(rows = []) {
  return FISHBONE_6M.map((cat) => ({
    ...cat,
    causes: rows.filter((row) => (row.category || '') === cat.key),
  }))
}

export function ftaTree(rows = [], topEvent = '') {
  const events = rows.map((row, i) => ({
    ...row,
    id: String(row.id || `E${i + 1}`),
    description: row.description || (row.gate === 'top' ? topEvent : ''),
  }))
  const byParent = new Map()
  events.forEach((ev) => {
    const parent = ev.parent || (ev.gate === 'top' ? null : '__root')
    if (!byParent.has(parent)) byParent.set(parent, [])
    byParent.get(parent).push(ev)
  })
  const tops = events.filter((e) => e.gate === 'top' || !e.parent)
  return { events, byParent, tops: tops.length ? tops : events.slice(0, 1) }
}

export function statusTone(status) {
  const s = String(status || '').toLowerCase()
  if (['closed', 'verified', 'done', 'complete', 'gated', 'implemented', 'confirmed', 'pass', 'keep'].includes(s)) return 'ok'
  if (['in_progress', 'approved', 'marginal_10_30', 'merge', 'extend', 'skip_lot'].includes(s)) return 'mid'
  if (['fail', 'ruled_out', 'remove', 'retire', 'unacceptable_>30', 'beyond_limits'].includes(s)) return 'bad'
  return 'idle'
}
