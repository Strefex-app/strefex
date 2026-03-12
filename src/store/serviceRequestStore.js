/**
 * Service Request Store — manages all service requests across tenants
 *
 * When a user submits a service request:
 *   1. It's stored here with status 'new'
 *   2. Notifications are generated for company admins & managers
 *   3. Admins/managers can assign, update status, and add notes
 *
 * Company isolation is enforced:
 *   - Each request carries _companyId to identify owning company
 *   - getSafeRequests() filters by the current user's company & role
 *   - No cross-company data leakage is possible via the safe methods
 *   - Superadmin can see all requests (platform level)
 */
import { create } from 'zustand'
import { getTenantId, getUserId, getUserRole, tenantKey } from '../utils/tenantStorage'

const STORAGE_KEY = 'strefex-service-requests'
const NOTIF_KEY = 'strefex-service-notifications'
const GLOBAL_NOTIF_KEY = 'strefex-service-notifications-global'

const load = (key) => {
  try {
    const raw = localStorage.getItem(tenantKey(key))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const save = (key, data) => {
  try {
    localStorage.setItem(tenantKey(key), JSON.stringify(data))
  } catch { /* silent */ }
}

const loadGlobal = () => {
  try {
    const raw = localStorage.getItem(GLOBAL_NOTIF_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveGlobal = (data) => {
  try {
    localStorage.setItem(GLOBAL_NOTIF_KEY, JSON.stringify(data))
  } catch { /* silent */ }
}

/** Extract company domain from email */
const getCompanyDomain = (email) => {
  if (!email) return ''
  return (email.split('@')[1] || '').toLowerCase()
}
const getTenantCompanyScope = (tenantId) => String(tenantId || '').split('::')[0].toLowerCase()

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

const dedupeById = (items) => {
  const map = new Map()
  ;(items || []).forEach((item) => {
    if (!item?.id) return
    if (!map.has(item.id)) map.set(item.id, item)
  })
  return [...map.values()]
}

const isAssignableAuditorOrServiceProvider = (email) => {
  const targetEmail = normalizeEmail(email)
  if (!targetEmail) return false
  const supportedTypes = new Set(['auditor', 'service_provider'])
  try {
    const rows = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key === 'strefex-account-registry' || key.startsWith('strefex-account-registry::')) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) rows.push(...parsed)
      }
    }
    return rows.some((acct) => {
      const accountType = String(acct?.accountType || '').toLowerCase()
      if (!supportedTypes.has(accountType)) return false
      if (normalizeEmail(acct?.email) === targetEmail) return true
      return Array.isArray(acct?.teamMembers) && acct.teamMembers.some((tm) => normalizeEmail(tm?.email) === targetEmail)
    })
  } catch {
    return false
  }
}

/**
 * Filter service requests by the current user's company & role.
 */
function filterBySafe(list) {
  const role = getUserRole()
  const userId = getUserId()
  const companyId = getTenantId()

  // Superadmin and external auditor see all requests
  if (role === 'superadmin' || role === 'auditor_external') return list

  const companyFiltered = list.filter((r) =>
    (r._companyId || getCompanyDomain(r.email)) === companyId
  )

  // Admin, internal auditor, and manager see all company requests
  if (role === 'admin' || role === 'auditor_internal' || role === 'manager') return companyFiltered

  return companyFiltered.filter((r) =>
    (r.email || '').toLowerCase() === userId ||
    (r.assignedTo || '').toLowerCase() === userId
  )
}

function canManageRequest(request) {
  const role = getUserRole()
  const userId = getUserId()
  const companyId = getTenantId()
  if (!request) return false
  if (role === 'superadmin') return true
  const requestCompany = request._companyId || getCompanyDomain(request.email)
  if (requestCompany !== companyId) return false
  if (role === 'admin' || role === 'manager') return true
  return String(request.assignedTo || '').toLowerCase() === userId
}

let _nextId = Date.now()

export const useServiceRequestStore = create((set, get) => ({
  requests: load(STORAGE_KEY),
  notifications: load(NOTIF_KEY),
  globalNotifications: loadGlobal(),

  canEditServiceRequest: () => {
    const r = getUserRole()
    return r !== 'auditor_internal' && r !== 'auditor_external' && r !== 'guest'
  },
  isReadOnly: () => {
    const r = getUserRole()
    return r === 'auditor_internal' || r === 'auditor_external'
  },

  /**
   * Submit a new service request (called by the user from ServiceList)
   */
  submitRequest: ({
    services,
    industryId,
    industryLabel,
    companyName,
    contactName,
    email,
    phone,
    address,
    preferredDate,
    priority,
    description,
    notes,
    attachmentNames,
    accountType,
    serviceCategoryId,
    serviceCategoryLabel,
    preferredProviderId,
    preferredProviderName,
    preferredProviderEmail,
    requestSource,
  }) => {
    const id = `SR-${new Date().getFullYear()}-${String(++_nextId).slice(-6)}`
    const request = {
      id,
      services,
      industryId,
      industryLabel: industryLabel || null,
      companyName,
      contactName,
      email,
      phone,
      address,
      preferredDate,
      priority,
      description,
      notes,
      attachmentNames: attachmentNames || [],
      accountType: accountType || 'unknown',
      serviceCategoryId: serviceCategoryId || null,
      serviceCategoryLabel: serviceCategoryLabel || null,
      preferredProviderId: preferredProviderId || null,
      preferredProviderName: preferredProviderName || null,
      preferredProviderEmail: preferredProviderEmail || null,
      requestSource: requestSource || null,
      _companyId: getTenantId(),
      _createdBy: getUserId(),
      status: 'new', // new | assigned | in_progress | completed | cancelled
      assignedTo: null, // email of assigned manager/admin
      assignedBy: null, // email of admin who assigned
      assignedAt: null,
      adminNotes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const updated = [request, ...get().requests]
    save(STORAGE_KEY, updated)

    // Create notification for admins/managers
    const notif = {
      id: `SNOTIF-${String(_nextId).slice(-6)}`,
      type: 'new_service_request',
      requestId: id,
      requestCompanyId: request._companyId,
      requestCompanyDomain: getCompanyDomain(email),
      title: `New Service Request from ${companyName || contactName}`,
      message: `${services.length} service(s) requested: ${services.join(', ')}`,
      priority,
      fromEmail: email,
      fromName: contactName,
      fromCompany: companyName,
      read: false,
      readBy: [], // emails of people who have read it
      createdAt: new Date().toISOString(),
    }
    const updatedNotifs = [notif, ...get().notifications]
    save(NOTIF_KEY, updatedNotifs)

    set({ requests: updated, notifications: updatedNotifs })
    return request
  },

  /**
   * Assign a service request to a manager or user
   */
  assignRequest: (requestId, assigneeEmail, assignerEmail) => {
    const targetAssignee = normalizeEmail(assigneeEmail)
    const current = get().requests.find((r) => r.id === requestId)
    if (!canManageRequest(current)) return
    const updated = get().requests.map((r) =>
      r.id === requestId
        ? {
            ...r,
            status: 'assigned',
            assignedTo: targetAssignee,
            assignedBy: assignerEmail,
            assignedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : r
    )
    save(STORAGE_KEY, updated)

    // Create notification for the assignee
    const req = updated.find((r) => r.id === requestId)
    const reqCategory = String(req?.serviceCategoryId || '').toLowerCase()
    const isAuditRequest = reqCategory === 'supplier-audit' || (req?.services || []).some((s) => String(s || '').toLowerCase().includes('audit'))
    const isAuditorOrServiceProvider = isAssignableAuditorOrServiceProvider(targetAssignee)
    const notif = {
      id: `SNOTIF-${String(++_nextId).slice(-6)}`,
      type: isAuditRequest && isAuditorOrServiceProvider ? 'audit_request_assigned' : 'request_assigned',
      requestId,
      requestCompanyId: req?._companyId || null,
      requestCompanyDomain: getCompanyDomain(req?.email),
      title: isAuditRequest ? 'Audit request assigned to you' : 'Service request assigned to you',
      message: `Request ${requestId} from ${req?.companyName || req?.contactName} has been assigned to you by ${assignerEmail}`,
      priority: req?.priority || 'Normal',
      fromEmail: assignerEmail,
      targetEmail: targetAssignee,
      read: false,
      readBy: [],
      createdAt: new Date().toISOString(),
    }
    const updatedNotifs = [notif, ...get().notifications]
    save(NOTIF_KEY, updatedNotifs)
    const updatedGlobalNotifs = dedupeById([notif, ...get().globalNotifications])
    saveGlobal(updatedGlobalNotifs)

    set({ requests: updated, notifications: updatedNotifs, globalNotifications: updatedGlobalNotifs })
  },

  /**
   * Update request status
   */
  updateRequestStatus: (requestId, status, note, updaterEmail) => {
    const current = get().requests.find((r) => r.id === requestId)
    if (!canManageRequest(current)) return
    const updated = get().requests.map((r) => {
      if (r.id !== requestId) return r
      const adminNotes = [...(r.adminNotes || [])]
      if (note) {
        adminNotes.push({
          text: note,
          by: updaterEmail,
          at: new Date().toISOString(),
        })
      }
      return { ...r, status, adminNotes, updatedAt: new Date().toISOString() }
    })
    save(STORAGE_KEY, updated)
    set({ requests: updated })
  },

  /**
   * Add admin note to a request
   */
  addNote: (requestId, note, authorEmail) => {
    const current = get().requests.find((r) => r.id === requestId)
    if (!canManageRequest(current)) return
    const updated = get().requests.map((r) => {
      if (r.id !== requestId) return r
      const adminNotes = [...(r.adminNotes || []), {
        text: note,
        by: authorEmail,
        at: new Date().toISOString(),
      }]
      return { ...r, adminNotes, updatedAt: new Date().toISOString() }
    })
    save(STORAGE_KEY, updated)
    set({ requests: updated })
  },

  /**
   * Mark notification as read
   */
  markNotificationRead: (notifId, readerEmail) => {
    const normalizedReader = normalizeEmail(readerEmail)
    const updated = get().notifications.map((n) => {
      if (n.id !== notifId) return n
      const readBy = [...(n.readBy || [])]
      if (!readBy.includes(normalizedReader)) readBy.push(normalizedReader)
      return { ...n, read: true, readBy }
    })
    const updatedGlobal = get().globalNotifications.map((n) => {
      if (n.id !== notifId) return n
      const readBy = [...(n.readBy || [])]
      if (!readBy.includes(normalizedReader)) readBy.push(normalizedReader)
      return { ...n, read: true, readBy }
    })
    save(NOTIF_KEY, updated)
    saveGlobal(updatedGlobal)
    set({ notifications: updated, globalNotifications: updatedGlobal })
  },

  /**
   * Get unread notifications for admins/managers
   */
  getUnreadNotifications: (readerEmail) => {
    const normalizedReader = normalizeEmail(readerEmail)
    return get().getSafeNotifications().filter(
      (n) => !(n.readBy || []).includes(normalizedReader)
    )
  },

  /**
   * Get requests by user email
   */
  getRequestsByUser: (email) => {
    return filterBySafe(get().requests).filter((r) => r.email === email)
  },

  /**
   * Get requests assigned to a specific person
   */
  getAssignedRequests: (email) => {
    return filterBySafe(get().requests).filter((r) => r.assignedTo === email)
  },

  /**
   * Get all requests — ⚠️ RAW, only use in superadmin pages.
   */
  getAllRequests: () => get().requests,
  getSafeNotifications: () => {
    const role = getUserRole()
    const userId = getUserId()
    const normalizedUserId = normalizeEmail(userId)
    const companyId = getTenantId()
    const companyScope = getTenantCompanyScope(companyId)
    const all = get().notifications
    const globalAll = get().globalNotifications || []
    const globalDirect = (get().globalNotifications || []).filter(
      (n) => normalizeEmail(n.targetEmail) === normalizedUserId
    )
    if (role === 'superadmin' || role === 'auditor_external') return dedupeById([...all, ...globalAll])
    const directlyAssigned = all.filter((n) => normalizeEmail(n.targetEmail) === normalizedUserId)
    const companyFiltered = all.filter((n) => {
      const fromDomain = getCompanyDomain(n.fromEmail || '')
      const targetDomain = getCompanyDomain(n.targetEmail || '')
      const requestDomain = String(n.requestCompanyDomain || '').toLowerCase()
      const requestCompanyId = String(n.requestCompanyId || '').toLowerCase()
      return (
        fromDomain === companyScope ||
        targetDomain === companyScope ||
        requestDomain === companyScope ||
        requestCompanyId === String(companyId || '').toLowerCase()
      )
    })
    if (role === 'admin' || role === 'manager' || role === 'auditor_internal') {
      return dedupeById([...directlyAssigned, ...companyFiltered, ...globalDirect])
    }
    return dedupeById([...directlyAssigned, ...globalDirect])
  },

  /**
   * SAFE — returns only requests the current user is allowed to see
   * based on their company & role hierarchy.
   */
  getSafeRequests: () => filterBySafe(get().requests),

  /**
   * Get safe request stats (filtered by company & role)
   */
  getStats: () => {
    const all = filterBySafe(get().requests)
    return {
      total: all.length,
      new: all.filter((r) => r.status === 'new').length,
      assigned: all.filter((r) => r.status === 'assigned').length,
      inProgress: all.filter((r) => r.status === 'in_progress').length,
      completed: all.filter((r) => r.status === 'completed').length,
      cancelled: all.filter((r) => r.status === 'cancelled').length,
    }
  },
}))
