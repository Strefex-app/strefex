import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { isSupabaseConfigured, companiesService, profilesService, companyProfileAttachmentsService } from '../services/supabaseService'
import {
  evaluateCompanyProfileDirectory,
  buildCompanyVisibilityUpdate,
} from '../services/companyProfileVisibilityService'
import {
  PROFILE_ATTACHMENT_SLOT_LABELS,
  VISIBILITY_TIER_LABELS,
} from '../constants/companyProfileDirectory'
import { useAccountRegistry } from '../store/accountRegistry'
import { ToggleCheckButton } from '../components/ToggleCheckButton'
import { getEquipmentCategoriesForIndustry } from '../data/equipmentCategoriesByIndustry'
import {
  normalizeReceivingPlants,
  readReceivingPlantsFromAccount,
  saveReceivingPlantsToAccount,
} from '../utils/receivingPlantsPersist'
import '../styles/app-page.css'
import './SuperAdminAccountDetailPage.css'

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

const SERVICE_EXPERTISE_OPTIONS = [
  { id: 'project-management', label: 'Project Management' },
  { id: 'supplier-services', label: 'Supplier Services' },
  { id: 'quality-services', label: 'Quality & Compliance' },
  { id: 'supplier-audit', label: 'Supplier Audit' },
]

function readIndustryFromSource(source) {
  const md = source?.metadata && typeof source.metadata === 'object' ? source.metadata : {}
  if (Array.isArray(md.industries) && md.industries[0]) return String(md.industries[0])
  if (Array.isArray(source?.industries) && source.industries[0]) return String(source.industries[0])
  return ''
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

function emptyForm() {
  return {
    name: '',
    email: '',
    phone: '',
    website: '',
    country: '',
    city: '',
    address: '',
    account_type: 'buyer',
    plan: 'start',
    contactName: '',
    contactPhone: '',
    contactProfileId: '',
    industryId: '',
    equipmentCategories: [],
    serviceCategories: [],
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
    plan: acct.plan || 'start',
    registration_code: acct.registrationCode || '',
    visibility_tier: acct.visibilityTier || acct.visibility_tier || 'basic',
    external_audit_status: acct.externalAuditStatus || 'none',
    external_audit_notes: acct.externalAuditNotes || '',
    external_audit_passed_at: acct.externalAuditPassedAt || null,
    profile_attachments: Array.isArray(acct.profileAttachments) ? acct.profileAttachments : [],
    industries,
    categories,
    serviceCategories,
    metadata: {
      ...(acct.metadata || {}),
      address: acct.address || null,
      receiving_plants: acct.receivingPlants || acct.metadata?.receiving_plants || [],
      industries,
      categories,
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
    plan: stub.plan || 'start',
    registration_code: stub.registrationCode || '',
    visibility_tier: stub.visibilityTier || stub.visibility_tier || 'basic',
    external_audit_status: stub.externalAuditStatus || 'none',
    external_audit_notes: stub.externalAuditNotes || '',
    external_audit_passed_at: stub.externalAuditPassedAt || null,
    profile_attachments: [],
    industries,
    categories,
    serviceCategories,
    metadata: {
      ...(stub.metadata || {}),
      address: stub.address || null,
      receiving_plants: stub.receivingPlants || stub.metadata?.receiving_plants || [],
      industries,
      categories,
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
  const [company, setCompany] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const [auditStatus, setAuditStatus] = useState('none')
  const [auditNotes, setAuditNotes] = useState('')
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
    const industryId = readIndustryFromSource(c) || readIndustryFromSource(primary) || ''
    setForm({
      name: c?.name || '',
      email: c?.email || '',
      phone: c?.phone || '',
      website: c?.website || '',
      country: c?.country || '',
      city: c?.city || '',
      address: c?.address || c?.metadata?.address || '',
      account_type: c?.account_type || 'buyer',
      plan: c?.plan || 'start',
      contactName: primary?.full_name || c?._contactName || '',
      contactPhone: primary?.phone || c?._contactPhone || '',
      contactProfileId: primary?.id || c?._profileId || '',
      industryId,
      equipmentCategories: (() => {
        const fromCompany = readEquipmentCategoriesFromSource(c, industryId)
        if (fromCompany.length) return fromCompany
        return readEquipmentCategoriesFromSource(primary, industryId)
      })(),
      serviceCategories: (() => {
        const fromCompany = readServiceCategoriesFromSource(c)
        if (fromCompany.length) return fromCompany
        return readServiceCategoriesFromSource(primary)
      })(),
    })
    const saved = readReceivingPlantsFromAccount(
      { receivingPlants: c?.metadata?.receiving_plants },
      c,
    )
    setPlants(saved.length ? saved : normalizeReceivingPlants([]))
  }, [])

  const applyLocalShaped = useCallback((shaped, plist = []) => {
    setCompany(shaped)
    setRegistryKey(shaped._registryKey || shaped.email || localLookupKey)
    setProfiles(plist)
    setAuditStatus(shaped.external_audit_status || 'none')
    setAuditNotes(shaped.external_audit_notes || '')
    syncFormFromCompany(shaped, plist)
  }, [localLookupKey, syncFormFromCompany])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setSavedMsg('')
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
            setAuditStatus(c?.external_audit_status || 'none')
            setAuditNotes(c?.external_audit_notes || '')
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
                setAuditStatus(c?.external_audit_status || 'none')
                setAuditNotes(c?.external_audit_notes || '')
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
      setAuditStatus(c?.external_audit_status || 'none')
      setAuditNotes(c?.external_audit_notes || '')
      syncFormFromCompany(c, plist)
    } catch (e) {
      // Company row missing / RLS: still allow edit from the list stub
      if (hydrateFromStubOrFail(e?.message || 'Failed to load company.')) return
    } finally {
      setLoading(false)
    }
  }, [
    accountStub,
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
    if (!path || !isSupabaseConfigured || isLocal) return
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

  const saveAccountProfile = async () => {
    if (!company || (!isCloud && !isLocal && !company._fromStub && !company._local)) return
    if (!form.name.trim()) {
      setError('Company name is required.')
      return
    }
    setSavingProfile(true)
    setError('')
    setSavedMsg('')
    try {
      const nextAddress = form.address.trim()
      const emailKey = (form.email || company.email || registryKey || '').trim().toLowerCase()
      const lookup = registryKey || emailKey || company._registryKey
      const nextIndustryId = String(form.industryId || '').trim()
      const nextIndustries = nextIndustryId ? [nextIndustryId] : []
      const nextCategories = nextIndustryId && Array.isArray(form.equipmentCategories) && form.equipmentCategories.length
        ? { [nextIndustryId]: [...form.equipmentCategories] }
        : {}
      const nextServiceCategories = Array.isArray(form.serviceCategories)
        ? [...form.serviceCategories]
        : []

      if (isLocal || (company._local && !companyId)) {
        if (!lookup && !emailKey) throw new Error('Missing local account key.')
        const patch = {
          company: form.name.trim(),
          name: form.contactName.trim() || undefined,
          email: emailKey || undefined,
          phone: form.phone.trim() || form.contactPhone.trim() || '',
          website: form.website.trim() || '',
          country: form.country.trim() || '',
          city: form.city.trim() || '',
          address: nextAddress || '',
          accountType: form.account_type || undefined,
          plan: form.plan || undefined,
          receivingPlants: normalizeReceivingPlants(plants),
          companyId: company.id || undefined,
          industries: nextIndustries,
          categories: nextCategories,
          serviceCategories: nextServiceCategories,
        }
        let updatedLocal = lookup ? updateAccount(lookup, patch) : null
        if (!updatedLocal && emailKey) {
          updatedLocal = updateAccount(emailKey, patch)
        }
        if (!updatedLocal) {
          updatedLocal = registerAccount({
            id: company._profileId || `local-${Date.now()}`,
            email: emailKey || lookup,
            ...patch,
            accountType: form.account_type || 'seller',
            plan: form.plan || 'start',
          })
        }
        if (!updatedLocal) throw new Error('Could not update local account registry.')
        await saveReceivingPlantsToAccount({
          plants,
          email: emailKey || lookup,
          companyId: updatedLocal.companyId || updatedLocal.company_id || null,
          updateAccount,
          tenant: null,
        })
        if (form.contactProfileId && isSupabaseConfigured) {
          try {
            const existingProfile = profiles.find((p) => p.id === form.contactProfileId)
            await profilesService.updateProfilePrivileged({
              id: form.contactProfileId,
              full_name: form.contactName.trim() || null,
              phone: form.contactPhone.trim() || null,
              metadata: {
                ...(existingProfile?.metadata || company.metadata || {}),
                industries: nextIndustries,
                categories: nextCategories,
                service_categories: nextServiceCategories,
              },
            })
          } catch {
            /* profile privileged update may be restricted */
          }
        }
        setCompany(companyFromRegistryAccount(updatedLocal))
        setRegistryKey(updatedLocal.email || updatedLocal.id || lookup)
        setSavedMsg('Account profile saved to local registry.')
        return
      }

      const companyPayload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        address: nextAddress || null,
        account_type: form.account_type || company.account_type,
        plan: form.plan || company.plan,
        metadata: {
          ...(company.metadata || {}),
          address: nextAddress || null,
          industries: nextIndustries,
          categories: nextCategories,
          service_categories: nextServiceCategories,
        },
      }
      const merged = {
        ...company,
        ...companyPayload,
        industries: nextIndustries,
        profile_attachments: company.profile_attachments,
      }
      const vis = buildCompanyVisibilityUpdate(merged)
      companyPayload.visibility_tier = vis.visibility_tier
      companyPayload.metadata = { ...companyPayload.metadata, ...vis.metadata }

      const updated = await companiesService.update(companyId, companyPayload)
      setCompany(updated)

      if (form.contactProfileId) {
        try {
          const existingProfile = profiles.find((p) => p.id === form.contactProfileId)
          await profilesService.updateProfilePrivileged({
            id: form.contactProfileId,
            full_name: form.contactName.trim() || null,
            phone: form.contactPhone.trim() || null,
            metadata: {
              ...(existingProfile?.metadata || company.metadata || {}),
              industries: nextIndustries,
              categories: nextCategories,
              service_categories: nextServiceCategories,
            },
          })
          setProfiles((prev) => prev.map((p) => (
            p.id === form.contactProfileId
              ? {
                ...p,
                full_name: form.contactName.trim(),
                phone: form.contactPhone.trim(),
                metadata: {
                  ...(p.metadata || {}),
                  industries: nextIndustries,
                  categories: nextCategories,
                  service_categories: nextServiceCategories,
                },
              }
              : p
          )))
        } catch {
          /* privileged update may be restricted; company save still applies */
        }
      }

      if (emailKey) {
        const existing = updateAccount(emailKey, {
          company: form.name.trim(),
          country: form.country.trim() || '',
          city: form.city.trim() || '',
          address: nextAddress || '',
          accountType: form.account_type || undefined,
          industries: nextIndustries,
          categories: nextCategories,
          serviceCategories: nextServiceCategories,
        })
        if (!existing) {
          registerAccount({
            id: form.contactProfileId || emailKey,
            email: emailKey,
            company: form.name.trim(),
            companyId,
            country: form.country.trim() || '',
            city: form.city.trim() || '',
            address: nextAddress || '',
            accountType: form.account_type || 'seller',
            plan: form.plan || 'start',
            industries: nextIndustries,
            categories: nextCategories,
            serviceCategories: nextServiceCategories,
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

      setSavedMsg('Account profile saved.')
      await load()
    } catch (e) {
      setError(e?.message || 'Failed to save account profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const saveAudit = async () => {
    if (!company) return
    setSaving(true)
    setError('')
    try {
      if (isLocal || (company._local && !companyId)) {
        const lookup = registryKey || company._registryKey || company.email
        if (!lookup) throw new Error('Missing local account key.')
        const patch = {
          externalAuditStatus: auditStatus,
          externalAuditNotes: auditNotes.trim() || '',
          externalAuditPassedAt: auditStatus === 'passed'
            ? (company.external_audit_passed_at || new Date().toISOString())
            : null,
          visibilityTier: auditStatus === 'passed' ? 'verified' : undefined,
        }
        let updatedLocal = updateAccount(lookup, patch)
        if (!updatedLocal) {
          updatedLocal = registerAccount({
            id: company._profileId || lookup,
            email: lookup,
            company: company.name || form.name || 'Business Account',
            accountType: company.account_type || 'seller',
            ...patch,
          })
        }
        if (!updatedLocal) throw new Error('Could not update local account registry.')
        const shaped = companyFromRegistryAccount(updatedLocal)
        setCompany(shaped)
        setAuditStatus(shaped.external_audit_status || 'none')
        setAuditNotes(shaped.external_audit_notes || '')
        setSavedMsg('Audit status saved to local registry.')
        return
      }

      if (!isCloud) return
      const next = {
        ...company,
        external_audit_status: auditStatus,
        external_audit_notes: auditNotes.trim() || null,
      }
      if (auditStatus === 'passed') {
        next.external_audit_passed_at = company.external_audit_passed_at || new Date().toISOString()
      } else {
        next.external_audit_passed_at = null
      }
      const vis = buildCompanyVisibilityUpdate(next)
      const updated = await companiesService.update(companyId, {
        external_audit_status: auditStatus,
        external_audit_notes: auditNotes.trim() || null,
        external_audit_passed_at: next.external_audit_passed_at,
        visibility_tier: vis.visibility_tier,
        metadata: vis.metadata,
      })
      setCompany(updated)
      setAuditStatus(updated?.external_audit_status || 'none')
      setAuditNotes(updated?.external_audit_notes || '')
    } catch (e) {
      setError(e?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const attachments = Array.isArray(company?.profile_attachments) ? company.profile_attachments : []

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
                  {company.account_type && (
                    <>
                      {' · '}
                      <span className="saad-type">{company.account_type}</span>
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
                <div className="saad-form-grid">
                  <label className="saad-field">
                    Company name
                    <input value={form.name} onChange={(e) => setField('name', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Company email
                    <input value={form.email} onChange={(e) => setField('email', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Phone
                    <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Website
                    <input value={form.website} onChange={(e) => setField('website', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Country
                    <input value={form.country} onChange={(e) => setField('country', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    City
                    <input value={form.city} onChange={(e) => setField('city', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field saad-field-span">
                    Address / plant address
                    <input value={form.address} onChange={(e) => setField('address', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Account type
                    <select value={form.account_type} onChange={(e) => setField('account_type', e.target.value)} disabled={savingProfile}>
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                      <option value="service_provider">Service provider</option>
                      <option value="auditor">Auditor</option>
                    </select>
                  </label>
                  <label className="saad-field">
                    Plan
                    <select value={form.plan} onChange={(e) => setField('plan', e.target.value)} disabled={savingProfile}>
                      <option value="start">Start</option>
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </label>
                  <label className="saad-field">
                    Contact full name
                    <input value={form.contactName} onChange={(e) => setField('contactName', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Contact phone
                    <input value={form.contactPhone} onChange={(e) => setField('contactPhone', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Industry
                    <select
                      value={form.industryId || ''}
                      disabled={savingProfile}
                      onChange={(e) => {
                        const industryId = e.target.value
                        setForm((prev) => ({
                          ...prev,
                          industryId,
                          equipmentCategories: [],
                        }))
                      }}
                    >
                      <option value="">Select industry…</option>
                      {PLATFORM_INDUSTRY_OPTIONS.map((ind) => (
                        <option key={ind.id} value={ind.id}>{ind.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {form.industryId && getEquipmentCategoriesForIndustry(form.industryId).length > 0 && (
                  <>
                    <h3 className="saad-h3">Equipment / product categories</h3>
                    <p className="saad-muted">Checked categories appear in Executive Summary filters and on the map for this industry.</p>
                    <div className="saad-category-checklist">
                      {getEquipmentCategoriesForIndustry(form.industryId).map((cat) => (
                        <ToggleCheckButton
                          key={cat.id}
                          checked={(form.equipmentCategories || []).includes(cat.id)}
                          disabled={savingProfile}
                          onChange={(checked) => {
                            setForm((prev) => {
                              const list = Array.isArray(prev.equipmentCategories) ? prev.equipmentCategories : []
                              return {
                                ...prev,
                                equipmentCategories: checked
                                  ? [...list, cat.id]
                                  : list.filter((id) => id !== cat.id),
                              }
                            })
                          }}
                        >
                          {cat.name}
                        </ToggleCheckButton>
                      ))}
                    </div>
                  </>
                )}

                {(form.account_type === 'service_provider' || form.account_type === 'auditor') && (
                  <>
                    <h3 className="saad-h3">Service expertise</h3>
                    <p className="saad-muted">Checked services appear in the Service Executive Summary for the selected industry.</p>
                    <div className="saad-category-checklist">
                      {(form.account_type === 'auditor'
                        ? SERVICE_EXPERTISE_OPTIONS.filter((s) => s.id === 'supplier-audit')
                        : SERVICE_EXPERTISE_OPTIONS.filter((s) => s.id !== 'supplier-audit')
                      ).map((svc) => (
                        <ToggleCheckButton
                          key={svc.id}
                          checked={(form.serviceCategories || []).includes(svc.id)}
                          disabled={savingProfile || form.account_type === 'auditor'}
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
                  </>
                )}

                <h3 className="saad-h3">Receiving plants</h3>
                <p className="saad-muted">Used by Intelligent Sourcing map and transit estimates.</p>
                <div className="saad-plants">
                  {plants.map((p) => (
                    <div key={p.id} className="saad-plant-row">
                      <input
                        aria-label="Plant name"
                        value={p.name}
                        onChange={(e) => updatePlantField(p.id, 'name', e.target.value)}
                        disabled={savingProfile}
                      />
                      <input
                        aria-label="Country code"
                        value={p.cc}
                        onChange={(e) => updatePlantField(p.id, 'cc', e.target.value.toUpperCase().slice(0, 2))}
                        disabled={savingProfile}
                      />
                      <input
                        aria-label="Latitude"
                        value={p.lat}
                        onChange={(e) => updatePlantField(p.id, 'lat', e.target.value)}
                        disabled={savingProfile}
                      />
                      <input
                        aria-label="Longitude"
                        value={p.lon}
                        onChange={(e) => updatePlantField(p.id, 'lon', e.target.value)}
                        disabled={savingProfile}
                      />
                      <button type="button" className="saad-link" onClick={() => removePlant(p.id)} disabled={savingProfile}>
                        Remove
                      </button>
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
                <h2>Attachments</h2>
                {isLocal && <p className="saad-muted">Cloud attachments require a linked company UUID.</p>}
                {!isLocal && attachments.length === 0 && <p className="saad-muted">No files.</p>}
                <ul className="saad-files">
                  {!isLocal && attachments.map((a) => (
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
                <h2>External audit (verified seller / provider)</h2>
                <p className="saad-muted">
                  When status is <strong>Passed</strong>, the company receives the verified label
                  {isLocal ? ' in the local registry' : ' and visibility tier is set to verified (after save)'}.
                </p>
                <label className="saad-field">
                  Audit status
                  <select value={auditStatus} onChange={(e) => setAuditStatus(e.target.value)} disabled={saving}>
                    <option value="none">None</option>
                    <option value="pending">Pending</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>
                <label className="saad-field">
                  Notes
                  <textarea
                    rows={4}
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    disabled={saving}
                    placeholder="Auditor firm, report reference, valid-until, etc."
                  />
                </label>
                <button type="button" className="saad-primary" disabled={saving} onClick={() => void saveAudit()}>
                  {saving ? 'Saving…' : isLocal ? 'Save audit (local)' : 'Save audit & recompute visibility'}
                </button>
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
