import {
  isSupabaseConfigured,
  supplierClaimsService,
  supplierUsersService,
  supplierProfilesService,
  supplierProductsService,
  supplierCertificationsService,
  vendorsService,
} from './supabaseService'

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

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

function getCurrentUserEmail() {
  return normalizeEmail(getAuthSnapshot()?.user?.email || '')
}

function computeCompleteness(profile, products, certifications) {
  let score = 0
  if (String(profile?.description || '').trim()) score += 20
  if (Array.isArray(products) && products.length > 0) score += 30
  if (Array.isArray(certifications) && certifications.length > 0) score += 30

  const contactSignals = [
    String(profile?.website || '').trim(),
    normalizeEmail(profile?.contact_email),
    String(profile?.phone || '').trim(),
  ].filter(Boolean).length
  score += Math.round((contactSignals / 3) * 20)
  return Math.min(100, Math.max(0, score))
}

const supplierOwnershipService = {
  async getSupplierSnapshot(supplierId) {
    if (!isSupabaseConfigured || !supplierId) return null
    const [vendor, profileRows, productRows, certRows, claimRows, membershipRows] = await Promise.all([
      vendorsService.getById(supplierId).catch(() => null),
      supplierProfilesService.list(null, { filters: [['supplier_id', 'eq', supplierId]], limit: 1 }).catch(() => []),
      supplierProductsService.list(null, { filters: [['supplier_id', 'eq', supplierId]], orderBy: 'updated_at', ascending: false }).catch(() => []),
      supplierCertificationsService.list(null, { filters: [['supplier_id', 'eq', supplierId]], orderBy: 'created_at', ascending: false }).catch(() => []),
      supplierClaimsService.list(null, { filters: [['supplier_id', 'eq', supplierId]], orderBy: 'created_at', ascending: false }).catch(() => []),
      supplierUsersService.list(null, { filters: [['supplier_id', 'eq', supplierId]] }).catch(() => []),
    ])
    const profile = Array.isArray(profileRows) ? (profileRows[0] || null) : null
    const products = Array.isArray(productRows) ? productRows : []
    const certifications = Array.isArray(certRows) ? certRows : []
    const claims = Array.isArray(claimRows) ? claimRows : []
    const members = Array.isArray(membershipRows) ? membershipRows : []
    const completeness = computeCompleteness(profile || {}, products, certifications)

    // Keep profile completeness in sync without blocking UI.
    if (profile && Number(profile.profile_completeness || 0) !== completeness) {
      void supplierProfilesService
        .upsert({
          supplier_id: supplierId,
          description: profile.description || null,
          website: profile.website || null,
          contact_email: profile.contact_email || null,
          phone: profile.phone || null,
          profile_completeness: completeness,
          updated_by: getCurrentUserId(),
        })
        .catch(() => {})
    }

    return {
      vendor,
      profile: profile
        ? { ...profile, profile_completeness: completeness }
        : {
            supplier_id: supplierId,
            description: '',
            website: '',
            contact_email: '',
            phone: '',
            profile_completeness: completeness,
          },
      products,
      certifications,
      claims,
      members,
      isClaimed: members.length > 0,
      myMemberRole: (() => {
        const uid = getCurrentUserId()
        const mine = members.find((m) => m.user_id === uid)
        return mine?.role || null
      })(),
    }
  },

  async listMyMemberships() {
    if (!isSupabaseConfigured) return []
    const uid = getCurrentUserId()
    if (!uid) return []
    return supplierUsersService.list(null, {
      filters: [['user_id', 'eq', uid]],
      orderBy: 'created_at',
      ascending: false,
    })
  },

  async submitClaim({ supplierId, verificationMethod = 'manual' }) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
    const uid = getCurrentUserId()
    if (!uid) throw new Error('Please sign in to submit a claim')

    const existingMembership = await supplierUsersService.list(null, {
      filters: [['supplier_id', 'eq', supplierId], ['user_id', 'eq', uid]],
      limit: 1,
    })
    if (Array.isArray(existingMembership) && existingMembership.length > 0) {
      throw new Error('You already have access to this supplier profile.')
    }

    const duplicatePending = await supplierClaimsService.list(null, {
      filters: [['supplier_id', 'eq', supplierId], ['user_id', 'eq', uid], ['status', 'eq', 'pending']],
      limit: 1,
    })
    if (Array.isArray(duplicatePending) && duplicatePending.length > 0) {
      throw new Error('You already have a pending claim for this supplier.')
    }

    return supplierClaimsService.create({
      supplier_id: supplierId,
      user_id: uid,
      status: 'pending',
      verification_method: verificationMethod,
    })
  },

  async reviewClaim(claimId, { approve = false, note = '' } = {}) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
    const reviewerId = getCurrentUserId()
    if (!reviewerId) throw new Error('Please sign in to review claims')

    const claim = await supplierClaimsService.getById(claimId)
    if (!claim) throw new Error('Claim not found')

    const status = approve ? 'approved' : 'rejected'
    const updatedClaim = await supplierClaimsService.update(claimId, {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      review_note: String(note || '').trim() || null,
    })

    if (approve) {
      await supplierUsersService.upsert({
        supplier_id: claim.supplier_id,
        user_id: claim.user_id,
        role: 'admin',
        created_by: reviewerId,
      })
    }
    return updatedClaim
  },

  async upsertProfile({ supplierId, description, website, contactEmail, phone }) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
    const uid = getCurrentUserId()
    const products = await supplierProductsService.list(null, { filters: [['supplier_id', 'eq', supplierId]] }).catch(() => [])
    const certs = await supplierCertificationsService.list(null, { filters: [['supplier_id', 'eq', supplierId]] }).catch(() => [])
    const nextProfile = {
      description: String(description || '').trim(),
      website: String(website || '').trim(),
      contact_email: normalizeEmail(contactEmail),
      phone: String(phone || '').trim(),
    }
    const completeness = computeCompleteness(nextProfile, products, certs)
    return supplierProfilesService.upsert({
      supplier_id: supplierId,
      ...nextProfile,
      profile_completeness: completeness,
      updated_by: uid,
    })
  },

  async addProduct({ supplierId, productName, category, manufacturingProcess, material, description }) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
    const uid = getCurrentUserId()
    return supplierProductsService.create({
      supplier_id: supplierId,
      product_name: String(productName || '').trim(),
      category: String(category || '').trim() || null,
      manufacturing_process: String(manufacturingProcess || '').trim() || null,
      material: String(material || '').trim() || null,
      description: String(description || '').trim() || null,
      created_by: uid,
      updated_by: uid,
    })
  },

  async updateProduct(productId, updates = {}) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
    const uid = getCurrentUserId()
    return supplierProductsService.update(productId, {
      ...updates,
      updated_by: uid,
      updated_at: new Date().toISOString(),
    })
  },

  async deleteProduct(productId) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
    return supplierProductsService.remove(productId)
  },

  async submitCertification({ supplierId, certificationName, issuingBody, validUntil }) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
    const uid = getCurrentUserId()
    return supplierCertificationsService.create({
      supplier_id: supplierId,
      certification_name: String(certificationName || '').trim(),
      issuing_body: String(issuingBody || '').trim() || null,
      valid_until: validUntil || null,
      status: 'pending',
      created_by: uid,
    })
  },

  async reviewCertification(certificationId, { verify = false, note = '' } = {}) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
    const reviewerId = getCurrentUserId()
    if (!reviewerId) throw new Error('Please sign in to review certifications')
    const status = verify ? 'verified' : 'rejected'
    return supplierCertificationsService.update(certificationId, {
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_note: String(note || '').trim() || null,
      updated_at: new Date().toISOString(),
    })
  },

  async listPendingClaims() {
    if (!isSupabaseConfigured) return []
    return supplierClaimsService.list(null, {
      filters: [['status', 'eq', 'pending']],
      orderBy: 'created_at',
      ascending: true,
      limit: 500,
    })
  },

  async listPendingCertifications() {
    if (!isSupabaseConfigured) return []
    return supplierCertificationsService.list(null, {
      filters: [['status', 'eq', 'pending']],
      orderBy: 'created_at',
      ascending: true,
      limit: 500,
    })
  },

  getCurrentUserEmail,
}

export default supplierOwnershipService
