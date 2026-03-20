/**
 * Supabase Service — Unified data layer for the STREFEX Platform.
 *
 * Wraps all Supabase client operations (auth, database, storage) and
 * provides a clean API that the rest of the app consumes.
 *
 * When Supabase is NOT configured, every method returns null/empty
 * so the app falls back to localStorage seamlessly.
 */
import { supabase, isSupabaseConfigured } from '../config/supabase'

/* ================================================================
   AUTH
   ================================================================ */
export const supabaseAuth = {
  _generateInvitePassword() {
    const bytes = new Uint8Array(12)
    window.crypto.getRandomValues(bytes)
    const base = Array.from(bytes, (b) => (b % 36).toString(36)).join('')
    return `Tmp!${base}9Z`
  },

  /**
   * Sign up with email + password.
   * Creates a Supabase auth user; the DB trigger auto-creates the profile.
   */
  async signUp({ email, password, fullName, phone, metadata = {} }) {
    if (!isSupabaseConfigured) return null
    const redirectTo = `${window.location.origin}/login?confirmed=true`
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: (fullName || '').trim(),
          phone,
          ...metadata,
        },
        emailRedirectTo: redirectTo,
      },
    })
    if (error) throw error
    return data
  },

  /**
   * Invite a team user by creating an auth account and triggering
   * Supabase email confirmation flow. Keeps inviter session intact.
   */
  async inviteTeamUser({ email, fullName, role = 'user', companyId = null, accountType = 'seller' }) {
    if (!isSupabaseConfigured) return null

    const {
      data: { session: inviterSession },
    } = await supabase.auth.getSession()
    const inviterId = inviterSession?.user?.id || null
    const redirectTo = `${window.location.origin}/login?confirmed=true`

    const { data, error } = await supabase.auth.signUp({
      email,
      password: this._generateInvitePassword(),
      options: {
        data: {
          full_name: (fullName || '').trim(),
          account_type: accountType,
          company_id: companyId,
          invited: true,
          invited_by: inviterId,
          invited_role: role,
        },
        emailRedirectTo: redirectTo,
      },
    })

    // If user already exists, treat as non-fatal for team invite UX.
    if (error) {
      const msg = String(error?.message || '').toLowerCase()
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        return { alreadyExists: true, user: null }
      }
      throw error
    }

    // Important: preserve inviter session if signUp switched it.
    if (
      inviterSession?.access_token &&
      inviterSession?.refresh_token &&
      data?.session?.user?.id &&
      data.session.user.id !== inviterSession.user?.id
    ) {
      await supabase.auth.setSession({
        access_token: inviterSession.access_token,
        refresh_token: inviterSession.refresh_token,
      })
    }

    return {
      user: data?.user || null,
      emailConfirmationPending: !data?.session,
      alreadyExists: false,
    }
  },

  /** Sign in with email + password. */
  async signIn(email, password) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  /** Sign in with magic link (passwordless). */
  async signInWithOtp(email) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase.auth.signInWithOtp({ email })
    if (error) throw error
    return data
  },

  /** Sign in with OAuth provider (Google, GitHub, etc.). */
  async signInWithOAuth(provider) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase.auth.signInWithOAuth({ provider })
    if (error) throw error
    return data
  },

  /** Sign out. */
  async signOut() {
    if (!isSupabaseConfigured) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  /** Get the current session. */
  async getSession() {
    if (!isSupabaseConfigured) return null
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  /** Get the current user. */
  async getUser() {
    if (!isSupabaseConfigured) return null
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  /** Listen for auth state changes. */
  onAuthStateChange(callback) {
    if (!isSupabaseConfigured) return { data: { subscription: { unsubscribe: () => {} } } }
    return supabase.auth.onAuthStateChange(callback)
  },

  /** Reset password. */
  async resetPassword(email) {
    if (!isSupabaseConfigured) return null
    const redirectTo = `${window.location.origin}/login?reset=true`
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
    return data
  },

  /** Resend signup confirmation email. */
  async resendSignupConfirmation(email) {
    if (!isSupabaseConfigured) return null
    const redirectTo = `${window.location.origin}/login?confirmed=true`
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) throw error
    return data
  },

  /** Update user (password, email, metadata). */
  async updateUser(updates) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase.auth.updateUser(updates)
    if (error) throw error
    return data
  },
}

/* ================================================================
   PROFILES
   ================================================================ */
export const profilesService = {
  async getMyProfile() {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()
    if (error) throw error
    return data
  },

  async updateProfile(updates) {
    if (!isSupabaseConfigured) return null
    const user = (await supabase.auth.getUser()).data.user
    const allowedKeys = new Set([
      'company_id',
      'full_name',
      'phone',
      'role',
      'avatar_url',
      'email_verified',
      'phone_verified',
      'status',
      'invited_by',
      'metadata',
    ])
    const safeUpdates = Object.fromEntries(
      Object.entries(updates || {}).filter(([key]) => allowedKeys.has(key))
    )
    if (Object.keys(safeUpdates).length === 0) {
      return null
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', user?.id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getCompanyProfiles(companyId) {
    if (!isSupabaseConfigured) return []
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', companyId)
    if (error) throw error
    return data || []
  },
}

/* ================================================================
   COMPANIES
   ================================================================ */
export const companiesService = {
  async create(company) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase
      .from('companies')
      .insert(company)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getById(id) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async list() {
    if (!isSupabaseConfigured) return []
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
}

/* ================================================================
   TEAM MEMBERS
   ================================================================ */
export const teamService = {
  async list(companyId) {
    if (!isSupabaseConfigured) return []
    const { data, error } = await supabase
      .from('team_members')
      .select('*, profiles(*)')
      .eq('company_id', companyId)
    if (error) throw error
    return data || []
  },

  async invite(member) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase
      .from('team_members')
      .insert(member)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateRole(id, role) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    if (!isSupabaseConfigured) return null
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

/* ================================================================
   GENERIC CRUD FACTORY — for tenant-scoped tables
   ================================================================ */
function createCrudService(tableName) {
  return {
    async list(companyId, options = {}) {
      if (!isSupabaseConfigured) return []
      let query = supabase.from(tableName).select(options.select || '*')
      if (companyId) query = query.eq('company_id', companyId)
      if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? false })
      else query = query.order('created_at', { ascending: false })
      if (options.limit) query = query.limit(options.limit)
      if (options.filters) {
        options.filters.forEach(([col, op, val]) => {
          query = query.filter(col, op, val)
        })
      }
      const { data, error } = await query
      if (error) throw error
      return data || []
    },

    async getById(id) {
      if (!isSupabaseConfigured) return null
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },

    async create(record) {
      if (!isSupabaseConfigured) return null
      const { data, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async update(id, updates) {
      if (!isSupabaseConfigured) return null
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async upsert(record) {
      if (!isSupabaseConfigured) return null
      const { data, error } = await supabase
        .from(tableName)
        .upsert(record)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async remove(id) {
      if (!isSupabaseConfigured) return null
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      if (error) throw error
    },

    async count(companyId) {
      if (!isSupabaseConfigured) return 0
      let query = supabase.from(tableName).select('id', { count: 'exact', head: true })
      if (companyId) query = query.eq('company_id', companyId)
      const { count, error } = await query
      if (error) throw error
      return count || 0
    },
  }
}

/* ── Instantiate services for each table ─────────────────── */
export const projectsService   = createCrudService('projects')
export const rfqsService       = createCrudService('rfqs')
export const contractsService  = createCrudService('contracts')
export const procurementService = createCrudService('procurement_items')
export const vendorsService    = createCrudService('vendors')
export const transactionsService = createCrudService('transactions')
export const serviceRequestsService = createCrudService('service_requests')
export const notificationsService = createCrudService('notifications')
export const templatesService  = createCrudService('templates')
export const auditLogsService  = createCrudService('audit_logs')
export const escrowService     = createCrudService('escrow_transactions')
export const productionService = createCrudService('production_data')
export const costDataService   = createCrudService('cost_data')
export const enterpriseService = createCrudService('enterprise_data')
export const fileMetadataService = createCrudService('file_metadata')
export const subscriptionsService = createCrudService('subscriptions')
export const supplierClaimsService = createCrudService('supplier_claims')
export const supplierUsersService = createCrudService('supplier_users')
export const supplierProfilesService = createCrudService('supplier_profiles')
export const supplierProductsService = createCrudService('supplier_products')
export const supplierCertificationsService = createCrudService('supplier_certifications')
export const changeLogsService = createCrudService('change_logs')
export const suppliersService = createCrudService('suppliers')
export const supplierCapabilitiesService = createCrudService('supplier_capabilities')
export const supplierAuditsService = createCrudService('supplier_audits')
export const supplierScoresService = createCrudService('supplier_scores')
export const buyersService = createCrudService('buyers')
export const buyerUsersService = createCrudService('buyer_users')
export const rfqSuppliersService = createCrudService('rfq_suppliers')
export const rfqResponsesService = createCrudService('rfq_responses')
export const supplierShortlistsService = createCrudService('supplier_shortlists')
export const dataSourcesService = createCrudService('data_sources')
export const supplierRawDataService = createCrudService('supplier_raw_data')
export const supplierEmbeddingsService = createCrudService('supplier_embeddings')
export const analyticsEventsService = createCrudService('analytics_events')
/** Superadmin-only RLS — imported B2B directory (plastic / stamping lists) */
export const platformDirectoryContactsService = createCrudService('platform_directory_contacts')
/** Superadmin-only RLS — tooling / international supplier registry (not public vendor profiles) */
export const platformRegisteredSuppliersService = createCrudService('platform_registered_suppliers')
/** Per-tenant directory; superadmin sees all companies (RLS) */
export const accountDirectoryEntriesService = createCrudService('account_directory_entries')

/** PostgREST / Supabase when RPC is missing, renamed, or not granted to the JWT role */
function isSearchSuppliersRpcUnavailable(error) {
  if (!error) return false
  const code = String(error.code || '')
  const msg = String(error.message || '').toLowerCase()
  return (
    code === 'PGRST202'
    || code === '42883'
    || msg.includes('schema cache')
    || msg.includes('search_suppliers')
    || msg.includes('could not find the function')
  )
}

/**
 * Fallback when `search_suppliers` RPC is not deployed or not exposed.
 * Mirrors the RPC result shape used by Buyer workspace / SupplierCard.
 */
async function searchSuppliersWithoutRpc(params = {}) {
  const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100)
  const offset = Math.max(Number(params.offset) || 0, 0)
  const rawQ = String(params.query || '').trim()
  const country = String(params.country || '').trim()
  const industry = String(params.industry || '').trim()
  const process = String(params.process || '').trim().toLowerCase()
  const certification = String(params.certification || '').trim().toLowerCase()
  const minAudit =
    params.minAuditScore != null && params.minAuditScore !== '' ? Number(params.minAuditScore) : null
  const maxRisk =
    params.maxRiskScore != null && params.maxRiskScore !== '' ? Number(params.maxRiskScore) : null
  const sortBy = String(params.sortBy || 'score').toLowerCase()

  let q = supabase
    .from('suppliers')
    .select('id, display_name, country, industry, description, created_at, vendor_id, legal_name')
  if (country) q = q.eq('country', country)
  if (industry) q = q.eq('industry', industry)
  if (rawQ) {
    const esc = rawQ.replace(/%/g, '').replace(/_/g, '')
    q = q.or(`display_name.ilike.%${esc}%,legal_name.ilike.%${esc}%,industry.ilike.%${esc}%`)
  }

  const fetchCap = Math.min(offset + limit + 200, 800)
  q = q.limit(fetchCap)

  const { data: supplierRows, error: e1 } = await q
  if (e1) throw e1
  let rows = supplierRows || []

  if (process) {
    const { data: caps, error: e2 } = await supabase
      .from('supplier_capabilities')
      .select('supplier_id, process')
      .limit(3000)
    if (e2) throw e2
    const allowed = new Set(
      (caps || [])
        .filter((c) => String(c.process || '').trim().toLowerCase() === process)
        .map((c) => c.supplier_id),
    )
    rows = rows.filter((s) => allowed.has(s.id))
  }

  if (certification) {
    const { data: certs, error: e3 } = await supabase
      .from('supplier_certifications')
      .select('supplier_id, certification_name, status')
      .eq('status', 'verified')
      .limit(3000)
    if (e3) throw e3
    const vendorIds = new Set(
      (certs || [])
        .filter((c) => String(c.certification_name || '').trim().toLowerCase() === certification)
        .map((c) => c.supplier_id),
    )
    rows = rows.filter((s) => s.vendor_id && vendorIds.has(s.vendor_id))
  }

  const ids = rows.map((r) => r.id).filter(Boolean)
  if (!ids.length) return []

  const [{ data: scoreRows }, { data: auditRows }] = await Promise.all([
    supabase
      .from('supplier_scores')
      .select('supplier_id, overall_score, risk_score, calculated_at')
      .in('supplier_id', ids)
      .order('calculated_at', { ascending: false }),
    supabase
      .from('supplier_audits')
      .select('supplier_id, audit_score, audited_at')
      .in('supplier_id', ids)
      .order('audited_at', { ascending: false }),
  ])

  const latestScore = new Map()
  ;(scoreRows || []).forEach((r) => {
    if (!latestScore.has(r.supplier_id)) latestScore.set(r.supplier_id, r)
  })
  const latestAudit = new Map()
  ;(auditRows || []).forEach((r) => {
    if (!latestAudit.has(r.supplier_id)) latestAudit.set(r.supplier_id, r)
  })

  const vids = [...new Set(rows.map((r) => r.vendor_id).filter(Boolean))]
  const profileByVendor = new Map()
  if (vids.length) {
    const { data: profs, error: e4 } = await supabase
      .from('supplier_profiles')
      .select('supplier_id, profile_completeness')
      .in('supplier_id', vids)
    if (e4) throw e4
    ;(profs || []).forEach((p) => profileByVendor.set(p.supplier_id, Number(p.profile_completeness || 0)))
  }

  const qLower = rawQ.toLowerCase()
  let out = rows.map((s) => {
    const sc = latestScore.get(s.id) || {}
    const au = latestAudit.get(s.id) || {}
    const overall = Number(sc.overall_score || 0)
    const risk = Number(sc.risk_score || 0)
    const auditScore = Number(au.audit_score || 0)
    const completeness = s.vendor_id ? (profileByVendor.get(s.vendor_id) || 0) : 0
    const boosted = Math.round((overall + completeness * 0.2) * 100) / 100
    let relevance = 0
    if (qLower) {
      const n = (s.display_name || '').toLowerCase()
      const l = (s.legal_name || '').toLowerCase()
      if (n.includes(qLower) || l.includes(qLower)) relevance = 2
      else if ((s.industry || '').toLowerCase().includes(qLower)) relevance = 1
    }
    return {
      supplier_id: s.id,
      display_name: s.display_name,
      country: s.country,
      industry: s.industry,
      description: s.description,
      overall_score: overall,
      risk_score: risk,
      latest_audit_score: auditScore,
      profile_completeness: completeness,
      boosted_score: boosted,
      created_at: s.created_at,
      relevance,
    }
  })

  if (minAudit != null && !Number.isNaN(minAudit)) {
    out = out.filter((r) => Number(r.latest_audit_score || 0) >= minAudit)
  }
  if (maxRisk != null && !Number.isNaN(maxRisk)) {
    out = out.filter((r) => Number(r.risk_score || 0) <= maxRisk)
  }

  if (sortBy === 'newest') {
    out.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  } else if (sortBy === 'relevance') {
    out.sort(
      (a, b) =>
        (b.relevance || 0) - (a.relevance || 0)
        || (b.boosted_score || 0) - (a.boosted_score || 0),
    )
  } else {
    out.sort(
      (a, b) =>
        (b.boosted_score || 0) - (a.boosted_score || 0)
        || String(a.display_name || '').localeCompare(String(b.display_name || '')),
    )
  }

  return out.slice(offset, offset + limit)
}

export const supplierSearchService = {
  async search(params = {}) {
    if (!isSupabaseConfigured) return []
    const payload = {
      p_query: params.query || null,
      p_country: params.country || null,
      p_industry: params.industry || null,
      p_process: params.process || null,
      p_certification: params.certification || null,
      p_min_audit_score: params.minAuditScore ?? null,
      p_max_risk_score: params.maxRiskScore ?? null,
      p_sort_by: params.sortBy || 'score',
      p_limit: params.limit || 20,
      p_offset: params.offset || 0,
    }
    const { data, error } = await supabase.rpc('search_suppliers', payload)
    if (!error) return data || []
    if (isSearchSuppliersRpcUnavailable(error)) {
      return searchSuppliersWithoutRpc(params)
    }
    throw error
  },
}

/* ================================================================
   STORAGE — File uploads
   ================================================================ */
export const storageService = {
  /**
   * Upload a file to a company's folder.
   * Path: {companyId}/{entityType}/{entityId}/{filename}
   */
  async upload({ companyId, entityType, entityId, file, bucket = 'documents' }) {
    if (!isSupabaseConfigured) return null
    const path = `${companyId}/${entityType}/${entityId || 'general'}/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) throw error

    // Save metadata
    await fileMetadataService.create({
      company_id: companyId,
      bucket,
      path: data.path,
      original_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      entity_type: entityType,
      entity_id: entityId,
    })

    return data
  },

  /** Get a signed URL for a private file. */
  async getSignedUrl(path, expiresIn = 3600, bucket = 'documents') {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    if (error) throw error
    return data.signedUrl
  },

  /** Get a public URL for a public file. */
  getPublicUrl(path, bucket = 'avatars') {
    if (!isSupabaseConfigured) return null
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  },

  /** Delete a file. */
  async remove(path, bucket = 'documents') {
    if (!isSupabaseConfigured) return null
    const { error } = await supabase.storage.from(bucket).remove([path])
    if (error) throw error
  },

  /** List files in a folder. */
  async listFiles(folder, bucket = 'documents') {
    if (!isSupabaseConfigured) return []
    const { data, error } = await supabase.storage.from(bucket).list(folder)
    if (error) throw error
    return data || []
  },
}

/** Superadmin-only bucket `supplier-directory` — paths: `{supplierId}/{timestamp}_{filename}` */
export const SUPPLIER_DIRECTORY_STORAGE_BUCKET = 'supplier-directory'

const PRESENTATION_MAX_BYTES = 50 * 1024 * 1024

function sanitizeStorageFileName(name) {
  const base = String(name || 'file').replace(/[/\\]/g, '_').replace(/[^\w.\-()+@ ]/g, '_')
  return base.length > 180 ? `${base.slice(0, 120)}_${base.slice(-40)}` : base
}

/** Company profile files — private `documents` bucket, path {companyId}/profile-attachments/... */
const COMPANY_PROFILE_ATTACHMENTS_FOLDER = 'profile-attachments'
const COMPANY_PROFILE_MAX_BYTES = 50 * 1024 * 1024

function sanitizeCompanyProfileFileName(name) {
  const base = String(name || 'file').replace(/[/\\]/g, '_').replace(/[^\w.\-()+@ ]/g, '_')
  return base.length > 180 ? `${base.slice(0, 120)}_${base.slice(-40)}` : base
}

export const companyProfileAttachmentsService = {
  maxBytes: COMPANY_PROFILE_MAX_BYTES,

  /**
   * @returns {{ id: string, path: string, name: string, mime_type: string, size_bytes: number, uploaded_at: string }}
   */
  async upload(companyId, file) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
    if (!companyId || !file) throw new Error('Missing company or file')
    if (file.size > COMPANY_PROFILE_MAX_BYTES) {
      throw new Error(`File too large (max ${Math.round(COMPANY_PROFILE_MAX_BYTES / (1024 * 1024))} MB)`)
    }
    const safe = sanitizeCompanyProfileFileName(file.name)
    const path = `${companyId}/${COMPANY_PROFILE_ATTACHMENTS_FOLDER}/${Date.now()}_${safe}`
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      })
    if (error) throw error
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `cf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    return {
      id,
      path: data.path,
      name: file.name,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      uploaded_at: new Date().toISOString(),
    }
  },

  async remove(path) {
    if (!isSupabaseConfigured) return
    if (!path) return
    const { error } = await supabase.storage.from('documents').remove([path])
    if (error) throw error
  },

  async getSignedUrl(path, expiresIn = 3600) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, expiresIn)
    if (error) throw error
    return data.signedUrl
  },
}

export const supplierDirectoryStorageService = {
  maxBytes: PRESENTATION_MAX_BYTES,

  /**
   * @returns {{ id: string, path: string, name: string, mime_type: string, size_bytes: number, uploaded_at: string }}
   */
  async uploadForRegisteredSupplier(supplierRowId, file) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
    if (!supplierRowId || !file) throw new Error('Missing supplier or file')
    if (file.size > PRESENTATION_MAX_BYTES) {
      throw new Error(`File too large (max ${Math.round(PRESENTATION_MAX_BYTES / (1024 * 1024))} MB)`)
    }
    const safe = sanitizeStorageFileName(file.name)
    const path = `${supplierRowId}/${Date.now()}_${safe}`
    const { data, error } = await supabase.storage
      .from(SUPPLIER_DIRECTORY_STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      })
    if (error) throw error
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `f-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    return {
      id,
      path: data.path,
      name: file.name,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      uploaded_at: new Date().toISOString(),
    }
  },

  async remove(path) {
    if (!isSupabaseConfigured) return
    if (!path) return
    const { error } = await supabase.storage.from(SUPPLIER_DIRECTORY_STORAGE_BUCKET).remove([path])
    if (error) throw error
  },

  async getSignedUrl(path, expiresIn = 3600) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase.storage
      .from(SUPPLIER_DIRECTORY_STORAGE_BUCKET)
      .createSignedUrl(path, expiresIn)
    if (error) throw error
    return data.signedUrl
  },
}

/* ================================================================
   REALTIME — Subscribe to changes
   ================================================================ */
export const realtimeService = {
  /**
   * Subscribe to INSERT/UPDATE/DELETE on a table for the current company.
   * @returns {{ unsubscribe: Function }}
   */
  subscribe(tableName, companyId, callback) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} }
    const channel = supabase
      .channel(`${tableName}_${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => callback(payload)
      )
      .subscribe()
    return { unsubscribe: () => supabase.removeChannel(channel) }
  },
}

/* ================================================================
   CONVENIENCE — Check connectivity
   ================================================================ */
export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured) return { connected: false, reason: 'not_configured' }
  try {
    const { error } = await supabase.from('companies').select('id').limit(1)
    if (error) return { connected: false, reason: error.message }
    return { connected: true }
  } catch (err) {
    return { connected: false, reason: err.message }
  }
}

export { isSupabaseConfigured }
