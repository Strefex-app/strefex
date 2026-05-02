/**
 * Cross-device workspace sync (Supabase) for tenant-scoped Zustand / local data.
 * Requires Supabase auth + profiles.company_id (same as other tenant tables).
 *
 * Pull runs after login rehydration; local changes debounce-push to
 * tenant_workspace_snapshots (company_id + state_key).
 *
 * Synced keys (see SYNC_SPECS): projects, vendors, rfqs, contracts, procurement, cost,
 * enterprise, production, templates, audit_logs, hr_space, account_registry, profile_contacts,
 * industry_prefs, service_prefs, service_requests_workspace, messenger (Company Messenger / Brain).
 */
import { isSupabaseConfigured, workspaceSnapshotsService } from './supabaseService'
import { tenantKey } from '../utils/tenantStorage'
import { useProjectStore } from '../store/projectStore'
import useVendorStore from '../store/vendorStore'
import useRfqStore from '../store/rfqStore'
import useContractStore from '../store/contractStore'
import useProcurementStore from '../store/procurementStore'
import useCostStore from '../store/costStore'
import useEnterpriseStore from '../store/enterpriseStore'
import useProductionStore from '../store/productionStore'
import { useTemplateStore } from '../store/templateStore'
import useAuditStore from '../store/auditStore'
import useHrSpaceStore from '../store/hrSpaceStore'
import { useAccountRegistry } from '../store/accountRegistry'
import { useIndustryStore } from '../store/industryStore'
import { useServiceStore } from '../store/serviceStore'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useMessengerStore } from '../store/messengerStore'

const DEBOUNCE_MS = 2500
const PROFILE_CONTACTS_STORAGE = 'strefex-profile-contacts'
const IND_BASE = 'strefex-selected-industries'
const CAT_BASE = 'strefex-selected-categories'
const SVC_BASE = 'strefex-selected-services'

export const PROFILE_CONTACTS_SYNC_EVENT = 'strefex-profile-contacts-sync'

let applyingRemote = false
let unsubscribers = []
const debounceTimers = new Map()
let bootstrappedCompanyId = null

function isLikelyUuid(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

async function getCompanyId() {
  try {
    const { useAuthStore } = await import('../store/authStore')
    const tid = useAuthStore.getState().tenant?.id
    return isLikelyUuid(tid) ? tid : null
  } catch {
    return null
  }
}

function zustandDataSlice(getState) {
  const s = getState()
  const out = {}
  Object.keys(s).forEach((k) => {
    const v = s[k]
    if (typeof v !== 'function') out[k] = v
  })
  return out
}

function readProfileContactsPayload() {
  try {
    const raw = localStorage.getItem(tenantKey(PROFILE_CONTACTS_STORAGE))
    if (!raw) return { contacts: [] }
    const parsed = JSON.parse(raw)
    return { contacts: Array.isArray(parsed) ? parsed : [] }
  } catch {
    return { contacts: [] }
  }
}

function applyProfileContactsPayload(payload) {
  const contacts = Array.isArray(payload?.contacts) ? payload.contacts : []
  try {
    localStorage.setItem(tenantKey(PROFILE_CONTACTS_STORAGE), JSON.stringify(contacts))
  } catch { /* silent */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROFILE_CONTACTS_SYNC_EVENT, { detail: contacts }))
  }
}

function readIndustryPayload() {
  try {
    const industries = JSON.parse(localStorage.getItem(tenantKey(IND_BASE)) || '[]')
    const categories = JSON.parse(localStorage.getItem(tenantKey(CAT_BASE)) || '{}')
    return {
      selectedIndustries: Array.isArray(industries) ? industries : [],
      selectedCategories: categories && typeof categories === 'object' ? categories : {},
    }
  } catch {
    return { selectedIndustries: [], selectedCategories: {} }
  }
}

function applyIndustryPayload(payload) {
  const industries = Array.isArray(payload?.selectedIndustries) ? payload.selectedIndustries : []
  const categories = payload?.selectedCategories && typeof payload.selectedCategories === 'object'
    ? payload.selectedCategories
    : {}
  try {
    localStorage.setItem(tenantKey(IND_BASE), JSON.stringify(industries))
    localStorage.setItem(tenantKey(CAT_BASE), JSON.stringify(categories))
  } catch { /* silent */ }
  useIndustryStore.setState({ selectedIndustries: industries, selectedCategories: categories })
}

function readServicePayload() {
  try {
    const raw = localStorage.getItem(tenantKey(SVC_BASE))
    const arr = raw ? JSON.parse(raw) : []
    return { selectedServices: Array.isArray(arr) ? arr : [] }
  } catch {
    return { selectedServices: [] }
  }
}

function applyServicePayload(payload) {
  const services = Array.isArray(payload?.selectedServices) ? payload.selectedServices : []
  try {
    localStorage.setItem(tenantKey(SVC_BASE), JSON.stringify(services))
  } catch { /* silent */ }
  useServiceStore.setState({ selectedServices: services })
}

/** Notify sync after Profile contacts change (debounced upload). */
export function notifyProfileContactsDirty() {
  schedulePushKey('profile_contacts')
}

/**
 * Mark a workspace snapshot key dirty. Use `immediate: true` after important
 * local mutations so other devices see updates without waiting for the debounce.
 * @param {string} stateKey — must match a SYNC_SPECS key (e.g. 'projects', 'vendors')
 */
export function notifyWorkspaceKeyDirty(stateKey, immediate = false) {
  schedulePushKey(stateKey, immediate)
}

let lastWorkspacePullAt = 0
const WORKSPACE_PULL_THROTTLE_MS = 1200

/**
 * Pull latest workspace snapshots from Supabase and apply to local stores.
 * Throttled to avoid hammering the API on rapid visibility/pageshow events (mobile).
 */
export async function pullWorkspaceSnapshots() {
  if (typeof window === 'undefined') return
  if (!isSupabaseConfigured) return

  const now = Date.now()
  if (now - lastWorkspacePullAt < WORKSPACE_PULL_THROTTLE_MS) return

  const companyId = await getCompanyId()
  if (!companyId || bootstrappedCompanyId !== companyId) return

  let rows = []
  try {
    rows = await workspaceSnapshotsService.listForCurrentUser()
  } catch {
    return
  }

  lastWorkspacePullAt = Date.now()

  const rowMap = new Map((rows || []).map((r) => [r.state_key, r]))

  applyingRemote = true
  try {
    SYNC_SPECS.forEach((spec) => {
      const row = rowMap.get(spec.key)
      if (row?.payload != null && typeof row.payload === 'object' && !spec.isEmpty(row.payload)) {
        spec.apply(row.payload)
      }
    })
  } finally {
    applyingRemote = false
  }
}

/**
 * Pull latest workspace snapshots immediately (ignores throttle). Use when entering
 * a screen that must reflect cloud state (e.g. Profile contacts) without waiting for
 * visibilitychange / pageshow.
 */
export async function pullWorkspaceSnapshotsForced() {
  if (typeof window === 'undefined') return
  if (!isSupabaseConfigured) return

  const companyId = await getCompanyId()
  if (!companyId || bootstrappedCompanyId !== companyId) return

  lastWorkspacePullAt = 0
  await pullWorkspaceSnapshots()
}

let lifecycleSyncAttached = false

/** Coalesces concurrent flush calls (visibility hidden + pagehide + route change). */
let flushAllInFlight = null

async function flushPush(companyId, stateKey, payload) {
  if (!isSupabaseConfigured || !companyId) return
  try {
    await workspaceSnapshotsService.upsert(companyId, stateKey, payload)
  } catch {
    /* offline / RLS — keep local data */
  }
}

function schedulePushKey(stateKey, immediate = false) {
  void (async () => {
    const companyId = await getCompanyId()
    if (!companyId || bootstrappedCompanyId !== companyId) return

    const spec = SYNC_SPECS.find((s) => s.key === stateKey)
    if (!spec) return

    const run = async () => {
      const payload = spec.extract()
      await flushPush(companyId, stateKey, payload)
    }

    if (immediate) {
      const t = debounceTimers.get(stateKey)
      if (t) clearTimeout(t)
      debounceTimers.delete(stateKey)
      await run()
      return
    }

    if (debounceTimers.has(stateKey)) {
      clearTimeout(debounceTimers.get(stateKey))
    }
    debounceTimers.set(
      stateKey,
      setTimeout(() => {
        debounceTimers.delete(stateKey)
        void run()
      }, DEBOUNCE_MS),
    )
  })()
}

const SYNC_SPECS = [
  {
    key: 'projects',
    extract: () => ({ projects: useProjectStore.getState().projects || [] }),
    apply: (p) => {
      if (Array.isArray(p?.projects)) useProjectStore.setState({ projects: p.projects })
    },
    isEmpty: (p) => !Array.isArray(p?.projects) || p.projects.length === 0,
    subscribe: (cb) => useProjectStore.subscribe(cb),
  },
  {
    key: 'vendors',
    extract: () => ({ vendors: useVendorStore.getState().vendors || [] }),
    apply: (p) => {
      if (Array.isArray(p?.vendors)) useVendorStore.setState({ vendors: p.vendors })
    },
    isEmpty: (p) => !Array.isArray(p?.vendors) || p.vendors.length === 0,
    subscribe: (cb) => useVendorStore.subscribe(cb),
  },
  {
    key: 'rfqs',
    extract: () => {
      const s = useRfqStore.getState()
      return { rfqs: s.rfqs || [], receivedRfqs: s.receivedRfqs || [] }
    },
    apply: (p) => {
      const next = {}
      if (Array.isArray(p?.rfqs)) next.rfqs = p.rfqs
      if (Array.isArray(p?.receivedRfqs)) next.receivedRfqs = p.receivedRfqs
      if (Object.keys(next).length) useRfqStore.setState(next)
    },
    isEmpty: (p) =>
      (!Array.isArray(p?.rfqs) || p.rfqs.length === 0) &&
      (!Array.isArray(p?.receivedRfqs) || p.receivedRfqs.length === 0),
    subscribe: (cb) => useRfqStore.subscribe(cb),
  },
  {
    key: 'contracts',
    extract: () => ({ contracts: useContractStore.getState().contracts || [] }),
    apply: (p) => {
      if (Array.isArray(p?.contracts)) useContractStore.setState({ contracts: p.contracts })
    },
    isEmpty: (p) => !Array.isArray(p?.contracts) || p.contracts.length === 0,
    subscribe: (cb) => useContractStore.subscribe(cb),
  },
  {
    key: 'procurement',
    extract: () => {
      const s = useProcurementStore.getState()
      return { requisitions: s.requisitions || [], purchaseOrders: s.purchaseOrders || [] }
    },
    apply: (p) => {
      const next = {}
      if (Array.isArray(p?.requisitions)) next.requisitions = p.requisitions
      if (Array.isArray(p?.purchaseOrders)) next.purchaseOrders = p.purchaseOrders
      if (Object.keys(next).length) useProcurementStore.setState(next)
    },
    isEmpty: (p) =>
      (!Array.isArray(p?.requisitions) || p.requisitions.length === 0) &&
      (!Array.isArray(p?.purchaseOrders) || p.purchaseOrders.length === 0),
    subscribe: (cb) => useProcurementStore.subscribe(cb),
  },
  {
    key: 'cost',
    extract: () => zustandDataSlice(useCostStore.getState),
    apply: (p) => {
      if (p && typeof p === 'object') useCostStore.setState(p)
    },
    isEmpty: (p) =>
      !p ||
      ((!Array.isArray(p.products) || p.products.length === 0) &&
        (!Array.isArray(p.scenarios) || p.scenarios.length === 0)),
    subscribe: (cb) => useCostStore.subscribe(cb),
  },
  {
    key: 'enterprise',
    extract: () => zustandDataSlice(useEnterpriseStore.getState),
    apply: (p) => {
      if (p && typeof p === 'object') useEnterpriseStore.setState(p)
    },
    isEmpty: (p) => {
      if (!p || typeof p !== 'object') return true
      const arrays = Object.keys(p).filter((k) => Array.isArray(p[k]))
      if (arrays.length === 0) return false
      return arrays.every((k) => p[k].length === 0)
    },
    subscribe: (cb) => useEnterpriseStore.subscribe(cb),
  },
  {
    key: 'production',
    extract: () => zustandDataSlice(useProductionStore.getState),
    apply: (p) => {
      if (p && typeof p === 'object') useProductionStore.setState(p)
    },
    isEmpty: (p) => {
      if (!p || typeof p !== 'object') return true
      if (Array.isArray(p.oeeData) && p.oeeData.length > 0) return false
      if (Array.isArray(p.equipment) && p.equipment.length > 0) return false
      if (Array.isArray(p.fiveSAudits) && p.fiveSAudits.length > 0) return false
      return true
    },
    subscribe: (cb) => useProductionStore.subscribe(cb),
  },
  {
    key: 'templates',
    extract: () => ({ templates: useTemplateStore.getState().templates || [] }),
    apply: (p) => {
      if (Array.isArray(p?.templates)) useTemplateStore.setState({ templates: p.templates })
    },
    isEmpty: (p) => !Array.isArray(p?.templates) || p.templates.length === 0,
    subscribe: (cb) => useTemplateStore.subscribe(cb),
  },
  {
    key: 'audit_logs',
    extract: () => ({ logs: useAuditStore.getState().logs || [] }),
    apply: (p) => {
      if (Array.isArray(p?.logs)) useAuditStore.setState({ logs: p.logs })
    },
    isEmpty: (p) => !Array.isArray(p?.logs) || p.logs.length === 0,
    subscribe: (cb) => useAuditStore.subscribe(cb),
  },
  {
    key: 'hr_space',
    extract: () => zustandDataSlice(useHrSpaceStore.getState),
    apply: (p) => {
      if (!p || typeof p !== 'object') return
      const prev = useHrSpaceStore.getState()
      const next = { ...p }
      /* Blobs are not synced; cloud JSON often omits cvStoredFileId. Keep local IndexedDB ids when still valid. */
      if (Array.isArray(p.candidates) && Array.isArray(prev.candidates)) {
        const localById = new Map(prev.candidates.map((c) => [c.id, c]))
        next.candidates = p.candidates.map((c) => {
          const loc = localById.get(c.id)
          const hasRemote = c.cvStoredFileId != null && String(c.cvStoredFileId).trim() !== ''
          const hasLocal = loc?.cvStoredFileId != null && String(loc.cvStoredFileId).trim() !== ''
          if (!hasRemote && hasLocal) {
            return { ...c, cvStoredFileId: loc.cvStoredFileId, cvMimeType: c.cvMimeType || loc.cvMimeType || '' }
          }
          return c
        })
      }
      if (Array.isArray(p.talentPoolEntries) && Array.isArray(prev.talentPoolEntries)) {
        const localById = new Map(prev.talentPoolEntries.map((e) => [e.id, e]))
        next.talentPoolEntries = p.talentPoolEntries.map((e) => {
          const loc = localById.get(e.id)
          const hasRemote = e.cvStoredFileId != null && String(e.cvStoredFileId).trim() !== ''
          const hasLocal = loc?.cvStoredFileId != null && String(loc.cvStoredFileId).trim() !== ''
          if (!hasRemote && hasLocal) {
            return { ...e, cvStoredFileId: loc.cvStoredFileId, cvMimeType: e.cvMimeType || loc.cvMimeType || '' }
          }
          return e
        })
      }
      useHrSpaceStore.setState(next)
    },
    isEmpty: (p) => !p?.employees?.length && !p?.openPositions?.length,
    subscribe: (cb) => useHrSpaceStore.subscribe(cb),
  },
  {
    key: 'account_registry',
    extract: () => ({ accounts: useAccountRegistry.getState().accounts || [] }),
    apply: (p) => {
      if (Array.isArray(p?.accounts)) {
        useAccountRegistry.getState().hydrateFromCloudSync(p.accounts)
      }
    },
    isEmpty: (p) => !Array.isArray(p?.accounts) || p.accounts.length === 0,
    subscribe: (cb) => useAccountRegistry.subscribe(cb),
  },
  {
    key: 'profile_contacts',
    extract: () => readProfileContactsPayload(),
    apply: (p) => applyProfileContactsPayload(p),
    isEmpty: (p) => !Array.isArray(p?.contacts) || p.contacts.length === 0,
    subscribe: () => () => {},
  },
  {
    key: 'industry_prefs',
    extract: () => readIndustryPayload(),
    apply: (p) => applyIndustryPayload(p),
    isEmpty: (p) =>
      (!Array.isArray(p?.selectedIndustries) || p.selectedIndustries.length === 0) &&
      (!p?.selectedCategories || Object.keys(p.selectedCategories).length === 0),
    subscribe: (cb) => useIndustryStore.subscribe(cb),
  },
  {
    key: 'service_prefs',
    extract: () => readServicePayload(),
    apply: (p) => applyServicePayload(p),
    isEmpty: (p) => !Array.isArray(p?.selectedServices) || p.selectedServices.length === 0,
    subscribe: (cb) => useServiceStore.subscribe(cb),
  },
  {
    key: 'service_requests_workspace',
    extract: () => {
      const s = useServiceRequestStore.getState()
      return {
        requests: s.requests || [],
        notifications: s.notifications || [],
        globalNotifications: s.globalNotifications || [],
      }
    },
    apply: (p) => {
      const next = {}
      if (Array.isArray(p?.requests)) next.requests = p.requests
      if (Array.isArray(p?.notifications)) next.notifications = p.notifications
      if (Array.isArray(p?.globalNotifications)) next.globalNotifications = p.globalNotifications
      if (Object.keys(next).length) useServiceRequestStore.setState(next)
      try {
        if (next.requests) {
          localStorage.setItem(tenantKey('strefex-service-requests'), JSON.stringify(next.requests))
        }
        if (next.notifications) {
          localStorage.setItem(tenantKey('strefex-service-notifications'), JSON.stringify(next.notifications))
        }
        if (next.globalNotifications) {
          localStorage.setItem('strefex-service-notifications-global', JSON.stringify(next.globalNotifications))
        }
      } catch { /* silent */ }
    },
    isEmpty: (p) =>
      (!Array.isArray(p?.requests) || p.requests.length === 0) &&
      (!Array.isArray(p?.notifications) || p.notifications.length === 0) &&
      (!Array.isArray(p?.globalNotifications) || p.globalNotifications.length === 0),
    subscribe: (cb) => useServiceRequestStore.subscribe(cb),
  },
  {
    key: 'messenger',
    extract: () => {
      const s = useMessengerStore.getState()
      return {
        encryptionAtRest: !!s.encryptionAtRest,
        groups: s.groups || [],
        topics: s.topics || [],
        topicEdgeKinds: s.topicEdgeKinds && typeof s.topicEdgeKinds === 'object' ? s.topicEdgeKinds : {},
        topicTemplates: Array.isArray(s.topicTemplates) ? s.topicTemplates : [],
        taskBoards: s.taskBoards || [],
        conversations: s.conversations || [],
      }
    },
    apply: (p) => {
      if (!p || typeof p !== 'object') return
      const cur = useMessengerStore.getState()
      useMessengerStore.setState({
        encryptionAtRest: typeof p.encryptionAtRest === 'boolean' ? p.encryptionAtRest : cur.encryptionAtRest,
        groups: Array.isArray(p.groups) ? p.groups : cur.groups,
        topics: Array.isArray(p.topics) ? p.topics : cur.topics,
        topicEdgeKinds:
          p.topicEdgeKinds && typeof p.topicEdgeKinds === 'object' ? p.topicEdgeKinds : cur.topicEdgeKinds,
        topicTemplates:
          Array.isArray(p.topicTemplates) && p.topicTemplates.length > 0 ? p.topicTemplates : cur.topicTemplates,
        taskBoards: Array.isArray(p.taskBoards) ? p.taskBoards : cur.taskBoards,
        conversations: Array.isArray(p.conversations) ? p.conversations : cur.conversations,
      })
    },
    isEmpty: (p) => {
      if (!p) return true
      if (Array.isArray(p.groups) && p.groups.length > 0) return false
      if (Array.isArray(p.topics) && p.topics.length > 0) return false
      if (
        Array.isArray(p.conversations) &&
        p.conversations.some((c) => Array.isArray(c.messages) && c.messages.length > 0)
      ) {
        return false
      }
      if (
        Array.isArray(p.taskBoards) &&
        p.taskBoards.some((b) =>
          (b.columns || []).some((col) => Array.isArray(col.cards) && col.cards.length > 0),
        )
      ) {
        return false
      }
      return true
    },
    subscribe: (cb) => useMessengerStore.subscribe(cb),
  },
]

/**
 * Upload every workspace snapshot key to Supabase immediately (clears pending debounced pushes first).
 * Call on route changes, tab hide, or before unload so creates/edits are not lost if the user goes idle.
 */
export function flushPendingWorkspacePushes() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (flushAllInFlight) return flushAllInFlight

  flushAllInFlight = (async () => {
    try {
      if (!isSupabaseConfigured) return

      const companyId = await getCompanyId()
      if (!companyId || bootstrappedCompanyId !== companyId) return

      debounceTimers.forEach((t) => clearTimeout(t))
      debounceTimers.clear()

      await Promise.all(SYNC_SPECS.map((spec) => flushPush(companyId, spec.key, spec.extract())))
    } catch {
      /* offline / RLS */
    } finally {
      flushAllInFlight = null
    }
  })()

  return flushAllInFlight
}

function attachLifecycleSync() {
  if (typeof window === 'undefined' || lifecycleSyncAttached) return
  lifecycleSyncAttached = true

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      /* Flush first so edits made just before backgrounding upload before we merge remote (mobile Safari). */
      void flushPendingWorkspacePushes().finally(() => {
        void pullWorkspaceSnapshots()
      })
    } else {
      void flushPendingWorkspacePushes()
    }
  })
  window.addEventListener('pageshow', () => {
    void flushPendingWorkspacePushes().finally(() => {
      void pullWorkspaceSnapshots()
    })
  })
  window.addEventListener('pagehide', () => {
    void flushPendingWorkspacePushes()
  })
  window.addEventListener('beforeunload', () => {
    void flushPendingWorkspacePushes()
  })
}

function attachSubscribers() {
  SYNC_SPECS.forEach((spec) => {
    if (spec.key === 'profile_contacts') return
    const unsub = spec.subscribe(() => {
      if (applyingRemote) return
      schedulePushKey(spec.key)
    })
    unsubscribers.push(unsub)
  })
}

export function stopWorkspaceCloudSync() {
  debounceTimers.forEach((t) => clearTimeout(t))
  debounceTimers.clear()
  unsubscribers.forEach((u) => {
    try { u() } catch { /* */ }
  })
  unsubscribers = []
  bootstrappedCompanyId = null
  lastWorkspacePullAt = 0
}

/**
 * Call after tenant stores rehydrate (login). Idempotent per company session.
 */
export async function bootstrapWorkspaceCloudSync() {
  if (typeof window === 'undefined') return
  if (!isSupabaseConfigured) return

  const companyId = await getCompanyId()
  if (!companyId) return

  stopWorkspaceCloudSync()
  bootstrappedCompanyId = companyId

  let rows = []
  try {
    rows = await workspaceSnapshotsService.listForCurrentUser()
  } catch {
    bootstrappedCompanyId = null
    return
  }

  const rowMap = new Map((rows || []).map((r) => [r.state_key, r]))

  applyingRemote = true
  try {
    SYNC_SPECS.forEach((spec) => {
      const row = rowMap.get(spec.key)
      if (row?.payload != null && typeof row.payload === 'object' && !spec.isEmpty(row.payload)) {
        spec.apply(row.payload)
      }
    })
  } finally {
    applyingRemote = false
  }

  /* Seed cloud from local data when server has no meaningful row yet. */
  for (const spec of SYNC_SPECS) {
    const row = rowMap.get(spec.key)
    const hasCloud = row?.payload != null && typeof row.payload === 'object' && !spec.isEmpty(row.payload)
    if (!hasCloud) {
      const local = spec.extract()
      if (!spec.isEmpty(local)) {
        await flushPush(companyId, spec.key, local)
      }
    }
  }

  attachSubscribers()
  attachLifecycleSync()
}
