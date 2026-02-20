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

/** Extract company domain from email */
const getCompanyDomain = (email) => {
  if (!email) return ''
  return (email.split('@')[1] || '').toLowerCase()
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

let _nextId = Date.now()

export const useServiceRequestStore = create((set, get) => ({
  requests: load(STORAGE_KEY),
  notifications: load(NOTIF_KEY),

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
  }) => {
    const id = `SR-${new Date().getFullYear()}-${String(++_nextId).slice(-6)}`
    const request = {
      id,
      services,
      industryId,
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
    const updated = get().requests.map((r) =>
      r.id === requestId
        ? {
            ...r,
            status: 'assigned',
            assignedTo: assigneeEmail,
            assignedBy: assignerEmail,
            assignedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : r
    )
    save(STORAGE_KEY, updated)

    // Create notification for the assignee
    const req = updated.find((r) => r.id === requestId)
    const notif = {
      id: `SNOTIF-${String(++_nextId).slice(-6)}`,
      type: 'request_assigned',
      requestId,
      title: `Service request assigned to you`,
      message: `Request ${requestId} from ${req?.companyName || req?.contactName} has been assigned to you by ${assignerEmail}`,
      priority: req?.priority || 'Normal',
      fromEmail: assignerEmail,
      targetEmail: assigneeEmail,
      read: false,
      readBy: [],
      createdAt: new Date().toISOString(),
    }
    const updatedNotifs = [notif, ...get().notifications]
    save(NOTIF_KEY, updatedNotifs)

    set({ requests: updated, notifications: updatedNotifs })
  },

  /**
   * Update request status
   */
  updateRequestStatus: (requestId, status, note, updaterEmail) => {
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
    const updated = get().notifications.map((n) => {
      if (n.id !== notifId) return n
      const readBy = [...(n.readBy || [])]
      if (!readBy.includes(readerEmail)) readBy.push(readerEmail)
      return { ...n, read: true, readBy }
    })
    save(NOTIF_KEY, updated)
    set({ notifications: updated })
  },

  /**
   * Get unread notifications for admins/managers
   */
  getUnreadNotifications: (readerEmail) => {
    return get().notifications.filter(
      (n) => !(n.readBy || []).includes(readerEmail)
    )
  },

  /**
   * Get requests by user email
   */
  getRequestsByUser: (email) => {
    return get().requests.filter((r) => r.email === email)
  },

  /**
   * Get requests assigned to a specific person
   */
  getAssignedRequests: (email) => {
    return get().requests.filter((r) => r.assignedTo === email)
  },

  /**
   * Get all requests — ⚠️ RAW, only use in superadmin pages.
   */
  getAllRequests: () => get().requests,

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
