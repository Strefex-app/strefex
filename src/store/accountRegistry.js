/**
 * Persistent account registry.
 *
 * Stores every registered buyer, seller, and service provider with their:
 *   - Company info, contact, account type, plan
 *   - Selected industries and equipment categories
 *   - Registration date, status
 *   - Team members (invited users who share the parent business account)
 *
 * Business rules:
 *   - One domain (e.g. @company.com) can have ONE account per direction
 *     (one Seller, one Buyer, and one Service Provider).
 *   - Team members are invited by the account admin and do NOT create
 *     separate business accounts.
 *
 * Data is persisted to localStorage for offline resilience.
 * In production, the primary source of truth is Supabase.
 */
import { create } from 'zustand'

const REGISTRY_KEY = 'strefex-account-registry'

/* ── Helpers ──────────────────────────────────────────── */

const loadRegistry = () => {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* */ }
  return null
}

const saveRegistry = (accounts) => {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(accounts))
  } catch { /* silent */ }
}

/* ── Zustand store ────────────────────────────────────── */

export const useAccountRegistry = create((set, get) => ({
  accounts: loadRegistry() || [],

  registerAccount: (account) => {
    const accounts = get().accounts
    const idx = accounts.findIndex((a) => a.id === account.id || a.email === account.email)
    let next
    if (idx >= 0) {
      next = [...accounts]
      next[idx] = { ...accounts[idx], ...account }
    } else {
      next = [...accounts, account]
    }
    saveRegistry(next)
    set({ accounts: next })
    return next[idx >= 0 ? idx : next.length - 1]
  },

  updateAccount: (idOrEmail, updates) => {
    const accounts = get().accounts
    const idx = accounts.findIndex((a) => a.id === idOrEmail || a.email === idOrEmail)
    if (idx < 0) return null
    const next = [...accounts]
    next[idx] = { ...next[idx], ...updates }
    saveRegistry(next)
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
      invitedAt: new Date().toISOString(),
      status: 'pending',
    }]
    const next = [...accounts]
    next[idx] = acct
    saveRegistry(next)
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
    set({ accounts: next })
    return acct
  },

  getTeamMembers: (accountIdOrEmail) => {
    const acct = get().accounts.find((a) => a.id === accountIdOrEmail || a.email === accountIdOrEmail)
    return acct?.teamMembers || []
  },

  isDomainRegistered: (domain, accountType) => {
    if (!domain) return false
    return get().accounts.some((a) =>
      a.accountType === accountType &&
      a.email?.split('@')[1]?.toLowerCase() === domain.toLowerCase() &&
      a.status !== 'canceled'
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
      active: all.filter((a) => a.status === 'active').length,
      totalTeamMembers: all.reduce((s, a) => s + (a.teamMembers?.length || 0), 0),
    }
  },
}))
