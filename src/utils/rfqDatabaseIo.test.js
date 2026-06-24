import { describe, expect, it } from 'vitest'
import { buildRfqSeedDatabase } from '../data/rfqEquipmentSeed'
import { RFQI_PROCESSES } from '../data/rfqIntelligenceCalc'
import { calcThreeBucketCost } from './rfqCostEngine'
import {
  exportRfqDatabaseJson,
  mergeRfqDatabase,
  normalizeRfqDatabase,
  replaceRfqDatabase,
  validateRfqDatabase,
} from './rfqDatabaseIo'
import {
  pickDefaultEnergyTariff,
  pickDefaultMachine,
  resolvePersonnelRates,
  resolveProcessRates,
} from './rfqEquipmentCost'

describe('rfqDatabaseIo v2', () => {
  const seed = buildRfqSeedDatabase()

  it('validates v2 seed database', () => {
    const result = validateRfqDatabase(seed)
    expect(result.ok).toBe(true)
    expect(result.data.energyTariffs.length).toBeGreaterThan(0)
    expect(result.data.personnelRoles.length).toBeGreaterThan(0)
  })

  it('migrates v1 tariffs payload', () => {
    const v1 = {
      version: 1,
      materials: seed.materials.slice(0, 2),
      machines: seed.machines.slice(0, 1),
      peripherals: [],
      tariffs: [
        { id: 'tariff-eu-west', name: 'West', region: 'EU-West', energyEURkWh: 0.22, labourEURh: 38, overheadPct: 180 },
      ],
    }
    const migrated = normalizeRfqDatabase(v1)
    expect(migrated.version).toBe(2)
    expect(migrated.energyTariffs.length).toBeGreaterThan(0)
    expect(migrated.personnelRegions.length).toBeGreaterThan(0)
    expect(migrated.personnelRoles.some((r) => r.roleKey === 'operator')).toBe(true)
  })

  it('merges by id', () => {
    const merged = mergeRfqDatabase(seed, {
      materials: [{ id: 'peek', cat: 'plastic', name: 'PEEK updated', price: 90 }],
    })
    expect(merged.materials.find((m) => m.id === 'peek')?.price).toBe(90)
  })

  it('exports three-bucket schema', () => {
    const parsed = JSON.parse(exportRfqDatabaseJson(seed))
    expect(parsed.costModel).toBe('three-bucket')
    expect(parsed.personnelRegions).toBeTruthy()
  })
})

describe('rfqCostEngine three buckets', () => {
  const seed = buildRfqSeedDatabase()
  const machine = seed.machines.find((m) => m.id === 'imm-engel-160')
  const energy = seed.energyTariffs.find((t) => t.id === 'energy-eu-west')
  const region = seed.personnelRegions.find((r) => r.id === 'pers-eu-west')
  const roles = seed.personnelRoles.filter((r) => r.regionId === 'pers-eu-west')
  const mat = seed.materials.find((m) => m.id === 'pp')

  it('separates material, process, and personnel', () => {
    const processRates = resolveProcessRates({
      machine,
      peripherals: [],
      energyTariff: energy,
      process: RFQI_PROCESSES.imm,
    })
    const personnelRates = resolvePersonnelRates({ region, roles })
    const result = calcThreeBucketCost({
      proc: 'imm',
      mat,
      weightG: 120,
      qty: 10000,
      processDef: RFQI_PROCESSES.imm,
      processRates,
      personnelRates,
    })
    expect(result.buckets.material).toBeGreaterThan(0)
    expect(result.buckets.process).toBeGreaterThan(0)
    expect(result.buckets.personnel).toBeGreaterThan(0)
    expect(result.total).toBeGreaterThan(
      result.buckets.material + result.buckets.process + result.buckets.personnel,
    )
  })
})

describe('rfqEquipmentCost', () => {
  const seed = buildRfqSeedDatabase()
  const machine = seed.machines.find((m) => m.id === 'imm-engel-160')
  const energy = seed.energyTariffs.find((t) => t.id === 'energy-eu-west')

  it('process rates exclude labour', () => {
    const rates = resolveProcessRates({ machine, peripherals: [], energyTariff: energy, process: RFQI_PROCESSES.imm })
    expect(rates.processRateEUR).toBeCloseTo(95 + 42 * 0.22, 1)
    expect(rates.machineRateEUR).toBe(95)
  })

  it('picks defaults for machine', () => {
    const m = pickDefaultMachine(seed.machines, 'imm')
    expect(m?.processId).toBe('imm')
    expect(pickDefaultEnergyTariff(seed.energyTariffs, m)?.id).toBeTruthy()
  })
})
