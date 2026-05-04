/** RFQ Intelligence — materials, processes & costing (derived from rfq_system_1 prototype). */

export const RFQI_MATERIALS = [
  { id: 'pp', cat: 'plastic', name: 'PP — Polypropylene', grade: 'Homopolymer', density: 0.91, price: 1.8 },
  { id: 'abs', cat: 'plastic', name: 'ABS', grade: 'General purpose', density: 1.05, price: 2.6 },
  { id: 'pa66gf30', cat: 'plastic', name: 'PA66 GF30', grade: '30% glass-filled', density: 1.37, price: 5.8 },
  { id: 'pc', cat: 'plastic', name: 'PC — Polycarbonate', grade: 'Clear/Opaque', density: 1.2, price: 5.2 },
  { id: 'al6061', cat: 'aluminium', name: 'Al 6061-T6', grade: 'T6 temper', density: 2.7, price: 3.2 },
  { id: 'al7075', cat: 'aluminium', name: 'Al 7075-T6', grade: 'T6 temper', density: 2.81, price: 6.8 },
  { id: 'steel4140', cat: 'steel', name: '4140 / 42CrMo4', grade: 'Alloy steel', density: 7.85, price: 2.2 },
  { id: 'sus316l', cat: 'stainless', name: 'SUS316L / 1.4404', grade: 'Low carbon', density: 7.98, price: 8.2 },
  { id: 'cf-pa', cat: 'composite', name: 'Carbon Fibre PA12', grade: 'CF reinforced', density: 1.1, price: 45 },
]

export const RFQI_PROCESSES = {
  imm: {
    id: 'imm',
    name: 'Injection Moulding',
    machineRate: 120,
    setupTime: 2.0,
    cycleBase: 0.5,
    complexMult: { simple: 1, medium: 1.5, complex: 2.5, vcomplex: 4 },
  },
  cnc: {
    id: 'cnc',
    name: 'CNC Machining',
    machineRate: 85,
    setupTime: 1.5,
    cycleBase: 0.8,
    complexMult: { simple: 1, medium: 1.8, complex: 3.5, vcomplex: 6 },
  },
  sheet: {
    id: 'sheet',
    name: 'Sheet Metal',
    machineRate: 95,
    setupTime: 1.0,
    cycleBase: 0.3,
    complexMult: { simple: 1, medium: 1.6, complex: 2.8, vcomplex: 4.5 },
  },
  '3dp': {
    id: '3dp',
    name: '3D Printing',
    machineRate: 45,
    setupTime: 0.5,
    cycleBase: 2.5,
    complexMult: { simple: 1, medium: 1.3, complex: 1.8, vcomplex: 2.5 },
  },
  casting: {
    id: 'casting',
    name: 'Die Casting',
    machineRate: 180,
    setupTime: 3.0,
    cycleBase: 0.2,
    complexMult: { simple: 1, medium: 1.4, complex: 2.2, vcomplex: 3.5 },
  },
  press: {
    id: 'press',
    name: 'Stamping/Press',
    machineRate: 95,
    setupTime: 2.0,
    cycleBase: 0.05,
    complexMult: { simple: 1, medium: 1.5, complex: 2.3, vcomplex: 3.5 },
  },
  extrusion: {
    id: 'extrusion',
    name: 'Extrusion',
    machineRate: 65,
    setupTime: 1.5,
    cycleBase: 0.1,
    complexMult: { simple: 1, medium: 1.3, complex: 2.0, vcomplex: 3.0 },
  },
  assembly: {
    id: 'assembly',
    name: 'Assembly',
    machineRate: 55,
    setupTime: 1.0,
    cycleBase: 0.5,
    complexMult: { simple: 1, medium: 1.4, complex: 2.2, vcomplex: 3.5 },
  },
}

export const RFQI_MANUFACTURERS = [
  { name: 'Engel Austria', country: 'AT', process: ['imm'], leadTime: 18, risk: 22 },
  { name: 'DMG Mori', country: 'DE', process: ['cnc'], leadTime: 16, risk: 25 },
  { name: 'Trumpf GmbH', country: 'DE', process: ['sheet'], leadTime: 20, risk: 22 },
  { name: 'EOS GmbH', country: 'DE', process: ['3dp'], leadTime: 6, risk: 20 },
]

export const DEFAULT_INCOMING_RFQS = [
  { id: 'RFQ-2026-0441', status: 'new', color: '#00d4ff', company: 'Bosch Automotive', part: 'Throttle body housing', process: 'IMM', material: 'PA66 GF30', qty: 50000, value: '€84K', date: '2026-05-02', urgency: 'high' },
  { id: 'RFQ-2026-0440', status: 'new', color: '#00d4ff', company: 'Siemens Energy', part: 'Control panel bracket', process: 'Sheet Metal', material: 'Al 5052', qty: 200, value: '€12K', date: '2026-05-01', urgency: 'normal' },
  { id: 'RFQ-2026-0439', status: 'review', color: '#ffab00', company: 'Zeiss Medical', part: 'Lens mount housing', process: 'CNC', material: 'Al 7075-T6', qty: 50, value: '€28K', date: '2026-04-30', urgency: 'high' },
  { id: 'RFQ-2026-0438', status: 'review', color: '#ffab00', company: 'ABB Robotics', part: 'Cable routing clip', process: 'IMM', material: 'PA66', qty: 100000, value: '€45K', date: '2026-04-29', urgency: 'normal' },
  { id: 'RFQ-2026-0437', status: 'quoted', color: '#00e676', company: 'BMW Group', part: 'Interior trim panel', process: 'IMM', material: 'PP + TPE', qty: 25000, value: '€180K', date: '2026-04-28', urgency: 'normal' },
  { id: 'RFQ-2026-0435', status: 'won', color: '#b060ff', company: 'Tesla Suppliers', part: 'Battery tray seal', process: 'IMM', material: 'EPDM / TPE', qty: 500000, value: '€420K', date: '2026-04-25', urgency: 'normal' },
]

const LABOUR_RATE_DEFAULT = 35

/**
 * Same structure as rfq_system_1.html `calcPartCost`.
 */
export function calcPartCost({ proc, mat, weightG, tolMult, finishMult, qty, complexity = 'medium' }) {
  const p = RFQI_PROCESSES[proc] || RFQI_PROCESSES.imm
  const compMult = p.complexMult[complexity] || 1.5

  const matCostPerPart = (weightG / 1000) * mat.price * 1.15
  const cycleH = (p.cycleBase * compMult * tolMult) / 60
  const machineLabour = cycleH * (p.machineRate + LABOUR_RATE_DEFAULT)
  const overhead = cycleH * LABOUR_RATE_DEFAULT * 1.8

  let toolingAmort = 0
  if (proc === 'imm') {
    const toolCost = 35000 + compMult * 15000 + (tolMult > 1.5 ? 15000 : 0)
    toolingAmort = toolCost / 1_000_000
  } else if (proc === 'casting') {
    toolingAmort = 80000 / 500000
  } else if (proc === 'press') {
    toolingAmort = 25000 / 2_000_000
  }

  const setup = (p.setupTime * (p.machineRate + LABOUR_RATE_DEFAULT)) / Math.max(qty, 100)
  const costBase = matCostPerPart + machineLabour + overhead + toolingAmort + setup
  const costWithFinish = costBase * finishMult
  const margin = costWithFinish * 0.25
  const unitPrice = costWithFinish + margin

  return {
    material: matCostPerPart,
    machining: machineLabour,
    overhead,
    tooling: toolingAmort,
    setup,
    finishing: costBase * (finishMult - 1),
    margin,
    total: unitPrice,
    toolingMouldEUR:
      proc === 'imm'
        ? 35000 + compMult * 15000 + (tolMult > 1.5 ? 15000 : 0)
        : proc === 'casting'
          ? 80000
          : proc === 'press'
            ? 25000
            : 0,
  }
}

const TOL_MAP = { standard: 1, medium: 1.3, tight: 1.8, precision: 2.5 }
const FIN_MAP = { asmanufactured: 1, fine: 1.1, smooth: 1.25, mirror: 1.6, painted: 1.3, anodised: 1.2, plated: 1.4 }

export function tolFactor(tolKey) {
  return TOL_MAP[tolKey] ?? 1
}

export function finishFactor(finKey) {
  return FIN_MAP[finKey] ?? 1
}

/**
 * Standalone calculator (matches `calcQuick` core from rfq_system_1.html).
 */
export function runRfqIntelQuickCalc(input) {
  const {
    procId = 'imm',
    materialId = 'pp',
    complexity = 1.5,
    weightG = 120,
    tol = 1,
    finish = 1,
    vol = 10000,
    machineRate,
    labourRate = 35,
    overheadPct = 180,
    tooling = 45000,
    toolShots = 1_000_000,
    marginPct = 25,
  } = input

  const p = RFQI_PROCESSES[procId] || RFQI_PROCESSES.imm
  const mr = machineRate ?? p.machineRate
  const mat = RFQI_MATERIALS.find((m) => m.id === materialId) || RFQI_MATERIALS[0]

  const matCost = (weightG / 1000) * mat.price * 1.15
  const cycleH = (p.cycleBase * complexity * tol) / 60
  const machCost = cycleH * (mr + labourRate)
  const ovhCost = cycleH * labourRate * (overheadPct / 100)
  const setupCost = (p.setupTime * (mr + labourRate)) / vol
  const toolAmort = tooling / toolShots
  const finCost = (matCost + machCost + ovhCost) * (finish - 1)
  const preMargin = matCost + machCost + ovhCost + setupCost + toolAmort + finCost
  const margin = marginPct / 100
  const unitPrice = preMargin / (1 - margin)

  const rows = [
    { label: 'Material', value: matCost, color: '#4fc3f7' },
    { label: 'Machining time', value: machCost, color: '#00d4ff' },
    { label: 'Overhead', value: ovhCost, color: '#b060ff' },
    { label: 'Tooling amort.', value: toolAmort, color: '#ff6d00' },
    { label: 'Setup cost', value: setupCost, color: '#ffab00' },
    { label: 'Finishing', value: finCost, color: '#00e676' },
  ]

  const volumes = [50, 100, 500, 1000, 5000, 10000, 50000, 100000]
  const volumePrices = volumes.map((v) => {
    const sc = (p.setupTime * (mr + labourRate)) / v
    const t =
      matCost +
      cycleH * (mr + labourRate) +
      ovhCost +
      sc +
      toolAmort +
      finCost
    return { vol: v, unit: t / (1 - margin) }
  })

  return {
    process: p.name,
    material: mat.name,
    preMargin,
    unitPrice,
    rows,
    volumePrices,
    meta: {
      machineRateUsed: mr,
      labourRate,
      toolingEUR: tooling,
      toolShots,
      overheadPct,
      marginPct,
    },
  }
}
