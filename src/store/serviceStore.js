/**
 * Service category selection store.
 *
 * Tracks which service categories the current Service Provider has chosen.
 * Free plan: 1 service category.
 * Basic+:    all service categories.
 *
 * Persisted to localStorage per-user AND synced to the account registry
 * so that service provider registrations are permanent and visible platform-wide.
 */
import { create } from 'zustand'
import { useAccountRegistry } from './accountRegistry'
import { tenantKey } from '../utils/tenantStorage'

const SVC_BASE = 'strefex-selected-services'

/** Sync current selections to the account registry (best-effort). */
const syncToRegistry = (serviceCategories) => {
  try {
    const authRaw = localStorage.getItem('strefex-auth')
    const auth = authRaw ? JSON.parse(authRaw) : null
    const email = auth?.user?.email
    if (!email) return
    const registry = useAccountRegistry.getState()
    const existing = registry.getAccountByEmail(email)
    if (existing) {
      registry.updateAccount(email, { serviceCategories: [...serviceCategories] })
    }
  } catch { /* silent — registry sync is best-effort */ }
}

const getStored = (baseKey, fallback) => {
  try {
    const raw = localStorage.getItem(tenantKey(baseKey))
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const save = (baseKey, value) => {
  try {
    localStorage.setItem(tenantKey(baseKey), JSON.stringify(value))
  } catch { /* silent */ }
}

export const useServiceStore = create((set, get) => ({
  /** Array of chosen service category IDs, e.g. ['project-management'] */
  selectedServices: getStored(SVC_BASE, []),

  /** Select a service category (respects maxCount). Returns true if added. */
  selectService: (serviceId, maxCount = 1) => {
    const current = get().selectedServices
    if (current.includes(serviceId)) return true
    if (current.length >= maxCount) return false
    const next = [...current, serviceId]
    save(SVC_BASE, next)
    set({ selectedServices: next })
    syncToRegistry(next)
    return true
  },

  deselectService: (serviceId) => {
    const next = get().selectedServices.filter((id) => id !== serviceId)
    save(SVC_BASE, next)
    set({ selectedServices: next })
    syncToRegistry(next)
  },

  setServices: (ids) => {
    save(SVC_BASE, ids)
    set({ selectedServices: ids })
    syncToRegistry(ids)
  },

  isServiceSelected: (serviceId) => get().selectedServices.includes(serviceId),

  clearServices: () => {
    save(SVC_BASE, [])
    set({ selectedServices: [] })
  },
}))
