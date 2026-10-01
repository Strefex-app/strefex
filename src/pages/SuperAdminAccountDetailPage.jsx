import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { isSupabaseConfigured, companiesService, profilesService, companyProfileAttachmentsService, supabaseAuth } from '../services/supabaseService'
import {
  evaluateCompanyProfileDirectory,
  buildCompanyVisibilityUpdate,
} from '../services/companyProfileVisibilityService'
import {
  PROFILE_ATTACHMENT_SLOT,
  PROFILE_ATTACHMENT_SLOT_LABELS,
  VISIBILITY_TIER_LABELS,
} from '../constants/companyProfileDirectory'
import { useAccountRegistry } from '../store/accountRegistry'
import { ToggleCheckButton } from '../components/ToggleCheckButton'
import CategorySubcategoryChecklist from '../components/CategorySubcategoryChecklist'
import { getEquipmentCategoryTreeForIndustry } from '../data/equipmentByIndustryCategory'
import { getProductCategoryTreeForIndustry } from '../data/productCategoriesByIndustry'
import { ACCOUNT_TYPES } from '../services/stripeService'
import { saveCompanyExternalAudit } from '../services/companyExternalAuditService'
import {
  EXTERNAL_AUDIT_STATUSES,
  EXTERNAL_AUDIT_STATUS_LABELS,
  readExternalAuditFromCompany,
  sellerNeedsAuditDate,
} from '../utils/companyExternalAudit'
import {
  normalizeReceivingPlants,
  readReceivingPlantsFromAccount,
  saveReceivingPlantsToAccount,
} from '../utils/receivingPlantsPersist'
import { buildCompanyTaxonomyWrite, checklistFromIndustryMaps, commitIndustryChecklist, countAccountTaxonomy } from '../utils/companyTaxonomyPayload'
import {
  isAdminCreatedPlaceholderEmail,
  slugifyCompanyName,
  transferSellerAccountRights,
} from '../utils/adminCreateSellerAccount'
import SourcingMetricsFields from '../components/SourcingMetricsFields'
import CompanyProfilePackFields from '../components/CompanyProfilePackFields'
import { syncCatalogueForSlot } from '../utils/companyPackCatalogue'
import CompanyPackCarousel from '../components/CompanyPackCarousel'
import {
  companyPackRegistryPayload,
  isPackDocumentFile,
  normalizeProfileAttachments,
  pickLatestForSlot,
  replacePackSlot,
  COMPANY_PACK_SLOT_IDS,
} from '../utils/companyProfilePack'
import './SuperAdminAccountDetailPage.css'
import {
  emptySourcingMetricsForm,
  mergeSourcingMetricsIntoMetadata,
  parseSourcingMetricsForm,
  sourcingMetricsFormFromSource,
  sourcingMetricsRegistryPatch,
} from '../utils/sourcingMetrics'
import { firstFilledText, firstFilledObject, mergeAccountsPreferFilled, omitEmptyCompanyScalars } from '../utils/keepExistingAccountFields'
import { isCompanyUuid, mergeCompanySources, pickPrimaryProfile } from '../utils/superadminAccountHydrate'
import { superadminSaveCompanyAccount } from '../services/superadminCompanyAccountService'
import {
  AUDIT_AND_SERVICE_EXPERTISE_OPTIONS,
  AUDITOR_EXPERTISE_OPTIONS,
  AUDIT_SERVICE_ITEMS,
} from '../data/auditServices'
import { normalizeIndustryIds, readAuditorVisibleIndustries } from '../utils/auditorIndustryScope'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const PLATFORM_INDUSTRY_OPTIONS = [
  { id: 'general', label: 'General / Other' },
  { id: 'automotive', label: 'Automotive' },
  { id: 'machinery', label: 'Machinery' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'medical', label: 'Medical' },
  { id: 'raw-materials', label: 'Raw Materials' },
  { id: 'oil-gas', label: 'Oil & Gas' },
  { id: 'green-energy', label: 'Green Energy' },
  { id: 'household-products', label: 'Household Products' },
  { id: 'nuclear', label: 'Nuclear' },
]

const SERVICE_PROVIDER_EXPERTISE_OPTIONS = [
  ...AUDIT_AND_SERVICE_EXPERTISE_OPTIONS,
  ...AUDIT_SERVICE_ITEMS,
]

function SaadField({ label, className = '', children }) {
  return (
    <label className={['saad-field', className].filter(Boolean).join(' ')}>
      <span className="saad-field-label">{label}</span>
      {children}
    </label>
  )
}

function readIndustryFromSource(source) {
  const md = source?.metadata && typeof source.metadata === 'object' ? source.metadata : {}
  if (Array.isArray(md.industries) && md.industries[0]) return String(md.industries[0])
  if (Array.isArray(source?.industries) && source.industries[0]) return String(source.industries[0])
  return ''
}

function readTaxonomyMaps(source, extra = {}) {
  const md = source?.metadata && typeof source.metadata === 'object' ? source.metadata : {}
  const pickMap = (...cands) => {
    for (const c of cands) {
      if (c && typeof c === 'object' && !Array.isArray(c) && Object.keys(c).length) return c
    }
    return {}
  }
  return {
    categories: pickMap(md.categories, source?.categories, extra.categories),
    productCategories: pickMap(md.product_categories, source?.productCategories, extra.productCategories),
    equipmentSubcategories: pickMap(md.equipment_subcategories, source?.equipmentSubcategories, extra.equipmentSubcategories),
    productSubcategories: pickMap(md.product_subcategories, source?.productSubcategories, extra.productSubcategories),
  }
}

function readEquipmentCategoriesFromSource(source, industryId) {
  const md = source?.metadata && typeof source.metadata === 'object' ? source.metadata : {}
  const cats = (md.categories && typeof md.categories === 'object')
    ? md.categories
    : (source?.categories && typeof source.categories === 'object' ? source.categories : {})
  if (!industryId) return []
  return Array.isArray(cats[industryId]) ? [...cats[industryId]] : []
}

function readServiceCategoriesFromSource(source) {
  const md = source?.metadata && typeof source.metadata === 'object' ? source.metadata : {}
  if (Array.isArray(md.service_categories)) return [...md.service_categories]
  if (Array.isArray(source?.serviceCategories)) return [...source.serviceCategories]
  return []
}

const ACCOUNT_TYPE_ORDER = ACCOUNT_TYPES.map((t) => t.id)

function readAccountTypesFromSource(source, profile) {
  const md = source?.metadata && typeof source.metadata === 'object' ? source.metadata : {}
  const pmd = profile?.metadata && typeof profile.metadata === 'object' ? profile.metadata : {}
  const fromMeta = Array.isArray(md.account_types) ? md.account_types : null
  const fromProfile = Array.isArray(pmd.account_types) ? pmd.account_types : null
  const fromRegistry = Array.isArray(source?.accountTypes) ? source.accountTypes : null
  const list = (fromMeta && fromMeta.length)
    ? fromMeta
    : (fromProfile && fromProfile.length)
      ? fromProfile
      : (fromRegistry && fromRegistry.length)
        ? fromRegistry
        : [source?.account_type || source?.accountType || pmd.account_type || 'seller']
  const normalized = [...new Set(
    list.map((v) => String(v || '').trim().toLowerCase()).filter((v) => ACCOUNT_TYPE_ORDER.includes(v)),
  )]
  if (!normalized.length) return ['seller']
  const primary = String(
    source?.account_type || source?.accountType || pmd.account_type || normalized[0],
  ).trim().toLowerCase()
  const ordered = []
  if (ACCOUNT_TYPE_ORDER.includes(primary) && normalized.includes(primary)) ordered.push(primary)
  ACCOUNT_TYPE_ORDER.forEach((id) => {
    if (normalized.includes(id) && !ordered.includes(id)) ordered.push(id)
  })
  return ordered
}

function emptyForm() {
  return {
    name: '',
    email: '',
    phone: '',
    website: '',
    country: '',
    city: '',
    address: '',
    account_types: ['seller'],
    plan: 'start',
    contactName: '',
    contactPhone: '',
    contactProfileId: '',
    industryId: '',
    productSubs: {},
    equipmentSubs: {},
    categories: {},
    productCategories: {},
    equipmentSubcategories: {},
    productSubcategories: {},
    serviceCategories: [],
    auditorVisibleIndustries: [],
    sourcingMetrics: emptySourcingMetricsForm(),
  }
}

function decodeParam(raw) {
  if (!raw) return ''
  try {
    return decodeURIComponent(String(raw))
  } catch {
    return String(raw)
  }
}

function findRegistryAccount(key) {
  const k = String(key || '').trim().toLowerCase()
  if (!k) return null
  const accounts = useAccountRegistry.getState().accounts || []
  return (
    accounts.find((a) => {
      const email = String(a?.email || '').trim().toLowerCase()
      const id = String(a?.id || '').trim().toLowerCase()
      const lookup = String(a?.registryLookupKey || '').trim().toLowerCase()
      const cid = String(a?.companyId || a?.company_id || '').trim().toLowerCase()
      return k === email || k === id || k === lookup || (cid && k === cid)
    }) || null
  )
}

/** Map local registry row into the company-shaped object the form expects. */
function companyFromRegistryAccount(acct) {
  if (!acct) return null
  const industries = Array.isArray(acct.industries) ? acct.industries : []
  const categories = acct.categories && typeof acct.categories === 'object' ? acct.categories : {}
  const serviceCategories = Array.isArray(acct.serviceCategories) ? acct.serviceCategories : []
  return {
    id: acct.companyId || acct.company_id || null,
    name: acct.company || acct.name || '',
    email: acct.email || '',
    phone: acct.phone || '',
    website: acct.website || '',
    country: acct.country || '',
    city: acct.city || '',
    address: acct.address || '',
    account_type: acct.accountType || 'seller',
    account_types: Array.isArray(acct.accountTypes) && acct.accountTypes.length
      ? acct.accountTypes
      : [acct.accountType || 'seller'],
    plan: acct.plan || 'start',
    registration_code: acct.registrationCode || '',
    visibility_tier: acct.visibilityTier || acct.visibility_tier || 'basic',
    external_audit_status: acct.externalAuditStatus || 'none',
    external_audit_notes: acct.externalAuditNotes || '',
    external_audit_passed_at: acct.externalAuditPassedAt || null,
    external_audit_planned_at: acct.externalAuditPlannedAt || null,
    external_audit_deadline_at: acct.externalAuditDeadlineAt || null,
    external_audit_assigned_auditor_email: acct.externalAuditAssignedAuditorEmail || '',
    external_audit_assigned_auditor_name: acct.externalAuditAssignedAuditorName || '',
    strefex_verified: acct.strefexVerified === true,
    onsite_audit_completed: acct.onsiteAuditCompleted === true,
    profile_attachments: normalizeProfileAttachments(acct.profileAttachments || acct.profile_attachments),
    industries,
    categories,
    productCategories: acct.productCategories && typeof acct.productCategories === 'object' ? acct.productCategories : {},
    equipmentSubcategories: acct.equipmentSubcategories && typeof acct.equipmentSubcategories === 'object' ? acct.equipmentSubcategories : {},
    productSubcategories: acct.productSubcategories && typeof acct.productSubcategories === 'object' ? acct.productSubcategories : {},
    serviceCategories,
    metadata: {
      ...(acct.metadata || {}),
      address: acct.address || null,
      receiving_plants: acct.receivingPlants || acct.metadata?.receiving_plants || [],
      industries,
      categories,
      product_categories: acct.productCategories || {},
      equipment_subcategories: acct.equipmentSubcategories || {},
      product_subcategories: acct.productSubcategories || {},
      service_categories: serviceCategories,
    },
    _local: true,
    _registryKey: acct.email || acct.id,
    _contactName: acct.name || acct.contactName || acct.fullName || '',
    _contactPhone: acct.phone || '',
    _profileId: UUID_RE.test(String(acct.id || '')) ? acct.id : null,
  }
}

/** Hydrate form from dashboard list stub when registry / company row is missing. */
function companyFromAccountStub(stub) {
  if (!stub) return null
  const profileId = UUID_RE.test(String(stub.id || '')) ? stub.id : null
  const industries = Array.isArray(stub.industries) ? stub.industries : []
  const categories = stub.categories && typeof stub.categories === 'object' ? stub.categories : {}
  const serviceCategories = Array.isArray(stub.serviceCategories) ? stub.serviceCategories : []
  return {
    id: stub.companyId || stub.company_id || null,
    name: stub.company || stub.companyName || '',
    email: stub.email || '',
    phone: stub.phone || '',
    website: stub.website || '',
    country: stub.country || '',
    city: stub.city || '',
    address: stub.address || '',
    account_type: stub.accountType || 'seller',
    account_types: Array.isArray(stub.accountTypes) && stub.accountTypes.length
      ? stub.accountTypes
      : [stub.accountType || 'seller'],
    plan: stub.plan || 'start',
    registration_code: stub.registrationCode || '',
    visibility_tier: stub.visibilityTier || stub.visibility_tier || 'basic',
    external_audit_status: stub.externalAuditStatus || stub.external_audit_status || 'none',
    external_audit_notes: stub.externalAuditNotes || stub.external_audit_notes || '',
    external_audit_passed_at: stub.externalAuditPassedAt || stub.external_audit_passed_at || null,
    external_audit_planned_at: stub.externalAuditPlannedAt || stub.external_audit_planned_at || null,
    external_audit_deadline_at: stub.externalAuditDeadlineAt || stub.external_audit_deadline_at || null,
    external_audit_assigned_auditor_email: stub.externalAuditAssignedAuditorEmail || stub.external_audit_assigned_auditor_email || '',
    external_audit_assigned_auditor_name: stub.externalAuditAssignedAuditorName || stub.external_audit_assigned_auditor_name || '',
    strefex_verified: stub.strefexVerified === true || stub.strefex_verified === true,
    onsite_audit_completed: stub.onsiteAuditCompleted === true || stub.onsite_audit_completed === true,
    profile_attachments: [],
    industries,
    categories,
    productCategories: stub.productCategories && typeof stub.productCategories === 'object' ? stub.productCategories : {},
    equipmentSubcategories: stub.equipmentSubcategories && typeof stub.equipmentSubcategories === 'object' ? stub.equipmentSubcategories : {},
    productSubcategories: stub.productSubcategories && typeof stub.productSubcategories === 'object' ? stub.productSubcategories : {},
    serviceCategories,
    metadata: {
      ...(stub.metadata || {}),
      address: stub.address || null,
      receiving_plants: stub.receivingPlants || stub.metadata?.receiving_plants || [],
      industries,
      categories,
      product_categories: stub.productCategories || {},
      equipment_subcategories: stub.equipmentSubcategories || {},
      product_subcategories: stub.productSubcategories || {},
      service_categories: serviceCategories,
    },
    _local: true,
    _fromStub: true,
    _registryKey: stub.email || stub.id,
    _contactName: stub.name || stub.contactName || stub.fullName || '',
    _contactPhone: stub.phone || '',
    _profileId: profileId,
  }
}

async function loadCloudCompany(cid) {
  const [c, plist] = await Promise.all([
    companiesService.getById(cid),
    profilesService.listForCompany(cid),
  ])
  return { c, plist: Array.isArray(plist) ? plist : [] }
}

export default function SuperAdminAccountDetailPage() {
  const { companyId: companyIdParam, accountKey: accountKeyParam } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const updateAccount = useAccountRegistry((s) => s.updateAccount)
  const registerAccount = useAccountRegistry((s) => s.registerAccount)
  const registryAccounts = useAccountRegistry((s) => s.accounts)
  const [company, setCompany] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const [auditStatus, setAuditStatus] = useState('none')
  const [auditNotes, setAuditNotes] = useState('')
  const [auditPlannedAt, setAuditPlannedAt] = useState('')
  const [auditDeadlineAt, setAuditDeadlineAt] = useState('')
  const [auditAuditorEmail, setAuditAuditorEmail] = useState('')
  const [auditAuditorName, setAuditAuditorName] = useState('')
  const [strefexVerified, setStrefexVerified] = useState(false)
  const [onsiteAudited, setOnsiteAudited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [openPath, setOpenPath] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [plants, setPlants] = useState([])
  const [registryKey, setRegistryKey] = useState('')
  /** Resolved Postgres company id when URL was local but stub/profile had a company. */
  const [resolvedCloudId, setResolvedCloudId] = useState('')
  /** Cloud getById failed; editing from list stub / registry only. */
  const [forceLocalEdit, setForceLocalEdit] = useState(false)
  const [transferEmail, setTransferEmail] = useState('')
  const [transferName, setTransferName] = useState('')
  const [packPending, setPackPending] = useState({})
  const [packRemovePaths, setPackRemovePaths] = useState([])
  const [transferInvite, setTransferInvite] = useState(true)
  const [transferring, setTransferring] = useState(false)
  const [sendingLoginEmail, setSendingLoginEmail] = useState(false)
  const [loginActionLink, setLoginActionLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  const routeCompanyId = useMemo(() => {
    const raw = decodeParam(companyIdParam)
    return UUID_RE.test(raw) ? raw : ''
  }, [companyIdParam])

  const localLookupKey = useMemo(() => {
    const fromLocalRoute = decodeParam(accountKeyParam)
    if (fromLocalRoute) return fromLocalRoute
    const raw = decodeParam(companyIdParam)
    if (raw && !UUID_RE.test(raw)) return raw
    return ''
  }, [accountKeyParam, companyIdParam])

  const companyId = forceLocalEdit ? '' : (resolvedCloudId || routeCompanyId)
  const isCloud = Boolean(companyId)
  const isLocal = forceLocalEdit || (Boolean(localLookupKey) && !routeCompanyId && !resolvedCloudId)

  const accountStub = location.state?.accountStub || null

  const syncFormFromCompany = useCallback((c, plist) => {
    const emailHint = c?.email || c?._registryKey || accountStub?.email
    const primary = pickPrimaryProfile(plist, emailHint)
    const reg = findRegistryAccount(c?.email || c?._registryKey || c?.id)
      || findRegistryAccount(primary?.email)
      || findRegistryAccount(accountStub?.email)
      || findRegistryAccount(localLookupKey)
    const maps = readTaxonomyMaps(c, {
      categories: firstFilledObject(c?.categories, reg?.categories, accountStub?.categories),
      productCategories: firstFilledObject(c?.productCategories, reg?.productCategories, accountStub?.productCategories),
      equipmentSubcategories: firstFilledObject(c?.equipmentSubcategories, reg?.equipmentSubcategories, accountStub?.equipmentSubcategories),
      productSubcategories: firstFilledObject(c?.productSubcategories, reg?.productSubcategories, accountStub?.productSubcategories),
    })
    const industryId = (Array.isArray(c?.industries) && c.industries[0])
      || (Array.isArray(reg?.industries) && reg.industries[0])
      || (Array.isArray(accountStub?.industries) && accountStub.industries[0])
      || readIndustryFromSource(c)
      || readIndustryFromSource(primary)
      || Object.keys(maps.categories)[0]
      || Object.keys(maps.productCategories)[0]
      || ''
    const accountTypes = readAccountTypesFromSource(c, primary)
    const filledName = firstFilledText(
      c?.name,
      c?.company,
      reg?.company,
      accountStub?.company,
      primary?.company_name,
      primary?.metadata?.company_name,
    )
    setCompany((prev) => ({
      ...(prev && (prev.id === c?.id || !c?.id) ? prev : {}),
      ...c,
      name: filledName || c?.name || prev?.name || '',
      account_types: accountTypes.length ? accountTypes : (c?.account_types || prev?.account_types),
      account_type: accountTypes[0] || c?.account_type || 'seller',
    }))
    setForm({
      ...emptyForm(),
      name: filledName,
      email: firstFilledText(c?.email, primary?.email, reg?.email, accountStub?.email),
      phone: firstFilledText(c?.phone, primary?.phone, reg?.phone, accountStub?.phone),
      website: firstFilledText(c?.website, reg?.website, accountStub?.website),
      country: firstFilledText(c?.country, reg?.country, accountStub?.country),
      city: firstFilledText(c?.city, reg?.city, accountStub?.city),
      address: firstFilledText(c?.address, c?.metadata?.address, reg?.address, accountStub?.address),
      account_types: accountTypes.length ? accountTypes : ['seller'],
      plan: c?.plan || reg?.plan || accountStub?.plan || 'start',
      contactName: firstFilledText(primary?.full_name, c?._contactName, reg?.contactName, accountStub?.contactName, accountStub?.name),
      contactPhone: firstFilledText(primary?.phone, c?._contactPhone, c?.phone, reg?.phone),
      contactProfileId: primary?.id || c?._profileId || '',
      industryId,
      categories: maps.categories,
      productCategories: maps.productCategories,
      equipmentSubcategories: maps.equipmentSubcategories,
      productSubcategories: maps.productSubcategories,
      productSubs: checklistFromIndustryMaps(industryId, maps.productCategories, maps.productSubcategories),
      equipmentSubs: checklistFromIndustryMaps(industryId, maps.categories, maps.equipmentSubcategories),
      serviceCategories: (() => {
        const fromCompany = readServiceCategoriesFromSource(c)
        if (fromCompany.length) return fromCompany
        const fromProfile = readServiceCategoriesFromSource(primary)
        if (fromProfile.length) return fromProfile
        if (Array.isArray(reg?.serviceCategories) && reg.serviceCategories.length) return [...reg.serviceCategories]
        if (Array.isArray(accountStub?.serviceCategories) && accountStub.serviceCategories.length) {
          return [...accountStub.serviceCategories]
        }
        return []
      })(),
      auditorVisibleIndustries: readAuditorVisibleIndustries({
        ...c,
        metadata: c?.metadata,
        industries: c?.industries || reg?.industries || accountStub?.industries,
        auditorVisibleIndustries: reg?.auditorVisibleIndustries || accountStub?.auditorVisibleIndustries,
      }),
      sourcingMetrics: sourcingMetricsFormFromSource(c, reg),
    })
    const plantsFromSources = readReceivingPlantsFromAccount(
      { receivingPlants: c?.metadata?.receiving_plants || reg?.receivingPlants || accountStub?.receivingPlants },
      c,
    )
    setPlants(plantsFromSources.length ? plantsFromSources : normalizeReceivingPlants([]))
  }, [accountStub, localLookupKey])

  const applyAuditFields = useCallback((source) => {
    const audit = readExternalAuditFromCompany(source)
    setAuditStatus(audit.status || 'none')
    setAuditNotes(audit.notes || '')
    setAuditPlannedAt(audit.plannedAt || '')
    setAuditDeadlineAt(audit.deadlineAt || '')
    setAuditAuditorEmail(audit.auditorEmail || '')
    setAuditAuditorName(audit.auditorName || '')
    setStrefexVerified(audit.strefexVerified === true)
    setOnsiteAudited(audit.onsiteAudited === true)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setPackPending({})
    setPackRemovePaths([])

    const registryHit = findRegistryAccount(localLookupKey)
      || findRegistryAccount(accountStub?.email)
      || findRegistryAccount(accountStub?.id)
      || findRegistryAccount(accountStub?.companyId)
      || findRegistryAccount(routeCompanyId)
    const localShaped = companyFromRegistryAccount(registryHit)
    const stubShaped = companyFromAccountStub(accountStub)

    const applyMerged = (cloud, plist = [], extraProfile = null) => {
      const primary = pickPrimaryProfile(plist, cloud?.email || localShaped?.email || stubShaped?.email || extraProfile?.email)
        || extraProfile
      const merged = mergeCompanySources(cloud, localShaped, stubShaped, primary)
      if (!merged) return false
      const cid = isCompanyUuid(merged.id) ? String(merged.id) : ''
      setResolvedCloudId(cid)
      setForceLocalEdit(!cid)
      setRegistryKey(merged._registryKey || merged.email || localLookupKey || '')
      setProfiles(Array.isArray(plist) && plist.length ? plist : (primary ? [primary] : []))
      applyAuditFields(merged)
      syncFormFromCompany(merged, Array.isArray(plist) && plist.length ? plist : (primary ? [primary] : []))
      return true
    }

    try {
      if (isSupabaseConfigured) {
        const candidateIds = [
          routeCompanyId,
          accountStub?.companyId,
          accountStub?.company_id,
          registryHit?.companyId,
          registryHit?.company_id,
        ].map((v) => String(v || '').trim()).filter(isCompanyUuid)

        let loaded = null
        for (const cid of [...new Set(candidateIds)]) {
          try {
            loaded = { cid, ...(await loadCloudCompany(cid)) }
            break
          } catch {
            /* try next uuid */
          }
        }

        if (!loaded) {
          const profileId =
            (isCompanyUuid(accountStub?.id) && String(accountStub.id))
            || (isCompanyUuid(localLookupKey) && String(localLookupKey))
            || ''
          const emailHint = firstFilledText(accountStub?.email, registryHit?.email, localLookupKey.includes('@') ? localLookupKey : '')
          let row = null
          try {
            if (profileId) row = await profilesService.getByIdWithCompany(profileId)
            if (!row && emailHint.includes('@')) row = await profilesService.getByEmailWithCompany(emailHint)
          } catch {
            row = null
          }
          if (row) {
            const coRaw = row?.companies
            const co = Array.isArray(coRaw) ? coRaw[0] : coRaw
            const cid = co?.id || row?.company_id
            if (isCompanyUuid(cid)) {
              try {
                loaded = { cid: String(cid), ...(await loadCloudCompany(String(cid))), profileRow: row }
              } catch {
                loaded = { cid: String(cid), c: co || null, plist: [row], profileRow: row }
              }
            } else {
              loaded = { cid: '', c: null, plist: [row], profileRow: row }
            }
          }
        }

        if (loaded?.c) {
          applyMerged(loaded.c, loaded.plist, loaded.profileRow)
          setLoading(false)
          return
        }
        if (loaded?.plist?.length) {
          applyMerged(null, loaded.plist, loaded.profileRow)
          setLoading(false)
          return
        }
      }

      if (applyMerged(null, [])) {
        setLoading(false)
        return
      }

      setCompany(null)
      setProfiles([])
      setRegistryKey('')
      setResolvedCloudId('')
      setForceLocalEdit(false)
      setError('Account not found. Open Edit from the accounts list, or ensure this profile is linked to a company.')
    } catch (e) {
      if (applyMerged(null, [])) {
        setError(e?.message ? `Loaded saved account data. Database refresh failed: ${e.message}` : '')
      } else {
        setCompany(null)
        setError(e?.message || 'Failed to load company.')
      }
    } finally {
      setLoading(false)
    }
  }, [
    accountStub,
    applyAuditFields,
    localLookupKey,
    routeCompanyId,
    syncFormFromCompany,
  ])

  useEffect(() => {
    void load()
  }, [load])

  const snapshot = useMemo(() => (company ? evaluateCompanyProfileDirectory(company) : null), [company])

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const applyIndustryCommit = (prev) => {
    const committed = commitIndustryChecklist({
      industryId: prev.industryId,
      productSubs: prev.productSubs,
      equipmentSubs: prev.equipmentSubs,
      categories: prev.categories,
      productCategories: prev.productCategories,
      equipmentSubcategories: prev.equipmentSubcategories,
      productSubcategories: prev.productSubcategories,
    })
    return {
      ...prev,
      categories: committed.categories,
      productCategories: committed.productCategories,
      equipmentSubcategories: committed.equipmentSubcategories,
      productSubcategories: committed.productSubcategories,
    }
  }

  const switchIndustry = (industryId) => {
    setForm((prev) => {
      const committed = applyIndustryCommit(prev)
      return {
        ...committed,
        industryId,
        productSubs: checklistFromIndustryMaps(industryId, committed.productCategories, committed.productSubcategories),
        equipmentSubs: checklistFromIndustryMaps(industryId, committed.categories, committed.equipmentSubcategories),
      }
    })
  }

  const removeIndustryPath = (industryId) => {
    setForm((prev) => {
      const committed = applyIndustryCommit(prev)
      const nextCategories = { ...committed.categories }
      const nextProduct = { ...committed.productCategories }
      const nextEqSubs = { ...committed.equipmentSubcategories }
      const nextProdSubs = { ...committed.productSubcategories }
      delete nextCategories[industryId]
      delete nextProduct[industryId]
      delete nextEqSubs[industryId]
      delete nextProdSubs[industryId]
      const remaining = Object.keys({ ...nextCategories, ...nextProduct, ...nextEqSubs, ...nextProdSubs })
      const nextId = remaining[0] || ''
      return {
        ...committed,
        categories: nextCategories,
        productCategories: nextProduct,
        equipmentSubcategories: nextEqSubs,
        productSubcategories: nextProdSubs,
        industryId: nextId,
        productSubs: checklistFromIndustryMaps(nextId, nextProduct, nextProdSubs),
        equipmentSubs: checklistFromIndustryMaps(nextId, nextCategories, nextEqSubs),
      }
    })
  }

  const updatePlantField = (id, key, value) => {
    const parsed = key === 'lat' || key === 'lon' ? (parseFloat(value) || 0) : value
    setPlants((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: parsed } : p)))
  }

  const addPlant = () => {
    setPlants((prev) => [
      ...prev,
      {
        id: `plant-${Date.now()}`,
        name: 'New plant',
        cc: 'DE',
        lat: 50,
        lon: 10,
        cont: 'EU',
      },
    ])
  }

  const removePlant = (id) => {
    setPlants((prev) => {
      const left = prev.filter((p) => p.id !== id)
      return left.length ? left : prev
    })
  }

  const openAttachment = async (path) => {
    if (!path || !isSupabaseConfigured) return
    setOpenPath(path)
    try {
      const url = await companyProfileAttachmentsService.getSignedUrl(path, 3600)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      /* silent */
    } finally {
      setOpenPath('')
    }
  }

  const storedPackFiles = normalizeProfileAttachments(company?.profile_attachments)

  const pickPackFile = (slot, file) => {
    if (!file) return
    if (!isPackDocumentFile(file)) {
      setError('Company pack files must be PDF or PowerPoint.')
      return
    }
    if (file.size > companyProfileAttachmentsService.maxBytes) {
      setError(`File too large (max ${Math.round(companyProfileAttachmentsService.maxBytes / (1024 * 1024))} MB).`)
      return
    }
    setError('')
    const current = pickLatestForSlot(storedPackFiles, slot)
    setPackPending((prev) => ({ ...prev, [slot]: file }))
    if (current?.path) {
      setPackRemovePaths((prev) => (prev.includes(current.path) ? prev : [...prev, current.path]))
    }
  }

  const clearPendingPack = (slot) => {
    const current = pickLatestForSlot(storedPackFiles, slot)
    setPackPending((prev) => {
      const next = { ...prev }
      delete next[slot]
      return next
    })
    if (current?.path) {
      setPackRemovePaths((prev) => prev.filter((p) => p !== current.path))
    }
  }

  const removeStoredPack = (file) => {
    if (!file?.path) return
    const slot = file.profile_slot
    const extra = storedPackFiles
      .filter((a) => a.profile_slot === PROFILE_ATTACHMENT_SLOT.PACK_CATALOGUE && a.pack_source_slot === slot)
      .map((a) => a.path)
    setPackRemovePaths((prev) => [...new Set([...prev, file.path, ...extra])])
    setCompany((prev) => prev ? {
      ...prev,
      profile_attachments: (prev.profile_attachments || []).filter(
        (a) => a.path !== file.path && !(a.profile_slot === PROFILE_ATTACHMENT_SLOT.PACK_CATALOGUE && a.pack_source_slot === slot),
      ),
    } : prev)
  }

  const flushCompanyPack = async (baseList) => {
    const uploadId = String(companyId || company?.id || '')
    const canStore = isSupabaseConfigured && UUID_RE.test(uploadId)
    if (Object.keys(packPending).length && !canStore) {
      throw new Error('Company pack uploads need a linked cloud company UUID.')
    }
    let next = normalizeProfileAttachments(baseList).filter((a) => !packRemovePaths.includes(a.path))
    if (canStore) {
      const removedSlots = new Set()
      normalizeProfileAttachments(baseList).forEach((row) => {
        if (packRemovePaths.includes(row.path) && COMPANY_PACK_SLOT_IDS.includes(row.profile_slot)) {
          removedSlots.add(row.profile_slot)
        }
      })
      for (const slot of COMPANY_PACK_SLOT_IDS) {
        const file = packPending[slot]
        if (!file) continue
        const meta = await companyProfileAttachmentsService.upload(uploadId, file, slot)
        next = replacePackSlot(next, slot, meta)
        next = await syncCatalogueForSlot({
          companyId: uploadId,
          slot,
          sourceFile: file,
          attachments: next,
          upload: (cid, f, s, opts) => companyProfileAttachmentsService.upload(cid, f, s, opts),
          remove: (p) => companyProfileAttachmentsService.remove(p),
        })
        removedSlots.delete(slot)
      }
      for (const slot of removedSlots) {
        next = await syncCatalogueForSlot({
          companyId: uploadId,
          slot,
          sourceFile: null,
          attachments: next,
          upload: (cid, f, s, opts) => companyProfileAttachmentsService.upload(cid, f, s, opts),
          remove: (p) => companyProfileAttachmentsService.remove(p),
        })
      }
      for (const path of packRemovePaths) {
        try {
          await companyProfileAttachmentsService.remove(path)
        } catch { /* already gone */ }
      }
    }
    return companyPackRegistryPayload(next)
  }

  const saveAccountProfile = async () => {
    if (!company) return
    const existingLocal = findRegistryAccount(registryKey)
      || findRegistryAccount(form.email)
      || findRegistryAccount(company.email)
      || findRegistryAccount(company.id)
      || {}
    const resolvedName = firstFilledText(form.name, company.name, company.company, existingLocal.company)
    if (!resolvedName) {
      setError('Company name is required.')
      return
    }
    setSavingProfile(true)
    setError('')
    setSavedMsg('')
    try {
      const nextAddress = form.address.trim()
      const emailKey = (form.email || company.email || registryKey || existingLocal.email || '').trim().toLowerCase()
      const lookup = registryKey || emailKey || company._registryKey
      const nextIndustryId = String(form.industryId || '').trim()
      const committed = commitIndustryChecklist({
        industryId: nextIndustryId,
        productSubs: form.productSubs,
        equipmentSubs: form.equipmentSubs,
        categories: firstFilledObject(form.categories, company.categories, company.metadata?.categories, existingLocal.categories),
        productCategories: firstFilledObject(form.productCategories, company.productCategories, company.metadata?.product_categories, existingLocal.productCategories),
        equipmentSubcategories: firstFilledObject(form.equipmentSubcategories, company.equipmentSubcategories, company.metadata?.equipment_subcategories, existingLocal.equipmentSubcategories),
        productSubcategories: firstFilledObject(form.productSubcategories, company.productSubcategories, company.metadata?.product_subcategories, existingLocal.productSubcategories),
      })
      const nextIndustries = committed.industries.length
        ? committed.industries
        : (Array.isArray(company.industries) && company.industries.length
          ? company.industries
          : (Array.isArray(existingLocal.industries) ? existingLocal.industries : []))
      const nextCategories = committed.categories
      const nextProductCategories = committed.productCategories
      const nextEquipmentSubcategories = committed.equipmentSubcategories
      const nextProductSubcategories = committed.productSubcategories
      const nextServiceCategories = Array.isArray(form.serviceCategories) && form.serviceCategories.length
        ? [...form.serviceCategories]
        : (Array.isArray(company.service_categories) && company.service_categories.length
          ? [...company.service_categories]
          : (Array.isArray(company.metadata?.service_categories) && company.metadata.service_categories.length
            ? [...company.metadata.service_categories]
            : (Array.isArray(existingLocal.serviceCategories) ? [...existingLocal.serviceCategories] : [])))
      const nextAccountTypes = (() => {
        const raw = Array.isArray(form.account_types) ? form.account_types : []
        const cleaned = [...new Set(
          raw.map((v) => String(v || '').trim().toLowerCase()).filter((v) => ACCOUNT_TYPE_ORDER.includes(v)),
        )]
        if (!cleaned.length) throw new Error('Select at least one account type (seller, buyer, etc.).')
        // Keep form order (first checked primary), then fill remaining in platform order.
        const ordered = []
        cleaned.forEach((id) => { if (!ordered.includes(id)) ordered.push(id) })
        return ordered
      })()
      const nextAuditorVisible = nextAccountTypes.includes('auditor')
        ? normalizeIndustryIds(form.auditorVisibleIndustries)
        : []
      const nextSourcingMetrics = parseSourcingMetricsForm(form.sourcingMetrics)
      const sourcingRegistryPatch = sourcingMetricsRegistryPatch(nextSourcingMetrics)
      const primaryAccountType = nextAccountTypes[0]
      const nextPack = await flushCompanyPack(company.profile_attachments)

      const taxonomy = buildCompanyTaxonomyWrite({
        industries: nextIndustries,
        categories: nextCategories,
        productCategories: nextProductCategories,
        equipmentSubcategories: nextEquipmentSubcategories,
        productSubcategories: nextProductSubcategories,
        serviceCategories: nextServiceCategories,
        accountType: primaryAccountType,
        accountTypes: nextAccountTypes,
        existingMetadata: mergeSourcingMetricsIntoMetadata({
          ...(company.metadata || {}),
          address: nextAddress || company.address || company.metadata?.address || null,
          auditor_visible_industries: nextAuditorVisible,
          admin_taxonomy_unlocked: true,
        }, nextSourcingMetrics),
      })
      const companyPayload = omitEmptyCompanyScalars({
        name: resolvedName,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        address: nextAddress || null,
        plan: form.plan || company.plan,
        ...taxonomy.companyColumns,
      }, company)
      const mergedPreview = {
        ...company,
        ...companyPayload,
        industries: nextIndustries,
        profile_attachments: nextPack,
      }
      const vis = buildCompanyVisibilityUpdate(mergedPreview)
      if (vis.visibility_tier && vis.visibility_tier !== 'basic') {
        companyPayload.visibility_tier = vis.visibility_tier
      }
      companyPayload.profile_attachments = nextPack
      if (!isCompanyUuid(companyId || company.id)) {
        companyPayload.slug = `${slugifyCompanyName(resolvedName)}-${Date.now().toString(36)}`
      }
      companyPayload.metadata = mergeSourcingMetricsIntoMetadata(
        { ...(companyPayload.metadata || {}), ...vis.metadata },
        nextSourcingMetrics,
      )

      let profileId = form.contactProfileId || company._profileId || ''
      let existingProfile = profiles.find((p) => p.id === profileId) || null
      if (!profileId && emailKey && isSupabaseConfigured) {
        try {
          const row = await profilesService.getByEmailWithCompany(emailKey)
          if (row?.id) {
            profileId = row.id
            existingProfile = row
          }
        } catch { /* lookup optional */ }
      }
      if (!profileId && profiles[0]?.id) {
        profileId = profiles[0].id
        existingProfile = profiles[0]
      }

      const profilePatch = {
        ...(form.contactName.trim() ? { full_name: form.contactName.trim() } : {}),
        ...(form.contactPhone.trim() ? { phone: form.contactPhone.trim() } : {}),
        metadata: mergeSourcingMetricsIntoMetadata({
          ...(existingProfile?.metadata || company.metadata || {}),
          ...taxonomy.metadataPatch,
        }, nextSourcingMetrics),
      }

      let updated = null
      if (isSupabaseConfigured) {
        const saved = await superadminSaveCompanyAccount({
          companyId: companyId || company.id,
          profileId,
          companyPayload,
          profilePatch,
        })
        updated = saved.company
        if (saved.profile) existingProfile = saved.profile
      } else if (!lookup && !emailKey) {
        throw new Error('Missing account key.')
      }

      const savedCompanyId = isCompanyUuid(updated?.id)
        ? String(updated.id)
        : (isCompanyUuid(companyId) ? String(companyId) : (isCompanyUuid(company.id) ? String(company.id) : ''))

      if (updated) {
        setResolvedCloudId(savedCompanyId)
        setForceLocalEdit(false)
        setCompany(mergeCompanySources(updated, companyFromRegistryAccount(existingLocal), companyFromAccountStub(accountStub), existingProfile))
      }

      const registryPatch = mergeAccountsPreferFilled({
        company: resolvedName,
        name: form.contactName.trim(),
        email: emailKey,
        phone: form.phone.trim() || form.contactPhone.trim(),
        website: form.website.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        address: nextAddress,
        accountType: primaryAccountType,
        accountTypes: nextAccountTypes,
        plan: form.plan,
        industries: nextIndustries,
        categories: nextCategories,
        productCategories: nextProductCategories,
        equipmentSubcategories: nextEquipmentSubcategories,
        productSubcategories: nextProductSubcategories,
        serviceCategories: nextServiceCategories,
        auditorVisibleIndustries: nextAuditorVisible,
      }, existingLocal)
      Object.assign(registryPatch, {
        receivingPlants: normalizeReceivingPlants(plants),
        companyId: savedCompanyId || existingLocal.companyId || undefined,
        ...sourcingRegistryPatch,
        visibilityTier: updated?.visibility_tier || companyPayload.visibility_tier || existingLocal.visibilityTier || undefined,
        profileAttachments: nextPack,
      })
      let updatedLocal = lookup ? updateAccount(lookup, registryPatch) : null
      if (!updatedLocal && emailKey) updatedLocal = updateAccount(emailKey, registryPatch)
      if (!updatedLocal && emailKey) {
        updatedLocal = registerAccount({
          id: profileId || savedCompanyId || `local-${Date.now()}`,
          email: emailKey || lookup,
          ...registryPatch,
          accountType: primaryAccountType,
          plan: form.plan || 'start',
        })
      }

      if (plants.length) {
        await saveReceivingPlantsToAccount({
          plants,
          email: emailKey || lookup,
          companyId: savedCompanyId || null,
          updateAccount,
          tenant: updated,
        })
      }

      if (profileId) {
        setProfiles((prev) => {
          const nextMeta = profilePatch.metadata || {}
          const found = prev.some((p) => p.id === profileId)
          const row = {
            id: profileId,
            full_name: form.contactName.trim() || existingProfile?.full_name || '',
            phone: form.contactPhone.trim() || existingProfile?.phone || '',
            company_id: savedCompanyId || companyId,
            email: emailKey || form.email,
            metadata: { ...(existingProfile?.metadata || {}), ...nextMeta },
          }
          if (!found) return [row, ...prev]
          return prev.map((p) => (p.id === profileId ? { ...p, ...row, metadata: { ...(p.metadata || {}), ...nextMeta } } : p))
        })
        setForm((prev) => ({ ...prev, contactProfileId: profileId }))
      }

      if (updatedLocal && !updated) {
        setCompany(companyFromRegistryAccount({ ...updatedLocal, profileAttachments: nextPack, ...sourcingRegistryPatch }))
        setRegistryKey(updatedLocal.email || updatedLocal.id || lookup)
      } else if (updatedLocal) {
        setRegistryKey(updatedLocal.email || updatedLocal.id || lookup)
      }

      setPackPending({})
      setPackRemovePaths([])
      if (!isSupabaseConfigured) {
        setSavedMsg('Account profile saved locally. Database is not configured.')
      } else if (!updated) {
        throw new Error('Could not save this account to the database.')
      } else {
        setSavedMsg('Account profile saved to the database.')
        if (savedCompanyId && savedCompanyId !== routeCompanyId) {
          navigate(`/admin-dashboard/account/${savedCompanyId}`, {
            replace: true,
            state: { accountStub: { ...(accountStub || {}), companyId: savedCompanyId, email: emailKey, company: resolvedName } },
          })
        } else {
          await load()
        }
      }
    } catch (e) {
      setError(e?.message || 'Failed to save account profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const transferToRealSeller = async () => {
    if (!company) return
    setTransferring(true)
    setError('')
    setSavedMsg('')
    try {
      const result = await transferSellerAccountRights({
        companyId: companyId || null,
        registryKey: registryKey || form.email || company.email,
        currentEmail: form.email || company.email,
        newEmail: transferEmail,
        contactName: transferName || form.contactName,
        sendInvite: transferInvite && isSupabaseConfigured,
        updateAccount,
        inviteTeamUser: isSupabaseConfigured
          ? (args) => supabaseAuth.inviteTeamUser(args)
          : null,
        companiesUpdate: isSupabaseConfigured && companyId
          ? (id, updates) => companiesService.update(id, updates)
          : null,
        profilesUpdate: isSupabaseConfigured
          ? (payload) => profilesService.updateProfilePrivileged(payload)
          : null,
        existingMetadata: company.metadata || {},
      })
      setForm((prev) => ({
        ...prev,
        email: result.email,
        contactName: transferName.trim() || prev.contactName,
      }))
      setRegistryKey(result.email)
      if (result.company) setCompany(result.company)
      else setCompany((prev) => (prev ? { ...prev, email: result.email } : prev))
      const inviteNote = result.inviteError
        ? ''
        : result.invite?.alreadyExists && !result.invite?.delivered
        ? ' Seller email already has a login — a sign-in link was sent if mail is configured.'
        : (result.invite?.delivered || result.invite?.emailConfirmationPending
          ? (result.invite?.channel === 'supabase_otp' || result.invite?.channel === 'supabase_resend'
            ? ' Login email sent via Supabase Auth (invite function was unreachable).'
            : ' Confirmation email sent — seller must open the link to take over login.')
          : (transferInvite && isSupabaseConfigured ? ' Invite requested.' : ''))
      setSavedMsg(`Seller rights transferred to ${result.email}.${inviteNote}`)
      if (result.invite?.actionLink) {
        setLoginActionLink(result.invite.actionLink)
        setLinkCopied(false)
      }
      if (result.inviteError) {
        setError(`Email did not send: ${result.inviteError}`)
      } else if (result.invite?.error) {
        setError(`Email did not send: ${result.invite.error}. Copy the confirmation link below and send it to the seller.`)
      }
      setTransferEmail('')
    } catch (e) {
      setError(e?.message || 'Transfer failed.')
    } finally {
      setTransferring(false)
    }
  }

  const sendSellerLoginEmail = async (rawEmail) => {
    const email = String(rawEmail || form.email || company?.email || '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setError('Set a real seller email before sending confirmation.')
      return
    }
    if (isAdminCreatedPlaceholderEmail(email)) {
      setError('Transfer rights to the seller email first, then send the login email.')
      return
    }
    setSendingLoginEmail(true)
    setError('')
    setSavedMsg('')
    try {
      const invite = await supabaseAuth.inviteTeamUser({
        email,
        fullName: transferName || form.contactName,
        role: 'admin',
        companyId: companyId || null,
        accountType: 'seller',
      })
      if (invite?.actionLink) {
        setLoginActionLink(invite.actionLink)
        setLinkCopied(false)
      }
      if (invite?.delivered || invite?.emailConfirmationPending) {
        setSavedMsg(`Login / confirmation email requested for ${email}. If Resend shows Bounced, copy the link below and send it to the seller.`)
      } else if (invite?.alreadyExists) {
        setSavedMsg(`${email} already has a login. A sign-in link was requested.`)
      } else {
        setSavedMsg(`Invite requested for ${email}.`)
      }
      if (invite?.error) {
        setError(`Email did not send: ${invite.error}. Copy the confirmation link below.`)
      }
    } catch (e) {
      setError(e?.message || 'Could not send confirmation email.')
    } finally {
      setSendingLoginEmail(false)
    }
  }

  const copyLoginActionLink = async () => {
    const link = String(loginActionLink || '').trim()
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
    } catch {
      setError('Could not copy. Select the link and copy it manually.')
    }
  }

  const auditorOptions = useMemo(() => {
    const out = []
    const seen = new Set()
    for (const a of registryAccounts || []) {
      const types = Array.isArray(a.accountTypes) ? a.accountTypes : [a.accountType]
      const isAud = types.some((t) => String(t || '').toLowerCase() === 'auditor')
        || String(a.accountType || '').toLowerCase() === 'auditor'
      if (!isAud) continue
      const email = String(a.email || '').trim().toLowerCase()
      if (!email || seen.has(email)) continue
      seen.add(email)
      out.push({ email, name: a.company || a.name || a.contactName || email })
    }
    return out
  }, [registryAccounts])

  const saveAudit = async () => {
    if (!company) return
    setSaving(true)
    setError('')
    try {
      const chosen = auditorOptions.find((a) => a.email === auditAuditorEmail)
      const auditorName = chosen?.name || auditAuditorName
      const sellerEmail = (form.email || company.email || registryKey || '').trim().toLowerCase()
      const sellerName = form.name || company.name || 'Seller'
      const visNext = {
        ...company,
        external_audit_status: auditStatus,
        external_audit_notes: auditNotes.trim() || null,
        external_audit_planned_at: auditPlannedAt || null,
        external_audit_assigned_auditor_email: auditAuditorEmail || null,
        external_audit_assigned_auditor_name: auditorName || null,
      }
      if (auditStatus === 'passed') {
        visNext.external_audit_passed_at = company.external_audit_passed_at || new Date().toISOString()
      } else {
        visNext.external_audit_passed_at = null
      }
      const vis = buildCompanyVisibilityUpdate(visNext)
      const updated = await saveCompanyExternalAudit({
        companyId: isCloud ? companyId : null,
        sellerEmail,
        sellerName,
        status: auditStatus,
        notes: auditNotes,
        plannedAt: auditPlannedAt,
        deadlineAt: auditDeadlineAt,
        auditorEmail: auditAuditorEmail,
        auditorName,
        strefexVerified,
        completeOnsite: onsiteAudited || auditStatus === 'passed',
        visibilityExtra: isCloud
          ? { visibility_tier: vis.visibility_tier, metadata: vis.metadata }
          : {},
      })
      if (updated) {
        setCompany({ ...company, ...updated })
        applyAuditFields(updated)
      } else {
        const lookup = registryKey || company._registryKey || company.email
        const shaped = companyFromRegistryAccount(
          useAccountRegistry.getState().accounts.find((a) => (
            String(a.email || '').toLowerCase() === String(lookup || '').toLowerCase()
            || a.id === lookup
          )),
        )
        if (shaped) setCompany(shaped)
        applyAuditFields(visNext)
      }
      setSavedMsg('Audit schedule saved. Seller and assigned auditor were notified.')
    } catch (e) {
      setError(e?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const attachments = storedPackFiles
  const otherProfileFiles = attachments.filter(
    (a) => !COMPANY_PACK_SLOT_IDS.includes(a.profile_slot) && a.profile_slot !== PROFILE_ATTACHMENT_SLOT.PACK_CATALOGUE,
  )

  return (
    <AppLayout>
      <div className="saad-page">
        <div className="saad-toolbar">
          <button type="button" className="saad-back" onClick={() => navigate('/admin-dashboard')}>
            ← Back to dashboard
          </button>
        </div>

        {loading && <p className="saad-muted">Loading account data…</p>}
        {error && <div className="saad-error" role="alert">{error}</div>}
        {savedMsg && <div className="saad-ok" role="status">{savedMsg}</div>}

        {!loading && company && (
          <>
            <header className="saad-header">
              <div>
                <h1 className="saad-title">{company.name || 'Company'}</h1>
                <p className="saad-sub">
                  <span className="saad-code-label">Platform number</span>
                  {' '}
                  <span className="saad-code">{company.registration_code || '—'}</span>
                  {' · '}
                  <span>{VISIBILITY_TIER_LABELS[company.visibility_tier] || company.visibility_tier}</span>
                  {(Array.isArray(company.account_types) ? company.account_types : (company.account_type ? [company.account_type] : [])).length > 0 && (
                    <>
                      {' · '}
                      <span className="saad-type">
                        {(Array.isArray(company.account_types) && company.account_types.length
                          ? company.account_types
                          : [company.account_type]
                        ).join(' + ')}
                      </span>
                    </>
                  )}
                  {isLocal && (
                    <>
                      {' · '}
                      <span className="saad-type">Local registry</span>
                    </>
                  )}
                </p>
              </div>
            </header>

            <div className="saad-grid">
              <section className="saad-card saad-card-wide">
                <h2>Account profile (editable)</h2>
                <p className="saad-muted">
                  Superadmin edits are written to the platform company record in the database. The form is filled from the live account (database, then registry) before you change anything.
                </p>
                <div className="saad-form-block">
                  <p className="saad-form-legend">Company</p>
                  <div className="saad-form-grid">
                    <SaadField label="Company name">
                      <input value={form.name} onChange={(e) => setField('name', e.target.value)} disabled={savingProfile} />
                    </SaadField>
                    <SaadField label="Company email">
                      <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} disabled={savingProfile} />
                    </SaadField>
                    <SaadField label="Phone">
                      <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} disabled={savingProfile} />
                    </SaadField>
                    <SaadField label="Website">
                      <input value={form.website} onChange={(e) => setField('website', e.target.value)} disabled={savingProfile} />
                    </SaadField>
                    <SaadField label="Plan">
                      <select value={form.plan} onChange={(e) => setField('plan', e.target.value)} disabled={savingProfile}>
                        <option value="start">Start</option>
                        <option value="basic">Basic</option>
                        <option value="premium">Premium</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </SaadField>
                  </div>
                </div>

                <div className="saad-form-block">
                  <p className="saad-form-legend">Location</p>
                  <div className="saad-form-grid">
                    <SaadField label="Country">
                      <input value={form.country} onChange={(e) => setField('country', e.target.value)} disabled={savingProfile} />
                    </SaadField>
                    <SaadField label="City">
                      <input value={form.city} onChange={(e) => setField('city', e.target.value)} disabled={savingProfile} />
                    </SaadField>
                    <SaadField label="Address / plant address" className="saad-field-span">
                      <input value={form.address} onChange={(e) => setField('address', e.target.value)} disabled={savingProfile} />
                    </SaadField>
                  </div>
                </div>

                <div className="saad-form-block">
                  <p className="saad-form-legend">Contact</p>
                  <div className="saad-form-grid">
                    <SaadField label="Contact full name">
                      <input value={form.contactName} onChange={(e) => setField('contactName', e.target.value)} disabled={savingProfile} />
                    </SaadField>
                    <SaadField label="Contact phone">
                      <input value={form.contactPhone} onChange={(e) => setField('contactPhone', e.target.value)} disabled={savingProfile} />
                    </SaadField>
                  </div>
                </div>

                <div className="saad-section">
                  <h3 className="saad-h3">Account types</h3>
                  <p className="saad-muted">
                    Check Seller, Buyer, and Service Provider together when the company needs more than one sourcing path. Superadmin additions are stored in the database and are not limited by the account plan.
                  </p>
                  <div className="saad-account-type-checks">
                    {ACCOUNT_TYPES.map((type) => {
                      const selected = Array.isArray(form.account_types) ? form.account_types : []
                      const checked = selected.includes(type.id)
                      const isPrimary = selected[0] === type.id
                      return (
                        <ToggleCheckButton
                          key={type.id}
                          checked={checked}
                          disabled={savingProfile}
                          className="saad-account-type-check"
                          onChange={(on) => {
                            setForm((prev) => {
                              const cur = Array.isArray(prev.account_types) ? [...prev.account_types] : []
                              let next
                              if (on) {
                                next = cur.includes(type.id) ? cur : [...cur, type.id]
                              } else {
                                next = cur.filter((id) => id !== type.id)
                                if (!next.length) next = [type.id]
                              }
                              return { ...prev, account_types: next }
                            })
                          }}
                        >
                          <span className="csc-title">
                            {type.label}
                            {isPrimary ? ' · primary' : ''}
                          </span>
                          <span className="csc-desc">{type.description}</span>
                        </ToggleCheckButton>
                      )
                    })}
                  </div>
                  {Array.isArray(form.account_types) && form.account_types.length > 1 && (
                    <div className="saad-primary-type-row">
                      <span className="saad-muted">Primary type:</span>
                      <select
                        value={form.account_types[0] || 'seller'}
                        disabled={savingProfile}
                        onChange={(e) => {
                          const primary = e.target.value
                          setForm((prev) => {
                            const cur = Array.isArray(prev.account_types) ? prev.account_types : []
                            return {
                              ...prev,
                              account_types: [primary, ...cur.filter((id) => id !== primary)],
                            }
                          })
                        }}
                      >
                        {form.account_types.map((id) => {
                          const meta = ACCOUNT_TYPES.find((t) => t.id === id)
                          return (
                            <option key={id} value={id}>{meta?.label || id}</option>
                          )
                        })}
                      </select>
                    </div>
                  )}
                </div>

                <div className="saad-section">
                  <h3 className="saad-h3">Sourcing coverage</h3>
                  <p className="saad-muted">
                    Select an industry, check categories and subcategories, then save. Switch industry (or add Service Provider) and save again — previous paths stay on the account.
                  </p>
                  {(() => {
                    const savedIds = [...new Set([
                      ...(form.industryId ? [form.industryId] : []),
                      ...Object.keys(form.categories || {}),
                      ...Object.keys(form.productCategories || {}),
                      ...Object.keys(form.equipmentSubcategories || {}),
                      ...Object.keys(form.productSubcategories || {}),
                    ])]
                    const tax = countAccountTaxonomy({
                      categories: form.categories,
                      productCategories: form.productCategories,
                      equipmentSubcategories: form.equipmentSubcategories,
                      productSubcategories: form.productSubcategories,
                      serviceCategories: form.serviceCategories,
                    })
                    return (
                      <>
                        <p className="saad-muted">
                          {tax.categories} categories · {tax.subcategories} subcategories
                          {savedIds.length ? ` · ${savedIds.length} ${savedIds.length === 1 ? 'industry' : 'industries'}` : ''}
                        </p>
                        {savedIds.length > 0 && (
                          <div className="saad-path-chips">
                            {savedIds.map((id) => {
                              const meta = PLATFORM_INDUSTRY_OPTIONS.find((i) => i.id === id)
                              const active = form.industryId === id
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  className={`saad-path-chip${active ? ' is-active' : ''}`}
                                  disabled={savingProfile}
                                  onClick={() => switchIndustry(id)}
                                >
                                  {meta?.label || id}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )
                  })()}
                  <div className="saad-form-grid saad-form-grid-tight">
                    <SaadField label="Industry to edit">
                      <select
                        value={form.industryId || ''}
                        disabled={savingProfile}
                        onChange={(e) => switchIndustry(e.target.value)}
                      >
                        <option value="">Select industry…</option>
                        {PLATFORM_INDUSTRY_OPTIONS.map((ind) => (
                          <option key={ind.id} value={ind.id}>{ind.label}</option>
                        ))}
                      </select>
                    </SaadField>
                    {form.industryId ? (
                      <div className="saad-field saad-field-actions">
                        <span className="saad-field-spacer" />
                        <button
                          type="button"
                          className="saad-back"
                          disabled={savingProfile}
                          onClick={() => removeIndustryPath(form.industryId)}
                        >
                          Remove this industry path
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {form.industryId && (
                  <div className="saad-section saad-section-soft">
                    {(Array.isArray(form.account_types) ? form.account_types : []).includes('seller') && getProductCategoryTreeForIndustry(form.industryId).length > 0 && (
                      <>
                        <h3 className="saad-h3">Product &amp; Component categories</h3>
                        <p className="saad-muted">Check a category, then select subcategory combinations (e.g. molds and checking fixtures).</p>
                        <CategorySubcategoryChecklist
                          categories={getProductCategoryTreeForIndustry(form.industryId)}
                          selectedSubs={form.productSubs || {}}
                          onChange={(next) => setForm((prev) => ({ ...prev, productSubs: next }))}
                          disabled={savingProfile}
                        />
                      </>
                    )}
                    {getEquipmentCategoryTreeForIndustry(form.industryId).length > 0 && (
                      <>
                        <h3 className="saad-h3">Equipment categories</h3>
                        <p className="saad-muted">Select equipment families and the specific subcategories this company supplies.</p>
                        <CategorySubcategoryChecklist
                          categories={getEquipmentCategoryTreeForIndustry(form.industryId)}
                          selectedSubs={form.equipmentSubs || {}}
                          onChange={(next) => setForm((prev) => ({ ...prev, equipmentSubs: next }))}
                          disabled={savingProfile}
                        />
                      </>
                    )}
                  </div>
                )}

                {((Array.isArray(form.account_types) ? form.account_types : []).includes('auditor')) && (
                  <div className="saad-section">
                    <h3 className="saad-h3">Auditor industry access</h3>
                    <p className="saad-muted">
                      This auditor only sees companies Superadmin assigns to them, and only in the industries you tick. Leave all unchecked to hide Calendar work until you set industries and assign sellers on Supplier pool.
                    </p>
                    <div className="saad-category-checklist">
                      {PLATFORM_INDUSTRY_OPTIONS.filter((opt) => opt.id !== 'general').map((opt) => (
                        <ToggleCheckButton
                          key={opt.id}
                          checked={(form.auditorVisibleIndustries || []).includes(opt.id)}
                          disabled={savingProfile}
                          onChange={(checked) => {
                            setForm((prev) => {
                              const list = Array.isArray(prev.auditorVisibleIndustries) ? prev.auditorVisibleIndustries : []
                              return {
                                ...prev,
                                auditorVisibleIndustries: checked
                                  ? [...list, opt.id]
                                  : list.filter((id) => id !== opt.id),
                              }
                            })
                          }}
                        >
                          {opt.label}
                        </ToggleCheckButton>
                      ))}
                    </div>
                  </div>
                )}

                {((Array.isArray(form.account_types) ? form.account_types : []).includes('service_provider')
                  || (Array.isArray(form.account_types) ? form.account_types : []).includes('auditor')) && (
                  <div className="saad-section">
                    <h3 className="saad-h3">Service expertise</h3>
                    <p className="saad-muted">
                      Same items as the service provider Profile and the Service map. Blank fields on this form are left unchanged when you save.
                    </p>
                    <div className="saad-category-checklist">
                      {((Array.isArray(form.account_types) ? form.account_types : []).includes('auditor')
                        ? AUDITOR_EXPERTISE_OPTIONS
                        : SERVICE_PROVIDER_EXPERTISE_OPTIONS
                      ).map((svc) => (
                        <ToggleCheckButton
                          key={svc.id}
                          checked={(form.serviceCategories || []).includes(svc.id)}
                          disabled={savingProfile}
                          onChange={(checked) => {
                            setForm((prev) => {
                              const list = Array.isArray(prev.serviceCategories) ? prev.serviceCategories : []
                              return {
                                ...prev,
                                serviceCategories: checked
                                  ? [...list, svc.id]
                                  : list.filter((id) => id !== svc.id),
                              }
                            })
                          }}
                        >
                          {svc.label}
                        </ToggleCheckButton>
                      ))}
                    </div>
                  </div>
                )}

                {((Array.isArray(form.account_types) ? form.account_types : []).includes('seller')
                  || (Array.isArray(form.account_types) ? form.account_types : []).includes('service_provider')
                  || (Array.isArray(form.account_types) ? form.account_types : []).includes('auditor')) && (
                  <div className="saad-section">
                    <h3 className="saad-h3">Sourcing facts</h3>
                    <p className="saad-muted">
                      Purchasing-facing facts for supplier shortlisting. Platform scores (fit, risk, price) are not asked here. Blank stays as “—” in Compare.
                    </p>
                    <SourcingMetricsFields
                      values={form.sourcingMetrics || emptySourcingMetricsForm()}
                      onChange={(next) => setForm((prev) => ({ ...prev, sourcingMetrics: next }))}
                      disabled={savingProfile}
                      title=""
                      hint=""
                      inputClassName=""
                      labelClassName="saad-field-label"
                      groupClassName="saad-field"
                      gridClassName="saad-form-grid"
                    />
                  </div>
                )}

                <div className="saad-section">
                  <h3 className="saad-h3">Company pack</h3>
                  <CompanyProfilePackFields
                    files={storedPackFiles.filter((a) => !packRemovePaths.includes(a.path))}
                    pendingBySlot={packPending}
                    disabled={savingProfile}
                    canUpload={isSupabaseConfigured && UUID_RE.test(String(companyId || company?.id || ''))}
                    onPickFile={pickPackFile}
                    onClearPending={clearPendingPack}
                    onRemoveStored={removeStoredPack}
                    hint="Upload PDF packs as backup. After save, purchasing reviews pictures in a carousel — they cannot download the files."
                  />
                  <div className="saad-form-block">
                    <p className="saad-form-legend">Catalogue preview</p>
                    <CompanyPackCarousel
                      attachments={storedPackFiles.filter((a) => !packRemovePaths.includes(a.path))}
                    />
                  </div>
                  {!isSupabaseConfigured || !UUID_RE.test(String(companyId || company?.id || '')) ? (
                    <p className="saad-muted">Uploads need a linked cloud company UUID.</p>
                  ) : null}
                </div>

                <div className="saad-section">
                  <h3 className="saad-h3">Receiving plants</h3>
                  <p className="saad-muted">Used by Intelligent Sourcing map and transit estimates.</p>
                  <div className="saad-plants">
                    {plants.map((p) => (
                      <div key={p.id} className="saad-plant-row">
                        <SaadField label="Plant name">
                          <input
                            value={p.name}
                            onChange={(e) => updatePlantField(p.id, 'name', e.target.value)}
                            disabled={savingProfile}
                            placeholder="Plant or site name"
                          />
                        </SaadField>
                        <SaadField label="Country">
                          <input
                            value={p.cc}
                            onChange={(e) => updatePlantField(p.id, 'cc', e.target.value.toUpperCase().slice(0, 2))}
                            disabled={savingProfile}
                            placeholder="CC"
                          />
                        </SaadField>
                        <SaadField label="Latitude">
                          <input
                            value={p.lat}
                            onChange={(e) => updatePlantField(p.id, 'lat', e.target.value)}
                            disabled={savingProfile}
                            placeholder="0.0000"
                          />
                        </SaadField>
                        <SaadField label="Longitude">
                          <input
                            value={p.lon}
                            onChange={(e) => updatePlantField(p.id, 'lon', e.target.value)}
                            disabled={savingProfile}
                            placeholder="0.0000"
                          />
                        </SaadField>
                        <div className="saad-plant-remove">
                          <button type="button" className="saad-link" onClick={() => removePlant(p.id)} disabled={savingProfile}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="saad-plant-actions">
                    <button type="button" className="saad-back" onClick={addPlant} disabled={savingProfile}>
                      Add plant
                    </button>
                    <button type="button" className="saad-primary" disabled={savingProfile} onClick={() => void saveAccountProfile()}>
                      {savingProfile ? 'Saving…' : 'Save account profile'}
                    </button>
                  </div>
                </div>
              </section>

              <section className="saad-card saad-card-wide">
                <h2>Transfer rights to real seller</h2>
                <p className="saad-muted">
                  Use after the company profile is ready. Sets the real seller email on this account
                  {isSupabaseConfigured ? ' and can send a login invite' : ''}
                  {' '}so they do not need a second registration.
                  {isAdminCreatedPlaceholderEmail(form.email) && (
                    <> Current email is a temporary placeholder.</>
                  )}
                </p>
                <div className="saad-form-grid">
                  <SaadField label="Real seller email">
                    <input
                      type="email"
                      value={transferEmail}
                      onChange={(e) => setTransferEmail(e.target.value)}
                      disabled={transferring}
                      placeholder="owner@supplier.com"
                    />
                  </SaadField>
                  <SaadField label="Seller contact name">
                    <input
                      value={transferName}
                      onChange={(e) => setTransferName(e.target.value)}
                      disabled={transferring}
                      placeholder={form.contactName || 'Optional'}
                    />
                  </SaadField>
                </div>
                {isSupabaseConfigured && (
                  <label className="saad-check-row">
                    <input
                      type="checkbox"
                      checked={transferInvite}
                      onChange={(e) => setTransferInvite(e.target.checked)}
                      disabled={transferring}
                    />
                    Send login invite email
                  </label>
                )}
                <div className="saad-plant-actions">
                  <button
                    type="button"
                    className="saad-primary"
                    disabled={transferring || !transferEmail.trim()}
                    onClick={() => void transferToRealSeller()}
                  >
                    {transferring ? 'Transferring…' : 'Transfer rights'}
                  </button>
                  {isSupabaseConfigured && (
                    <button
                      type="button"
                      className="saad-back"
                      disabled={sendingLoginEmail || transferring}
                      onClick={() => void sendSellerLoginEmail(transferEmail.trim() || form.email)}
                    >
                      {sendingLoginEmail ? 'Sending email…' : 'Send confirmation email'}
                    </button>
                  )}
                </div>
                <p className="saad-muted saad-mail-hint stx-text-wrap">
                  If Resend lists this as Bounced, do not keep retrying — the inbox rejected it. Copy the confirmation link and send it to the seller another way. Then in Resend open the email → Bounced → See details, and remove the address from Suppressions before trying again.
                </p>
                {loginActionLink ? (
                  <div className="saad-login-link">
                    <p className="saad-muted stx-text-wrap">{loginActionLink}</p>
                    <button
                      type="button"
                      className="saad-back"
                      onClick={() => void copyLoginActionLink()}
                    >
                      {linkCopied ? 'Link copied' : 'Copy confirmation link'}
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="saad-card">
                <h2>Profile directory (computed)</h2>
                {snapshot && (
                  <>
                    <h3 className="saad-h3">Mandatory</h3>
                    <ul className="saad-checklist">
                      {Object.entries(snapshot.mandatory).map(([k, ok]) => (
                        <li key={k} className={ok ? 'ok' : 'no'}>{k.replace(/_/g, ' ')} — {ok ? 'Yes' : 'No'}</li>
                      ))}
                    </ul>
                    <h3 className="saad-h3">Extra (premium RFQ)</h3>
                    <ul className="saad-checklist">
                      {Object.entries(snapshot.extra).map(([k, ok]) => (
                        <li key={k} className={ok ? 'ok' : 'no'}>{k.replace(/_/g, ' ')} — {ok ? 'Yes' : 'No'}</li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              <section className="saad-card">
                <h2>Other profile files</h2>
                <p className="saad-muted">Photos, videos, and files outside the company pack.</p>
                {otherProfileFiles.length === 0 && <p className="saad-muted">No extra files.</p>}
                <ul className="saad-files">
                  {otherProfileFiles.map((a) => (
                    <li key={a.id || a.path}>
                      <span className="saad-fname">{a.name || a.path}</span>
                      <span className="saad-fslot">{PROFILE_ATTACHMENT_SLOT_LABELS[a.profile_slot] || a.profile_slot || 'other'}</span>
                      {a.path && (
                        <button
                          type="button"
                          className="saad-link"
                          disabled={openPath === a.path}
                          onClick={() => openAttachment(a.path)}
                        >
                          Open
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="saad-card">
                <h2>Users (profiles)</h2>
                {profiles.length === 0 && (
                  <p className="saad-muted">
                    {isLocal ? 'No cloud profiles linked to this local account yet.' : 'No linked profiles.'}
                  </p>
                )}
                <ul className="saad-profiles">
                  {profiles.map((p) => (
                    <li key={p.id}>
                      <strong>{p.full_name || '—'}</strong>
                      <span className="saad-muted"> {p.email}</span>
                      <span className="saad-role"> · {p.role}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="saad-card saad-card-wide">
                <h2>Trust badges &amp; external audit</h2>
                <p className="saad-muted">
                  New sellers have <strong>no badge</strong>. Only STREFEX platform managers / superadmin grant
                  <strong> Verified</strong>. After an on-site visit is completed, add <strong>On-site audited</strong>.
                  Set a <strong>deadline</strong> (auditors cannot change it). They may pick a visit date on or before
                  that deadline. The seller is notified that STREFEX planned the audit — not who will attend.
                </p>
                <div className="saad-form-grid">
                  <SaadField label="STREFEX Verified badge">
                    <select
                      value={strefexVerified ? 'yes' : 'no'}
                      onChange={(e) => setStrefexVerified(e.target.value === 'yes')}
                      disabled={saving}
                    >
                      <option value="no">No badge</option>
                      <option value="yes">Verified</option>
                    </select>
                  </SaadField>
                  <SaadField label="On-site audited badge">
                    <select
                      value={onsiteAudited ? 'yes' : 'no'}
                      onChange={(e) => {
                        const on = e.target.value === 'yes'
                        setOnsiteAudited(on)
                        if (on) setAuditStatus('passed')
                      }}
                      disabled={saving}
                    >
                      <option value="no">Not yet</option>
                      <option value="yes">On-site audited</option>
                    </select>
                  </SaadField>
                  <SaadField label="Audit status">
                    <select value={auditStatus} onChange={(e) => setAuditStatus(e.target.value)} disabled={saving}>
                      {EXTERNAL_AUDIT_STATUSES.map((id) => (
                        <option key={id} value={id}>{EXTERNAL_AUDIT_STATUS_LABELS[id]}</option>
                      ))}
                    </select>
                  </SaadField>
                  <SaadField label="Deadline (STREFEX)">
                    <input
                      type="date"
                      value={auditDeadlineAt}
                      onChange={(e) => setAuditDeadlineAt(e.target.value)}
                      disabled={saving}
                    />
                  </SaadField>
                  <SaadField label="Planned visit date">
                    <input
                      type="date"
                      value={auditPlannedAt}
                      onChange={(e) => setAuditPlannedAt(e.target.value)}
                      disabled={saving}
                      required={sellerNeedsAuditDate(auditStatus)}
                      max={auditDeadlineAt || undefined}
                    />
                  </SaadField>
                  <SaadField label="Assigned auditor (hidden from seller)">
                    <select
                      value={auditAuditorEmail}
                      onChange={(e) => {
                        const email = e.target.value
                        const chosen = auditorOptions.find((a) => a.email === email)
                        setAuditAuditorEmail(email)
                        setAuditAuditorName(chosen?.name || '')
                      }}
                      disabled={saving}
                    >
                      <option value="">— Select auditor —</option>
                      {auditorOptions.map((a) => (
                        <option key={a.email} value={a.email}>{a.name} ({a.email})</option>
                      ))}
                    </select>
                  </SaadField>
                  <SaadField label="Internal notes" className="saad-field-span">
                    <textarea
                      rows={4}
                      value={auditNotes}
                      onChange={(e) => setAuditNotes(e.target.value)}
                      disabled={saving}
                      placeholder="Internal only — not shown to the seller."
                    />
                  </SaadField>
                </div>
                <button type="button" className="saad-primary" disabled={saving} onClick={() => void saveAudit()}>
                  {saving ? 'Saving…' : 'Save badges, deadline & notify'}
                </button>
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
