/**
 * Persistent account registry.
 *
 * Stores every registered buyer, seller, service provider, and auditor with their:
 *   - Company info, contact, account type, plan
 *   - Selected industries and equipment categories
 *   - Registration date, status
 *   - Team members (invited users who share the parent business account)
 *
 * Business rules:
 *   - One domain (e.g. @company.com) can have ONE account per direction
 *     (one Seller, one Buyer, one Service Provider, and one Auditor).
 *   - Team members are invited by the account admin and do NOT create
 *     separate business accounts.
 *
 * Data is persisted to localStorage for offline resilience.
 * In production, the primary source of truth is Supabase.
 */
import { create } from 'zustand'

const REGISTRY_KEY = 'strefex-account-registry'
const REGISTRY_INDEX_KEY = 'strefex-account-registry-index'

const sanitizeScope = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9._\-]/g, '')

const getSessionPrimaryAccountType = (user) => {
  const direct = sanitizeScope(user?.primaryAccountType || user?.accountType)
  if (direct) return direct
  if (Array.isArray(user?.accountTypes) && user.accountTypes.length > 0) {
    const first = sanitizeScope(user.accountTypes[0])
    if (first) return first
  }
  return 'seller'
}

const getCompanyScope = () => {
  try {
    const raw = localStorage.getItem('strefex-auth')
    if (!raw) return 'guest'
    const parsed = JSON.parse(raw)
    const tenant = parsed?.tenant || {}
    const user = parsed?.user || {}
    const accountType = getSessionPrimaryAccountType(user)
    const withType = (base) => {
      const safeBase = sanitizeScope(base)
      if (!safeBase) return 'guest'
      return `${safeBase}::${accountType}`
    }
    if (tenant?.id) return withType(tenant.id)
    if (tenant?.slug) return withType(tenant.slug)
    if (user?.email) {
      const domain = String(user.email).split('@')[1]
      if (domain) return withType(domain)
    }
    if (user?.companyName) return withType(user.companyName)
  } catch {
    // no-op
  }
  return 'guest'
}

const getRegistryKey = () => `${REGISTRY_KEY}::${getCompanyScope()}`

const getAuthRole = () => {
  try {
    const raw = localStorage.getItem('strefex-auth')
    if (!raw) return 'guest'
    const parsed = JSON.parse(raw)
    return String(parsed?.role || 'guest').toLowerCase()
  } catch {
    return 'guest'
  }
}

const getSessionEmailDomain = () => {
  try {
    const raw = localStorage.getItem('strefex-auth')
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    const domain = String(parsed?.user?.email || '').split('@')[1] || ''
    return sanitizeScope(domain)
  } catch {
    return ''
  }
}

/* ── Helpers ──────────────────────────────────────────── */

/** Merge every `strefex-account-registry` slice (incl. `::guest` from signup before login). */
function mergeAllRegistryLocalStorageSlices() {
  const byEmail = new Map()
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || (key !== REGISTRY_KEY && !key.startsWith(`${REGISTRY_KEY}::`))) continue
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const arr = JSON.parse(raw)
      if (!Array.isArray(arr)) continue
      for (const a of arr) {
        const em = String(a?.email || '').trim().toLowerCase()
        if (!em) continue
        const prev = byEmail.get(em)
        const t = new Date(a?.updatedAt || a?.registeredAt || 0).getTime()
        const pt = prev ? new Date(prev?.updatedAt || prev?.registeredAt || 0).getTime() : -1
        if (!prev || t >= pt) byEmail.set(em, a)
      }
    } catch {
      /* skip bad slice */
    }
  }
  return [...byEmail.values()]
}

const loadRegistry = () => {
  try {
    const role = getAuthRole()
    if (role === 'superadmin' || role === 'auditor_external') {
      const merged = mergeAllRegistryLocalStorageSlices()
      if (merged.length > 0) return merged
    }

    const scopedRaw = localStorage.getItem(getRegistryKey())
    if (scopedRaw) return JSON.parse(scopedRaw)

    // Backward compatibility: migrate legacy global registry into scoped storage.
    const legacyRaw = localStorage.getItem(REGISTRY_KEY)
    if (!legacyRaw) return null
    const legacyAccounts = JSON.parse(legacyRaw)
    if (!Array.isArray(legacyAccounts) || legacyAccounts.length === 0) return null

    if (role === 'superadmin') return legacyAccounts

    const scope = getCompanyScope()
    if (!scope || scope === 'guest') return null
    const [scopeDomainOrTenant, scopeAccountType] = String(scope).split('::')
    const sessionDomain = getSessionEmailDomain()
    const migrated = legacyAccounts.filter((a) =>
      (
        String(a?.email || '').split('@')[1]?.toLowerCase() === scopeDomainOrTenant ||
        (sessionDomain && String(a?.email || '').split('@')[1]?.toLowerCase() === sessionDomain) ||
        sanitizeScope(a?.companyId || a?.id || '') === scopeDomainOrTenant
      ) &&
      (!scopeAccountType || String(a?.accountType || '').toLowerCase() === scopeAccountType)
    )
    if (migrated.length > 0) {
      localStorage.setItem(getRegistryKey(), JSON.stringify(migrated))
    }
    return migrated
  } catch { /* */ }
  return null
}

const saveRegistry = (accounts) => {
  try {
    localStorage.setItem(getRegistryKey(), JSON.stringify(accounts))
  } catch { /* silent */ }
}

const loadRegistryIndex = () => {
  try {
    const raw = localStorage.getItem(REGISTRY_INDEX_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveRegistryIndex = (rows) => {
  try {
    localStorage.setItem(REGISTRY_INDEX_KEY, JSON.stringify(rows))
  } catch { /* silent */ }
}

const mergeRegistryIndex = (accounts) => {
  const existing = loadRegistryIndex()
  const map = new Map()
  existing.forEach((row) => {
    const key = `${row.domain}::${row.accountType}::${row.industryId}`
    map.set(key, row)
  })
  ;(accounts || []).forEach((a) => {
    const domain = String(a?.email || '').split('@')[1]?.toLowerCase()
    const accountType = String(a?.accountType || '').toLowerCase()
    if (!domain || !accountType) return
    const industries = Array.isArray(a?.industries) && a.industries.length > 0 ? a.industries : ['general']
    industries.forEach((industryId) => {
      const safeIndustry = String(industryId || 'general').toLowerCase()
      const key = `${domain}::${accountType}::${safeIndustry}`
      map.set(key, {
        domain,
        accountType,
        industryId: safeIndustry,
        status: a?.status || 'active',
        updatedAt: new Date().toISOString(),
      })
    })
  })
  const next = [...map.values()]
  saveRegistryIndex(next)
  return next
}

/* ── Zustand store ────────────────────────────────────── */

const initialAccounts = loadRegistry() || []
mergeRegistryIndex(initialAccounts)

export const useAccountRegistry = create((set, get) => ({
  accounts: initialAccounts,

  /** Call after login (especially superadmin) so scoped `::guest` registrations appear. */
  rehydrateRegistryFromStorage: () => {
    const next = loadRegistry() || []
    mergeRegistryIndex(next)
    set({ accounts: next })
    return next.length
  },

  registerAccount: (account) => {
    const accounts = get().accounts
    const idx = accounts.findIndex((a) => a.id === account.id || a.email === account.email)
    const stamped = { ...account, updatedAt: new Date().toISOString() }
    let next
    if (idx >= 0) {
      next = [...accounts]
      next[idx] = { ...accounts[idx], ...stamped }
    } else {
      next = [...accounts, stamped]
    }
    saveRegistry(next)
    mergeRegistryIndex(next)
    set({ accounts: next })
    return next[idx >= 0 ? idx : next.length - 1]
  },

  updateAccount: (idOrEmail, updates) => {
    const accounts = get().accounts
    const idx = accounts.findIndex((a) => a.id === idOrEmail || a.email === idOrEmail)
    if (idx < 0) return null
    const next = [...accounts]
    next[idx] = { ...next[idx], ...updates, updatedAt: new Date().toISOString() }
    saveRegistry(next)
    mergeRegistryIndex(next)
    set({ accounts: next })
    return next[idx]
  },

  addIndustryToAccount: (idOrEmail, industryId, categoryIds = []) => {
    const accounts = get().accounts
    const idx = accounts.findIndex((a) => a.id === idOrEmail || a.email === idOrEmail)
    if (idx < 0) return null
    const acct = { ...accounts[idx] }
    acct.industries = acct.industries || []
    acct.categories = acct.categories || {}
    if (!acct.industries.includes(industryId)) {
      acct.industries = [...acct.industries, industryId]
    }
    const cats = { ...acct.categories }
    const existing = cats[industryId] || []
    const merged = [...new Set([...existing, ...categoryIds])]
    cats[industryId] = merged
    acct.categories = cats
    const next = [...accounts]
    next[idx] = acct
    saveRegistry(next)
    mergeRegistryIndex(next)
    set({ accounts: next })
    return acct
  },

  /* ── Team Members ─────────────────────────────────────── */

  inviteTeamMember: (accountIdOrEmail, member) => {
    const accounts = get().accounts
    const idx = accounts.findIndex((a) => a.id === accountIdOrEmail || a.email === accountIdOrEmail)
    if (idx < 0) return null
    const acct = { ...accounts[idx] }
    const existing = acct.teamMembers || []
    if (existing.find((m) => m.email === member.email)) return null
    acct.teamMembers = [...existing, {
      id: `tm-${Date.now()}`,
      name: member.name,
      email: member.email,
      role: member.role || 'user',
      accountType: member.accountType || acct.accountType || 'seller',
      companyId: member.companyId || acct.id || '',
      invitedAt: new Date().toISOString(),
      status: 'pending',
    }]
    const next = [...accounts]
    next[idx] = acct
    saveRegistry(next)
    mergeRegistryIndex(next)
    set({ accounts: next })
    return acct
  },

  removeTeamMember: (accountIdOrEmail, memberEmail) => {
    const accounts = get().accounts
    const idx = accounts.findIndex((a) => a.id === accountIdOrEmail || a.email === accountIdOrEmail)
    if (idx < 0) return null
    const acct = { ...accounts[idx] }
    acct.teamMembers = (acct.teamMembers || []).filter((m) => m.email !== memberEmail)
    const next = [...accounts]
    next[idx] = acct
    saveRegistry(next)
    mergeRegistryIndex(next)
    set({ accounts: next })
    return acct
  },

  updateTeamMember: (accountIdOrEmail, memberEmail, updates) => {
    const accounts = get().accounts
    const idx = accounts.findIndex((a) => a.id === accountIdOrEmail || a.email === accountIdOrEmail)
    if (idx < 0) return null
    const acct = { ...accounts[idx] }
    acct.teamMembers = (acct.teamMembers || []).map((m) =>
      m.email === memberEmail ? { ...m, ...updates } : m
    )
    const next = [...accounts]
    next[idx] = acct
    saveRegistry(next)
    mergeRegistryIndex(next)
    set({ accounts: next })
    return acct
  },

  getTeamMembers: (accountIdOrEmail) => {
    const acct = get().accounts.find((a) => a.id === accountIdOrEmail || a.email === accountIdOrEmail)
    return acct?.teamMembers || []
  },

  isDomainRegistered: (domain, accountType) => {
    if (!domain) return false
    const safeDomain = domain.toLowerCase()
    const safeType = String(accountType || '').toLowerCase()
    const localMatch = get().accounts.some((a) =>
      a.accountType === accountType &&
      a.email?.split('@')[1]?.toLowerCase() === safeDomain &&
      a.status !== 'canceled'
    )
    if (localMatch) return true
    return loadRegistryIndex().some((row) =>
      row.domain === safeDomain &&
      row.accountType === safeType &&
      row.status !== 'canceled'
    )
  },

  isDomainIndustryRegistered: (domain, accountType, industryId) => {
    if (!domain || !industryId) return false
    const safeDomain = domain.toLowerCase()
    const safeType = String(accountType || '').toLowerCase()
    const safeIndustry = String(industryId || '').toLowerCase()
    const localMatch = get().accounts.some((a) =>
      a.accountType === accountType &&
      a.email?.split('@')[1]?.toLowerCase() === safeDomain &&
      (a.industries || []).includes(industryId) &&
      a.status !== 'canceled'
    )
    if (localMatch) return true
    return loadRegistryIndex().some((row) =>
      row.domain === safeDomain &&
      row.accountType === safeType &&
      row.industryId === safeIndustry &&
      row.status !== 'canceled'
    )
  },

  getAccountsByDomain: (domain) => {
    if (!domain) return []
    return get().accounts.filter((a) =>
      a.email?.split('@')[1]?.toLowerCase() === domain.toLowerCase() &&
      a.status !== 'canceled'
    )
  },

  /* ── Queries ──────────────────────────────────────────── */

  getRegisteredSellers: (industryId = null) => {
    let sellers = get().accounts.filter((a) =>
      (a.accountType === 'seller' || a.accountType === 'service_provider') && a.status !== 'canceled'
    )
    if (industryId) {
      sellers = sellers.filter((a) => (a.industries || []).includes(industryId))
    }
    return sellers
  },

  getSellersByCategory: (industryId, categoryId) => {
    return get().accounts.filter((a) =>
      (a.accountType === 'seller' || a.accountType === 'service_provider') &&
      a.status !== 'canceled' &&
      (a.industries || []).includes(industryId) &&
      (a.categories?.[industryId] || []).includes(categoryId)
    )
  },

  getRegisteredServiceProviders: (industryId = null) => {
    let sps = get().accounts.filter((a) => a.accountType === 'service_provider' && a.status !== 'canceled')
    if (industryId) {
      sps = sps.filter((a) => (a.industries || []).includes(industryId))
    }
    return sps
  },

  getRegisteredAuditors: (industryId = null, { onlyVerified = false } = {}) => {
    let auditors = get().accounts.filter((a) => a.accountType === 'auditor' && a.status !== 'canceled')
    if (industryId) {
      auditors = auditors.filter((a) => (a.industries || []).includes(industryId))
    }
    if (onlyVerified) {
      auditors = auditors.filter((a) => {
        const status = String(a.status || '').toLowerCase()
        return status === 'active' || status === 'verified'
      })
    }
    return auditors
  },

  getServiceProvidersByCategory: (serviceCategoryId) => {
    return get().accounts.filter((a) =>
      a.accountType === 'service_provider' &&
      a.status !== 'canceled' &&
      (a.serviceCategories || []).includes(serviceCategoryId)
    )
  },

  getRegisteredBuyers: (industryId = null) => {
    let buyers = get().accounts.filter((a) => a.accountType === 'buyer' && a.status !== 'canceled')
    if (industryId) {
      buyers = buyers.filter((a) => (a.industries || []).includes(industryId))
    }
    return buyers
  },

  getSellerCountByIndustry: () => {
    const sellers = get().accounts.filter((a) =>
      (a.accountType === 'seller' || a.accountType === 'service_provider') && a.status !== 'canceled'
    )
    const counts = {}
    sellers.forEach((a) => {
      (a.industries || []).forEach((ind) => {
        counts[ind] = (counts[ind] || 0) + 1
      })
    })
    return counts
  },

  getSellerCountByCategory: (industryId) => {
    const sellers = get().accounts.filter((a) =>
      (a.accountType === 'seller' || a.accountType === 'service_provider') && a.status !== 'canceled' &&
      (a.industries || []).includes(industryId)
    )
    const counts = {}
    sellers.forEach((a) => {
      (a.categories?.[industryId] || []).forEach((cat) => {
        counts[cat] = (counts[cat] || 0) + 1
      })
    })
    return counts
  },

  getAccountByEmail: (email) => get().accounts.find((a) => a.email === email),

  getTotals: () => {
    const all = get().accounts
    return {
      total: all.length,
      sellers: all.filter((a) => a.accountType === 'seller').length,
      buyers: all.filter((a) => a.accountType === 'buyer').length,
      serviceProviders: all.filter((a) => a.accountType === 'service_provider').length,
      auditors: all.filter((a) => a.accountType === 'auditor').length,
      active: all.filter((a) => a.status === 'active').length,
      totalTeamMembers: all.reduce((s, a) => s + (a.teamMembers?.length || 0), 0),
    }
  },

  /** Replace registry from cloud sync (persists to scoped localStorage). */
  hydrateFromCloudSync: (accounts) => {
    const next = Array.isArray(accounts) ? accounts : []
    saveRegistry(next)
    mergeRegistryIndex(next)
    set({ accounts: next })
  },
}))
