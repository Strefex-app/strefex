import { create } from 'zustand'
import { tenantKey } from '../utils/tenantStorage'

const STORAGE_KEY = 'strefex-sourcing-plant'

function loadPlant() {
  try {
    const raw = localStorage.getItem(tenantKey(STORAGE_KEY))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function savePlant(plant) {
  try {
    if (!plant) localStorage.removeItem(tenantKey(STORAGE_KEY))
    else localStorage.setItem(tenantKey(STORAGE_KEY), JSON.stringify(plant))
  } catch { /* */ }
}

/**
 * Buyer's selected receiving plant (from Intelligent Sourcing) — shared with Executive Summary map.
 */
const useSourcingPlantStore = create((set) => ({
  plant: loadPlant(),
  setPlant: (plant) => {
    savePlant(plant || null)
    set({ plant: plant || null })
  },
  clearPlant: () => {
    savePlant(null)
    set({ plant: null })
  },
}))

export default useSourcingPlantStore
