/**
 * Vendor Master Data Store — SAP-like vendor management
 *
 * Every buyer account maintains its own vendor master registry:
 *   - Unique vendor account numbers (SAP-style: VEND-XXXX)
 *   - Company & contact master data
 *   - Banking & payment information
 *   - Certifications & compliance
 *   - Purchase & RFQ history (connections)
 *   - Performance evaluation & scoring
 *   - Document attachments
 *   - Payment terms & conditions
 *   - Status management (active, blocked, pending, archived)
 *
 * Tenant-scoped — each buyer sees only their own vendor registry.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserRole } from '../utils/tenantStorage'
import { canEdit as guardCanEdit, isAuditor } from '../utils/companyGuard'

let _seqId = 1000

const nextVendorNumber = () => `VEND-${++_seqId}`

const useVendorStore = create(
  persist(
    (set, get) => ({
      vendors: [],

      /* ═══════════════════════════════════════════════════════════
       *  CRUD
       * ═══════════════════════════════════════════════════════════ */
      addVendor: (vendorData) => {
        const vendor = {
          id: `vnd-${Date.now()}`,
          vendorNumber: nextVendorNumber(),
          status: 'pending_approval',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          general: vendorData.general || {},
          addresses: vendorData.addresses || {},
          contacts: vendorData.contacts || [],
          banking: vendorData.banking || {},
          purchasing: vendorData.purchasing || { paymentTerms: 'Net 30', incoterms: 'EXW', minimumOrderValue: 0, leadTimeAvgDays: 0, deliveryReliability: 0, qualityRating: 0, priceCompetitiveness: 0, overallScore: 0 },
          certifications: vendorData.certifications || [],
          connections: [],
          documents: [],
          evaluations: [],
          complaints: [],
          notes: [],
          changeLog: [],
        }
        set((s) => ({ vendors: [vendor, ...s.vendors] }))
        return vendor
      },

      updateVendor: (id, updates) =>
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
          ),
        })),

      updateVendorSection: (id, section, data) =>
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === id ? { ...v, [section]: data, updatedAt: new Date().toISOString() } : v
          ),
        })),

      updateVendorSectionWithLog: (id, section, newData, changedBy, reason, changes) => {
        const logEntry = {
          id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: new Date().toISOString(),
          changedBy,
          section,
          reason: reason || '',
          changes: changes || [],
        }
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === id
              ? { ...v, [section]: newData, updatedAt: new Date().toISOString(), changeLog: [logEntry, ...(v.changeLog || [])] }
              : v
          ),
        }))
      },

      updateContactWithLog: (vendorId, contactId, contactData, changedBy, reason, changes) => {
        const logEntry = {
          id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: new Date().toISOString(),
          changedBy,
          section: 'contacts',
          reason: reason || '',
          changes: changes || [],
        }
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === vendorId
              ? {
                  ...v,
                  contacts: v.contacts.map((c) => c.id === contactId ? { ...c, ...contactData } : c),
                  updatedAt: new Date().toISOString(),
                  changeLog: [logEntry, ...(v.changeLog || [])],
                }
              : v
          ),
        }))
      },

      addChangeLog: (vendorId, entry) =>
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === vendorId
              ? { ...v, changeLog: [{ id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: new Date().toISOString(), ...entry }, ...(v.changeLog || [])] }
              : v
          ),
        })),

      deleteVendor: (id) =>
        set((s) => ({ vendors: s.vendors.filter((v) => v.id !== id) })),

      /* ═══════════════════════════════════════════════════════════
       *  STATUS MANAGEMENT
       * ═══════════════════════════════════════════════════════════ */
      setVendorStatus: (id, status, reason) =>
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === id
              ? {
                  ...v,
                  status,
                  statusReason: reason || '',
                  updatedAt: new Date().toISOString(),
                  notes: reason
                    ? [{ id: `note-${Date.now()}`, date: new Date().toISOString(), author: 'System', text: `Status → ${status}: ${reason}` }, ...v.notes]
                    : v.notes,
                }
              : v
          ),
        })),

      approveVendor: (id) => get().setVendorStatus(id, 'active', 'Vendor approved'),
      blockVendor: (id, reason) => get().setVendorStatus(id, 'blocked', reason || 'Vendor blocked'),
      archiveVendor: (id) => get().setVendorStatus(id, 'archived', 'Vendor archived'),

      /* ═══════════════════════════════════════════════════════════
       *  CONNECTIONS (RFQs, Orders, Payments)
       * ═══════════════════════════════════════════════════════════ */
      addConnection: (vendorId, connection) =>
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === vendorId
              ? {
                  ...v,
                  connections: [{ id: `conn-${Date.now()}`, date: new Date().toISOString(), ...connection }, ...v.connections],
                  updatedAt: new Date().toISOString(),
                }
              : v
          ),
        })),

      /* ═══════════════════════════════════════════════════════════
       *  EVALUATIONS
       * ═══════════════════════════════════════════════════════════ */
      addEvaluation: (vendorId, evaluation) => {
        const CRITERIA = ['quality', 'delivery', 'price', 'communication', 'technicalCapability', 'compliance', 'flexibility', 'documentation']
        const scores = CRITERIA.map((k) => evaluation[k] || 0).filter((v) => v > 0)
        const overall = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
        const evalRecord = {
          id: `eval-${Date.now()}`,
          date: new Date().toISOString(),
          year: new Date().getFullYear(),
          overall: Math.round(overall * 100) / 100,
          ...evaluation,
        }
        set((s) => ({
          vendors: s.vendors.map((v) => {
            if (v.id !== vendorId) return v
            const evals = [evalRecord, ...v.evaluations]
            const avgQ = evals.reduce((a, e) => a + (e.quality || 0), 0) / evals.length
            const avgD = evals.reduce((a, e) => a + (e.delivery || 0), 0) / evals.length
            const avgP = evals.reduce((a, e) => a + (e.price || 0), 0) / evals.length
            const avgO = evals.reduce((a, e) => a + (e.overall || 0), 0) / evals.length
            const openComplaints = (v.complaints || []).filter((c) => c.status === 'open')
            const complaintDeduction = openComplaints.reduce((s, c) => s + Math.abs(c.impactScore || 0), 0)
            const adjustedScore = Math.max(0, Math.round((avgO - complaintDeduction) * 10) / 10)
            return {
              ...v,
              evaluations: evals,
              purchasing: {
                ...v.purchasing,
                qualityRating: Math.round(avgQ * 10) / 10,
                deliveryReliability: Math.round(avgD * 20 * 10) / 10,
                priceCompetitiveness: Math.round(avgP * 10) / 10,
                overallScore: adjustedScore,
              },
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
        return evalRecord
      },

      /* ═══════════════════════════════════════════════════════════
       *  COMPLAINTS / NCRs
       * ═══════════════════════════════════════════════════════════ */
      addComplaint: (vendorId, complaint) => {
        const record = {
          id: `cmp-${Date.now()}`,
          date: new Date().toISOString(),
          status: 'open',
          resolution: '',
          resolvedDate: '',
          resolvedBy: '',
          ...complaint,
        }
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === vendorId
              ? { ...v, complaints: [record, ...(v.complaints || [])], updatedAt: new Date().toISOString() }
              : v
          ),
        }))
        return record
      },

      resolveComplaint: (vendorId, complaintId, resolution, resolvedBy) =>
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === vendorId
              ? {
                  ...v,
                  complaints: (v.complaints || []).map((c) =>
                    c.id === complaintId
                      ? { ...c, status: 'resolved', resolution, resolvedBy, resolvedDate: new Date().toISOString() }
                      : c
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : v
          ),
        })),

      /* ═══════════════════════════════════════════════════════════
       *  EVALUATION CLASS — A/B/C/D based on score + complaints
       * ═══════════════════════════════════════════════════════════ */
      getEvaluationClass: (vendorId) => {
        const vendor = get().vendors.find((v) => v.id === vendorId)
        if (!vendor) return { cls: '—', label: 'Unknown', color: '#999' }
        const base = vendor.purchasing.overallScore || 0
        if (base === 0) return { cls: '—', label: 'Not Evaluated', color: '#999' }
        const openComplaints = (vendor.complaints || []).filter((c) => c.status === 'open')
        const deduction = openComplaints.reduce((s, c) => s + Math.abs(c.impactScore || 0), 0)
        const adjusted = Math.max(0, base - deduction)
        if (adjusted >= 4.0) return { cls: 'A', label: 'Preferred Supplier', color: '#27ae60' }
        if (adjusted >= 3.0) return { cls: 'B', label: 'Approved Supplier', color: '#2563eb' }
        if (adjusted >= 2.0) return { cls: 'C', label: 'Conditional Supplier', color: '#e65100' }
        return { cls: 'D', label: 'Restricted Supplier', color: '#e74c3c' }
      },

      /* ═══════════════════════════════════════════════════════════
       *  CONTACTS
       * ═══════════════════════════════════════════════════════════ */
      addContact: (vendorId, contact) =>
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === vendorId
              ? { ...v, contacts: [...v.contacts, { id: `ct-${Date.now()}`, ...contact }], updatedAt: new Date().toISOString() }
              : v
          ),
        })),

      removeContact: (vendorId, contactId) =>
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === vendorId
              ? { ...v, contacts: v.contacts.filter((c) => c.id !== contactId), updatedAt: new Date().toISOString() }
              : v
          ),
        })),

      /* ═══════════════════════════════════════════════════════════
       *  NOTES
       * ═══════════════════════════════════════════════════════════ */
      addNote: (vendorId, author, text) =>
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === vendorId
              ? { ...v, notes: [{ id: `note-${Date.now()}`, date: new Date().toISOString(), author, text }, ...v.notes], updatedAt: new Date().toISOString() }
              : v
          ),
        })),

      /* ═══════════════════════════════════════════════════════════
       *  DOCUMENTS
       * ═══════════════════════════════════════════════════════════ */
      addDocument: (vendorId, doc) =>
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === vendorId
              ? { ...v, documents: [{ id: `doc-${Date.now()}`, uploadedAt: new Date().toISOString(), ...doc }, ...v.documents], updatedAt: new Date().toISOString() }
              : v
          ),
        })),

      removeDocument: (vendorId, docId) =>
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === vendorId
              ? { ...v, documents: v.documents.filter((d) => d.id !== docId), updatedAt: new Date().toISOString() }
              : v
          ),
        })),

      /* ═══════════════════════════════════════════════════════════
       *  ROLE-BASED ACCESS
       * ═══════════════════════════════════════════════════════════ */
      canEditVendor: () => guardCanEdit(),
      isReadOnly: () => isAuditor(),
      getAccessLevel: () => getUserRole(),

      /* ═══════════════════════════════════════════════════════════
       *  GETTERS
       * ═══════════════════════════════════════════════════════════ */
      getVendorById: (id) => get().vendors.find((v) => v.id === id),
      getVendorByNumber: (num) => get().vendors.find((v) => v.vendorNumber === num),
      getActiveVendors: () => get().vendors.filter((v) => v.status === 'active'),
      getBlockedVendors: () => get().vendors.filter((v) => v.status === 'blocked'),
      getPendingVendors: () => get().vendors.filter((v) => v.status === 'pending_approval'),

      getVendorStats: () => {
        const v = get().vendors
        return {
          total: v.length,
          active: v.filter((x) => x.status === 'active').length,
          blocked: v.filter((x) => x.status === 'blocked').length,
          pending: v.filter((x) => x.status === 'pending_approval').length,
          archived: v.filter((x) => x.status === 'archived').length,
          totalConnections: v.reduce((s, x) => s + x.connections.length, 0),
          totalOrders: v.reduce((s, x) => s + x.connections.filter((c) => c.type === 'order').length, 0),
          totalSpend: v.reduce((s, x) => s + x.connections.filter((c) => c.type === 'payment' && c.status === 'paid').reduce((a, c) => a + (c.amount || 0), 0), 0),
          avgScore: Math.round((v.filter((x) => x.purchasing.overallScore > 0).reduce((s, x) => s + x.purchasing.overallScore, 0) / Math.max(v.filter((x) => x.purchasing.overallScore > 0).length, 1)) * 10) / 10,
        }
      },
    }),
    {
      name: 'strefex-vendor-master',
      storage: createTenantStorage(),
    }
  )
)

export default useVendorStore
