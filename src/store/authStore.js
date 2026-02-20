import { create } from 'zustand'
import { tenantKey } from '../utils/tenantStorage'
import { isSuperadminEmail } from '../services/superadminAuth'

/* ── helpers ─────────────────────────────────────────────── */
const STORAGE_KEY = 'strefex-auth'

const getStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // token-expiry guard
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const persist = (state) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        isAuthenticated: state.isAuthenticated,
        role: state.role,
        token: state.token,
        expiresAt: state.expiresAt,
        user: state.user,
        tenant: state.tenant,
      })
    )
  } catch {
    /* silent */
  }
}

const clear = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* silent */
  }
}

/**
 * Rehydrate all tenant-scoped Zustand stores so they load data
 * for the *current* user (after login or logout changes the tenant).
 *
 * - Zustand `persist` stores expose `.persist.rehydrate()` — we call it
 *   so the middleware re-reads from the new tenant-scoped localStorage key.
 * - Manual stores (industry, service, subscription) re-read via their
 *   getStored helpers which already use `tenantKey()`, so we reset their
 *   Zustand state from the new tenant-scoped localStorage.
 * - We wrap in a setTimeout(0) so the auth change has been committed to
 *   localStorage before stores try to derive the new tenantId.
 *
 * Uses dynamic import() to avoid circular dependency issues.
 */
const rehydrateAllTenantStores = () => {
  setTimeout(async () => {
    try {
      // ── Zustand persist stores — call .persist.rehydrate() ──
      const [
        projectMod,
        productionMod,
        costMod,
        enterpriseMod,
        rfqMod,
        contractMod,
        procurementMod,
        vendorMod,
        walletMod,
        auditMod,
        templateMod,
      ] = await Promise.all([
        import('./projectStore'),
        import('./productionStore'),
        import('./costStore'),
        import('./enterpriseStore'),
        import('./rfqStore'),
        import('./contractStore'),
        import('./procurementStore'),
        import('./vendorStore'),
        import('./walletStore'),
        import('./auditStore'),
        import('./templateStore'),
      ])

      const persistStores = [
        projectMod.useProjectStore,
        productionMod.default,
        costMod.default,
        enterpriseMod.default,
        rfqMod.default,
        contractMod.default,
        procurementMod.default,
        vendorMod.default,
        walletMod.default,
        auditMod.default,
        templateMod.useTemplateStore,
      ]
      persistStores.forEach((store) => {
        try { store?.persist?.rehydrate?.() } catch { /* silent */ }
      })

      // ── Manual stores — re-read from tenant-scoped localStorage ──
      const [industryMod, serviceMod, featureMod, txMod, svcReqMod] = await Promise.all([
        import('./industryStore'),
        import('./serviceStore'),
        import('../services/featureFlags'),
        import('./transactionStore'),
        import('./serviceRequestStore'),
      ])

      // industryStore
      try {
        const indKey = tenantKey('strefex-selected-industries')
        const catKey = tenantKey('strefex-selected-categories')
        const industries = JSON.parse(localStorage.getItem(indKey) || '[]')
        const categories = JSON.parse(localStorage.getItem(catKey) || '{}')
        industryMod.useIndustryStore.setState({ selectedIndustries: industries, selectedCategories: categories })
      } catch { /* silent */ }

      // serviceStore
      try {
        const svcKey = tenantKey('strefex-selected-services')
        const services = JSON.parse(localStorage.getItem(svcKey) || '[]')
        serviceMod.useServiceStore.setState({ selectedServices: services })
      } catch { /* silent */ }

      // subscriptionStore
      try {
        const subKey = tenantKey('strefex-subscription')
        const sub = JSON.parse(localStorage.getItem(subKey) || '{}')
        featureMod.useSubscriptionStore.setState({
          planId: sub.planId || 'start',
          accountType: sub.accountType || 'seller',
          status: sub.status || 'active',
          trialEndsAt: sub.trialEndsAt || null,
          overrides: sub.overrides || {},
        })
      } catch { /* silent */ }

      // transactionStore — reload from tenant-scoped key
      try {
        const txKey = tenantKey('strefex-transactions')
        const txData = JSON.parse(localStorage.getItem(txKey) || '[]')
        txMod.useTransactionStore.setState({ transactions: txData })
      } catch { /* silent */ }

      // serviceRequestStore — reload from tenant-scoped key
      try {
        const reqKey = tenantKey('strefex-service-requests')
        const notifKey = tenantKey('strefex-service-notifications')
        const reqData = JSON.parse(localStorage.getItem(reqKey) || '[]')
        const notifData = JSON.parse(localStorage.getItem(notifKey) || '[]')
        svcReqMod.useServiceRequestStore.setState({ requests: reqData, notifications: notifData })
      } catch { /* silent */ }

    } catch { /* silent — defensive against import failures */ }
  }, 0)
}

/* ── store ────────────────────────────────────────────────── */
const stored = getStored()

export const useAuthStore = create((set, get) => ({
  isAuthenticated: stored?.isAuthenticated ?? false,
  role: stored?.role ?? 'user', // 'superadmin' | 'auditor_external' | 'admin' | 'auditor_internal' | 'manager' | 'user'
  token: stored?.token ?? null,
  expiresAt: stored?.expiresAt ?? null,

  /** User profile from backend. */
  user: stored?.user ?? null, // { id, email, fullName, role }

  /** Tenant/company from backend. */
  tenant: stored?.tenant ?? null, // { id, name, slug }

  /**
   * Login — stores the full session, then rehydrates all tenant-scoped stores
   * so that the new user's data (not the previous user's) is loaded.
   * @param {{ role, token, expiresAt, user?, tenant? }} session
   */
  login: ({ role = 'user', token = null, expiresAt = null, user = null, tenant = null } = {}) => {
    // Final enforcement: superadmin role requires verified STREFEX email
    let safeRole = role
    if (safeRole === 'superadmin' && !isSuperadminEmail(user?.email)) {
      safeRole = 'admin'
    }
    const next = { isAuthenticated: true, role: safeRole, token, expiresAt, user, tenant }
    persist(next)
    set(next)
    rehydrateAllTenantStores()
  },

  /** Update user profile without re-authenticating. */
  setUser: (user) => {
    const state = get()
    const next = { ...state, user }
    persist(next)
    set({ user })
  },

  /** Update tenant info. */
  setTenant: (tenant) => {
    const state = get()
    const next = { ...state, tenant }
    persist(next)
    set({ tenant })
  },

  /** Logout — clears session and rehydrates stores to 'guest' (empty) state. */
  logout: () => {
    clear()
    set({
      isAuthenticated: false,
      role: 'user',
      token: null,
      expiresAt: null,
      user: null,
      tenant: null,
    })
    // Rehydrate all stores — now tenantId becomes 'guest', so the stores
    // will load empty/default data instead of the previous user's data.
    rehydrateAllTenantStores()
  },

  /* ── convenience helpers ───────────────────────────────── */
  isSuperAdmin: () => get().role === 'superadmin',
  isAdmin: () => get().role === 'admin' || get().role === 'superadmin',
  isManager: () => ['manager', 'admin', 'superadmin'].includes(get().role),
  isAuditorInternal: () => get().role === 'auditor_internal',
  isAuditorExternal: () => get().role === 'auditor_external',
  isAuditor: () => get().role === 'auditor_internal' || get().role === 'auditor_external',
  canEdit: () => {
    const r = get().role
    return r !== 'auditor_internal' && r !== 'auditor_external' && r !== 'guest'
  },
  hasRole: (requiredRole) => {
    const hierarchy = { superadmin: 6, auditor_external: 5, admin: 4, auditor_internal: 3, manager: 2, user: 1 }
    return (hierarchy[get().role] ?? 0) >= (hierarchy[requiredRole] ?? 0)
  },
  hasMinRole: (requiredRole) => {
    const hierarchy = { superadmin: 6, auditor_external: 5, admin: 4, auditor_internal: 3, manager: 2, user: 1 }
    return (hierarchy[get().role] ?? 0) >= (hierarchy[requiredRole] ?? 0)
  },

  /** Check if token is still valid (not expired). */
  isTokenValid: () => {
    const { token, expiresAt } = get()
    if (!token) return false
    if (expiresAt && Date.now() > expiresAt) return false
    return true
  },
}))
