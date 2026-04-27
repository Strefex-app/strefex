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
import { getLegacyTenantIds, getTenantId, getUserId, getUserRole, tenantKey } from '../utils/tenantStorage'
import { isSupabaseConfigured, notificationsService, serviceRequestsService } from '../services/supabaseService'

const STORAGE_KEY = 'strefex-service-requests'
const NOTIF_KEY = 'strefex-service-notifications'
const GLOBAL_NOTIF_KEY = 'strefex-service-notifications-global'

const load = (key) => {
  try {
    const canonicalKey = tenantKey(key)
    const raw = localStorage.getItem(canonicalKey)
    if (raw) return JSON.parse(raw)
    const legacyTenantIds = getLegacyTenantIds()
    for (let i = 0; i < legacyTenantIds.length; i += 1) {
      const legacyRaw = localStorage.getItem(`${key}::${legacyTenantIds[i]}`)
      if (legacyRaw) return JSON.parse(legacyRaw)
    }
    return []
  } catch {
    return []
  }
}

const save = (key, data) => {
  try {
    localStorage.setItem(tenantKey(key), JSON.stringify(data))
  } catch { /* silent */ }
}

const saveByFullKey = (fullKey, data) => {
  try {
    localStorage.setItem(fullKey, JSON.stringify(data))
  } catch { /* silent */ }
}

const loadGlobal = () => {
  try {
    const raw = localStorage.getItem(GLOBAL_NOTIF_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const globalRows = Array.isArray(parsed) ? parsed : []

    // Backfill older assignment notifications from tenant-scoped keys
    // so previously sent assignments can still appear for assignees.
    const migrated = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(`${NOTIF_KEY}::`)) continue
      try {
        const tenantRaw = localStorage.getItem(key)
        const tenantRows = tenantRaw ? JSON.parse(tenantRaw) : []
        if (!Array.isArray(tenantRows)) continue
        tenantRows.forEach((n) => {
          const type = String(n?.type || '').toLowerCase()
          const hasTarget = Boolean(normalizeEmail(n?.targetEmail))
          if ((type === 'request_assigned' || type === 'audit_request_assigned') && hasTarget) {
            migrated.push(n)
          }
        })
      } catch {
        // Ignore malformed tenant notification buckets.
      }
    }
    const merged = dedupeById([...globalRows, ...migrated])
    if (merged.length !== globalRows.length) {
      saveGlobal(merged)
    }
    return merged
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

let _refreshTimer = null
let _refreshStorageListener = null
let _refreshFocusListener = null
let _refreshVisibilityListener = null
/** Single-flight: overlapping refreshFromDatabase calls share one Supabase round-trip. */
let _refreshDbInFlight = null

/** Polling interval while the tab is visible (hidden tabs pause interval to save battery & network). */
const SERVICE_REQUEST_POLL_MS_VISIBLE = 12000

const stripStorageMeta = (request) => {
  const next = { ...request }
  delete next._storageKey
  return next
}

const loadRequestsByRole = () => {
  const role = getUserRole()
  const scopedKey = tenantKey(STORAGE_KEY)
  const canSeeAllTenants = role === 'superadmin' || role === 'auditor_external'

  if (!canSeeAllTenants) {
    const scoped = load(STORAGE_KEY)
    return scoped.map((r) => ({ ...r, _storageKey: scopedKey }))
  }

  const merged = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(`${STORAGE_KEY}::`)) continue
    try {
      const raw = localStorage.getItem(key)
      const rows = raw ? JSON.parse(raw) : []
      if (!Array.isArray(rows)) continue
      rows.forEach((row) => merged.push({ ...row, _storageKey: key }))
    } catch {
      // ignore malformed tenant buckets
    }
  }

  return dedupeById(merged)
}

const loadNotificationsByRole = () => {
  const role = getUserRole()
  const scopedKey = tenantKey(NOTIF_KEY)
  const canSeeAllTenants = role === 'superadmin' || role === 'auditor_external'
  if (!canSeeAllTenants) return load(NOTIF_KEY)
  const merged = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(`${NOTIF_KEY}::`)) continue
    try {
      const raw = localStorage.getItem(key)
      const rows = raw ? JSON.parse(raw) : []
      if (!Array.isArray(rows)) continue
      rows.forEach((row) => merged.push({ ...row, _storageKey: key }))
    } catch {
      // ignore malformed tenant buckets
    }
  }
  if (merged.length === 0) return load(NOTIF_KEY).map((n) => ({ ...n, _storageKey: scopedKey }))
  return dedupeById(merged)
}

const persistReadFlagAcrossTenantNotifBuckets = (notifId, readerEmail) => {
  const normalizedReader = normalizeEmail(readerEmail)
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(`${NOTIF_KEY}::`)) continue
    try {
      const raw = localStorage.getItem(key)
      const rows = raw ? JSON.parse(raw) : []
      if (!Array.isArray(rows)) continue
      let changed = false
      const next = rows.map((n) => {
        if (n?.id !== notifId) return n
        const readBy = Array.isArray(n.readBy) ? [...n.readBy] : []
        if (!readBy.includes(normalizedReader)) readBy.push(normalizedReader)
        changed = true
        return { ...n, read: true, readBy }
      })
      if (changed) saveByFullKey(key, next)
    } catch {
      // ignore malformed tenant buckets
    }
  }
}

const mapDbRequestToLocal = (row) => {
  const companyId = String(row?.company_id || getTenantId())
  const metadata = (row?.metadata && typeof row.metadata === 'object') ? row.metadata : {}
  const services = Array.isArray(row?.services)
    ? row.services
    : String(row?.services || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
  const createdAt = row?.created_at || row?.createdAt || new Date().toISOString()
  const updatedAt = row?.updated_at || row?.updatedAt || createdAt
  const id = String(metadata?.local_id || row?.id || '')
  if (!id) return null
  return {
    id,
    services,
    industryId: row?.industry_id || row?.industryId || null,
    industryLabel: metadata?.industry_label || null,
    companyName: row?.company_name || row?.companyName || '',
    contactName: row?.contact_name || row?.contactName || '',
    email: row?.email || '',
    phone: row?.phone || '',
    address: row?.address || '',
    preferredDate: row?.preferred_date || row?.preferredDate || '',
    priority: row?.priority || 'Normal',
    description: row?.description || '',
    notes: row?.notes || '',
    attachmentNames: Array.isArray(row?.attachment_names) ? row.attachment_names : [],
    accountType: row?.account_type || row?.accountType || 'unknown',
    serviceCategoryId: metadata?.service_category_id || null,
    serviceCategoryLabel: metadata?.service_category_label || null,
    preferredProviderId: metadata?.preferred_provider_id || null,
    preferredProviderName: metadata?.preferred_provider_name || null,
    preferredProviderEmail: metadata?.preferred_provider_email || null,
    requestSource: metadata?.request_source || null,
    _companyId: companyId,
    _storageKey: `${STORAGE_KEY}::${companyId}`,
    _createdBy: row?.created_by || row?._createdBy || '',
    _dbId: row?.id || null,
    status: row?.status || 'new',
    assignedTo: row?.assigned_to || row?.assignedTo || null,
    assignedBy: row?.assigned_by || row?.assignedBy || null,
    assignedAt: row?.assigned_at || row?.assignedAt || null,
    adminNotes: Array.isArray(row?.admin_notes) ? row.admin_notes : [],
    createdAt,
    updatedAt,
  }
}

const mapDbNotificationToLocal = (row) => {
  const id = String((row?.metadata && row.metadata.local_id) || row?.id || '')
  if (!id) return null
  const metadata = (row?.metadata && typeof row.metadata === 'object') ? row.metadata : {}
  return {
    id,
    type: row?.type || 'request_update',
    requestId: metadata?.local_request_id || row?.request_id || null,
    requestCompanyId: row?.company_id || null,
    requestCompanyDomain: metadata?.request_company_domain || '',
    title: row?.title || 'Request update',
    message: row?.message || '',
    priority: row?.priority || 'Normal',
    fromEmail: row?.from_email || row?.fromEmail || '',
    targetEmail: row?.target_email || row?.targetEmail || '',
    read: Boolean(row?.read),
    readBy: Array.isArray(row?.read_by) ? row.read_by : Array.isArray(row?.readBy) ? row.readBy : [],
    createdAt: row?.created_at || row?.createdAt || new Date().toISOString(),
    _dbId: row?.id || null,
  }
}

const toDbRequestPayload = (request) => ({
  company_id: getAuthCompanyId(),
  services: Array.isArray(request?.services) ? request.services : [],
  industry_id: request?.industryId || null,
  company_name: request?.companyName || null,
  contact_name: request?.contactName || null,
  email: normalizeEmail(request?.email),
  phone: request?.phone || null,
  address: request?.address || null,
  preferred_date: request?.preferredDate || null,
  priority: String(request?.priority || 'normal').toLowerCase(),
  description: request?.description || '',
  notes: request?.notes || '',
  attachment_names: Array.isArray(request?.attachmentNames) ? request.attachmentNames : [],
  account_type: request?.accountType || null,
  created_by: getAuthUserId(),
  status: request?.status || 'new',
  assigned_to: normalizeEmail(request?.assignedTo),
  assigned_by: normalizeEmail(request?.assignedBy),
  assigned_at: request?.assignedAt || null,
  admin_notes: Array.isArray(request?.adminNotes) ? request.adminNotes : [],
  metadata: {
    local_id: request?.id || null,
    industry_label: request?.industryLabel || null,
    service_category_id: request?.serviceCategoryId || null,
    service_category_label: request?.serviceCategoryLabel || null,
    preferred_provider_id: request?.preferredProviderId || null,
    preferred_provider_name: request?.preferredProviderName || null,
    preferred_provider_email: normalizeEmail(request?.preferredProviderEmail),
    request_source: request?.requestSource || null,
  },
  created_at: request?.createdAt || new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

const toDbNotificationPayload = (notif) => ({
  company_id: getAuthCompanyId(),
  type: notif?.type || 'request_update',
  request_id: null,
  title: notif?.title || 'Request update',
  message: notif?.message || '',
  priority: String(notif?.priority || 'normal').toLowerCase(),
  from_email: normalizeEmail(notif?.fromEmail),
  from_name: null,
  from_company: null,
  target_email: normalizeEmail(notif?.targetEmail),
  read: Boolean(notif?.read),
  read_by: Array.isArray(notif?.readBy) ? notif.readBy : [],
  created_at: notif?.createdAt || new Date().toISOString(),
})

const getAuthSnapshot = () => {
  try {
    return JSON.parse(localStorage.getItem('strefex-auth') || '{}')
  } catch {
    return {}
  }
}

const getAuthCompanyId = () => {
  const id = getAuthSnapshot()?.tenant?.id
  return id || null
}

const getAuthUserId = () => {
  const id = getAuthSnapshot()?.user?.id
  return id || null
}

const persistRequestRecordToDatabase = async (request) => {
  if (!isSupabaseConfigured || !request?.id) return
  const companyId = getAuthCompanyId()
  if (!companyId) return
  const payload = toDbRequestPayload(request)
  if (!payload.company_id) return
  try {
    const existing = await serviceRequestsService.list(companyId, {
      limit: 1,
      filters: [['metadata->>local_id', 'eq', String(request.id)]],
    })
    const match = Array.isArray(existing) ? existing[0] : null
    if (match?.id) {
      await serviceRequestsService.update(match.id, payload)
    } else {
      await serviceRequestsService.create(payload)
    }
  } catch {
    // Local persistence remains available as fallback.
  }
}

const persistNotificationBatchToDatabase = async (notifications) => {
  if (!isSupabaseConfigured) return
  const companyId = getAuthCompanyId()
  if (!companyId) return
  const rows = Array.isArray(notifications) ? notifications : []
  for (let i = 0; i < rows.length; i += 1) {
    const payload = toDbNotificationPayload(rows[i])
    if (!payload.company_id) continue
    try {
      const existing = await notificationsService.list(companyId, {
        limit: 1,
        filters: [
          ['type', 'eq', String(rows[i]?.type || 'request_update')],
          ['target_email', 'eq', normalizeEmail(rows[i]?.targetEmail)],
          ['created_at', 'eq', rows[i]?.createdAt || payload.created_at],
        ],
      })
      const match = rows[i]?._dbId
        ? { id: rows[i]._dbId }
        : (Array.isArray(existing) ? existing[0] : null)
      if (match?.id) {
        await notificationsService.update(match.id, payload)
      } else {
        await notificationsService.create(payload)
      }
    } catch {
      // Local persistence remains available as fallback.
    }
  }
}

const persistRequestsByRole = (requests) => {
  const role = getUserRole()
  const scopedKey = tenantKey(STORAGE_KEY)
  const canWriteCrossTenant = role === 'superadmin' || role === 'auditor_external'
  if (!canWriteCrossTenant) {
    const ownRows = (requests || [])
      .filter((r) => !r._storageKey || r._storageKey === scopedKey)
      .map(stripStorageMeta)
    save(STORAGE_KEY, ownRows)
    return
  }

  const grouped = new Map()
  ;(requests || []).forEach((r) => {
    const targetKey = r._storageKey || `${STORAGE_KEY}::${r._companyId || getTenantId()}`
    if (!grouped.has(targetKey)) grouped.set(targetKey, [])
    grouped.get(targetKey).push(stripStorageMeta(r))
  })
  grouped.forEach((rows, fullKey) => saveByFullKey(fullKey, rows))
}

const pushNotification = (existing, notif) => [notif, ...(existing || [])]

const buildRequestNotification = ({
  idSeed,
  type,
  request,
  title,
  message,
  priority,
  fromEmail,
  targetEmail,
}) => ({
  id: `SNOTIF-${String(idSeed).slice(-6)}`,
  type,
  requestId: request?.id || null,
  requestCompanyId: request?._companyId || null,
  requestCompanyDomain: getCompanyDomain(request?.email),
  title,
  message,
  priority: priority || request?.priority || 'Normal',
  fromEmail: normalizeEmail(fromEmail),
  targetEmail: normalizeEmail(targetEmail),
  read: false,
  readBy: [],
  createdAt: new Date().toISOString(),
})

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
  const currentDomain = getCompanyDomain(userId)

  // Superadmin and external auditor see all requests
  if (role === 'superadmin' || role === 'auditor_external') return list

  const companyFiltered = list.filter((r) =>
    (r._companyId || getCompanyDomain(r.email)) === companyId ||
    getCompanyDomain(r.email) === currentDomain
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
  const currentDomain = getCompanyDomain(userId)
  if (!request) return false
  if (role === 'superadmin') return true
  const requestCompany = request._companyId || getCompanyDomain(request.email)
  if (requestCompany !== companyId && getCompanyDomain(request.email) !== currentDomain) return false
  if (role === 'admin' || role === 'manager') return true
  return String(request.assignedTo || '').toLowerCase() === userId
}

let _nextId = Date.now()

export const useServiceRequestStore = create((set, get) => ({
  requests: loadRequestsByRole(),
  notifications: loadNotificationsByRole(),
  globalNotifications: loadGlobal(),
  isRefreshing: false,
  lastRefreshedAt: null,

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
    const currentRequests = loadRequestsByRole()
    const id = `SR-${new Date().getFullYear()}-${String(++_nextId).slice(-6)}`
    const normalizedPreferredProviderEmail = normalizeEmail(preferredProviderEmail)
    const autoAssignable = normalizedPreferredProviderEmail && isAssignableAuditorOrServiceProvider(normalizedPreferredProviderEmail)
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
      preferredProviderEmail: normalizedPreferredProviderEmail || null,
      requestSource: requestSource || null,
      _companyId: getTenantId(),
      _storageKey: tenantKey(STORAGE_KEY),
      _createdBy: getUserId(),
      status: autoAssignable ? 'assigned' : 'new', // new | assigned | on_hold | in_progress | completed | cancelled | recalled
      assignedTo: autoAssignable ? normalizedPreferredProviderEmail : null, // email of assigned manager/admin
      assignedBy: autoAssignable ? 'auto-routing' : null, // email of admin who assigned
      assignedAt: autoAssignable ? new Date().toISOString() : null,
      adminNotes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const updated = [request, ...currentRequests]
    persistRequestsByRole(updated)

    const adminNotif = {
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
      readBy: [],
      createdAt: new Date().toISOString(),
    }
    const assigneeNotif = autoAssignable
      ? buildRequestNotification({
          idSeed: ++_nextId,
          type: String(serviceCategoryId || '').toLowerCase() === 'supplier-audit' ? 'audit_request_assigned' : 'request_assigned',
          request,
          title: String(serviceCategoryId || '').toLowerCase() === 'supplier-audit'
            ? 'Audit request assigned to you'
            : 'Service request assigned to you',
          message: `Request ${id} from ${companyName || contactName} has been routed to you.`,
          fromEmail: email,
          targetEmail: normalizedPreferredProviderEmail,
        })
      : null
    const requestorNotif = buildRequestNotification({
      idSeed: ++_nextId,
      type: 'request_submitted',
      request,
      title: 'Your service request has been submitted',
      message: autoAssignable
        ? `Request ${id} was submitted and routed to ${preferredProviderName || normalizedPreferredProviderEmail || 'provider'}.`
        : `Request ${id} was submitted and is awaiting assignment.`,
      fromEmail: email,
      targetEmail: email,
    })
    const notifBatch = assigneeNotif
      ? [adminNotif, assigneeNotif, requestorNotif]
      : [adminNotif, requestorNotif]
    const updatedNotifs = [...notifBatch, ...get().notifications]
    save(NOTIF_KEY, updatedNotifs)
    const updatedGlobalNotifs = dedupeById(
      assigneeNotif
        ? [assigneeNotif, requestorNotif, ...get().globalNotifications]
        : [requestorNotif, ...get().globalNotifications]
    )
    saveGlobal(updatedGlobalNotifs)
    void persistRequestRecordToDatabase(request)
    void persistNotificationBatchToDatabase(notifBatch)
    set({ requests: updated, notifications: updatedNotifs, globalNotifications: updatedGlobalNotifs })
    return request
  },

  /**
   * Assign a service request to a manager or user
   */
  assignRequest: (requestId, assigneeEmail, assignerEmail) => {
    const currentRequests = loadRequestsByRole()
    const targetAssignee = normalizeEmail(assigneeEmail)
    const current = currentRequests.find((r) => r.id === requestId)
    if (!canManageRequest(current)) return
    const updated = currentRequests.map((r) =>
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
    persistRequestsByRole(updated)

    // Create notification for the assignee
    const req = updated.find((r) => r.id === requestId)
    const reqCategory = String(req?.serviceCategoryId || '').toLowerCase()
    const isAuditRequest = reqCategory === 'supplier-audit' || (req?.services || []).some((s) => String(s || '').toLowerCase().includes('audit'))
    const isAuditorOrServiceProvider = isAssignableAuditorOrServiceProvider(targetAssignee)
    const notif = buildRequestNotification({
      idSeed: ++_nextId,
      type: isAuditRequest && isAuditorOrServiceProvider ? 'audit_request_assigned' : 'request_assigned',
      request: req,
      title: isAuditRequest ? 'Audit request assigned to you' : 'Service request assigned to you',
      message: `Request ${requestId} from ${req?.companyName || req?.contactName} has been assigned to you by ${assignerEmail}`,
      fromEmail: assignerEmail,
      targetEmail: targetAssignee,
    })
    const requestorNotif = req?.email && normalizeEmail(req.email) !== targetAssignee
      ? buildRequestNotification({
          idSeed: ++_nextId,
          type: 'request_assignment_updated',
          request: req,
          title: 'Your request has been assigned',
          message: `Request ${requestId} is now assigned to ${targetAssignee}.`,
          fromEmail: assignerEmail,
          targetEmail: req.email,
        })
      : null
    const notifsToAdd = requestorNotif ? [notif, requestorNotif] : [notif]
    const updatedNotifs = [...notifsToAdd, ...get().notifications]
    save(NOTIF_KEY, updatedNotifs)
    const updatedGlobalNotifs = dedupeById([...notifsToAdd, ...get().globalNotifications])
    saveGlobal(updatedGlobalNotifs)
    const updatedRequest = updated.find((r) => r.id === requestId)
    void persistRequestRecordToDatabase(updatedRequest)
    void persistNotificationBatchToDatabase(notifsToAdd)
    set({ requests: updated, notifications: updatedNotifs, globalNotifications: updatedGlobalNotifs })
  },

  /**
   * Update request status
   */
  updateRequestStatus: (requestId, status, note, updaterEmail) => {
    const currentRequests = loadRequestsByRole()
    const current = currentRequests.find((r) => r.id === requestId)
    if (!canManageRequest(current)) return
    const updated = currentRequests.map((r) => {
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
    persistRequestsByRole(updated)
    const nextReq = updated.find((r) => r.id === requestId)
    const lifecycleNotifs = []
    if (nextReq?.email) {
      lifecycleNotifs.push(buildRequestNotification({
        idSeed: ++_nextId,
        type: 'request_status_updated',
        request: nextReq,
        title: `Request ${requestId} status updated`,
        message: `Your request is now ${status.replace('_', ' ')}.${note ? ` Note: ${note}` : ''}`,
        fromEmail: updaterEmail,
        targetEmail: nextReq.email,
      }))
    }
    const assigneeEmail = normalizeEmail(nextReq?.assignedTo)
    if (assigneeEmail && assigneeEmail !== normalizeEmail(nextReq?.email)) {
      lifecycleNotifs.push(buildRequestNotification({
        idSeed: ++_nextId,
        type: 'request_status_updated_assignee',
        request: nextReq,
        title: `Assigned request ${requestId} updated`,
        message: `Request ${requestId} is now ${status.replace('_', ' ')}.${note ? ` Note: ${note}` : ''}`,
        fromEmail: updaterEmail,
        targetEmail: assigneeEmail,
      }))
    }
    if (lifecycleNotifs.length > 0) {
      const updatedNotifs = [...lifecycleNotifs, ...get().notifications]
      const updatedGlobal = dedupeById([...lifecycleNotifs, ...get().globalNotifications])
      save(NOTIF_KEY, updatedNotifs)
      saveGlobal(updatedGlobal)
      void persistRequestRecordToDatabase(nextReq)
      void persistNotificationBatchToDatabase(lifecycleNotifs)
      set({ requests: updated, notifications: updatedNotifs, globalNotifications: updatedGlobal })
      return
    }
    void persistRequestRecordToDatabase(nextReq)
    set({ requests: updated })
  },

  /**
   * Add admin note to a request
   */
  addNote: (requestId, note, authorEmail) => {
    const currentRequests = loadRequestsByRole()
    const current = currentRequests.find((r) => r.id === requestId)
    if (!canManageRequest(current)) return
    const updated = currentRequests.map((r) => {
      if (r.id !== requestId) return r
      const adminNotes = [...(r.adminNotes || []), {
        text: note,
        by: authorEmail,
        at: new Date().toISOString(),
      }]
      return { ...r, adminNotes, updatedAt: new Date().toISOString() }
    })
    persistRequestsByRole(updated)
    const updatedRequest = updated.find((r) => r.id === requestId)
    void persistRequestRecordToDatabase(updatedRequest)
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
    if (getUserRole() === 'superadmin' || getUserRole() === 'auditor_external') {
      persistReadFlagAcrossTenantNotifBuckets(notifId, normalizedReader)
    } else {
      save(NOTIF_KEY, updated)
    }
    saveGlobal(updatedGlobal)
    const synced = [...updated, ...updatedGlobal].filter((n) => n.id === notifId)
    void persistNotificationBatchToDatabase(synced)
    set({ notifications: updated, globalNotifications: updatedGlobal })
  },

  refreshFromStorage: () => {
    set({
      requests: loadRequestsByRole(),
      notifications: loadNotificationsByRole(),
      globalNotifications: loadGlobal(),
      lastRefreshedAt: new Date().toISOString(),
    })
  },

  /** Append a platform-scoped notification visible to the target user (e.g. feature grants). */
  pushGlobalPlatformNotification: ({ targetEmail, title, message, type = 'platform' }) => {
    const normalizedTarget = normalizeEmail(targetEmail)
    if (!normalizedTarget) return
    const row = {
      id: `GNOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      requestId: null,
      requestCompanyId: null,
      requestCompanyDomain: '',
      title: String(title || 'STREFEX'),
      message: String(message || ''),
      priority: 'Normal',
      fromEmail: 'platform@strefex.com',
      targetEmail: normalizedTarget,
      read: false,
      readBy: [],
      createdAt: new Date().toISOString(),
    }
    const next = dedupeById([row, ...(get().globalNotifications || [])])
    saveGlobal(next)
    set({ globalNotifications: next })
  },

  refreshFromDatabase: async () => {
    if (!isSupabaseConfigured) return
    if (_refreshDbInFlight) return _refreshDbInFlight

    _refreshDbInFlight = (async () => {
      set({ isRefreshing: true })
      try {
        const role = getUserRole()
        const companyId = getAuthCompanyId()
        const userEmail = normalizeEmail(getAuthSnapshot()?.user?.email)
        const canSeeAll = role === 'superadmin' || role === 'auditor_external'

        const requestsPromise = canSeeAll
          ? serviceRequestsService.list(null, { limit: 500, orderBy: 'updated_at', ascending: false }).catch(() => [])
          : (companyId
            ? serviceRequestsService.list(companyId, { limit: 500, orderBy: 'updated_at', ascending: false }).catch(() => [])
            : Promise.resolve([]))

        const notificationsByCompanyPromise = canSeeAll
          ? notificationsService.list(null, { limit: 500, orderBy: 'created_at', ascending: false }).catch(() => [])
          : (companyId
            ? notificationsService.list(companyId, { limit: 500, orderBy: 'created_at', ascending: false }).catch(() => [])
            : Promise.resolve([]))

        const notificationsByTargetPromise = canSeeAll || !userEmail
          ? Promise.resolve([])
          : notificationsService.list(null, {
            limit: 500,
            orderBy: 'created_at',
            ascending: false,
            filters: [['target_email', 'eq', userEmail]],
          }).catch(() => [])

        const [dbRequestsRaw, dbNotificationsByCompanyRaw, dbNotificationsByTargetRaw] = await Promise.all([
          requestsPromise,
          notificationsByCompanyPromise,
          notificationsByTargetPromise,
        ])
        const dbNotificationsRaw = dedupeById([
          ...(Array.isArray(dbNotificationsByCompanyRaw) ? dbNotificationsByCompanyRaw : []),
          ...(Array.isArray(dbNotificationsByTargetRaw) ? dbNotificationsByTargetRaw : []),
        ])
        const dbRequests = (Array.isArray(dbRequestsRaw) ? dbRequestsRaw : [])
          .map(mapDbRequestToLocal)
          .filter(Boolean)
        const dbNotifications = (Array.isArray(dbNotificationsRaw) ? dbNotificationsRaw : [])
          .map(mapDbNotificationToLocal)
          .filter(Boolean)

        if (dbRequests.length > 0) {
          const merged = dedupeById([...dbRequests, ...loadRequestsByRole()])
          persistRequestsByRole(merged)
        }
        if (dbNotifications.length > 0) {
          const mergedNotifs = dedupeById([...dbNotifications, ...loadNotificationsByRole()])
          save(NOTIF_KEY, mergedNotifs)
        }
        set({
          requests: loadRequestsByRole(),
          notifications: loadNotificationsByRole(),
          globalNotifications: loadGlobal(),
          lastRefreshedAt: new Date().toISOString(),
        })
      } finally {
        set({ isRefreshing: false })
        _refreshDbInFlight = null
      }
    })()

    return _refreshDbInFlight
  },

  startRefreshSequence: () => {
    const run = () => {
      get().refreshFromStorage()
      get().refreshFromDatabase().catch(() => {})
    }

    const armPollingTimer = () => {
      if (_refreshTimer) {
        clearInterval(_refreshTimer)
        _refreshTimer = null
      }
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return
      }
      _refreshTimer = setInterval(run, SERVICE_REQUEST_POLL_MS_VISIBLE)
    }

    run()
    armPollingTimer()

    if (!_refreshStorageListener) {
      _refreshStorageListener = (e) => {
        if (!e?.key) return
        if (
          e.key.startsWith(`${STORAGE_KEY}::`) ||
          e.key.startsWith(`${NOTIF_KEY}::`) ||
          e.key === GLOBAL_NOTIF_KEY
        ) {
          run()
        }
      }
      window.addEventListener('storage', _refreshStorageListener)
    }
    if (!_refreshFocusListener) {
      _refreshFocusListener = () => run()
      window.addEventListener('focus', _refreshFocusListener)
    }
    if (!_refreshVisibilityListener) {
      _refreshVisibilityListener = () => {
        if (document.visibilityState === 'visible') {
          run()
        }
        armPollingTimer()
      }
      document.addEventListener('visibilitychange', _refreshVisibilityListener)
    }
  },

  stopRefreshSequence: () => {
    if (_refreshTimer) {
      clearInterval(_refreshTimer)
      _refreshTimer = null
    }
    if (_refreshStorageListener) {
      window.removeEventListener('storage', _refreshStorageListener)
      _refreshStorageListener = null
    }
    if (_refreshFocusListener) {
      window.removeEventListener('focus', _refreshFocusListener)
      _refreshFocusListener = null
    }
    if (_refreshVisibilityListener) {
      document.removeEventListener('visibilitychange', _refreshVisibilityListener)
      _refreshVisibilityListener = null
    }
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
  getNotificationSummary: (readerEmail) => {
    const normalizedReader = normalizeEmail(readerEmail)
    const all = [...get().getSafeNotifications()].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )
    const unread = all.filter((n) => !(n.readBy || []).includes(normalizedReader))
    return {
      all,
      unread,
      totalCount: all.length,
      unreadCount: unread.length,
    }
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
  getAllRequests: () => loadRequestsByRole(),
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
  getSafeRequests: () => filterBySafe(loadRequestsByRole()),

  /**
   * Get safe request stats (filtered by company & role)
   */
  getStats: () => {
    const all = filterBySafe(loadRequestsByRole())
    return {
      total: all.length,
      new: all.filter((r) => r.status === 'new').length,
      assigned: all.filter((r) => r.status === 'assigned').length,
      onHold: all.filter((r) => r.status === 'on_hold').length,
      inProgress: all.filter((r) => r.status === 'in_progress').length,
      completed: all.filter((r) => r.status === 'completed').length,
      cancelled: all.filter((r) => r.status === 'cancelled').length,
      recalled: all.filter((r) => r.status === 'recalled').length,
    }
  },
}))
