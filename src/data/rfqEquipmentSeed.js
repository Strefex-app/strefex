/** Seed database for RFQ Intelligence — three cost pillars (v2). */

export const RFQI_DB_VERSION = 2

export const RFQI_SEED_ENERGY_TARIFFS = [
  { id: 'energy-eu-west', name: 'W.Europe industrial', region: 'EU-West', energyEURkWh: 0.22 },
  { id: 'energy-eu-east', name: 'C/E Europe industrial', region: 'EU-East', energyEURkWh: 0.14 },
  { id: 'energy-asia', name: 'Asia manufacturing', region: 'Asia', energyEURkWh: 0.09 },
]

export const RFQI_SEED_PERSONNEL_REGIONS = [
  { id: 'pers-eu-west', name: 'W.Europe industrial', region: 'EU-West', overheadPct: 180 },
  { id: 'pers-eu-east', name: 'C/E Europe industrial', region: 'EU-East', overheadPct: 160 },
  { id: 'pers-asia', name: 'Asia manufacturing', region: 'Asia', overheadPct: 140 },
]

export const RFQI_SEED_PERSONNEL_ROLES = [
  { id: 'role-op-eu-west', regionId: 'pers-eu-west', roleKey: 'operator', name: 'Machine operator', rateEURh: 38, cycleShare: 0.25, setupHours: 0 },
  { id: 'role-setter-eu-west', regionId: 'pers-eu-west', roleKey: 'setter', name: 'Setter / technician', rateEURh: 45, cycleShare: 0, setupHours: 1.5 },
  { id: 'role-qc-eu-west', regionId: 'pers-eu-west', roleKey: 'qc', name: 'QC inspector', rateEURh: 42, cycleShare: 0.08, setupHours: 0 },
  { id: 'role-op-eu-east', regionId: 'pers-eu-east', roleKey: 'operator', name: 'Machine operator', rateEURh: 22, cycleShare: 0.25, setupHours: 0 },
  { id: 'role-setter-eu-east', regionId: 'pers-eu-east', roleKey: 'setter', name: 'Setter / technician', rateEURh: 28, cycleShare: 0, setupHours: 1.5 },
  { id: 'role-qc-eu-east', regionId: 'pers-eu-east', roleKey: 'qc', name: 'QC inspector', rateEURh: 26, cycleShare: 0.08, setupHours: 0 },
  { id: 'role-op-asia', regionId: 'pers-asia', roleKey: 'operator', name: 'Machine operator', rateEURh: 12, cycleShare: 0.25, setupHours: 0 },
  { id: 'role-setter-asia', regionId: 'pers-asia', roleKey: 'setter', name: 'Setter / technician', rateEURh: 16, cycleShare: 0, setupHours: 1.5 },
  { id: 'role-qc-asia', regionId: 'pers-asia', roleKey: 'qc', name: 'QC inspector', rateEURh: 14, cycleShare: 0.08, setupHours: 0 },
]

export const RFQI_SEED_MATERIALS = [
  { id: 'pp', cat: 'plastic', name: 'PP — Polypropylene', grade: 'Homopolymer', density: 0.91, price: 1.8, scrapPct: 15 },
  { id: 'hdpe', cat: 'plastic', name: 'HDPE', grade: 'Injection moulding', density: 0.95, price: 1.6, scrapPct: 15 },
  { id: 'ldpe', cat: 'plastic', name: 'LDPE', grade: 'General purpose', density: 0.92, price: 1.5, scrapPct: 15 },
  { id: 'abs', cat: 'plastic', name: 'ABS', grade: 'General purpose', density: 1.05, price: 2.6, scrapPct: 15 },
  { id: 'pa6', cat: 'plastic', name: 'PA6 — Nylon 6', grade: 'Unfilled', density: 1.14, price: 3.4, scrapPct: 18 },
  { id: 'pa66', cat: 'plastic', name: 'PA66 — Nylon 66', grade: 'Unfilled', density: 1.14, price: 3.8, scrapPct: 18 },
  { id: 'pa66gf30', cat: 'plastic', name: 'PA66 GF30', grade: '30% glass-filled', density: 1.37, price: 5.8, scrapPct: 12 },
  { id: 'pa66gf50', cat: 'plastic', name: 'PA66 GF50', grade: '50% glass-filled', density: 1.53, price: 7.2, scrapPct: 12 },
  { id: 'pc', cat: 'plastic', name: 'PC — Polycarbonate', grade: 'Clear/Opaque', density: 1.2, price: 5.2, scrapPct: 15 },
  { id: 'pom', cat: 'plastic', name: 'POM — Acetal', grade: 'Homopolymer', density: 1.42, price: 3.1, scrapPct: 15 },
  { id: 'pmma', cat: 'plastic', name: 'PMMA — Acrylic', grade: 'Optical grade', density: 1.19, price: 4.5, scrapPct: 15 },
  { id: 'pet', cat: 'plastic', name: 'PET', grade: 'Bottle grade', density: 1.38, price: 2.2, scrapPct: 15 },
  { id: 'peek', cat: 'plastic', name: 'PEEK', grade: 'Unfilled', density: 1.32, price: 85, scrapPct: 20 },
  { id: 'peek-gf30', cat: 'plastic', name: 'PEEK GF30', grade: '30% glass-filled', density: 1.49, price: 120, scrapPct: 18 },
  { id: 'pps', cat: 'plastic', name: 'PPS', grade: 'Reinforced', density: 1.35, price: 18, scrapPct: 15 },
  { id: 'lcp', cat: 'plastic', name: 'LCP', grade: 'High flow', density: 1.4, price: 22, scrapPct: 15 },
  { id: 'pvdf', cat: 'plastic', name: 'PVDF', grade: 'Chemical resistant', density: 1.78, price: 28, scrapPct: 15 },
  { id: 'tpe', cat: 'plastic', name: 'TPE — Thermoplastic elastomer', grade: 'Shore 65A', density: 1.1, price: 4.8, scrapPct: 15 },
  { id: 'tpu', cat: 'plastic', name: 'TPU', grade: 'Estane type', density: 1.2, price: 6.5, scrapPct: 15 },
  { id: 'pbt', cat: 'plastic', name: 'PBT', grade: 'GF30', density: 1.52, price: 5.5, scrapPct: 12 },
  { id: 'pei', cat: 'plastic', name: 'PEI — Ultem', grade: 'Amorphous', density: 1.27, price: 45, scrapPct: 18 },
  { id: 'al6061', cat: 'aluminium', name: 'Al 6061-T6', grade: 'T6 temper', density: 2.7, price: 3.2, scrapPct: 10 },
  { id: 'al7075', cat: 'aluminium', name: 'Al 7075-T6', grade: 'T6 temper', density: 2.81, price: 6.8, scrapPct: 10 },
  { id: 'al5052', cat: 'aluminium', name: 'Al 5052-H32', grade: 'Sheet', density: 2.68, price: 3.5, scrapPct: 10 },
  { id: 'steel4140', cat: 'steel', name: '4140 / 42CrMo4', grade: 'Alloy steel', density: 7.85, price: 2.2, scrapPct: 8 },
  { id: 'steel1018', cat: 'steel', name: '1018 mild steel', grade: 'Low carbon', density: 7.87, price: 1.4, scrapPct: 8 },
  { id: 'sus316l', cat: 'stainless', name: 'SUS316L / 1.4404', grade: 'Low carbon', density: 7.98, price: 8.2, scrapPct: 8 },
  { id: 'sus304', cat: 'stainless', name: 'SUS304 / 1.4301', grade: 'Austenitic', density: 7.93, price: 4.5, scrapPct: 8 },
  { id: 'cf-pa', cat: 'composite', name: 'Carbon Fibre PA12', grade: 'CF reinforced', density: 1.1, price: 45, scrapPct: 15 },
  { id: 'gfrp', cat: 'composite', name: 'GFRP laminate', grade: 'Epoxy prepreg', density: 1.6, price: 32, scrapPct: 12 },
]

export const RFQI_SEED_MACHINES = [
  {
    id: 'imm-engel-80',
    processId: 'imm',
    name: 'Engel victory 80',
    tonnage: 80,
    clampForceKN: 800,
    machineRateEUR: 78,
    energyKwh: 28,
    setupTimeH: 1.5,
    cycleTimeFactor: 1.05,
    defaultEnergyTariffId: 'energy-eu-west',
    defaultPersonnelRegionId: 'pers-eu-west',
  },
  {
    id: 'imm-engel-160',
    processId: 'imm',
    name: 'Engel victory 160',
    tonnage: 160,
    clampForceKN: 1600,
    machineRateEUR: 95,
    energyKwh: 42,
    setupTimeH: 2.0,
    cycleTimeFactor: 1.0,
    defaultEnergyTariffId: 'energy-eu-west',
    defaultPersonnelRegionId: 'pers-eu-west',
  },
  {
    id: 'imm-arburg-220',
    processId: 'imm',
    name: 'Arburg Allrounder 470 H',
    tonnage: 220,
    clampForceKN: 2200,
    machineRateEUR: 110,
    energyKwh: 55,
    setupTimeH: 2.5,
    cycleTimeFactor: 0.95,
    defaultEnergyTariffId: 'energy-eu-west',
    defaultPersonnelRegionId: 'pers-eu-west',
  },
  {
    id: 'imm-sumitomo-180',
    processId: 'imm',
    name: 'Sumitomo SE180DUZ',
    tonnage: 180,
    clampForceKN: 1800,
    machineRateEUR: 88,
    energyKwh: 48,
    setupTimeH: 2.0,
    cycleTimeFactor: 1.0,
    defaultEnergyTariffId: 'energy-asia',
    defaultPersonnelRegionId: 'pers-asia',
  },
  {
    id: 'cnc-dmg-5axis',
    processId: 'cnc',
    name: 'DMG Mori DMU 50',
    tonnage: null,
    machineRateEUR: 95,
    energyKwh: 18,
    setupTimeH: 1.5,
    cycleTimeFactor: 1.0,
    defaultEnergyTariffId: 'energy-eu-west',
    defaultPersonnelRegionId: 'pers-eu-west',
  },
  {
    id: 'cnc-haas-vf2',
    processId: 'cnc',
    name: 'Haas VF-2',
    tonnage: null,
    machineRateEUR: 72,
    energyKwh: 12,
    setupTimeH: 1.0,
    cycleTimeFactor: 1.1,
    defaultEnergyTariffId: 'energy-eu-west',
    defaultPersonnelRegionId: 'pers-eu-west',
  },
  {
    id: 'sheet-trumpf-3030',
    processId: 'sheet',
    name: 'Trumpf TruLaser 3030',
    tonnage: null,
    machineRateEUR: 105,
    energyKwh: 35,
    setupTimeH: 1.0,
    cycleTimeFactor: 1.0,
    defaultEnergyTariffId: 'energy-eu-west',
    defaultPersonnelRegionId: 'pers-eu-west',
  },
]

export const RFQI_SEED_PERIPHERALS = [
  { id: 'peri-dryer', processId: 'imm', name: 'Desiccant material dryer', rateEUR: 8, notes: 'Required for hygroscopic grades (PA, PEEK)' },
  { id: 'peri-mtc', processId: 'imm', name: 'Mold temperature controller', rateEUR: 6, notes: 'Oil or water unit' },
  { id: 'peri-hot-runner', processId: 'imm', name: 'Hot runner controller', rateEUR: 12, notes: 'Multi-zone hot runner' },
  { id: 'peri-robot', processId: 'imm', name: '6-axis take-out robot', rateEUR: 15, notes: 'Part removal & stacking' },
  { id: 'peri-granulator', processId: 'imm', name: 'Inline granulator', rateEUR: 5, notes: 'Sprue/runner regrind' },
  { id: 'peri-chiller', processId: 'imm', name: 'Process chiller', rateEUR: 7, notes: 'Hydraulic / barrel cooling' },
  { id: 'peri-conveyor', processId: 'imm', name: 'Conveyor & boxing', rateEUR: 4, notes: 'Downstream handling' },
  { id: 'peri-cmm', processId: 'cnc', name: 'CMM inspection (allocated)', rateEUR: 18, notes: 'Quality overhead per lot' },
  { id: 'peri-deburr', processId: 'cnc', name: 'Deburring cell', rateEUR: 22, notes: 'Manual or vibratory' },
]

/** @deprecated v1 — kept for migration */
export const RFQI_SEED_TARIFFS = [
  { id: 'tariff-eu-west', name: 'W.Europe industrial', region: 'EU-West', energyEURkWh: 0.22, labourEURh: 38, overheadPct: 180 },
  { id: 'tariff-eu-east', name: 'C/E Europe industrial', region: 'EU-East', energyEURkWh: 0.14, labourEURh: 22, overheadPct: 160 },
  { id: 'tariff-asia', name: 'Asia manufacturing', region: 'Asia', energyEURkWh: 0.09, labourEURh: 12, overheadPct: 140 },
]

export function buildRfqSeedDatabase() {
  return {
    version: RFQI_DB_VERSION,
    materials: [...RFQI_SEED_MATERIALS],
    machines: [...RFQI_SEED_MACHINES],
    peripherals: [...RFQI_SEED_PERIPHERALS],
    energyTariffs: [...RFQI_SEED_ENERGY_TARIFFS],
    personnelRegions: [...RFQI_SEED_PERSONNEL_REGIONS],
    personnelRoles: [...RFQI_SEED_PERSONNEL_ROLES],
  }
}

export function migrateRfqDatabaseV1ToV2(state) {
  if (!state || state.version >= 2) return state
  const seed = buildRfqSeedDatabase()
  const legacyTariffs = state.tariffs || RFQI_SEED_TARIFFS

  const energyTariffs = legacyTariffs.map((t) => ({
    id: t.id?.startsWith('energy-') ? t.id : `energy-${(t.region || t.id || 'default').toLowerCase().replace(/\s+/g, '-')}`,
    name: t.name || 'Energy tariff',
    region: t.region || '',
    energyEURkWh: Number(t.energyEURkWh) || 0.15,
  }))

  const personnelRegions = legacyTariffs.map((t) => ({
    id: t.id?.startsWith('pers-') ? t.id : `pers-${(t.region || t.id || 'default').toLowerCase().replace(/\s+/g, '-')}`,
    name: t.name || 'Personnel region',
    region: t.region || '',
    overheadPct: Number(t.overheadPct) || 180,
  }))

  const personnelRoles = []
  personnelRegions.forEach((reg, i) => {
    const legacy = legacyTariffs[i] || legacyTariffs[0]
    const labour = Number(legacy?.labourEURh) || 35
    personnelRoles.push(
      { id: `role-op-${reg.id}`, regionId: reg.id, roleKey: 'operator', name: 'Machine operator', rateEURh: labour, cycleShare: 0.25, setupHours: 0 },
      { id: `role-setter-${reg.id}`, regionId: reg.id, roleKey: 'setter', name: 'Setter / technician', rateEURh: Math.round(labour * 1.18), cycleShare: 0, setupHours: 1.5 },
      { id: `role-qc-${reg.id}`, regionId: reg.id, roleKey: 'qc', name: 'QC inspector', rateEURh: Math.round(labour * 1.1), cycleShare: 0.08, setupHours: 0 },
    )
  })

  const tariffToEnergy = new Map(legacyTariffs.map((t, i) => [t.id, energyTariffs[i]?.id]))
  const tariffToPers = new Map(legacyTariffs.map((t, i) => [t.id, personnelRegions[i]?.id]))

  const machines = (state.machines || seed.machines).map((m) => ({
    ...m,
    defaultEnergyTariffId: m.defaultEnergyTariffId || tariffToEnergy.get(m.defaultTariffId) || energyTariffs[0]?.id,
    defaultPersonnelRegionId: m.defaultPersonnelRegionId || tariffToPers.get(m.defaultTariffId) || personnelRegions[0]?.id,
  }))

  const materials = (state.materials || seed.materials).map((m) => ({
    ...m,
    scrapPct: m.scrapPct ?? 15,
  }))

  return {
    version: RFQI_DB_VERSION,
    materials,
    machines,
    peripherals: state.peripherals?.length ? state.peripherals : seed.peripherals,
    energyTariffs: state.energyTariffs?.length ? state.energyTariffs : energyTariffs,
    personnelRegions: state.personnelRegions?.length ? state.personnelRegions : personnelRegions,
    personnelRoles: state.personnelRoles?.length ? state.personnelRoles : personnelRoles,
  }
}
