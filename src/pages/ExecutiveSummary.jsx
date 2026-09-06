import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import WorldMap from '../components/WorldMap'
import { 
  getSuppliersByIndustry,
  getSuppliersByIndustryAndCategory,
  getSupplierLocations, 
  getIndustryMetrics,
  matchSuppliersToRfq,
  INDUSTRY_LABELS,
  filterSuppliersRespectingCatalogVisibility,
  augmentSupplierListForSuperadminPlatformView,
} from '../data/supplierDatabase'
import { useMarketplaceCatalogVisibilityEffective } from '../hooks/useMarketplaceCatalogVisibilityEffective'
import { buyerWorkspaceUrl, rfqIntelligenceUrl } from '../constants/rfqPaths'
import {
  DEFAULT_ASK_REQUIREMENTS,
} from '../utils/standardRfqSchema'
import { MarketplaceCatalogVisibilityControl } from '../components/MarketplaceCatalogVisibilityControl'
import { getEquipmentCategoriesForIndustry } from '../data/equipmentCategoriesByIndustry'
import { getProductCategoriesForIndustry } from '../data/productCategoriesByIndustry'
import { useAccountRegistry } from '../store/accountRegistry'
import useRfqStore from '../store/rfqStore'
import { useAuthStore } from '../store/authStore'
import { supabase, isSupabaseConfigured } from '../config/supabase'
import { tenantKey } from '../utils/tenantStorage'
import { getApproximateLngLatOrFallback } from '../utils/accountApproximateLocation'
import useSourcingPlantStore from '../store/sourcingPlantStore'
import { buildBuyerRfqInitialDraft, createAndSendNetworkRfq } from '../utils/networkRfqCreate'
import { getInjectionMachineIntelRows, toneClass } from '../data/immInjectionMachineProfiles'
import ServiceProviderAvailabilityCard from '../components/ServiceProviderAvailabilityCard'
import { ToggleCheckButton } from '../components/ToggleCheckButton'
import BuyerRfqCreateForm from '../components/buyer/BuyerRfqCreateForm'
import CapabilityCompareTable from '../components/CapabilityCompareTable'
import { normalizeCapabilityCompareRows } from '../utils/capabilityCompare'
import '../styles/app-page.css'
import './ExecutiveSummary.css'

/** Horizontal % bar: fill width is percentage of track (avoid flex-grow ignoring width). */
function ExecMetricBar({ pct, fillColor }) {
  const w = Math.min(100, Math.max(0, Number(pct) || 0))
  return (
    <span className="exec-metric-bar-track">
      <span
        className="exec-metric-bar-fill"
        style={{ width: `${w}%`, backgroundColor: fillColor }}
      />
    </span>
  )
}

const ExecutiveSummary = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { industryId, categoryId } = useParams()
  const receivingPlant = useSourcingPlantStore((s) => s.plant)

  /* ── Plan-based visibility ──────────────────────────────── */
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const user = useAuthStore((s) => s.user)
  // Preview sessions (via "Preview Platform" on login page) can see the page but NOT names
  const isPreviewSession = (() => {
    try {
      const exp = localStorage.getItem(tenantKey('strefex-preview-expires'))
      return exp && Date.now() < Number(exp)
    } catch { return false }
  })()
  // Requesters see anonymized supplier/provider identities; only superadmin can unmask.
  const canSeeNames = isSuperAdmin && !isPreviewSession

  // Build navigation context — Executive Summary now lives under equipment category
  const goBack = () => navigate(-1)

  // Resolve category label for the page title
  const allCategories = useMemo(() => getEquipmentCategoriesForIndustry(industryId), [industryId])
  const productCategories = useMemo(() => getProductCategoriesForIndustry(industryId), [industryId])
  const categoryObj = categoryId
    ? allCategories.find((c) => c.id === categoryId) || productCategories.find((c) => c.id === categoryId)
    : null
  const categoryLabel = categoryObj ? categoryObj.name : categoryId || ''
  
  const { getRfqsByIndustry, addAttachment, removeAttachment } = useRfqStore()
  const storeRfqs = useRfqStore((s) => s.rfqs)
  
  // State
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [showRfqModal, setShowRfqModal] = useState(false)
  const [rfqTargetSupplierId, setRfqTargetSupplierId] = useState(null)
  const [selectedForRfq, setSelectedForRfq] = useState(new Set()) // multi-select for RFQ comparison
  const [dbRegisteredSellers, setDbRegisteredSellers] = useState([])
  
  // Registered sellers from the persistent account registry
  // If categoryId is present, filter by both industry AND category
  const registeredSellers = useAccountRegistry((s) =>
    categoryId
      ? s.getSellersByCategory(industryId, categoryId)
      : s.getRegisteredSellers(industryId)
  )
  const registeredServiceProviders = useAccountRegistry((s) => s.getRegisteredServiceProviders(industryId))

  // Database-backed registered suppliers (cross-device/session source of truth)
  useEffect(() => {
    let cancelled = false

    const loadDbSuppliers = async () => {
      if (!isSupabaseConfigured || !industryId) {
        if (!cancelled) setDbRegisteredSellers([])
        return
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, metadata, companies(name)')
          .not('company_id', 'is', null)

        if (error) throw error

        const mapped = (data || [])
          .filter((profile) => {
            const md = profile?.metadata || {}
            const accountTypes = Array.isArray(md.account_types)
              ? md.account_types
              : [md.account_type].filter(Boolean)
            const isSellerLike = accountTypes.includes('seller') || accountTypes.includes('service_provider')
            if (!isSellerLike) return false

            const industries = Array.isArray(md.industries)
              ? md.industries
              : (md.industry ? [md.industry] : [])
            const categoriesByIndustry = md.categories && typeof md.categories === 'object' ? md.categories : {}
            const inIndustry = industries.includes(industryId)
            const inCategory = !categoryId || (Array.isArray(categoriesByIndustry[industryId]) && categoriesByIndustry[industryId].includes(categoryId))
            return inIndustry && inCategory
          })
          .map((profile) => {
            const md = profile?.metadata || {}
            const categoriesByIndustry = md.categories && typeof md.categories === 'object' ? md.categories : {}
            return {
              id: `db-${profile.id}`,
              name: profile?.companies?.name || profile?.full_name || profile?.email || 'Supplier',
              country: md.country || '—',
              city: md.city || '—',
              address: md.address || '',
              coordinates: md.coordinates || null,
              industries: Array.isArray(md.industries) ? md.industries : (md.industry ? [md.industry] : []),
              categories: Object.values(categoriesByIndustry).flat(),
              source: 'registered_db',
              rating: md.rating ?? 0,
              riskLevel: md.riskLevel ?? 50,
              fitLevel: md.fitLevel ?? 50,
              capacityLevel: md.capacityLevel ?? 50,
              certifications: md.certifications || [],
              leadTimeDays: md.leadTimeDays ?? 0,
              deliveryTimeDays: md.deliveryTimeDays ?? 0,
              priceIndex: md.priceIndex ?? 100,
              established: md.established ?? null,
              employees: md.employees ?? null,
              plan: md.plan || null,
              registeredAt: md.registeredAt || null,
            }
          })

        if (!cancelled) setDbRegisteredSellers(mapped)
      } catch {
        if (!cancelled) setDbRegisteredSellers([])
      }
    }

    loadDbSuppliers()
    return () => { cancelled = true }
  }, [industryId, categoryId])

  // Get data — merge static supplier DB with registered sellers
  // Scope to equipment category when available
  const industryLabel = industryId ? INDUSTRY_LABELS[industryId] || industryId : 'All Industries'
  const showMarketplaceCatalog = useMarketplaceCatalogVisibilityEffective()
  const suppliers = useMemo(() => {
    const staticSuppliers = categoryId
      ? getSuppliersByIndustryAndCategory(industryId, categoryId)
      : getSuppliersByIndustry(industryId)
    // Convert registered sellers to the same shape, avoiding duplicates by company name
    const staticNames = new Set(staticSuppliers.map((s) => s.name.toLowerCase()))
    const fromRegistry = registeredSellers
      .filter((a) => {
        const key = String(a.company || a.companyName || a.email || '').toLowerCase()
        return key && !staticNames.has(key)
      })
      .map((a) => ({
        id: a.id,
        name: a.company || a.companyName || a.contactName || a.name || a.email || 'Supplier',
        country: a.country || '—',
        city: a.city || '—',
        address: a.address || '',
        coordinates: a.coordinates || null,
        industries: a.industries || [],
        categories: [
          ...Object.values(a.categories || {}).flat(),
          ...Object.values(a.productCategories || {}).flat(),
        ],
        source: 'registered',
        rating: a.rating ?? 0,
        riskLevel: a.riskLevel ?? 50,
        fitLevel: a.fitLevel ?? 50,
        capacityLevel: a.capacityLevel ?? 50,
        certifications: a.certifications || [],
        leadTimeDays: a.leadTimeDays ?? 0,
        deliveryTimeDays: a.deliveryTimeDays ?? 0,
        priceIndex: a.priceIndex ?? 100,
        established: a.established ?? null,
        employees: a.employees ?? null,
        plan: a.plan,
        registeredAt: a.registeredAt,
      }))
    const namesAfterRegistry = new Set([
      ...staticNames,
      ...fromRegistry.map((s) => (s.name || '').toLowerCase()),
    ])
    const fromDatabase = dbRegisteredSellers.filter((s) => !namesAfterRegistry.has((s.name || '').toLowerCase()))
    return augmentSupplierListForSuperadminPlatformView(
      filterSuppliersRespectingCatalogVisibility(
        [...staticSuppliers, ...fromRegistry, ...fromDatabase],
        showMarketplaceCatalog,
      ),
      industryId,
      categoryId,
      isSuperAdmin,
    )
  }, [industryId, categoryId, registeredSellers, dbRegisteredSellers, showMarketplaceCatalog, isSuperAdmin])

  const supplierLocations = useMemo(() => {
    const staticLocsRaw = getSupplierLocations(industryId, categoryId)
    const staticLocs = showMarketplaceCatalog
      ? staticLocsRaw
      : staticLocsRaw.filter((l) => l.source !== 'database')
    const staticIds = new Set(staticLocs.map((l) => l.id))
    const registryAndDb = [...registeredSellers, ...dbRegisteredSellers]

    const approximateFor = (a) =>
      getApproximateLngLatOrFallback({
        country: a.country,
        city: a.city,
        address: a.address,
        seed: String(a.id ?? a.name ?? ''),
      })

    const regLocs = registryAndDb
      .filter((a) => !staticIds.has(a.id))
      .map((a) => {
        const coords = approximateFor(a)
        return {
          id: a.id,
          name: a.company || a.companyName || a.name || a.contactName || 'Supplier',
          coordinates: coords,
          country: a.country || '—',
          city: a.city || '—',
          rating: a.rating ?? 0,
          riskLevel: a.riskLevel ?? 50,
          fitLevel: a.fitLevel ?? 50,
        }
      })

    const allLocs = [...staticLocs, ...regLocs]
    const idsInMap = new Set(allLocs.map((l) => l.id))
    const extraFromSuppliers = []
    if (isSuperAdmin) {
      for (const s of suppliers) {
        if (!s?.coordinates || s.coordinates[0] === 0) continue
        if (idsInMap.has(s.id)) continue
        idsInMap.add(s.id)
        extraFromSuppliers.push({
          id: s.id,
          name: s.name,
          coordinates: s.coordinates,
          country: s.country || '—',
          city: s.city || '—',
          rating: s.rating ?? 0,
          riskLevel: s.riskLevel ?? 50,
          fitLevel: s.fitLevel ?? 50,
          source: s.source || 'registered',
        })
      }
    }
    const mergedLocs = [...allLocs, ...extraFromSuppliers]
    // Anonymize names on map for non-premium buyers
    if (!canSeeNames) {
      return mergedLocs.map((loc, i) => ({ ...loc, name: `Supplier #${(i + 1).toString().padStart(2, '0')}` }))
    }
    return mergedLocs
  }, [industryId, categoryId, registeredSellers, dbRegisteredSellers, canSeeNames, showMarketplaceCatalog, isSuperAdmin, suppliers])

  const directoryMetrics = useMemo(
    () =>
      getIndustryMetrics(industryId, categoryId, {
        excludeMarketplaceCatalog: !showMarketplaceCatalog,
        superadminPlatformView: isSuperAdmin,
      }),
    [industryId, categoryId, showMarketplaceCatalog, isSuperAdmin],
  )

  /** Eight headline indicators from the same supplier rows shown in the table (supplier-stated fields). */
  const metrics = useMemo(() => {
    const rows = Array.isArray(suppliers) ? suppliers : []
    const n = rows.length
    const avg = (pick) => {
      if (!n) return 0
      const sum = rows.reduce((a, s) => a + (Number(pick(s)) || 0), 0)
      return Math.round(sum / n)
    }
    const avgFit = avg((s) => s.fitLevel)
    const avgRisk = avg((s) => s.riskLevel)
    const avgCapacity = avg((s) => s.capacityLevel)
    const avgRating = n
      ? Math.round((rows.reduce((a, s) => a + (Number(s.rating) || 0), 0) / n) * 10) / 10
      : 0
    const avgLead = avg((s) => s.leadTimeDays)
    const avgDelivery = avg((s) => s.deliveryTimeDays)
    const avgPrice = avg((s) => s.priceIndex)
    const certShare = n
      ? Math.round(rows.filter((s) => (s.certifications || []).length > 0).length / n * 100)
      : 0
    const capacityNote = avgCapacity > 90
      ? 'High utilisation — clarify investment / capacity expansion with the manufacturer'
      : avgCapacity > 80
        ? 'Tight headroom — confirm ramp with manufacturers'
        : 'Enough capacity for requested volume'
    return {
      ...directoryMetrics,
      totalSuppliers: n || directoryMetrics.totalSuppliers || 0,
      sampleSize: n,
      avgFit,
      avgRisk,
      avgCapacity,
      avgRating,
      avgLead,
      avgDelivery,
      avgPrice,
      certShare,
      capacityNote,
    }
  }, [suppliers, directoryMetrics])

  const immIntelRows = useMemo(
    () => getInjectionMachineIntelRows(selectedSupplier),
    [selectedSupplier]
  )
  const serviceProviderRows = useMemo(() => {
    const all = Array.isArray(registeredServiceProviders) ? registeredServiceProviders : []
    return all.map((provider) => ({
      id: provider.id,
      company: provider.company || provider.contactName || provider.email || 'Service Provider',
      serviceCategories: Array.isArray(provider.serviceCategories) ? provider.serviceCategories : [],
      email: provider.email || '',
    }))
  }, [registeredServiceProviders])
  const categoryOptions = useMemo(() => {
    const merged = [...allCategories, ...productCategories]
    return [...new Map(merged.map((c) => [c.id, c])).values()]
  }, [allCategories, productCategories])

  const lockedSupplierIds = useMemo(() => {
    if (selectedForRfq.size > 0) return [...selectedForRfq]
    if (rfqTargetSupplierId) return [rfqTargetSupplierId]
    const matched = matchSuppliersToRfq({
      industryId,
      categoryId: categoryId || categoryOptions[0]?.id || '',
      requirements: DEFAULT_ASK_REQUIREMENTS,
      excludeMarketplaceCatalog: !showMarketplaceCatalog,
      superadminPlatformView: isSuperAdmin,
    }).slice(0, 5).map((s) => s.id)
    if (matched.length > 0) return matched
    return suppliers.slice(0, 5).map((s) => s.id)
  }, [
    selectedForRfq,
    rfqTargetSupplierId,
    industryId,
    categoryId,
    categoryOptions,
    showMarketplaceCatalog,
    isSuperAdmin,
    suppliers,
  ])

  const rfqs = useMemo(() => getRfqsByIndustry(industryId), [industryId, getRfqsByIndustry, storeRfqs])
  const rfqStats = useMemo(() => {
    const list = Array.isArray(rfqs) ? rfqs : []
    return {
      total: list.length,
      sent: list.filter((r) => r.status === 'sent' || r.status === 'active').length,
      active: list.filter((r) => r.status === 'active').length,
      draft: list.filter((r) => r.status === 'draft').length,
      completed: list.filter((r) => r.status === 'completed').length,
      responses: list.reduce((sum, r) => sum + (r.responses || 0), 0),
    }
  }, [rfqs])

  const comparedSuppliers = useMemo(
    () => suppliers.filter((s) => selectedForRfq.has(s.id)),
    [suppliers, selectedForRfq]
  )

  const capabilityCompareRows = useMemo(
    () => normalizeCapabilityCompareRows(comparedSuppliers, industryId),
    [comparedSuppliers, industryId],
  )
  
  /* ── Anonymized display name for non-premium buyers ────── */
  const getDisplayName = (supplier, index) => {
    if (canSeeNames) return supplier.name
    return `Supplier #${(index + 1).toString().padStart(2, '0')}`
  }

  /* ── Multi-select RFQ toggle ─────────────────────────────── */
  const toggleRfqSelection = (supplierId) => {
    setSelectedForRfq((prev) => {
      const next = new Set(prev)
      if (next.has(supplierId)) next.delete(supplierId)
      else next.add(supplierId)
      return next
    })
  }

  const handleSendMultiRfq = () => {
    if (selectedForRfq.size === 0) return
    setRfqTargetSupplierId(null)
    setShowRfqModal(true)
  }

  const openRfqModal = (supplierId = null) => {
    setRfqTargetSupplierId(supplierId)
    if (supplierId) {
      setSelectedForRfq(new Set([supplierId]))
    }
    setShowRfqModal(true)
  }

  // Deep-link from Intelligent Sourcing: open RFQ + apply shortlist names (once per landing)
  const openedFromSourcing = useRef(false)
  useEffect(() => {
    if (searchParams.get('openRfq') !== '1' || openedFromSourcing.current) return
    openedFromSourcing.current = true
    const shortlist = String(searchParams.get('shortlist') || '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
    if (shortlist.length && suppliers?.length) {
      const ids = suppliers
        .filter((s) => shortlist.some((n) => String(s.name || '').toLowerCase() === n.toLowerCase()))
        .map((s) => s.id)
      if (ids.length) setSelectedForRfq(new Set(ids))
    }
    setShowRfqModal(true)
  }, [searchParams, suppliers])

  const plantLocation = useMemo(() => {
    if (!receivingPlant || receivingPlant.lat == null || receivingPlant.lon == null) return null
    return {
      id: `plant-${receivingPlant.id || 'home'}`,
      name: receivingPlant.name || 'Receiving plant',
      coordinates: [Number(receivingPlant.lon), Number(receivingPlant.lat)],
      kind: 'plant',
    }
  }, [receivingPlant])

  const closeRfqModal = () => {
    setShowRfqModal(false)
    setRfqTargetSupplierId(null)
  }

  // Handle marker click on map
  const handleMarkerClick = (location) => {
    const supplier = suppliers.find(s => s.id === location.id)
    setSelectedSupplier(supplier)
  }
  
  // Handle RFQ creation — same form + rfqStore as Intelligent Sourcing / Buyer Workspace
  const handleSendRfqDraft = (draft) => {
    const result = createAndSendNetworkRfq(draft, {
      industryId: draft.industryId || industryId || '',
      buyerEmail: user?.email || '',
      buyerCompany: user?.companyName || user?.company || user?.email || 'Buyer',
      plant: receivingPlant,
      source: 'executive-summary',
    })
    if (!result.ok) return
    closeRfqModal()
    setSelectedForRfq(new Set())
  }
  // Get risk color
  const getRiskColor = (risk) => {
    if (risk <= 10) return '#4CAF50'
    if (risk <= 20) return '#FF9800'
    return '#f44336'
  }
  
  // Get rating color
  const getRatingColor = (rating) => {
    if (rating >= 4.5) return '#4CAF50'
    if (rating >= 4.0) return '#FF9800'
    return '#f44336'
  }

  return (
    <AppLayout>
      <div className="app-page executive-summary-page">
        {/* Header Card */}
        <div className="app-page-card">
          <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); goBack() }}>
            ← Back
          </a>
          <div className="exec-header">
            <div className="exec-header-left">
              <div className="exec-logo-container">
                <img src={`${import.meta.env.BASE_URL}assets/strefex-logo-executive-summary.png`} alt="STREFEX" className="exec-logo-img exec-logo-img--executive" />
              </div>
              <p className="exec-subtitle">EXECUTIVE SUMMARY</p>
              <p className="app-page-subtitle exec-page-subtitle-row">
                <span>
                  {industryLabel}{categoryLabel ? ` — ${categoryLabel}` : ''} — Supplier Metrics &amp; RFQ Analysis
                </span>
                <span className="exec-tooltip exec-tooltip--page">
                  <span className="exec-tooltip-marker" aria-hidden="true">
                    ?
                  </span>
                  <span className="exec-tooltip-panel" role="tooltip">
                    <span className="exec-tooltip-inner">
                      <p>
                        The eight headline cards are <strong>averages of supplier-stated fields</strong> from the
                        rows listed below for this industry
                        {categoryLabel ? (
                          <>
                            {' '}
                            / <strong>{categoryLabel}</strong>
                          </>
                        ) : null}
                        . <strong>n</strong> on each card is the sample size — how many suppliers are included in
                        that average. Capacity above 90% prompts clarifying investment with the manufacturer;
                        lower utilisation means enough capacity for requested volume.
                      </p>
                      <p>
                        When you <strong>Create RFQ</strong>, suggested suppliers are <strong>ranked by a match
                        score</strong>: fit level plus lead-time and ISO / IATF quality alignment — capped at 100%.
                      </p>
                    </span>
                  </span>
                </span>
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, maxWidth: '100%' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="exec-rfq-btn exec-rfq-btn--outline"
                  onClick={() => navigate(buyerWorkspaceUrl({ tab: 'track' }))}
                >
                  Track quotes
                </button>
                <button
                  type="button"
                  className="exec-rfq-btn exec-rfq-btn--outline"
                  onClick={() =>
                    navigate(
                      rfqIntelligenceUrl(`tab=new&industryId=${encodeURIComponent(industryId || '')}&categoryId=${encodeURIComponent(categoryId || '')}`),
                    )
                  }
                >
                  RFQ Intelligence
                </button>
                <button
                  type="button"
                  className="exec-rfq-btn"
                  onClick={() => openRfqModal()}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Create RFQ
                </button>
              </div>
              <MarketplaceCatalogVisibilityControl />
            </div>
          </div>
        </div>

        {/* Eight supplier-stated indicators — 4 columns × 2 rows */}
        <div className="exec-main-indicators">
          {[
            {
              key: 'fit',
              label: 'SUPPLIER FIT',
              value: `${metrics.avgFit}%`,
              pct: metrics.avgFit,
              fill: 'fit',
              sub: 'From supplier capability profiles',
              tip: `Average fit level each supplier stated for this industry/category (0–100). n=${metrics.sampleSize} means the average uses ${metrics.sampleSize} supplier row${metrics.sampleSize === 1 ? '' : 's'} currently listed below.`,
            },
            {
              key: 'risk',
              label: 'RISK LEVEL',
              value: `${metrics.avgRisk}%`,
              pct: metrics.avgRisk,
              fill: 'risk',
              sub: 'Higher % = higher stated risk',
              tip: `Average risk % from supplier profile data (directory or registered account). n=${metrics.sampleSize} = number of suppliers included in this average.`,
            },
            {
              key: 'capacity',
              label: 'CAPACITY USED',
              value: `${metrics.avgCapacity}%`,
              pct: metrics.avgCapacity,
              fill: 'capacity',
              sub: metrics.capacityNote,
              tip: `Average utilisation % suppliers entered on their plant profile. Above 90%: clarify investment with the manufacturer. At/below 80%: enough capacity for requested volume. n=${metrics.sampleSize} suppliers in the average.`,
            },
            {
              key: 'rating',
              label: 'RATING',
              value: `${metrics.avgRating} ★`,
              pct: Math.min(100, Math.round((Number(metrics.avgRating) || 0) / 5 * 100)),
              fill: 'fit',
              sub: 'Supplier / directory rating',
              tip: `Average star rating from supplier records shown in the table. n=${metrics.sampleSize} = suppliers averaged.`,
            },
            {
              key: 'lead',
              label: 'LEAD TIME',
              value: `${metrics.avgLead}d`,
              pct: Math.min(100, Math.round((Number(metrics.avgLead) || 0) / 1.5)),
              fill: 'capacity',
              sub: 'Stated production lead (ex-works)',
              tip: `Average production lead time (days) stated by suppliers. n=${metrics.sampleSize} suppliers included.`,
            },
            {
              key: 'delivery',
              label: 'DELIVERY',
              value: `${metrics.avgDelivery}d`,
              pct: Math.min(100, Math.round((Number(metrics.avgDelivery) || 0) * 4)),
              fill: 'capacity',
              sub: 'Stated delivery / transit days',
              tip: `Average delivery time (days) from supplier profile data. n=${metrics.sampleSize} = sample size for this average.`,
            },
            {
              key: 'price',
              label: 'PRICE INDEX',
              value: String(metrics.avgPrice),
              pct: Math.min(100, Number(metrics.avgPrice) || 0),
              fill: 'risk',
              sub: '100 = market average (supplier index)',
              tip: `Average price index stated on supplier profiles (100 ≈ market). n=${metrics.sampleSize} suppliers in the average.`,
            },
            {
              key: 'certs',
              label: 'STANDARDS ON FILE',
              value: `${metrics.certShare}%`,
              pct: metrics.certShare,
              fill: 'fit',
              sub: 'Share with declared certifications',
              tip: `Share of listed suppliers that declared at least one certification in their account/directory data. n=${metrics.sampleSize} suppliers checked.`,
            },
          ].map((card) => (
            <div key={card.key} className="exec-indicator-card">
              <span className="exec-indicator-label exec-indicator-label-row">
                {card.label}
                <span className="exec-tooltip exec-tooltip--indicator">
                  <span className="exec-tooltip-marker" aria-hidden="true">?</span>
                  <span className="exec-tooltip-panel" role="tooltip">
                    <span className="exec-tooltip-inner">{card.tip}</span>
                  </span>
                </span>
              </span>
              <div className="exec-indicator-bar">
                <div
                  className={`exec-indicator-fill ${card.fill}`}
                  style={{ width: `${Math.min(100, Math.max(0, card.pct || 0))}%` }}
                />
              </div>
              <div className="exec-indicator-value-row">
                <span className="exec-indicator-value">{card.value}</span>
                <span
                  className="exec-indicator-n"
                  title={`n=${metrics.sampleSize}: number of suppliers included in this average from the table below.`}
                >
                  n={metrics.sampleSize}
                </span>
              </div>
              <p className="exec-indicator-sub stx-text-wrap">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Map and RFQ Stats Row */}
        <div className="exec-content-row">
          {/* Map Section */}
          <div className="app-page-card exec-map-card">
            <h3 className="exec-section-title">Supplier Locations</h3>
            <p className="exec-map-disclaimer">
              Pins use approximate positions from supplier country/city (and registry address fields where available), not precise street coordinates.
            </p>
            <div className="exec-map-container">
              <WorldMap
                variant="executive"
                locations={supplierLocations}
                plantLocation={plantLocation}
                onMarkerClick={handleMarkerClick}
                selectedId={selectedSupplier?.id}
              />
            </div>
            <div className="exec-map-legend">
              <span className="legend-item">
                <span className="legend-dot champagne" /> Supplier location (approximate pin)
              </span>
              {plantLocation && (
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: '#192A56', borderRadius: 2 }} /> Receiving plant
                  {receivingPlant?.name ? ` · ${receivingPlant.name}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* RFQ Infographics */}
          <div className="exec-rfq-stats">
            <div className="app-page-card exec-stat-card">
              <div className="exec-stat-icon sent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="exec-stat-info">
                <span className="exec-stat-value">{rfqStats.sent}</span>
                <span className="exec-stat-label">RFQs Sent</span>
              </div>
            </div>
            <div className="app-page-card exec-stat-card">
              <div className="exec-stat-icon active">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="exec-stat-info">
                <span className="exec-stat-value">{rfqStats.active}</span>
                <span className="exec-stat-label">Active RFQs</span>
              </div>
            </div>
            <div className="app-page-card exec-stat-card">
              <div className="exec-stat-icon responses">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="exec-stat-info">
                <span className="exec-stat-value">{rfqStats.responses}</span>
                <span className="exec-stat-label">Responses</span>
              </div>
            </div>
            <div className="app-page-card exec-stat-card">
              <div className="exec-stat-icon suppliers">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="exec-stat-info">
                <span className="exec-stat-value">{metrics.totalSuppliers}</span>
                <span className="exec-stat-label">Matched Suppliers</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Upgrade banner for non-premium buyers ─────────── */}
        {!canSeeNames && (
          <div className="exec-upgrade-banner">
            <div className="exec-upgrade-banner-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="exec-upgrade-banner-text">
              <strong>Supplier names are hidden for requester accounts.</strong> You can still compare all metrics and send RFQs to multiple sellers for price comparison.
            </div>
          </div>
        )}

        <ServiceProviderAvailabilityCard
          industryLabel={industryLabel}
          canSeeNames={canSeeNames}
          providers={serviceProviderRows}
          cardStyle={{ marginTop: 16 }}
          onRequestService={(serviceId, label) => {
            const p = new URLSearchParams({
              context: 'service',
              serviceCategory: serviceId,
              serviceCategoryLabel: label,
              industry: industryId || '',
              industryLabel: industryLabel || '',
              requestSource: 'executive-summary',
            })
            navigate(`/services?${p.toString()}`)
          }}
          onRequestProvider={(provider, requestMeta) => {
            const p = new URLSearchParams({
              context: 'service',
              serviceCategory: requestMeta?.serviceCategoryId || 'supplier-services',
              serviceCategoryLabel: requestMeta?.serviceCategoryLabel || 'Supplier Services',
              industry: industryId || '',
              industryLabel: industryLabel || '',
              preferredProviderId: String(provider?.id || ''),
              preferredProviderName: String(provider?.company || ''),
              preferredProviderEmail: String(provider?.email || ''),
              requestSource: 'executive-summary',
            })
            navigate(`/services?${p.toString()}`)
          }}
        />

        {/* Supplier Summary Table */}
        <div className="app-page-card">
          <div className="exec-table-header-row">
            <h3 className="exec-section-title">Registered Sellers &amp; Suppliers ({suppliers.length})</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className="exec-multi-rfq-btn exec-multi-rfq-btn--outline"
                onClick={() =>
                  navigate(
                    rfqIntelligenceUrl(`tab=new&industryId=${encodeURIComponent(industryId || '')}&categoryId=${encodeURIComponent(categoryId || '')}`),
                  )
                }
              >
                RFQ Intelligence
              </button>
              {selectedForRfq.size > 0 && (
                <button type="button" className="exec-multi-rfq-btn" onClick={handleSendMultiRfq}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Send RFQ to {selectedForRfq.size} Seller{selectedForRfq.size > 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
          <div className="exec-table-wrapper">
            <table className="exec-table">
              <thead>
                <tr>
                  <th className="exec-th-check">
                    <ToggleCheckButton
                      compact
                      checked={selectedForRfq.size === suppliers.length && suppliers.length > 0}
                      onChange={() => {
                        if (selectedForRfq.size === suppliers.length) setSelectedForRfq(new Set())
                        else setSelectedForRfq(new Set(suppliers.map((s) => s.id)))
                      }}
                      title="Select all for RFQ"
                      aria-label="Select all suppliers for RFQ"
                    />
                  </th>
                  <th>Supplier</th>
                  <th>Location</th>
                  <th>Rating</th>
                  <th>Risk</th>
                  <th>Fit</th>
                  <th>Capacity</th>
                  <th>Lead Time</th>
                  <th>Delivery</th>
                  <th>Price Index</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier, idx) => (
                  <tr 
                    key={supplier.id}
                    className={`${selectedSupplier?.id === supplier.id ? 'selected' : ''} ${selectedForRfq.has(supplier.id) ? 'rfq-checked' : ''}`}
                    onClick={() => setSelectedSupplier(supplier)}
                  >
                    <td className="exec-td-check" onClick={(e) => e.stopPropagation()}>
                      <ToggleCheckButton
                        compact
                        checked={selectedForRfq.has(supplier.id)}
                        onChange={() => toggleRfqSelection(supplier.id)}
                        title="Select for RFQ comparison"
                        aria-label={`Select ${getDisplayName(supplier, idx)} for RFQ`}
                      />
                    </td>
                    <td className="exec-td-supplier">
                      <div className="supplier-name">
                        <span className="supplier-name-text">
                          {getDisplayName(supplier, idx)}
                          {canSeeNames && supplier.source === 'registered' && <span className="exec-reg-badge">Registered</span>}
                          {!canSeeNames && <span className="exec-anon-badge">Anonymous</span>}
                        </span>
                        {canSeeNames && (
                          <span className="supplier-certs">
                            {supplier.certifications?.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="location-cell">
                        <span className="country-flag">{supplier.country}</span>
                        <span className="city-name">{supplier.city}</span>
                      </span>
                    </td>
                    <td>
                      <span className="rating-cell" style={{ color: getRatingColor(supplier.rating) }}>
                        {supplier.rating} ★
                      </span>
                    </td>
                    <td>
                      <span className="risk-cell exec-metric-cell">
                        <ExecMetricBar pct={supplier.riskLevel} fillColor={getRiskColor(supplier.riskLevel)} />
                        <span className="risk-value">{supplier.riskLevel}%</span>
                      </span>
                    </td>
                    <td>
                      <span className="fit-cell exec-metric-cell">
                        <ExecMetricBar pct={supplier.fitLevel} fillColor="#4CAF50" />
                        <span className="fit-value">{supplier.fitLevel}%</span>
                      </span>
                    </td>
                    <td>
                      <span className="capacity-cell exec-metric-cell" title={
                        supplier.capacityLevel > 90
                          ? 'High capacity used — clarify investment with manufacturer'
                          : 'Enough capacity for requested volume'
                      }>
                        <ExecMetricBar pct={supplier.capacityLevel} fillColor="#FF9800" />
                        <span className="capacity-value">{supplier.capacityLevel}%</span>
                      </span>
                    </td>
                    <td className="time-cell">{supplier.leadTimeDays} days</td>
                    <td className="time-cell">{supplier.deliveryTimeDays} days</td>
                    <td>
                      <span 
                        className="price-cell"
                        style={{ 
                          color: supplier.priceIndex <= 100 ? '#4CAF50' : 
                                 supplier.priceIndex <= 110 ? '#FF9800' : '#f44336'
                        }}
                      >
                        {supplier.priceIndex}
                      </span>
                    </td>
                    <td>
                      <button 
                        type="button" 
                        className="table-action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedSupplier(supplier)
                          openRfqModal(supplier.id)
                        }}
                      >
                        RFQ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {comparedSuppliers.length >= 2 && (
          <div className="app-page-card exec-supplier-comparison">
            <h3 className="exec-section-title">
              Capability compare ({comparedSuppliers.length})
            </h3>
            <p className="exec-cmp-intro">
              Selected via checkboxes — same columns as Buyer Workspace Discover compare
              (location, capacity, lead, standards, evidence, PPAP / trace).
            </p>
            <CapabilityCompareTable
              rows={capabilityCompareRows}
              industryId={industryId}
              canSeeDetails={canSeeNames}
              maskName={(row, index) => getDisplayName(comparedSuppliers[index] || row, suppliers.indexOf(comparedSuppliers[index] || row))}
            />
          </div>
        )}

        {/* Selected Supplier Details */}
        {selectedSupplier && (
          <div className="app-page-card exec-supplier-detail">
            <div className="exec-detail-header">
              <h3 className="exec-section-title">
                {canSeeNames ? selectedSupplier.name : getDisplayName(selectedSupplier, suppliers.indexOf(selectedSupplier))}
              </h3>
              <div className="exec-detail-header-actions">
                {!selectedForRfq.has(selectedSupplier.id) && (
                  <button
                    type="button"
                    className="table-action-btn"
                    onClick={() => toggleRfqSelection(selectedSupplier.id)}
                  >
                    + Add to RFQ
                  </button>
                )}
                <button 
                  type="button" 
                  className="close-btn"
                  onClick={() => setSelectedSupplier(null)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="exec-detail-grid">
              <div className="exec-detail-item">
                <span className="detail-label">Location</span>
                <span className="detail-value">{selectedSupplier.city}, {selectedSupplier.country}</span>
              </div>
              {canSeeNames && (
                <div className="exec-detail-item">
                  <span className="detail-label">Established</span>
                  <span className="detail-value">{selectedSupplier.established}</span>
                </div>
              )}
              {canSeeNames && (
                <div className="exec-detail-item">
                  <span className="detail-label">Employees</span>
                  <span className="detail-value">{selectedSupplier.employees?.toLocaleString()}</span>
                </div>
              )}
              <div className="exec-detail-item">
                <span className="detail-label">Certifications</span>
                <span className="detail-value">{selectedSupplier.certifications?.join(', ')}</span>
              </div>
              <div className="exec-detail-item">
                <span className="detail-label">Industries</span>
                <span className="detail-value">
                  {selectedSupplier.industries?.map(i => INDUSTRY_LABELS[i] || i).join(', ')}
                </span>
              </div>
              <div className="exec-detail-item">
                <span className="detail-label">Categories</span>
                <span className="detail-value">{selectedSupplier.categories?.join(', ')}</span>
              </div>
            </div>

            {immIntelRows?.length ? (
              <div className="exec-imm-intel">
                <div className="exec-imm-intel-heading">
                  <h4 className="exec-imm-intel-title">Injection molding supplier profile</h4>
                  <p className="exec-imm-intel-note">
                    Criterion snapshot aligned with IMM comparison dashboards (equipment mix, positioning, pricing
                    tiers). Values are illustrative; confirm with the supplier before purchase.
                  </p>
                </div>
                <div className="exec-imm-table-wrap">
                  <table className="exec-imm-table">
                    <tbody>
                      {immIntelRows.map((row) => (
                        <tr key={row.label}>
                          <th scope="row">{row.label}</th>
                          <td>
                            {row.chips?.length ? (
                              <span className="exec-imm-chips">
                                {row.chips.map((chip) => (
                                  <span key={chip.text} className={toneClass(chip.tone)}>
                                    {chip.text}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className="exec-imm-text">{row.text}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="exec-detail-metrics">
              <div className="metric-item">
                <div className="metric-gauge">
                  <svg viewBox="0 0 100 50">
                    <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="#e0e0e0" strokeWidth="8"/>
                    <path 
                      d="M10 50 A40 40 0 0 1 90 50" 
                      fill="none" 
                      stroke="#4CAF50" 
                      strokeWidth="8"
                      strokeDasharray={`${selectedSupplier.fitLevel * 1.26} 126`}
                    />
                  </svg>
                  <span className="metric-value">{selectedSupplier.fitLevel}%</span>
                </div>
                <span className="metric-label">Fit Level</span>
              </div>
              <div className="metric-item">
                <div className="metric-gauge">
                  <svg viewBox="0 0 100 50">
                    <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="#e0e0e0" strokeWidth="8"/>
                    <path 
                      d="M10 50 A40 40 0 0 1 90 50" 
                      fill="none" 
                      stroke={getRiskColor(selectedSupplier.riskLevel)} 
                      strokeWidth="8"
                      strokeDasharray={`${selectedSupplier.riskLevel * 1.26} 126`}
                    />
                  </svg>
                  <span className="metric-value">{selectedSupplier.riskLevel}%</span>
                </div>
                <span className="metric-label">Risk Level</span>
              </div>
              <div className="metric-item">
                <div className="metric-gauge">
                  <svg viewBox="0 0 100 50">
                    <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="#e0e0e0" strokeWidth="8"/>
                    <path 
                      d="M10 50 A40 40 0 0 1 90 50" 
                      fill="none" 
                      stroke="#FF9800" 
                      strokeWidth="8"
                      strokeDasharray={`${selectedSupplier.capacityLevel * 1.26} 126`}
                    />
                  </svg>
                  <span className="metric-value">{selectedSupplier.capacityLevel}%</span>
                </div>
                <span className="metric-label">Capacity</span>
              </div>
            </div>
            <p className="exec-indicator-sub stx-text-wrap" style={{ marginTop: 12 }}>
              {selectedSupplier.capacityLevel > 90
                ? 'High capacity used — clarify investment / capacity expansion with the manufacturer before awarding volume.'
                : 'Enough capacity for requested volume based on this supplier’s stated utilisation.'}
            </p>
          </div>
        )}

        {/* RFQ Modal */}
        {showRfqModal && (
          <div className="exec-modal-overlay" onClick={closeRfqModal}>
            <div className="exec-modal exec-modal--rfq" onClick={e => e.stopPropagation()}>
              <div className="exec-modal-header">
                <h3>Create New RFQ</h3>
                <button type="button" className="close-btn" onClick={closeRfqModal}>×</button>
              </div>
              <div className="exec-modal-body">
                <BuyerRfqCreateForm
                  categoryOptions={categoryOptions}
                  initialDraft={buildBuyerRfqInitialDraft({
                    supplierIds: lockedSupplierIds,
                    title: 'Network RFQ',
                  })}
                  shortlisted={suppliers}
                  showMarketplaceCatalog={showMarketplaceCatalog}
                  isSuperAdmin={isSuperAdmin}
                  canSeeDetails={canSeeNames}
                  hideSupplierPicker={lockedSupplierIds.length > 0}
                  lockedSupplierIds={lockedSupplierIds.length > 0 ? lockedSupplierIds : null}
                  submitLabel="Send RFQ"
                  onCancel={closeRfqModal}
                  onContinue={handleSendRfqDraft}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ExecutiveSummary
