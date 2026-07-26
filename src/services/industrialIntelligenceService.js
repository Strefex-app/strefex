import {
  isSupabaseConfigured,
  suppliersService,
  supplierCapabilitiesService,
  supplierAuditsService,
  supplierScoresService,
  supplierSearchService,
  buyersService,
  buyerUsersService,
  projectsService,
  rfqsService,
  rfqSuppliersService,
  rfqResponsesService,
  supplierShortlistsService,
  analyticsEventsService,
  notificationsService,
  storageService,
  supplierProfilesService,
  vendorsService,
} from './supabaseService'
import { emailService } from './emailService'
import { useAuthStore } from '../store/authStore'

function getAuthSnapshot() {
  try {
    return JSON.parse(localStorage.getItem('strefex-auth') || '{}')
  } catch {
    return {}
  }
}

function getCurrentUserId() {
  return getAuthSnapshot()?.user?.id || null
}

function getCurrentCompanyId() {
  return getAuthSnapshot()?.user?.companyId || null
}

function getCurrentUserEmail() {
  return String(getAuthSnapshot()?.user?.email || '').trim().toLowerCase()
}

function toInFilter(values = []) {
  const safe = values
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .map((v) => `"${v.replace(/"/g, '')}"`)
  return `(${safe.join(',')})`
}

const industrialIntelligenceService = {
  async searchSuppliers(filters = {}) {
    if (!isSupabaseConfigured) return []
    const page = Number(filters.page || 1)
    const pageSize = Number(filters.pageSize || 20)
    const offset = Math.max(0, (page - 1) * pageSize)

    const rows = await supplierSearchService.search({
      query: filters.query || '',
      country: filters.country || '',
      industry: filters.industry || '',
      process: filters.process || '',
      certification: filters.certification || '',
      minAuditScore: filters.minAuditScore ?? null,
      maxRiskScore: filters.maxRiskScore ?? null,
      sortBy: filters.sortBy || 'score',
      limit: pageSize,
      offset,
    })

    return rows
  },

  async getSupplierById(supplierId) {
    if (!isSupabaseConfigured || !supplierId) return null
    const [supplier, capabilities, audits, scores] = await Promise.all([
      suppliersService.getById(supplierId).catch(() => null),
      supplierCapabilitiesService.list(null, { filters: [['supplier_id', 'eq', supplierId]] }).catch(() => []),
      supplierAuditsService.list(null, { filters: [['supplier_id', 'eq', supplierId]], orderBy: 'audited_at', ascending: false }).catch(() => []),
      supplierScoresService.list(null, { filters: [['supplier_id', 'eq', supplierId]], orderBy: 'calculated_at', ascending: false, limit: 1 }).catch(() => []),
    ])
    return {
      supplier,
      capabilities: Array.isArray(capabilities) ? capabilities : [],
      audits: Array.isArray(audits) ? audits : [],
      score: Array.isArray(scores) ? (scores[0] || null) : null,
    }
  },

  /** Lightweight batch fetch for buyer discover cards (avoids N×4 round-trips). */
  async getSuppliersBasicByIds(supplierIds = []) {
    if (!isSupabaseConfigured) return []
    const unique = [...new Set((supplierIds || []).map((id) => String(id || '').trim()).filter(Boolean))]
    if (unique.length === 0) return []
    const rows = await suppliersService
      .list(null, {
        filters: [['id', 'in', toInFilter(unique)]],
        limit: Math.min(unique.length, 100),
      })
      .catch(() => [])
    return Array.isArray(rows) ? rows : []
  },

  async resolveGlobalSupplierId(vendorId) {
    if (!vendorId) return null
    const rows = await suppliersService.list(null, {
      filters: [['vendor_id', 'eq', vendorId]],
      limit: 1,
    }).catch(() => [])
    return rows[0]?.id || null
  },

  async ensureBuyerRecordForCompany(companyId) {
    if (!isSupabaseConfigured || !companyId) return null
    const rows = await buyersService.list(null, {
      filters: [['company_id', 'eq', companyId]],
      limit: 1,
    }).catch(() => [])
    if (rows[0]) return rows[0]
    return buyersService.create({
      company_id: companyId,
      name: 'Buyer workspace',
      metadata: { auto_created: true },
    })
  },

  /**
   * Creates tenant-scoped vendor + global supplier + profile row so RFQ invites can target directory emails.
   * @param {string} ownerCompanyId — buyer company that "owns" the stub vendor (CRM-style).
   */
  async ensureStubSupplierFromDirectoryContact({
    ownerCompanyId,
    displayName,
    legalName,
    email,
    website,
    country,
    industryLabel,
  }) {
    if (!isSupabaseConfigured || !ownerCompanyId) throw new Error('Company context is required.')
    const name = String(displayName || legalName || email || 'External contact').trim()
    const em = String(email || '').trim().toLowerCase()
    if (!em.includes('@')) throw new Error('Valid email is required for RFQ delivery.')

    const meta = { contact_email: em, source: 'account_directory_stub' }

    const vendor = await vendorsService.create({
      company_id: ownerCompanyId,
      status: 'active',
      general: {
        companyName: name,
        legalName: String(legalName || name).trim(),
        website: String(website || '').trim(),
        country: String(country || '').trim(),
        industry: industryLabel ? [String(industryLabel)] : [],
      },
      contacts: [
        {
          id: `ct-${Date.now()}`,
          name: name,
          email: em,
          isPrimary: true,
        },
      ],
      metadata: meta,
    })

    const existing = await suppliersService
      .list(null, { filters: [['vendor_id', 'eq', vendor.id]], limit: 1 })
      .catch(() => [])
    let supplier = existing[0] || null
    if (!supplier) {
      supplier = await suppliersService.create({
        vendor_id: vendor.id,
        legal_name: String(legalName || name).trim(),
        display_name: name,
        country: country || null,
        industry: industryLabel || null,
        website: website || null,
        metadata: { ...meta, contact_email: em },
      })
    } else {
      await suppliersService
        .update(supplier.id, {
          display_name: name,
          country: country || supplier.country,
          industry: industryLabel || supplier.industry,
          website: website || supplier.website,
          metadata: { ...(supplier.metadata || {}), ...meta, contact_email: em },
        })
        .catch(() => {})
    }

    await supplierProfilesService
      .upsert({
        supplier_id: vendor.id,
        contact_email: em,
        website: website || null,
        description: 'External directory / spreadsheet contact (stub profile for RFQ).',
        phone: null,
        profile_completeness: 65,
      })
      .catch(() => {})

    return supplier.id
  },

  async createRfqFromDirectorySelection({
    buyerCompanyId,
    title,
    description,
    deadline,
    requirements = {},
    directoryEntries = [],
    skipCompletenessCheck = true,
  }) {
    if (!buyerCompanyId) throw new Error('Select which company issues the RFQ.')
    const supplierIds = []
    const seen = new Set()
    for (const row of directoryEntries) {
      const em = String(row?.email || '').trim().toLowerCase()
      if (!em.includes('@') || seen.has(em)) continue
      seen.add(em)
      const sid = await this.ensureStubSupplierFromDirectoryContact({
        ownerCompanyId: buyerCompanyId,
        displayName: row.company_name || row.contact_name || em,
        legalName: row.company_name,
        email: em,
        website: row.website,
        country: row.country,
        industryLabel: row.industry_label || row.industry_hub_id,
      })
      supplierIds.push(sid)
    }
    if (supplierIds.length === 0) throw new Error('No rows with valid emails in selection.')
    return this.createRfq({
      projectId: null,
      title,
      description,
      deadline,
      supplierIds,
      requirements,
      buyerCompanyId,
      skipCompletenessCheck,
    })
  },

  async ensureBuyerWorkspace() {
    const companyId = getCurrentCompanyId()
    const userId = getCurrentUserId()
    if (!companyId || !userId) return null
    const rows = await buyersService.list(null, { filters: [['company_id', 'eq', companyId]], limit: 1 }).catch(() => [])
    let buyer = rows[0] || null
    if (!buyer) {
      buyer = await buyersService.create({
        company_id: companyId,
        name: `Buyer Workspace ${String(companyId).slice(0, 8)}`,
      })
    }
    await buyerUsersService.upsert({
      buyer_id: buyer.id,
      user_id: userId,
      role: 'admin',
    })
    return buyer
  },

  async listBuyerProjects() {
    const buyer = await this.ensureBuyerWorkspace()
    if (!buyer) return []
    return projectsService.list(null, {
      filters: [['buyer_id', 'eq', buyer.id]],
      orderBy: 'updated_at',
      ascending: false,
    })
  },

  async createBuyerProject({ name, description }) {
    const buyer = await this.ensureBuyerWorkspace()
    const companyId = getCurrentCompanyId()
    const userId = getCurrentUserId()
    if (!buyer || !companyId) throw new Error('Buyer workspace is unavailable.')
    return projectsService.create({
      company_id: companyId,
      buyer_id: buyer.id,
      created_by: userId,
      name: String(name || '').trim(),
      description: String(description || '').trim() || null,
      status: 'active',
    })
  },

  async shortlistSupplier({ supplierId, projectId = null }) {
    const buyer = await this.ensureBuyerWorkspace()
    if (!buyer) throw new Error('Buyer workspace is unavailable.')
    const row = await supplierShortlistsService.upsert({
      buyer_id: buyer.id,
      supplier_id: supplierId,
      project_id: projectId,
    })
    await analyticsEventsService.create({
      company_id: getCurrentCompanyId(),
      profile_id: getCurrentUserId(),
      event_type: 'supplier_shortlisted',
      entity_type: 'supplier',
      entity_id: supplierId,
      payload: { projectId },
    }).catch(() => {})
    return row
  },

  async listShortlistedSuppliers(projectId = null) {
    const buyer = await this.ensureBuyerWorkspace()
    if (!buyer) return []
    const filters = [['buyer_id', 'eq', buyer.id]]
    if (projectId) filters.push(['project_id', 'eq', projectId])
    return supplierShortlistsService.list(null, { filters, orderBy: 'created_at', ascending: false })
  },

  async createRfq({
    projectId,
    title,
    description,
    deadline,
    supplierIds = [],
    requirements = {},
    buyerCompanyId = null,
    skipCompletenessCheck = false,
  }) {
    const actingSuperadmin = Boolean(buyerCompanyId)
    if (actingSuperadmin && useAuthStore.getState().role !== 'superadmin') {
      throw new Error('Only superadmin can send RFQs on behalf of another company.')
    }

    let buyer
    let companyId
    if (actingSuperadmin) {
      companyId = buyerCompanyId
      buyer = await this.ensureBuyerRecordForCompany(companyId)
    } else {
      buyer = await this.ensureBuyerWorkspace()
      companyId = getCurrentCompanyId()
    }

    const userId = getCurrentUserId()
    if (!buyer || !companyId) throw new Error('Buyer workspace is unavailable.')
    if (!String(title || '').trim()) throw new Error('RFQ title is required.')
    if (supplierIds.length === 0) throw new Error('Select at least one supplier.')

    // Restrict RFQ participation to suppliers with minimum profile completeness.
    const uniqueSupplierIds = [...new Set((supplierIds || []).filter(Boolean))]
    const suppliers = await Promise.all(uniqueSupplierIds.map((id) => suppliersService.getById(id).catch(() => null)))
    if (!skipCompletenessCheck) {
      const vendorIds = suppliers.map((s) => s?.vendor_id).filter(Boolean)
      const completenessRows = vendorIds.length
        ? await supplierProfilesService.list(null, { filters: [['supplier_id', 'in', toInFilter(vendorIds)]] }).catch(() => [])
        : []
      const completenessMap = new Map((completenessRows || []).map((r) => [r.supplier_id, Number(r.profile_completeness || 0)]))
      const blocked = suppliers.filter((s) => {
        const vendorId = s?.vendor_id
        const completeness = Number(completenessMap.get(vendorId) || 0)
        return completeness < 60
      })
      if (blocked.length > 0) {
        throw new Error(`RFQ can be sent only to suppliers with profile completeness >= 60%. Blocked: ${blocked.length}`)
      }
    }

    const rfq = await rfqsService.create({
      company_id: companyId,
      buyer_id: buyer.id,
      project_id: projectId || null,
      created_by: userId,
      title: String(title || '').trim(),
      description: String(description || '').trim() || null,
      deadline: deadline || null,
      requirements: requirements && typeof requirements === 'object' ? requirements : {},
      status: 'sent',
    })
    await Promise.all(
      uniqueSupplierIds.map((sid) =>
        rfqSuppliersService.create({
          rfq_id: rfq.id,
          supplier_id: sid,
          status: 'invited',
        })
      )
    )
    // In-app + email notifications for invited suppliers.
    await Promise.all(
      uniqueSupplierIds.map(async (sid) => {
        const supplier = suppliers.find((s) => s?.id === sid)
        const targetEmail = String(supplier?.metadata?.contact_email || supplier?.website || '').trim()
        await notificationsService.create({
          company_id: companyId,
          profile_id: userId,
          type: 'rfq_invited',
          request_id: rfq.id,
          title: `RFQ invitation: ${rfq.title}`,
          message: `You were invited to respond to RFQ "${rfq.title}".`,
          target_email: targetEmail || null,
          from_email: getCurrentUserEmail(),
          from_company: String(buyer?.name || 'Buyer'),
        }).catch(() => {})
        if (targetEmail && targetEmail.includes('@')) {
          void emailService.sendRfqInvite({
            email: targetEmail,
            supplierName: supplier?.display_name || 'Supplier',
            rfqTitle: rfq.title,
            deadline: rfq.deadline || null,
            buyerName: buyer?.name || 'Buyer',
          }).catch(() => {})
        }
      })
    )
    await analyticsEventsService.create({
      company_id: companyId,
      profile_id: userId,
      event_type: 'rfq_sent',
      entity_type: 'rfq',
      entity_id: rfq.id,
      payload: { supplierCount: uniqueSupplierIds.length },
    }).catch(() => {})
    return rfq
  },

  async markRfqViewed({ rfqId, supplierId }) {
    const links = await rfqSuppliersService.list(null, {
      filters: [['rfq_id', 'eq', rfqId], ['supplier_id', 'eq', supplierId]],
      limit: 1,
    }).catch(() => [])
    if (!links[0]) return null
    return rfqSuppliersService.update(links[0].id, {
      status: links[0].status === 'responded' ? 'responded' : 'viewed',
      viewed_at: new Date().toISOString(),
    })
  },

  async closeRfqForSupplier({ rfqId, supplierId }) {
    const links = await rfqSuppliersService.list(null, {
      filters: [['rfq_id', 'eq', rfqId], ['supplier_id', 'eq', supplierId]],
      limit: 1,
    }).catch(() => [])
    if (!links[0]) return null
    return rfqSuppliersService.update(links[0].id, {
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
  },

  async uploadRfqResponseAttachments({ files = [] }) {
    const companyId = getCurrentCompanyId()
    if (!companyId || !Array.isArray(files) || files.length === 0) return []
    const uploads = await Promise.all(
      files.map(async (file) => {
        const uploaded = await storageService.upload({
          companyId,
          entityType: 'rfq-response',
          entityId: getCurrentUserId() || 'anonymous',
          file,
          bucket: 'documents',
        }).catch(() => null)
        if (!uploaded?.path) return null
        const signedUrl = await storageService.getSignedUrl(uploaded.path, 7 * 24 * 3600, 'documents').catch(() => null)
        return {
          name: file.name,
          path: uploaded.path,
          url: signedUrl || '',
          size: file.size || 0,
          type: file.type || '',
        }
      })
    )
    return uploads.filter(Boolean)
  },

  async respondToRfq({
    rfqId,
    supplierId,
    price,
    leadTime,
    notes,
    currency = 'USD',
    warrantyMonths = null,
    moq = null,
    paymentTerms = '',
    responseFields = {},
    attachments = [],
  }) {
    const normalizedAttachments = Array.isArray(attachments) ? attachments : []
    const hasFiles = normalizedAttachments.some((item) => typeof File !== 'undefined' && item instanceof File)
    const uploadedAttachments = hasFiles
      ? await this.uploadRfqResponseAttachments({ files: normalizedAttachments })
      : normalizedAttachments

    const response = await rfqResponsesService.upsert({
      rfq_id: rfqId,
      supplier_id: supplierId,
      price: price ?? null,
      lead_time: leadTime ?? null,
      currency: String(currency || 'USD'),
      warranty_months: warrantyMonths == null ? null : Number(warrantyMonths),
      moq: moq == null ? null : Number(moq),
      payment_terms: String(paymentTerms || '').trim() || null,
      response_fields: responseFields && typeof responseFields === 'object' ? responseFields : {},
      attachment_urls: Array.isArray(uploadedAttachments) ? uploadedAttachments : [],
      notes: String(notes || '').trim() || null,
    })
    const links = await rfqSuppliersService.list(null, {
      filters: [['rfq_id', 'eq', rfqId], ['supplier_id', 'eq', supplierId]],
      limit: 1,
    }).catch(() => [])
    if (links[0]) {
      await rfqSuppliersService.update(links[0].id, {
        status: 'responded',
        viewed_at: links[0].viewed_at || new Date().toISOString(),
        responded_at: new Date().toISOString(),
      }).catch(() => {})
    }
    const rfq = await rfqsService.getById(rfqId).catch(() => null)
    await notificationsService.create({
      company_id: getCurrentCompanyId(),
      profile_id: getCurrentUserId(),
      type: 'rfq_responded',
      request_id: rfqId,
      title: `RFQ response submitted`,
      message: `A supplier submitted response for "${rfq?.title || 'RFQ'}".`,
      from_email: getCurrentUserEmail(),
    }).catch(() => {})
    void emailService.sendRfqResponseNotice({
      buyerEmail: String(rfq?.buyer_email || '').trim(),
      rfqTitle: rfq?.title || 'RFQ',
      supplierName: String(responseFields?.supplierName || 'Supplier'),
    }).catch(() => {})
    await analyticsEventsService.create({
      company_id: getCurrentCompanyId(),
      profile_id: getCurrentUserId(),
      event_type: 'rfq_response_submitted',
      entity_type: 'rfq',
      entity_id: rfqId,
      payload: { supplierId },
    }).catch(() => {})
    return response
  },

  async listSupplierRfqInvitesByVendor(vendorId) {
    const globalSupplierId = await this.resolveGlobalSupplierId(vendorId)
    if (!globalSupplierId) return { globalSupplierId: null, invites: [], rfqs: [] }
    const invites = await rfqSuppliersService.list(null, {
      filters: [['supplier_id', 'eq', globalSupplierId]],
      orderBy: 'invited_at',
      ascending: false,
    }).catch(() => [])
    const rfqIds = [...new Set((invites || []).map((i) => i.rfq_id).filter(Boolean))]
    const rfqs = await Promise.all(rfqIds.map((id) => rfqsService.getById(id).catch(() => null)))
    return {
      globalSupplierId,
      invites: invites || [],
      rfqs: rfqs.filter(Boolean),
    }
  },

  async listBuyerRfqTracking() {
    const buyer = await this.ensureBuyerWorkspace()
    if (!buyer) return []
    const rfqs = await rfqsService.list(null, {
      filters: [['buyer_id', 'eq', buyer.id]],
      orderBy: 'created_at',
      ascending: false,
    }).catch(() => [])
    if (!rfqs.length) return []
    const rfqIds = rfqs.map((r) => r.id)
    const links = await rfqSuppliersService.list(null, {
      filters: [['rfq_id', 'in', toInFilter(rfqIds)]],
      orderBy: 'invited_at',
      ascending: false,
    }).catch(() => [])
    const byRfq = new Map()
    links.forEach((link) => {
      const arr = byRfq.get(link.rfq_id) || []
      arr.push(link)
      byRfq.set(link.rfq_id, arr)
    })
    return rfqs.map((rfq) => {
      const rows = byRfq.get(rfq.id) || []
      return {
        ...rfq,
        invited_count: rows.filter((r) => r.status === 'invited').length,
        viewed_count: rows.filter((r) => r.status === 'viewed').length,
        responded_count: rows.filter((r) => r.status === 'responded').length,
        closed_count: rows.filter((r) => r.status === 'closed').length,
        total_suppliers: rows.length,
      }
    })
  },

  async getRecommendedSuppliers(filters = {}, limit = 8) {
    const base = await this.searchSuppliers({
      ...filters,
      sortBy: 'score',
      page: 1,
      pageSize: Math.max(limit, 20),
    })
    return (base || [])
      .filter((s) => Number(s.overall_score || 0) >= 60 && Number(s.profile_completeness || 0) >= 60)
      .sort(
        (a, b) =>
          (Number(b.tenant_visibility_rank) || 0) - (Number(a.tenant_visibility_rank) || 0)
          || (Number(b.boosted_score || b.boostedScore || 0) - Number(a.boosted_score || a.boostedScore || 0)),
      )
      .slice(0, limit)
  },

  async listMyInAppNotifications(limit = 100) {
    const email = getCurrentUserEmail()
    const companyId = getCurrentCompanyId()
    const rowsByEmail = email
      ? await notificationsService.list(null, {
          filters: [['target_email', 'eq', email]],
          orderBy: 'created_at',
          ascending: false,
          limit,
        }).catch(() => [])
      : []
    const rowsByCompany = companyId
      ? await notificationsService.list(companyId, {
          orderBy: 'created_at',
          ascending: false,
          limit,
        }).catch(() => [])
      : []
    const merged = [...rowsByEmail, ...rowsByCompany]
    const dedup = new Map()
    merged.forEach((n) => {
      if (!dedup.has(n.id)) dedup.set(n.id, n)
    })
    return [...dedup.values()]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
  },

  async getBuyerWorkspaceSummary() {
    const buyer = await this.ensureBuyerWorkspace()
    if (!buyer) return null
    const [projects, rfqs, shortlists] = await Promise.all([
      projectsService.list(null, { filters: [['buyer_id', 'eq', buyer.id]] }),
      rfqsService.list(null, { filters: [['buyer_id', 'eq', buyer.id]] }),
      supplierShortlistsService.list(null, { filters: [['buyer_id', 'eq', buyer.id]] }),
    ])
    return {
      buyer,
      projects,
      rfqs,
      shortlists,
    }
  },

  async trackEvent(eventType, entityType, entityId, payload = {}) {
    return analyticsEventsService.create({
      company_id: getCurrentCompanyId(),
      profile_id: getCurrentUserId(),
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      payload,
    })
  },
}

export default industrialIntelligenceService
