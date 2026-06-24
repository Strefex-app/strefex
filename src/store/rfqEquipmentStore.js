import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildRfqSeedDatabase } from '../data/rfqEquipmentSeed'
import { createTenantStorage } from '../utils/tenantStorage'
import {
  mergeRfqDatabase,
  normalizeRfqDatabase,
  replaceRfqDatabase,
  validateRfqDatabase,
} from '../utils/rfqDatabaseIo'

const seed = buildRfqSeedDatabase()

function upsertRow(list, row) {
  const idx = list.findIndex((r) => r.id === row.id)
  if (idx >= 0) {
    const next = [...list]
    next[idx] = { ...next[idx], ...row }
    return next
  }
  return [...list, row]
}

function removeRow(list, id) {
  return list.filter((r) => r.id !== id)
}

export const useRfqEquipmentStore = create(
  persist(
    (set, get) => ({
      ...seed,

      exportDatabase: () => normalizeRfqDatabase(get()),

      importDatabase: (payload, mode = 'merge') => {
        const result = validateRfqDatabase(payload)
        if (!result.ok) return result
        if (mode === 'replace') {
          set(replaceRfqDatabase(result.data))
        } else {
          set(mergeRfqDatabase(get(), result.data))
        }
        return { ok: true }
      },

      resetToSeed: () => set(buildRfqSeedDatabase()),

      upsertMaterial: (row) => set((s) => ({ materials: upsertRow(s.materials, row) })),
      deleteMaterial: (id) => set((s) => ({ materials: removeRow(s.materials, id) })),

      upsertMachine: (row) => set((s) => ({ machines: upsertRow(s.machines, row) })),
      deleteMachine: (id) => set((s) => ({ machines: removeRow(s.machines, id) })),

      upsertPeripheral: (row) => set((s) => ({ peripherals: upsertRow(s.peripherals, row) })),
      deletePeripheral: (id) => set((s) => ({ peripherals: removeRow(s.peripherals, id) })),

      upsertEnergyTariff: (row) => set((s) => ({ energyTariffs: upsertRow(s.energyTariffs, row) })),
      deleteEnergyTariff: (id) => set((s) => ({ energyTariffs: removeRow(s.energyTariffs, id) })),

      upsertPersonnelRegion: (row) => set((s) => ({ personnelRegions: upsertRow(s.personnelRegions, row) })),
      deletePersonnelRegion: (id) => set((s) => ({ personnelRegions: removeRow(s.personnelRegions, id) })),

      upsertPersonnelRole: (row) => set((s) => ({ personnelRoles: upsertRow(s.personnelRoles, row) })),
      deletePersonnelRole: (id) => set((s) => ({ personnelRoles: removeRow(s.personnelRoles, id) })),
    }),
    {
      name: 'strefex-rfq-equipment-db',
      storage: createTenantStorage(),
      partialize: (s) => normalizeRfqDatabase(s),
      merge: (persisted, current) => ({
        ...current,
        ...normalizeRfqDatabase(persisted),
      }),
    },
  ),
)
