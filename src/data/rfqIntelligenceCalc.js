/** RFQ Intelligence — materials, processes & costing (derived from rfq_system_1 prototype). */

import { RFQI_SEED_MATERIALS } from './rfqEquipmentSeed'
import { calcThreeBucketCost } from '../utils/rfqCostEngine'

/** Default material list — tenant store may override at runtime. */
export const RFQI_MATERIALS = RFQI_SEED_MATERIALS

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
 * Three-bucket part cost — Material | Process | Personnel.
 */
export function calcPartCost({
  proc,
  mat,
  weightG,
  tolMult,
  finishMult,
  qty,
  complexity = 'medium',
  processRates = null,
  personnelRates = null,
  /** @deprecated use processRates + personnelRates */
  equipmentRates = null,
  marginPct = 25,
}) {
  const p = RFQI_PROCESSES[proc] || RFQI_PROCESSES.imm

  const legacyProcess = equipmentRates
    ? {
        machineRateEUR: equipmentRates.baseMachineRateEUR ?? equipmentRates.machineRateEUR,
        peripheralRateEUR: equipmentRates.peripheralRateEUR ?? 0,
        energyRateEUR: equipmentRates.energyRateEUR ?? 0,
        processRateEUR: equipmentRates.machineRateEUR,
        setupTimeH: equipmentRates.setupTimeH,
        cycleFactor: equipmentRates.cycleFactor,
      }
    : processRates

  const legacyPersonnel = equipmentRates
    ? {
        cycleLabourRateEUR: Number(equipmentRates.labourEURh ?? LABOUR_RATE_DEFAULT) * 0.33,
        setupLabourEUR: Number(equipmentRates.labourEURh ?? LABOUR_RATE_DEFAULT) * 1.5,
        overheadPct: equipmentRates.overheadPct ?? 180,
      }
    : personnelRates

  const result = calcThreeBucketCost({
    proc,
    mat,
    weightG,
    tolMult,
    finishMult,
    qty,
    complexity,
    processDef: p,
    processRates: legacyProcess,
    personnelRates: legacyPersonnel,
    marginPct,
  })

  return {
    material: result.material,
    process: result.process.total,
    personnel: result.personnel.total,
    buckets: result.buckets,
    bucketRows: result.bucketRows,
    machining: result.process.machineCycle + result.process.peripheralCycle + result.process.energyCycle,
    overhead: result.personnel.overhead,
    tooling: result.process.tooling,
    setup: result.process.setup + result.personnel.setupLabour,
    finishing: result.finishing,
    margin: result.marginAmount,
    total: result.total,
    toolingMouldEUR: result.toolingMouldEUR,
    detail: result,
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

export { runRfqIntelQuickCalc } from '../utils/rfqCostEngine'
