/** @typedef {{ label: string, value: number | string }} MachineDbOverviewStat */

/** @param {object} db */
export function buildCutDbOverviewStats(db) {
  if (!db) return []
  /** @type {MachineDbOverviewStat[]} */
  const stats = [
    { label: 'Tools', value: db.tools?.length ?? 0 },
    { label: 'Suppliers', value: db.suppliers?.length ?? 0 },
    { label: 'Machine brands', value: db.machines?.length ?? 0 },
    { label: 'Coatings', value: db.coatings?.length ?? 0 },
    { label: 'ISO materials', value: db.materials?.length ?? 0 },
  ]
  return stats
}

/** @param {{ suppliers?: object[], machines?: object[] }} db */
export function buildMachineDbOverviewStats(db) {
  if (!db) return []
  const regions = new Set(
    (db.suppliers || []).map((s) => s.region).filter(Boolean),
  )
  /** @type {MachineDbOverviewStat[]} */
  return [
    { label: 'Suppliers', value: db.suppliers?.length ?? 0 },
    { label: 'Models', value: db.machines?.length ?? 0 },
    { label: 'Regions', value: regions.size },
  ]
}
