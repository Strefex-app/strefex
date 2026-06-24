/**
 * Resolve process-side rates (machine, peripherals, energy) — no personnel.
 */
export function resolveProcessRates({ machine, peripherals = [], energyTariff, process }) {
  const baseRate = Number(machine?.machineRateEUR ?? process?.machineRate ?? 85)
  const periRate = peripherals.reduce((sum, p) => sum + (Number(p.rateEUR) || 0), 0)
  const energyKwh = Number(machine?.energyKwh) || 0
  const energyEURkWh = Number(energyTariff?.energyEURkWh) || 0
  const energyRateEUR = energyKwh * energyEURkWh

  const processRateEUR = baseRate + periRate + energyRateEUR

  return {
    machineRateEUR: baseRate,
    peripheralRateEUR: periRate,
    energyRateEUR,
    processRateEUR,
    setupTimeH: Number(machine?.setupTimeH ?? process?.setupTime ?? 2),
    cycleFactor: Number(machine?.cycleTimeFactor ?? 1),
    machineName: machine?.name || null,
    energyTariffName: energyTariff?.name || null,
    peripheralNames: peripherals.map((p) => p.name),
  }
}

/**
 * Resolve personnel-side rates from selected roles in a region.
 */
export function resolvePersonnelRates({ region, roles = [] }) {
  const cycleLabourRateEUR = roles.reduce(
    (sum, r) => sum + (Number(r.rateEURh) || 0) * (Number(r.cycleShare) || 0),
    0,
  )
  const setupLabourEUR = roles.reduce(
    (sum, r) => sum + (Number(r.rateEURh) || 0) * (Number(r.setupHours) || 0),
    0,
  )

  return {
    cycleLabourRateEUR,
    setupLabourEUR,
    overheadPct: Number(region?.overheadPct ?? 180),
    regionName: region?.name || null,
    roleNames: roles.map((r) => r.name),
  }
}

export function pickDefaultMachine(machines = [], processId) {
  return machines.find((m) => m.processId === processId) || null
}

export function pickDefaultEnergyTariff(energyTariffs = [], machine) {
  if (machine?.defaultEnergyTariffId) {
    return energyTariffs.find((t) => t.id === machine.defaultEnergyTariffId) || energyTariffs[0] || null
  }
  if (machine?.defaultTariffId) {
    return energyTariffs.find((t) => t.id === machine.defaultTariffId || t.id === `energy-${machine.defaultTariffId}`) || energyTariffs[0] || null
  }
  return energyTariffs[0] || null
}

export function pickDefaultPersonnelRegion(personnelRegions = [], machine) {
  if (machine?.defaultPersonnelRegionId) {
    return personnelRegions.find((r) => r.id === machine.defaultPersonnelRegionId) || personnelRegions[0] || null
  }
  return personnelRegions[0] || null
}

export function rolesForRegion(personnelRoles = [], regionId, selectedRoleIds = null) {
  const inRegion = personnelRoles.filter((r) => r.regionId === regionId)
  if (!selectedRoleIds) return inRegion
  return inRegion.filter((r) => selectedRoleIds.includes(r.id))
}

export function defaultRoleIdsForRegion(personnelRoles = [], regionId) {
  return personnelRoles.filter((r) => r.regionId === regionId).map((r) => r.id)
}

/** @deprecated — use resolveProcessRates + resolvePersonnelRates */
export function resolveEquipmentRates({ machine, peripherals = [], tariff, process }) {
  const processRates = resolveProcessRates({
    machine,
    peripherals,
    energyTariff: tariff,
    process,
  })
  return {
    ...processRates,
    machineRateEUR: processRates.processRateEUR,
    baseMachineRateEUR: processRates.machineRateEUR,
    labourEURh: Number(tariff?.labourEURh ?? 35),
    overheadPct: Number(tariff?.overheadPct ?? 180),
    tariffName: tariff?.name || null,
  }
}

export function pickDefaultTariff(tariffs = [], machine) {
  return pickDefaultEnergyTariff(tariffs, machine)
}
