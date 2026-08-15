import { create } from 'zustand'
import { AUTH_USE_COOKIES } from '../config/authCookies'
import { isSuperadminEmail } from '../services/superadminAuth'
import { setServerFeatureGrants } from '../utils/featureGrants'
import {
  scheduleRehydrateTenantStores,
  stopWorkspaceCloudSyncOnLogout,
} from './rehydrateTenantStores'

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
        token: AUTH_USE_COOKIES ? null : state.token,
        expiresAt: state.expiresAt,
        user: state.user,
        tenant: state.tenant,
        sessionMode: state.sessionMode || 'live',
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

/* ── store ────────────────────────────────────────────────── */
const stored = getStored()

export const useAuthStore = create((set, get) => ({
  isAuthenticated: stored?.isAuthenticated ?? false,
  role: stored?.role ?? 'user', // 'superadmin' | 'auditor_external' | 'admin' | 'auditor_internal' | 'manager' | 'user'
  token: AUTH_USE_COOKIES ? null : (stored?.token ?? null),
  expiresAt: stored?.expiresAt ?? null,

  /** User profile from backend. */
  user: stored?.user ?? null, // { id, email, fullName, role }

  /** Tenant/company from backend. */
  tenant: stored?.tenant ?? null, // { id, name, slug }

  /** `live` = Supabase/backend session; `demo` = isolated presentation sandbox. */
  sessionMode: stored?.sessionMode ?? 'live',
  tenantReady: true,

  /**
   * Login — stores the full session, then rehydrates all tenant-scoped stores
   * so that the new user's data (not the previous user's) is loaded.
   * @param {{ role, token, expiresAt, user?, tenant?, sessionMode? }} session
   */
  login: ({ role = 'user', token = null, expiresAt = null, user = null, tenant = null, sessionMode = 'live', skipRehydrate = false } = {}) => {
    // Final enforcement: superadmin role requires verified STREFEX email
    let safeRole = role
    if (safeRole === 'superadmin' && !isSuperadminEmail(user?.email)) {
      safeRole = 'admin'
    }
    const safeToken = AUTH_USE_COOKIES ? null : token
    const prev = get()
    const tenantChanged =
      !skipRehydrate &&
      (!prev.isAuthenticated || String(prev.tenant?.id || '') !== String(tenant?.id || ''))
    const next = {
      isAuthenticated: true,
      role: safeRole,
      token: safeToken,
      expiresAt,
      user,
      tenant,
      sessionMode,
      tenantReady: tenantChanged ? false : prev.tenantReady,
    }
    persist(next)
    set(next)
    if (tenantChanged) scheduleRehydrateTenantStores(get)
  },

  /** Overwrite role from a server-verified profile without a full rehydrate. */
  applyVerifiedRole: (role) => {
    const state = get()
    if (!state.isAuthenticated) return
    let safeRole = role || 'user'
    if (safeRole === 'superadmin' && !isSuperadminEmail(state.user?.email)) {
      safeRole = 'admin'
    }
    const next = { ...state, role: safeRole }
    persist(next)
    set({ role: safeRole })
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

  /**
   * Refresh token/expiry without rehydrating tenant stores.
   * Used when Supabase auto-refreshes the session.
   */
  touchSession: ({ token, expiresAt } = {}) => {
    const state = get()
    if (!state.isAuthenticated) return
    const nextToken = AUTH_USE_COOKIES ? null : (token === undefined ? state.token : token)
    const nextExpiresAt = expiresAt === undefined ? state.expiresAt : expiresAt
    const next = { ...state, token: nextToken, expiresAt: nextExpiresAt }
    persist(next)
    set({ token: nextToken, expiresAt: nextExpiresAt })
  },

  /** Logout — clears session and rehydrates stores to 'guest' (empty) state. */
  logout: () => {
    stopWorkspaceCloudSyncOnLogout()
    setServerFeatureGrants([])
    import('../config/demoAccount')
      .then((m) => m.revokeDemoAccessSession())
      .catch(() => {})
    clear()
    set({
      isAuthenticated: false,
      role: 'user',
      token: null,
      expiresAt: null,
      user: null,
      tenant: null,
      sessionMode: 'live',
      tenantReady: true,
    })
    // Rehydrate all stores — now tenantId becomes 'guest', so the stores
    // will load empty/default data instead of the previous user's data.
    scheduleRehydrateTenantStores(get)
  },

  markTenantReady: () => set({ tenantReady: true }),

  /* ── convenience helpers ───────────────────────────────── */
  isDemoSession: () => get().sessionMode === 'demo',
  isLiveSession: () => get().sessionMode !== 'demo',
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

  /** Check if session is still valid (Bearer token or cookie session expiry). */
  isTokenValid: () => {
    const { token, expiresAt, isAuthenticated } = get()
    if (AUTH_USE_COOKIES) {
      if (!isAuthenticated) return false
      if (expiresAt && Date.now() > expiresAt) return false
      return true
    }
    if (!token) return false
    if (expiresAt && Date.now() > expiresAt) return false
    return true
  },
}))
