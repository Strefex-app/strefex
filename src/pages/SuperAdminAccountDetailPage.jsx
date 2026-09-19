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
import {
  AUDIT_AND_SERVICE_EXPERTISE_OPTIONS,
  AUDITOR_EXPERTISE_OPTIONS,
  AUDIT_SERVICE_ITEMS,
} from '../data/auditServices'

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
    const primary = Array.isArray(plist) && plist.length ? plist[0] : null
    const reg = findRegistryAccount(c?.email || c?._registryKey || c?.id)
      || findRegistryAccount(primary?.email)
    const maps = readTaxonomyMaps(c, {
      categories: reg?.categories,
      productCategories: reg?.productCategories,
      equipmentSubcategories: reg?.equipmentSubcategories,
      productSubcategories: reg?.productSubcategories,
    })
    const industryId = (Array.isArray(c?.industries) && c.industries[0])
      || (Array.isArray(reg?.industries) && reg.industries[0])
      || readIndustryFromSource(c)
      || readIndustryFromSource(primary)
      || Object.keys(maps.categories)[0]
      || Object.keys(maps.productCategories)[0]
      || ''
    const accountTypes = readAccountTypesFromSource(c, primary)
    const filledName = firstFilledText(c?.name, c?.company, reg?.company, primary?.company_name)
    setCompany((prev) => ({
      ...(prev && prev.id === c?.id ? prev : {}),
      ...c,
      name: filledName || c?.name || prev?.name || '',
      account_types: accountTypes,
      account_type: accountTypes[0] || c?.account_type || 'seller',
    }))
    setForm({
      name: filledName,
      email: firstFilledText(c?.email, primary?.email, reg?.email),
      phone: firstFilledText(c?.phone, primary?.phone, reg?.phone),
      website: firstFilledText(c?.website, reg?.website),
      country: firstFilledText(c?.country, reg?.country),
      city: firstFilledText(c?.city, reg?.city),
      address: firstFilledText(c?.address, c?.metadata?.address, reg?.address),
      account_types: accountTypes,
      plan: c?.plan || reg?.plan || 'start',
      contactName: firstFilledText(primary?.full_name, c?._contactName, reg?.contactName),
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
        return Array.isArray(reg?.serviceCategories) ? [...reg.serviceCategories] : []
      })(),
      sourcingMetrics: sourcingMetricsFormFromSource(c, reg),
    })
    const saved = readReceivingPlantsFromAccount(
      { receivingPlants: c?.metadata?.receiving_plants },
      c,
    )
    setPlants(saved.length ? saved : normalizeReceivingPlants([]))
  }, [])

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

  const applyLocalShaped = useCallback((shaped, plist = []) => {
    setCompany(shaped)
    setRegistryKey(shaped._registryKey || shaped.email || localLookupKey)
    setProfiles(plist)
    applyAuditFields(shaped)
    syncFormFromCompany(shaped, plist)
  }, [applyAuditFields, localLookupKey, syncFormFromCompany])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setSavedMsg('')
    setPackPending({})
    setPackRemovePaths([])
    setResolvedCloudId('')
    setForceLocalEdit(false)

    const hydrateFromStubOrFail = (fallbackMsg) => {
      const shaped = companyFromAccountStub(accountStub)
      if (shaped) {
        setForceLocalEdit(true)
        applyLocalShaped(shaped)
        setLoading(false)
        return true
      }
      setCompany(null)
      setProfiles([])
      setRegistryKey('')
      setLoading(false)
      setError(fallbackMsg)
      return false
    }

    // Local route: registry → resolve company via stub/profile → stub hydrate
    if (localLookupKey && !routeCompanyId) {
      const acct = findRegistryAccount(localLookupKey)
      if (acct) {
        applyLocalShaped(companyFromRegistryAccount(acct))
        setLoading(false)
        return
      }

      const stubCid = accountStub?.companyId || accountStub?.company_id
      const stubProfileId = accountStub?.id
      const keyLooksLikeUuid = UUID_RE.test(String(localLookupKey))

      if (isSupabaseConfigured) {
        try {
          // Prefer company UUID from navigation stub
          if (stubCid && UUID_RE.test(String(stubCid))) {
            const { c, plist } = await loadCloudCompany(String(stubCid))
            setResolvedCloudId(String(stubCid))
            setCompany(c)
            setRegistryKey((c?.email || accountStub?.email || '').trim().toLowerCase())
            setProfiles(plist)
            applyAuditFields(c)
            syncFormFromCompany(c, plist)
            setLoading(false)
            return
          }

          // Profile UUID in stub or in the local-account URL key
          const profileId =
            (stubProfileId && UUID_RE.test(String(stubProfileId)) && String(stubProfileId))
            || (keyLooksLikeUuid ? String(localLookupKey) : '')
          let row = null
          if (profileId) {
            row = await profilesService.getByIdWithCompany(profileId)
          } else if (localLookupKey.includes('@') || (accountStub?.email || '').includes('@')) {
            row = await profilesService.getByEmailWithCompany(
              accountStub?.email || localLookupKey,
            )
          }
          if (row) {
            const coRaw = row?.companies
            const co = Array.isArray(coRaw) ? coRaw[0] : coRaw
            const cid = co?.id || row?.company_id
            if (cid && UUID_RE.test(String(cid))) {
              try {
                const { c, plist } = await loadCloudCompany(String(cid))
                setResolvedCloudId(String(cid))
                setCompany(c)
                setRegistryKey((c?.email || row?.email || '').trim().toLowerCase())
                setProfiles(plist.length ? plist : [row])
                applyAuditFields(c)
                syncFormFromCompany(c, plist.length ? plist : [row])
                setLoading(false)
                return
              } catch {
                /* fall through to stub / profile-shaped local */
              }
            }
            const shaped = companyFromAccountStub({
              id: row.id,
              email: row.email,
              company: co?.name || row.metadata?.company_name || '',
              name: row.full_name,
              contactName: row.full_name,
              phone: row.phone || co?.phone || '',
              companyId: cid || null,
              accountType: co?.account_type || 'seller',
              plan: co?.plan || 'start',
            })
            applyLocalShaped(shaped, [row])
            setLoading(false)
            return
          }
        } catch {
          /* fall through to stub */
        }
      }

      hydrateFromStubOrFail(
        'Account not found. Open Edit from the accounts list, or ensure this profile is linked to a company.',
      )
      return
    }

    if (!routeCompanyId) {
      setLoading(false)
      setError('Invalid company id.')
      return
    }

    if (!isSupabaseConfigured) {
      setLoading(false)
      setError('Supabase is not configured.')
      return
    }

    try {
      const { c, plist } = await loadCloudCompany(routeCompanyId)
      setCompany(c)
      setRegistryKey((c?.email || '').trim().toLowerCase())
      setProfiles(plist)
      applyAuditFields(c)
      syncFormFromCompany(c, plist)
    } catch (e) {
      // Company row missing / RLS: still allow edit from the list stub
      if (hydrateFromStubOrFail(e?.message || 'Failed to load company.')) return
    } finally {
      setLoading(false)
    }
  }, [
    accountStub,
    applyAuditFields,
    applyLocalShaped,
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
    if (!company || (!isCloud && !isLocal && !company._fromStub && !company._local)) return
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
      const nextSourcingMetrics = parseSourcingMetricsForm(form.sourcingMetrics)
      const sourcingRegistryPatch = sourcingMetricsRegistryPatch(nextSourcingMetrics)
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
      const primaryAccountType = nextAccountTypes[0]
      const nextPack = await flushCompanyPack(company.profile_attachments)

      if (isLocal || (company._local && !companyId)) {
        if (!lookup && !emailKey) throw new Error('Missing local account key.')
        const patch = mergeAccountsPreferFilled({
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
        }, existingLocal)
        Object.assign(patch, {
          receivingPlants: normalizeReceivingPlants(plants),
          companyId: company.id || existingLocal.companyId || undefined,
          ...sourcingRegistryPatch,
          visibilityTier: company.visibility_tier || company.visibilityTier || existingLocal.visibilityTier || undefined,
          profileAttachments: nextPack,
        })
        let updatedLocal = lookup ? updateAccount(lookup, patch) : null
        if (!updatedLocal && emailKey) {
          updatedLocal = updateAccount(emailKey, patch)
        }
        if (!updatedLocal) {
          updatedLocal = registerAccount({
            id: company._profileId || `local-${Date.now()}`,
            email: emailKey || lookup,
            ...patch,
            accountType: primaryAccountType,
            plan: form.plan || 'start',
          })
        }
        if (!updatedLocal) throw new Error('Could not update local account registry.')
        const localCompanyId = String(updatedLocal.companyId || updatedLocal.company_id || company.id || '')
        if (isSupabaseConfigured && UUID_RE.test(localCompanyId)) {
          try {
            await companiesService.update(localCompanyId, { profile_attachments: nextPack })
          } catch { /* may lack company row */ }
        }
        await saveReceivingPlantsToAccount({
          plants,
          email: emailKey || lookup,
          companyId: updatedLocal.companyId || updatedLocal.company_id || null,
          updateAccount,
          tenant: null,
        })
        if (isSupabaseConfigured) {
          try {
            let profileId = form.contactProfileId || company._profileId || ''
            if (!profileId && emailKey) {
              const row = await profilesService.getByEmailWithCompany(emailKey)
              profileId = row?.id || ''
            }
            if (profileId) {
              const existingProfile = profiles.find((p) => p.id === profileId)
                || (await profilesService.getByIdWithCompany(profileId))
              const linkCompanyId = UUID_RE.test(String(company.id || ''))
                ? String(company.id)
                : (UUID_RE.test(String(updatedLocal.companyId || ''))
                  ? String(updatedLocal.companyId)
                  : null)
              await profilesService.updateProfilePrivileged({
                id: profileId,
                ...(linkCompanyId ? { company_id: linkCompanyId } : {}),
                ...(form.contactName.trim() ? { full_name: form.contactName.trim() } : {}),
                ...(form.contactPhone.trim() ? { phone: form.contactPhone.trim() } : {}),
                metadata: mergeSourcingMetricsIntoMetadata({
                  ...(existingProfile?.metadata || company.metadata || {}),
                  account_type: primaryAccountType,
                  account_types: nextAccountTypes,
                  industries: nextIndustries,
                  categories: nextCategories,
                  product_categories: nextProductCategories,
                  equipment_subcategories: nextEquipmentSubcategories,
                  product_subcategories: nextProductSubcategories,
                  service_categories: nextServiceCategories,
                  admin_taxonomy_unlocked: true,
                }, nextSourcingMetrics),
              })
            }
          } catch {
            /* profile privileged update may be restricted */
          }
        }
        setCompany(companyFromRegistryAccount({ ...updatedLocal, profileAttachments: nextPack, ...sourcingRegistryPatch }))
        setRegistryKey(updatedLocal.email || updatedLocal.id || lookup)
        setPackPending({})
        setPackRemovePaths([])
        setSavedMsg('Account profile saved to local registry.')
        return
      }

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
      const merged = {
        ...company,
        ...companyPayload,
        industries: nextIndustries,
        profile_attachments: nextPack,
      }
      const vis = buildCompanyVisibilityUpdate(merged)
      companyPayload.visibility_tier = vis.visibility_tier
      companyPayload.profile_attachments = nextPack
      companyPayload.metadata = mergeSourcingMetricsIntoMetadata(
        { ...(companyPayload.metadata || {}), ...vis.metadata },
        nextSourcingMetrics,
      )

      const updated = await companiesService.update(companyId, companyPayload)
      setCompany(updated)

      let profileSyncWarning = ''
      try {
        let profileId = form.contactProfileId || ''
        let existingProfile = profiles.find((p) => p.id === profileId) || null
        if (!profileId && emailKey) {
          const row = await profilesService.getByEmailWithCompany(emailKey)
          if (row?.id) {
            profileId = row.id
            existingProfile = row
          }
        }
        if (!profileId && profiles[0]?.id) {
          profileId = profiles[0].id
          existingProfile = profiles[0]
        }
        if (profileId) {
          if (!existingProfile) {
            existingProfile = await profilesService.getByIdWithCompany(profileId)
          }
          await profilesService.updateProfilePrivileged({
            id: profileId,
            company_id: companyId,
            ...(form.contactName.trim() ? { full_name: form.contactName.trim() } : {}),
            ...(form.contactPhone.trim() ? { phone: form.contactPhone.trim() } : {}),
            metadata: mergeSourcingMetricsIntoMetadata({
              ...(existingProfile?.metadata || company.metadata || {}),
              ...taxonomy.metadataPatch,
            }, nextSourcingMetrics),
          })
          setProfiles((prev) => {
            const nextMeta = mergeSourcingMetricsIntoMetadata({
              ...taxonomy.metadataPatch,
            }, nextSourcingMetrics)
            const found = prev.some((p) => p.id === profileId)
            if (!found) {
              return [{
                id: profileId,
                full_name: form.contactName.trim() || existingProfile?.full_name || '',
                phone: form.contactPhone.trim() || existingProfile?.phone || '',
                company_id: companyId,
                email: emailKey || form.email,
                metadata: { ...(existingProfile?.metadata || {}), ...nextMeta },
              }, ...prev]
            }
            return prev.map((p) => (
              p.id === profileId
                ? {
                  ...p,
                  full_name: form.contactName.trim() || p.full_name,
                  phone: form.contactPhone.trim() || p.phone,
                  company_id: companyId,
                  metadata: {
                    ...(p.metadata || {}),
                    ...nextMeta,
                  },
                }
                : p
            ))
          })
          setForm((prev) => ({ ...prev, contactProfileId: profileId }))
        }
      } catch (profileErr) {
        profileSyncWarning = profileErr?.message
          ? ` Company saved; profile sync failed: ${profileErr.message}`
          : ' Company saved; profile directory sync failed.'
      }

      if (emailKey) {
        const registryPatch = mergeAccountsPreferFilled({
          company: resolvedName,
          country: form.country.trim(),
          city: form.city.trim(),
          address: nextAddress,
          accountType: primaryAccountType,
          accountTypes: nextAccountTypes,
          industries: nextIndustries,
          categories: nextCategories,
          productCategories: nextProductCategories,
          equipmentSubcategories: nextEquipmentSubcategories,
          productSubcategories: nextProductSubcategories,
          serviceCategories: nextServiceCategories,
        }, existingLocal)
        const existing = updateAccount(emailKey, {
          ...registryPatch,
          companyId,
          visibilityTier: updated?.visibility_tier || companyPayload.visibility_tier || null,
          plan: form.plan || company.plan || existingLocal.plan || 'start',
          ...sourcingRegistryPatch,
          profileAttachments: nextPack,
        })
        if (!existing) {
          registerAccount({
            id: form.contactProfileId || emailKey,
            email: emailKey,
            company: resolvedName,
            companyId,
            country: registryPatch.country,
            city: registryPatch.city,
            address: registryPatch.address,
            accountType: primaryAccountType,
            accountTypes: nextAccountTypes,
            plan: form.plan || 'start',
            industries: nextIndustries,
            categories: nextCategories,
            productCategories: nextProductCategories,
            equipmentSubcategories: nextEquipmentSubcategories,
            productSubcategories: nextProductSubcategories,
            serviceCategories: nextServiceCategories,
            visibilityTier: updated?.visibility_tier || companyPayload.visibility_tier || null,
            ...sourcingRegistryPatch,
            profileAttachments: nextPack,
          })
        }
      }

      if (plants.length) {
        await saveReceivingPlantsToAccount({
          plants,
          email: emailKey,
          companyId,
          updateAccount,
          tenant: updated,
        })
      }

      setSavedMsg(`Account profile saved.${profileSyncWarning}`)
      setPackPending({})
      setPackRemovePaths([])
      await load()
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
      const inviteNote = result.invite?.alreadyExists
        ? ' Seller email already has a login — a sign-in link was sent if mail is configured.'
        : (result.invite?.delivered || result.invite?.emailConfirmationPending
          ? ' Confirmation email sent via Resend — seller must open the link to take over login.'
          : (transferInvite && isSupabaseConfigured ? ' Invite requested.' : ''))
      setSavedMsg(`Seller rights transferred to ${result.email}.${inviteNote}`)
      setTransferEmail('')
    } catch (e) {
      setError(e?.message || 'Transfer failed.')
    } finally {
      setTransferring(false)
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

        {loading && <p className="saad-muted">Loading…</p>}
        {error && <div className="saad-error" role="alert">{error}</div>}
        {savedMsg && <div className="saad-ok" role="status">{savedMsg}</div>}

        {!loading && company && (
          <>
            <header className="saad-header">
              <div>
                <h1 className="saad-title">{company.name || 'Company'}</h1>
                <p className="saad-sub">
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
                  {isLocal
                    ? 'This manufacturer is stored in the local account registry (no cloud company UUID yet). Edits save locally and feed Intelligent Sourcing.'
                    : 'Superadmin can correct buyer and user company data for sourcing geo accuracy. Changes sync to the platform company record and the local account registry.'}
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
                </div>
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
