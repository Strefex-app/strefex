/**
 * Transaction Store — records all financial transactions
 *
 * Multi-level approval flow for plan upgrades:
 *   1. Regular user requests upgrade    → status: 'requested'
 *   2. Company admin approves request   → status: 'company_approved'
 *   3. Company admin completes payment  → status: 'pending_platform_approval'
 *   4. STREFEX superuser approves       → status: 'paid'  (plan activated)
 *
 * Each transaction carries `companyDomain` for company-level data isolation.
 * Only the STREFEX superuser can see transactions across all companies.
 *
 * Service payment transactions can be assigned to STREFEX team members
 * by the superuser so the work gets tracked and fulfilled.
 */
import { create } from 'zustand'
import { getLegacyTenantIds, getTenantId, getUserId, getUserRole, tenantKey } from '../utils/tenantStorage'
import { isSupabaseConfigured, transactionsService } from '../services/supabaseService'

const STORAGE_KEY = 'strefex-transactions'

const loadTransactions = () => {
  try {
    const scopedKey = tenantKey(STORAGE_KEY)
    const raw = localStorage.getItem(scopedKey)
    if (raw) return JSON.parse(raw)
    const legacyTenantIds = getLegacyTenantIds()
    for (let i = 0; i < legacyTenantIds.length; i += 1) {
      const legacyRaw = localStorage.getItem(`${STORAGE_KEY}::${legacyTenantIds[i]}`)
      if (legacyRaw) return JSON.parse(legacyRaw)
    }
    return []
  } catch {
    return []
  }
}

const persistTx = (transactions) => {
  try {
    localStorage.setItem(tenantKey(STORAGE_KEY), JSON.stringify(transactions))
  } catch { /* silent */ }
}

const getAuthSnapshot = () => {
  try {
    return JSON.parse(localStorage.getItem('strefex-auth') || '{}')
  } catch {
    return {}
  }
}

const getAuthCompanyId = () => getAuthSnapshot()?.tenant?.id || null
const getAuthUserDbId = () => getAuthSnapshot()?.user?.id || null

const toDbTransactionPayload = (tx) => ({
  company_id: getAuthCompanyId(),
  created_by: getAuthUserDbId(),
  invoice_id: tx?.invoiceId || null,
  type: tx?.type || null,
  service: tx?.service || null,
  amount: Number(tx?.amount || 0),
  method: tx?.method || null,
  status: tx?.status || null,
  user_email: (tx?.userEmail || '').toLowerCase(),
  company_name: tx?.companyName || null,
  account_type: tx?.accountType || null,
  requested_by: (tx?.requestedBy || '').toLowerCase(),
  plan_from: tx?.planFrom || null,
  plan_to: tx?.planTo || null,
  task_status: tx?.taskStatus || null,
  assigned_to: (tx?.assignedTo || '').toLowerCase() || null,
  assigned_by: (tx?.assignedBy || '').toLowerCase() || null,
  assigned_at: tx?.assignedAt || null,
  approved_by: tx?.platformApprovedBy || tx?.companyApprovedBy || null,
  approved_at: tx?.platformApprovedAt || tx?.companyApprovedAt || null,
  rejection_reason: tx?.rejectionReason || null,
  rejected_by: tx?.rejectedBy || null,
  paid_by: tx?.paidBy || null,
  paid_at: tx?.paidAt || null,
  metadata: {
    local_id: tx?.id || null,
    company_domain: tx?.companyDomain || getCompanyDomain(tx?.userEmail),
    platform_approved_by: tx?.platformApprovedBy || null,
    platform_approved_at: tx?.platformApprovedAt || null,
    company_approved_by: tx?.companyApprovedBy || null,
    company_approved_at: tx?.companyApprovedAt || null,
  },
  created_at: tx?.date || null,
  updated_at: tx?.updatedAt || new Date().toISOString(),
})

const syncTransactionsToDatabase = async (transactions) => {
  if (!isSupabaseConfigured) return
  const companyId = getAuthCompanyId()
  if (!companyId) return
  const rows = Array.isArray(transactions) ? transactions : []
  for (let i = 0; i < rows.length; i += 1) {
    const payload = toDbTransactionPayload(rows[i])
    if (!payload.company_id) continue
    try {
      const existing = await transactionsService.list(companyId, {
        limit: 1,
        filters: [['metadata->>local_id', 'eq', String(rows[i]?.id || '')]],
      })
      const match = Array.isArray(existing) ? existing[0] : null
      if (match?.id) {
        await transactionsService.update(match.id, payload)
      } else {
        await transactionsService.create(payload)
      }
    } catch {
      // local-first fallback
    }
  }
}

const persistAndSync = (transactions) => {
  persistTx(transactions)
  void syncTransactionsToDatabase(transactions)
}

/** Extract company domain from email (e.g. user@acme.com → acme.com) */
export const getCompanyDomain = (email) => {
  if (!email) return ''
  const parts = email.split('@')
  return (parts[1] || '').toLowerCase()
}

/**
 * Filter transactions by the current user's company & role.
 * Prevents cross-company data leakage.
 *   - superadmin: sees ALL transactions (platform level)
 *   - admin:      sees all COMPANY transactions
 *   - manager:    sees all COMPANY transactions
 *   - user:       sees only THEIR OWN transactions
 */
function filterByCurrentCompanyRole(txList) {
  const role = getUserRole()
  const userId = getUserId()
  const companyId = getTenantId()
  const currentDomain = getCompanyDomain(userId)

  // Superadmin and external auditor see all transactions
  if (role === 'superadmin' || role === 'auditor_external') return txList

  // Filter to current company first
  const companyTxs = txList.filter((tx) => {
    const txCompany = tx.companyDomain || getCompanyDomain(tx.userEmail) || ''
    return txCompany === companyId || txCompany === currentDomain || tx._companyId === companyId
  })

  // Admin, internal auditor, and manager see all company transactions
  if (role === 'admin' || role === 'auditor_internal' || role === 'manager') return companyTxs

  // Regular user — only own transactions
  return companyTxs.filter((tx) =>
    (tx.userEmail || '').toLowerCase() === userId ||
    (tx.requestedBy || '').toLowerCase() === userId
  )
}

function canMutateWithinCompany(tx) {
  const role = getUserRole()
  const companyId = getTenantId()
  const currentDomain = getCompanyDomain(getUserId())
  if (!tx) return false
  if (role === 'superadmin') return true
  if (role === 'auditor_internal' || role === 'auditor_external' || role === 'guest') return false
  const txCompany = tx.companyDomain || getCompanyDomain(tx.userEmail) || tx._companyId || ''
  return txCompany === companyId || txCompany === currentDomain || tx._companyId === companyId
}

function canRunCompanyApproval(tx) {
  const role = getUserRole()
  return (role === 'admin' || role === 'superadmin') && canMutateWithinCompany(tx)
}

let _nextId = Date.now()

export const useTransactionStore = create((set, get) => ({
  transactions: loadTransactions(),

  /* ═══════════════════════════════════════════════════════════
   *  CREATE TRANSACTION
   * ═══════════════════════════════════════════════════════════ */

  /**
   * Record a new transaction.
   * @param {Object} tx
   * @param {string} tx.type - 'plan_upgrade' | 'plan_downgrade' | 'service_payment' | 'subscription_renewal'
   * @param {string} tx.service - Description of what was purchased
   * @param {number} tx.amount - Amount in USD (0 for free plan)
   * @param {string} tx.method - Payment method ('card', 'bank', 'paypal', 'crypto-btc', 'stripe', 'free', 'platform', '')
   * @param {string} tx.status - See multi-level flow above
   * @param {string} tx.userEmail - Who initiated the transaction
   * @param {string} tx.companyName - Company name
   * @param {string} [tx.planFrom] - Previous plan (for upgrades/downgrades)
   * @param {string} [tx.planTo] - New plan (for upgrades/downgrades)
   * @param {string} [tx.accountType] - buyer/seller/service_provider
   * @param {string} [tx.requestedBy] - Email of user who requested (for user-initiated requests)
   */
  addTransaction: (tx) => {
    const id = `TXN-${new Date().getFullYear()}-${String(++_nextId).slice(-6)}`
    const newTx = {
      id,
      invoiceId: `INV-${new Date().getFullYear()}-${String(_nextId).slice(-4)}`,
      date: new Date().toISOString(),
      companyDomain: tx.companyDomain || getCompanyDomain(tx.userEmail),
      _companyId: getTenantId(),
      _createdBy: getUserId(),
      // Task assignment fields (for service payments)
      taskStatus: tx.type === 'service_payment' ? 'unassigned' : null,
      assignedTo: null,
      assignedBy: null,
      assignedAt: null,
      ...tx,
    }
    const updated = [newTx, ...get().transactions]
    persistAndSync(updated)
    set({ transactions: updated })
    return newTx
  },

  /** Update transaction status generically. */
  updateTransactionStatus: (txId, status) => {
    const current = get().transactions.find((tx) => tx.id === txId)
    if (!canMutateWithinCompany(current)) return null
    const updated = get().transactions.map((tx) =>
      tx.id === txId ? { ...tx, status, updatedAt: new Date().toISOString() } : tx
    )
    persistAndSync(updated)
    set({ transactions: updated })
    return updated.find((tx) => tx.id === txId) || null
  },

  /* ═══════════════════════════════════════════════════════════
   *  SERVICE PAYMENT TASK MANAGEMENT
   * ═══════════════════════════════════════════════════════════ */

  assignTask: (txId, assigneeEmail, assigneeName, assignerEmail) => {
    if (getUserRole() !== 'superadmin') return null
    const updated = get().transactions.map((tx) =>
      tx.id === txId
        ? {
            ...tx,
            taskStatus: 'assigned',
            assignedTo: assigneeEmail,
            assignedToName: assigneeName || assigneeEmail,
            assignedBy: assignerEmail,
            assignedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : tx
    )
    persistAndSync(updated)
    set({ transactions: updated })
    return updated.find((tx) => tx.id === txId) || null
  },

  updateTaskStatus: (txId, taskStatus) => {
    const role = getUserRole()
    const userId = getUserId()
    const current = get().transactions.find((tx) => tx.id === txId)
    if (!current) return null
    const isAssignee = String(current.assignedTo || '').toLowerCase() === userId
    const canManage = role === 'superadmin' || ((role === 'admin' || role === 'manager') && canMutateWithinCompany(current))
    if (!isAssignee && !canManage) return null
    const updated = get().transactions.map((tx) =>
      tx.id === txId ? { ...tx, taskStatus, updatedAt: new Date().toISOString() } : tx
    )
    persistAndSync(updated)
    set({ transactions: updated })
    return updated.find((tx) => tx.id === txId) || null
  },

  getUnassignedServiceTasks: () =>
    get().transactions.filter(
      (tx) => tx.type === 'service_payment' && (!tx.taskStatus || tx.taskStatus === 'unassigned')
    ),

  getAssignedTasks: (email) =>
    get().transactions.filter(
      (tx) => tx.type === 'service_payment' && tx.assignedTo === email
    ),

  getAllServiceTasks: () =>
    get().transactions.filter((tx) => tx.type === 'service_payment'),

  /* ═══════════════════════════════════════════════════════════
   *  MULTI-LEVEL PLAN UPGRADE APPROVAL
   * ═══════════════════════════════════════════════════════════ */

  /**
   * Step 1 — Company admin approves a user's upgrade request.
   * requested → company_approved
   */
  companyApprovePlan: (txId, adminEmail) => {
    const current = get().transactions.find((tx) => tx.id === txId)
    if (!canRunCompanyApproval(current)) return null
    let result = null
    const updated = get().transactions.map((tx) => {
      if (tx.id !== txId) return tx
      result = {
        ...tx,
        status: 'company_approved',
        companyApprovedBy: adminEmail,
        companyApprovedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return result
    })
    persistAndSync(updated)
    set({ transactions: updated })
    return result
  },

  /**
   * Step 1b — Company admin rejects a user's upgrade request.
   * requested → rejected_by_company
   */
  companyRejectPlan: (txId, adminEmail, reason) => {
    const current = get().transactions.find((tx) => tx.id === txId)
    if (!canRunCompanyApproval(current)) return null
    const updated = get().transactions.map((tx) =>
      tx.id === txId
        ? {
            ...tx,
            status: 'rejected_by_company',
            rejectedBy: adminEmail,
            rejectionReason: reason || '',
            updatedAt: new Date().toISOString(),
          }
        : tx
    )
    persistAndSync(updated)
    set({ transactions: updated })
    return updated.find((tx) => tx.id === txId) || null
  },

  /**
   * Step 2 — Company admin has paid; mark the transaction accordingly.
   * company_approved → pending_platform_approval
   * (Also used for admin-initiated upgrades that go straight to pending_platform_approval.)
   */
  markPlanPaid: (txId, adminEmail, method) => {
    const current = get().transactions.find((tx) => tx.id === txId)
    if (!canRunCompanyApproval(current)) return null
    let result = null
    const updated = get().transactions.map((tx) => {
      if (tx.id !== txId) return tx
      result = {
        ...tx,
        status: 'pending_platform_approval',
        method: method || tx.method,
        paidBy: adminEmail,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return result
    })
    persistAndSync(updated)
    set({ transactions: updated })
    return result
  },

  /**
   * Step 3 — STREFEX superuser approves the paid subscription.
   * pending_platform_approval | pending_approval → paid  (plan activated)
   */
  platformApprovePlan: (txId, superadminEmail) => {
    if (getUserRole() !== 'superadmin') return null
    let result = null
    const updated = get().transactions.map((tx) => {
      if (tx.id !== txId) return tx
      result = {
        ...tx,
        status: 'paid',
        platformApprovedBy: superadminEmail,
        platformApprovedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return result
    })
    persistAndSync(updated)
    set({ transactions: updated })
    return result
  },

  /**
   * Step 3b — STREFEX superuser rejects.
   * → rejected_by_platform
   */
  platformRejectPlan: (txId, superadminEmail, reason) => {
    if (getUserRole() !== 'superadmin') return null
    const updated = get().transactions.map((tx) =>
      tx.id === txId
        ? {
            ...tx,
            status: 'rejected_by_platform',
            rejectedBy: superadminEmail,
            rejectionReason: reason || '',
            updatedAt: new Date().toISOString(),
          }
        : tx
    )
    persistAndSync(updated)
    set({ transactions: updated })
    return updated.find((tx) => tx.id === txId) || null
  },

  /* ── Backward-compat aliases (used by SuperAdminDashboard) ── */

  approvePlanPayment: (txId, approverEmail) =>
    get().platformApprovePlan(txId, approverEmail),

  rejectPlanPayment: (txId, rejecterEmail, reason) =>
    get().platformRejectPlan(txId, rejecterEmail, reason),

  getPendingPlanApprovals: () =>
    get().transactions.filter(
      (tx) =>
        tx.type === 'plan_upgrade' &&
        (tx.status === 'pending_approval' || tx.status === 'pending_platform_approval')
    ),

  /* ═══════════════════════════════════════════════════════════
   *  COMPANY-SCOPED QUERIES
   * ═══════════════════════════════════════════════════════════ */

  /** All transactions for a specific company domain. */
  getCompanyTransactions: (domain) => {
    if (!domain) return []
    const d = domain.toLowerCase()
    return get().transactions.filter(
      (tx) => (tx.companyDomain || getCompanyDomain(tx.userEmail)) === d
    )
  },

  /** Upgrade requests awaiting company admin approval (for a domain). */
  getCompanyPendingRequests: (domain) => {
    if (!domain) return []
    const d = domain.toLowerCase()
    return get().transactions.filter(
      (tx) =>
        tx.type === 'plan_upgrade' &&
        tx.status === 'requested' &&
        (tx.companyDomain || getCompanyDomain(tx.userEmail)) === d
    )
  },

  /** Company-approved upgrades awaiting admin payment (for a domain). */
  getCompanyApprovedAwaitingPayment: (domain) => {
    if (!domain) return []
    const d = domain.toLowerCase()
    return get().transactions.filter(
      (tx) =>
        tx.type === 'plan_upgrade' &&
        tx.status === 'company_approved' &&
        (tx.companyDomain || getCompanyDomain(tx.userEmail)) === d
    )
  },

  /** Paid by company, awaiting STREFEX approval (for a domain). */
  getCompanyPendingPlatformApproval: (domain) => {
    if (!domain) return []
    const d = domain.toLowerCase()
    return get().transactions.filter(
      (tx) =>
        tx.type === 'plan_upgrade' &&
        (tx.status === 'pending_platform_approval' || tx.status === 'pending_approval') &&
        (tx.companyDomain || getCompanyDomain(tx.userEmail)) === d
    )
  },

  /** ALL pending platform approvals across companies (for STREFEX superuser). */
  getAllPendingPlatformApprovals: () =>
    get().transactions.filter(
      (tx) =>
        tx.type === 'plan_upgrade' &&
        (tx.status === 'pending_platform_approval' || tx.status === 'pending_approval')
    ),

  /* ═══════════════════════════════════════════════════════════
   *  GENERAL QUERIES
   * ═══════════════════════════════════════════════════════════ */

  getTransactionsByUser: (email) =>
    get().transactions.filter((tx) => tx.userEmail === email),

  canEditTransaction: () => {
    const r = getUserRole()
    return r !== 'auditor_internal' && r !== 'auditor_external' && r !== 'guest'
  },
  isReadOnly: () => {
    const r = getUserRole()
    return r === 'auditor_internal' || r === 'auditor_external'
  },

  /** ⚠️  RAW — only use in superadmin pages. Use getSafeTransactions() elsewhere. */
  getAllTransactions: () => get().transactions,

  /**
   * SAFE — returns only transactions the current user is allowed to see
   * based on their company & role hierarchy. Use this in all non-superadmin UIs.
   */
  getSafeTransactions: () => filterByCurrentCompanyRole(get().transactions),

  getTotalRevenue: () =>
    filterByCurrentCompanyRole(get().transactions)
      .filter((tx) => tx.status === 'paid')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0),

  getPendingPayments: () =>
    filterByCurrentCompanyRole(get().transactions).filter(
      (tx) =>
        tx.status === 'pending' ||
        tx.status === 'pending_platform_approval' ||
        tx.status === 'pending_approval' ||
        tx.status === 'requested' ||
        tx.status === 'company_approved'
    ),
}))
