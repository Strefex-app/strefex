import {
  RFQI_DB_VERSION,
  buildRfqSeedDatabase,
  migrateRfqDatabaseV1ToV2,
} from '../data/rfqEquipmentSeed'

const ENTITY_KEYS = [
  'materials',
  'machines',
  'peripherals',
  'energyTariffs',
  'personnelRegions',
  'personnelRoles',
]

function normalizeList(items, requiredFields) {
  if (!Array.isArray(items)) return []
  return items.filter((row) => row && typeof row === 'object' && requiredFields.every((f) => row[f] != null && row[f] !== ''))
}

export function normalizeRfqDatabase(state) {
  if (!state) return buildRfqSeedDatabase()
  if (!state.version || state.version < 2 || state.tariffs) {
    return migrateRfqDatabaseV1ToV2(state)
  }
  return {
    version: state.version || RFQI_DB_VERSION,
    materials: state.materials || [],
    machines: state.machines || [],
    peripherals: state.peripherals || [],
    energyTariffs: state.energyTariffs || [],
    personnelRegions: state.personnelRegions || [],
    personnelRoles: state.personnelRoles || [],
  }
}

export function validateRfqDatabase(payload) {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Invalid JSON — expected an object.' }
  }

  const normalized = normalizeRfqDatabase(payload)
  const materials = normalizeList(payload.materials, ['id', 'cat', 'name', 'price'])
  const machines = normalizeList(payload.machines, ['id', 'processId', 'name', 'machineRateEUR'])
  const peripherals = normalizeList(payload.peripherals, ['id', 'processId', 'name', 'rateEUR'])
  const energyTariffs = normalizeList(payload.energyTariffs || payload.tariffs, ['id', 'name'])
  const personnelRegions = normalizeList(payload.personnelRegions, ['id', 'name', 'overheadPct'])
  const personnelRoles = normalizeList(payload.personnelRoles, ['id', 'regionId', 'name', 'rateEURh'])

  const hasAny =
    materials.length ||
    machines.length ||
    peripherals.length ||
    energyTariffs.length ||
    personnelRegions.length ||
    personnelRoles.length

  if (!hasAny) {
    return { ok: false, error: 'No valid records found. Check id, name, and rate fields.' }
  }

  return {
    ok: true,
    data: {
      version: payload.version || RFQI_DB_VERSION,
      materials: materials.length ? materials : normalized.materials,
      machines: machines.length ? machines : normalized.machines,
      peripherals: peripherals.length ? peripherals : normalized.peripherals,
      energyTariffs: energyTariffs.length ? energyTariffs.map((t) => ({
        id: t.id,
        name: t.name,
        region: t.region || '',
        energyEURkWh: Number(t.energyEURkWh ?? t.energy ?? 0.15),
      })) : normalized.energyTariffs,
      personnelRegions: personnelRegions.length ? personnelRegions : normalized.personnelRegions,
      personnelRoles: personnelRoles.length ? personnelRoles : normalized.personnelRoles,
    },
  }
}

export function mergeRfqDatabase(current, incoming) {
  const base = normalizeRfqDatabase(current)
  const out = { ...base }
  ENTITY_KEYS.forEach((key) => {
    const existing = [...(out[key] || [])]
    const byId = new Map(existing.map((row) => [row.id, row]))
    ;(incoming[key] || []).forEach((row) => byId.set(row.id, { ...byId.get(row.id), ...row }))
    out[key] = [...byId.values()]
  })
  out.version = incoming.version || out.version || RFQI_DB_VERSION
  return out
}

export function replaceRfqDatabase(incoming) {
  const seed = buildRfqSeedDatabase()
  const validated = validateRfqDatabase(incoming)
  const data = validated.ok ? validated.data : incoming
  return {
    version: data.version || RFQI_DB_VERSION,
    materials: data.materials?.length ? data.materials : seed.materials,
    machines: data.machines?.length ? data.machines : seed.machines,
    peripherals: data.peripherals?.length ? data.peripherals : seed.peripherals,
    energyTariffs: data.energyTariffs?.length ? data.energyTariffs : seed.energyTariffs,
    personnelRegions: data.personnelRegions?.length ? data.personnelRegions : seed.personnelRegions,
    personnelRoles: data.personnelRoles?.length ? data.personnelRoles : seed.personnelRoles,
  }
}

export function exportRfqDatabaseJson(db) {
  const normalized = normalizeRfqDatabase(db)
  return JSON.stringify(
    {
      version: normalized.version || RFQI_DB_VERSION,
      exportedAt: new Date().toISOString(),
      costModel: 'three-bucket',
      materials: normalized.materials,
      machines: normalized.machines,
      peripherals: normalized.peripherals,
      energyTariffs: normalized.energyTariffs,
      personnelRegions: normalized.personnelRegions,
      personnelRoles: normalized.personnelRoles,
    },
    null,
    2,
  )
}

export function downloadRfqDatabase(db, filename = 'rfq-intelligence-database.json') {
  const blob = new Blob([`\uFEFF${exportRfqDatabaseJson(db)}`], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportRfqDatabaseSection(db, section) {
  const normalized = normalizeRfqDatabase(db)
  return JSON.stringify(
    {
      version: normalized.version,
      exportedAt: new Date().toISOString(),
      section,
      [section]: normalized[section] || [],
    },
    null,
    2,
  )
}
