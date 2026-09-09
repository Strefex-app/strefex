import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useTranslation } from '../i18n/useTranslation'
import '../styles/app-page.css'
import './BuyerWorkspace.css'
import SupplierCard from '../components/SupplierCard'
import CapabilityCompareTable from '../components/CapabilityCompareTable'
import ShortlistGapPanel from '../components/buyer/ShortlistGapPanel'
import HubIndustryRegistration from '../components/hubs/HubIndustryRegistration'
import industrialIntelligenceService from '../services/industrialIntelligenceService'
import { useIndustryStore } from '../store/industryStore'
import { useAccountRegistry } from '../store/accountRegistry'
import { useSubscriptionStore } from '../services/featureFlags'
import { useAuthStore } from '../store/authStore'
import useRfqStore from '../store/rfqStore'
import useEvidenceRequestStore from '../store/evidenceRequestStore'
import { normalizeCapabilityCompareRows } from '../utils/capabilityCompare'
import { useMarketplaceCatalogVisibilityEffective } from '../hooks/useMarketplaceCatalogVisibilityEffective'
import { isSeededSupplierDirectoryEnabled } from '../config/supplierDataMode'
import { PLATFORM_HUB_INDUSTRY_SLUGS, displayHubIndustryFromSlug } from '../data/platformHubIndustries'
import { getEquipmentCategoriesForIndustry } from '../data/equipmentCategoriesByIndustry'
import { getProductCategoriesForIndustry } from '../data/productCategoriesByIndustry'
import { tenantKey } from '../utils/tenantStorage'
import {
  canSeeManufacturerDetails,
  filterManufacturersByCategory,
  filterManufacturersByIndustry,
  formatMaskedManufacturerLabel,
  hydrateShortlistEntryToCardRow,
  isSupplierUuid,
  loadDiscoverDirectoryPage,
} from '../utils/buyerWorkspaceSuppliers'
import {
  coverageStats,
  enhanceSupplierList,
  filterStandardForIndustry,
  sortSuppliersByReliability,
  supplierMeetsCertFilter,
} from '../utils/buyerSourcingReliability'
import { rfqIntelligenceUrl, BUYER_WORKSPACE_PATH } from '../constants/rfqPaths'

function getRegistrySellersForDiscover(industryId, categoryId) {
  const registry = useAccountRegistry.getState()
  if (categoryId) return registry.getSellersByCategory(industryId, categoryId)
  return registry.getRegisteredSellers(industryId)
}

const TABS = [
  { id: 'track', labelKey: 'buyerWorkspace.tabTrack' },
]

const LEGACY_TAB_MAP = {
  discover: 'find',
  shortlist: 'find',
  create: 'track',
  send: 'track',
  rfq: 'track',
}

const DISCOVER_PAGE_SIZE = 24

function supplierKey(row) {
  return row?.supplier_id || row?.id
}

function supplierDisplayName(row) {
  return row?.display_name || row?.displayName || row?.legal_name || row?.name || supplierKey(row) || 'Supplier'
}

export default function BuyerWorkspace() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  // Legacy create/send deep links are handled by NetworkSourcingRoute → Sourcing.
  // If this page is reached with those tabs, stay on Track (never bounce to Home).
  const normalizedTab = LEGACY_TAB_MAP[tabParam] || tabParam
  const initialTab = TABS.some((tab) => tab.id === normalizedTab)
    ? normalizedTab
    : 'track'
  const [activeTab, setActiveTab] = useState(initialTab)

  const user = useAuthStore((s) => s.user)
  const localRfqs = useRfqStore((s) => s.rfqs)
  const createEvidenceRequest = useEvidenceRequestStore((s) => s.createRequest)
  const hasOpenEvidenceRequest = useEvidenceRequestStore((s) => s.hasOpenRequest)

  const selectedIndustries = useIndustryStore((s) => s.selectedIndustries)
  const selectedCategories = useIndustryStore((s) => s.selectedCategories)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const hasExecutiveSummary = useSubscriptionStore((s) => s.hasFeature('executiveSummary'))
  // Seeded marketplace catalog is off unless VITE_SEED_SUPPLIER_DIRECTORY=true (or superadmin turns the toggle on).
  const showMarketplaceCatalog = useMarketplaceCatalogVisibilityEffective()
    || isSeededSupplierDirectoryEnabled()
  const [discoverScope, setDiscoverScope] = useState('category') // 'category' | 'industry'

  const isPreviewSession = useMemo(() => {
    try {
      const exp = localStorage.getItem(tenantKey('strefex-preview-expires'))
      return exp && Date.now() < Number(exp)
    } catch {
      return false
    }
  }, [])

  const canSeeDetails = canSeeManufacturerDetails({
    hasExecutiveSummary,
    isSuperAdmin,
    isPreviewSession,
  })

  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [discoverSuppliers, setDiscoverSuppliers] = useState([])
  const [certFilterOn, setCertFilterOn] = useState(false)
  const [discoverTotal, setDiscoverTotal] = useState(0)
  const [discoverSource, setDiscoverSource] = useState('connected')
  const [shortlisted, setShortlisted] = useState([])
  const [selectedForCompare, setSelectedForCompare] = useState([])
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [trackingRows, setTrackingRows] = useState([])
  const [, startTransition] = useTransition()
  const discoverRequestRef = useRef(0)

  useEffect(() => {
    setCertFilterOn(false)
  }, [selectedIndustry])

  const primaryCertFilter = useMemo(
    () => filterStandardForIndustry(selectedIndustry),
    [selectedIndustry],
  )

  const industryOptions = useMemo(() => {
    if (isSuperAdmin) return [...PLATFORM_HUB_INDUSTRY_SLUGS]
    return selectedIndustries.length > 0 ? [...selectedIndustries] : []
  }, [isSuperAdmin, selectedIndustries])

  const categoryOptions = useMemo(() => {
    if (!selectedIndustry) return []
    const equipment = getEquipmentCategoriesForIndustry(selectedIndustry)
    const product = getProductCategoriesForIndustry(selectedIndustry)
    const merged = [...equipment, ...product]
    const unique = [...new Map(merged.map((cat) => [cat.id, cat])).values()]
    if (isSuperAdmin) return unique
    const registered = selectedCategories[selectedIndustry] || []
    if (registered.length === 0) return unique
    return unique.filter((cat) => registered.includes(cat.id))
  }, [selectedIndustry, isSuperAdmin, selectedCategories])

  const selectedCategoryLabel = useMemo(() => {
    const match = categoryOptions.find((cat) => cat.id === selectedCategory)
    return match?.name || ''
  }, [categoryOptions, selectedCategory])

  const setTab = useCallback((tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId }, { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    const rawTab = searchParams.get('tab')
    const mapped = LEGACY_TAB_MAP[rawTab] || rawTab
    if (mapped && TABS.some((entry) => entry.id === mapped) && mapped !== activeTab) {
      setActiveTab(mapped)
    }
    const urlIndustry = searchParams.get('industryId')
    const urlCategory = searchParams.get('categoryId')
    if (urlIndustry) setSelectedIndustry(urlIndustry)
    if (urlCategory) setSelectedCategory(urlCategory)
  }, [searchParams, activeTab])

  useEffect(() => {
    if (selectedIndustry) return
    if (industryOptions.length > 0) {
      setSelectedIndustry(industryOptions[0])
    }
  }, [industryOptions, selectedIndustry])

  useEffect(() => {
    if (categoryOptions.length === 0) {
      setSelectedCategory('')
      return
    }
    if (!selectedCategory || !categoryOptions.some((cat) => cat.id === selectedCategory)) {
      setSelectedCategory(categoryOptions[0].id)
    }
  }, [categoryOptions, selectedCategory])

  const loadShortlists = async () => {
    const rows = await industrialIntelligenceService.listShortlistedSuppliers().catch(() => [])
    setShortlisted(rows)
    return rows
  }

  const loadTracking = async () => {
    const rows = await industrialIntelligenceService.listBuyerRfqTracking().catch(() => [])
    setTrackingRows(rows)
  }

  useEffect(() => {
    void loadShortlists()
    void loadTracking()
  }, [])

  useEffect(() => {
    if (!selectedIndustry || !selectedCategory) return

    const requestId = discoverRequestRef.current + 1
    discoverRequestRef.current = requestId
    const signal = { cancelled: false }

    setDiscoverLoading(true)
    setDiscoverSuppliers([])
    setDiscoverTotal(0)
    setDiscoverScope('category')

    const loadDirectoryFirstPage = async (categoryIdForLoad = selectedCategory, scope = 'category') => {
      let deferLoadingClear = false
      try {
        const registeredSellers = getRegistrySellersForDiscover(
          selectedIndustry,
          categoryIdForLoad || undefined,
        )
        const page = await loadDiscoverDirectoryPage({
          industryId: selectedIndustry,
          categoryId: categoryIdForLoad || '',
          categoryLabel: categoryIdForLoad ? selectedCategoryLabel : '',
          registeredSellers,
          showMarketplaceCatalog,
          offset: 0,
          limit: DISCOVER_PAGE_SIZE,
          signal,
        })
        if (signal.cancelled || discoverRequestRef.current !== requestId) return false
        // Category too narrow — fall back to whole industry so Find is not a dead end.
        if (page.total === 0 && categoryIdForLoad && scope === 'category') {
          deferLoadingClear = true
          return loadDirectoryFirstPage('', 'industry')
        }
        startTransition(() => {
          setDiscoverSuppliers(enhanceSupplierList(page.rows, selectedIndustry))
          setDiscoverTotal(page.total)
          setDiscoverSource('directory')
          setDiscoverScope(scope)
        })
        return page.total > 0
      } finally {
        if (!deferLoadingClear && discoverRequestRef.current === requestId) {
          setDiscoverLoading(false)
        }
      }
    }

    if (shortlisted.length === 0) {
      void loadDirectoryFirstPage()
      return () => {
        signal.cancelled = true
        discoverRequestRef.current += 1
      }
    }

    const supplierIds = shortlisted.map((entry) => entry.supplier_id).filter(Boolean)

    void (async () => {
      try {
        const basicRows = await industrialIntelligenceService.getSuppliersBasicByIds(supplierIds)
        if (signal.cancelled || discoverRequestRef.current !== requestId) return

        const byId = new Map(basicRows.map((row) => [row.id, row]))
        const hydrated = shortlisted.map((entry) => {
          const sid = entry.supplier_id
          const supplier = sid ? byId.get(sid) : null
          return hydrateShortlistEntryToCardRow(entry, supplier ? { supplier } : null)
        })
        const connected = filterManufacturersByCategory(
          filterManufacturersByIndustry(hydrated, selectedIndustry),
          selectedCategory,
        )

        if (connected.length > 0) {
          startTransition(() => {
            setDiscoverSuppliers(enhanceSupplierList(connected, selectedIndustry))
            setDiscoverTotal(connected.length)
            setDiscoverSource('connected')
          })
          if (discoverRequestRef.current === requestId) {
            setDiscoverLoading(false)
          }
          return
        }

        await loadDirectoryFirstPage()
      } catch (err) {
        if (signal.cancelled || discoverRequestRef.current !== requestId) return
        setError(err?.message || t('buyerWorkspace.errLoadSuppliers'))
        await loadDirectoryFirstPage()
      }
    })()

    return () => {
      signal.cancelled = true
      discoverRequestRef.current += 1
    }
  }, [selectedIndustry, selectedCategory, selectedCategoryLabel, shortlisted, showMarketplaceCatalog, t])

  const loadMoreDirectory = useCallback(async () => {
    if (!selectedIndustry || discoverSource !== 'directory') return
    if (discoverSuppliers.length >= discoverTotal) return

    setLoadingMore(true)
    const requestId = discoverRequestRef.current
    const signal = { cancelled: false }
    const categoryIdForLoad = discoverScope === 'industry' ? '' : selectedCategory
    try {
      const registeredSellers = getRegistrySellersForDiscover(
        selectedIndustry,
        categoryIdForLoad || undefined,
      )
      const page = await loadDiscoverDirectoryPage({
        industryId: selectedIndustry,
        categoryId: categoryIdForLoad || '',
        categoryLabel: categoryIdForLoad ? selectedCategoryLabel : '',
        registeredSellers,
        showMarketplaceCatalog,
        offset: discoverSuppliers.length,
        limit: DISCOVER_PAGE_SIZE,
        signal,
      })
      if (signal.cancelled || discoverRequestRef.current !== requestId) return
      startTransition(() => {
        setDiscoverSuppliers((prev) => enhanceSupplierList([...prev, ...page.rows], selectedIndustry))
        setDiscoverTotal(page.total)
      })
    } finally {
      if (discoverRequestRef.current === requestId) {
        setLoadingMore(false)
      }
    }
  }, [
    selectedIndustry,
    selectedCategory,
    selectedCategoryLabel,
    discoverSource,
    discoverScope,
    discoverSuppliers.length,
    discoverTotal,
    showMarketplaceCatalog,
  ])

  const hasMoreDiscover = discoverSource === 'directory' && discoverSuppliers.length < discoverTotal

  const supplierLookup = useMemo(() => {
    const map = new Map()
    ;[...discoverSuppliers, ...selectedForCompare].forEach((row) => {
      const key = supplierKey(row)
      if (key) map.set(key, row)
    })
    return map
  }, [discoverSuppliers, selectedForCompare])

  const shortlistedAsSuppliers = useMemo(() => {
    return shortlisted.map((entry) => {
      const sid = supplierKey(entry)
      const match = supplierLookup.get(sid)
      return {
        id: entry.id,
        supplier_id: sid,
        name: supplierDisplayName(match || entry),
        display_name: supplierDisplayName(match || entry),
      }
    })
  }, [shortlisted, supplierLookup])

  const shortlistedCards = useMemo(() => {
    return shortlisted.map((entry) => {
      const sid = supplierKey(entry)
      return supplierLookup.get(sid) || {
        supplier_id: sid,
        display_name: sid,
      }
    })
  }, [shortlisted, supplierLookup])

  const addCompare = (supplier) => {
    void industrialIntelligenceService.trackEvent(
      'supplier_view',
      'supplier',
      supplierKey(supplier),
      { from: 'buyer_workspace_compare' },
    ).catch(() => {})
    setSelectedForCompare((prev) => {
      const id = supplierKey(supplier)
      if (prev.some((p) => supplierKey(p) === id)) return prev
      return [...prev, supplier]
    })
    setTab('track')
  }

  const handleShortlist = async (supplier) => {
    const supplierId = supplierKey(supplier)
    if (!supplierId) return
    if (!isSupplierUuid(supplierId)) {
      setError(t('buyerWorkspace.errShortlistDirectory'))
      return
    }
    setError('')
    try {
      await industrialIntelligenceService.shortlistSupplier({ supplierId })
      setFeedback(t('buyerWorkspace.feedbackShortlist'))
      await loadShortlists()
    } catch (err) {
      setError(err?.message || t('buyerWorkspace.errShortlist'))
    }
  }

  const handleRequestEvidence = useCallback((supplier) => {
    const supplierId = supplierKey(supplier)
    if (!supplierId) return
    const primary = filterStandardForIndustry(selectedIndustry)
    if (hasOpenEvidenceRequest(supplierId, primary?.id)) {
      setFeedback(t('buyerWorkspace.evidenceAlreadyRequested'))
      return
    }
    createEvidenceRequest({
      supplierId,
      supplierName: supplierDisplayName(supplier),
      industryId: selectedIndustry,
      standardId: primary?.id,
      standardLabel: primary?.label,
      buyerCompany: user?.companyName || user?.company || '',
      buyerEmail: user?.email || '',
    })
    setFeedback(t('buyerWorkspace.evidenceRequested').replace('{standard}', primary?.label || ''))
  }, [
    selectedIndustry,
    createEvidenceRequest,
    hasOpenEvidenceRequest,
    user,
    t,
  ])

  const handleGapRequestEvidence = useCallback((supplierId) => {
    const row = [...shortlistedCards, ...discoverSuppliers, ...selectedForCompare]
      .find((s) => supplierKey(s) === supplierId)
    if (row) handleRequestEvidence(row)
  }, [shortlistedCards, discoverSuppliers, selectedForCompare, handleRequestEvidence])

  const compareRows = useMemo(
    () => normalizeCapabilityCompareRows(selectedForCompare, selectedIndustry),
    [selectedForCompare, selectedIndustry],
  )

  const trackRowsMerged = useMemo(() => {
    const byId = new Map()
    trackingRows.forEach((row) => {
      byId.set(String(row.id), {
        id: row.id,
        title: row.title,
        deadline: row.deadline || '—',
        invited: row.invited_count || 0,
        viewed: row.viewed_count || 0,
        responded: row.responded_count || 0,
        closed: row.closed_count || 0,
        localId: null,
        quoteCount: 0,
        source: 'network',
      })
    })
    ;(localRfqs || []).forEach((rfq) => {
      if (!rfq?.id || rfq.status === 'draft') return
      const key = String(rfq.id)
      const quoteCount = (rfq.sellerResponses || []).length
      const invited = (rfq.selectedSellers || rfq.suppliers || []).length
      const existing = byId.get(key)
      if (existing) {
        byId.set(key, {
          ...existing,
          localId: rfq.id,
          quoteCount,
          invited: Math.max(existing.invited, invited),
          responded: Math.max(existing.responded, quoteCount),
          buyerRef: rfq.buyerRefDisplay || existing.buyerRef || null,
          title: rfq.buyerRefDisplay
            ? `${rfq.buyerRefDisplay} — ${rfq.title || existing.title || 'RFQ'}`
            : (existing.title || rfq.title),
          source: 'both',
        })
        return
      }
      byId.set(key, {
        id: rfq.id,
        title: rfq.buyerRefDisplay
          ? `${rfq.buyerRefDisplay} — ${rfq.title || 'RFQ'}`
          : (rfq.title || rfq.id),
        deadline: rfq.deadline || rfq.dueDate || '—',
        invited,
        viewed: 0,
        responded: quoteCount,
        closed: rfq.status === 'closed' || rfq.status === 'awarded' ? 1 : 0,
        localId: rfq.id,
        quoteCount,
        buyerRef: rfq.buyerRefDisplay || null,
        source: 'local',
      })
    })
    return [...byId.values()]
  }, [trackingRows, localRfqs])

  const intelUrl = rfqIntelligenceUrl({
    industryId: selectedIndustry || undefined,
    categoryId: selectedCategory || undefined,
  })

  return (
    <AppLayout>
      <div className="app-page bw-page">
        <div className="app-page-card bw-header">
          <div>
            <h2 className="app-page-title">{t('buyerWorkspace.title')}</h2>
            <p className="app-page-subtitle">{t('buyerWorkspace.subtitleTrackOnly')}</p>
          </div>
          <div className="bw-header__actions">
            <Link to={BUYER_WORKSPACE_PATH} className="app-page-btn-outline">
              {t('nav.sourcing')}
            </Link>
            <Link to="/dashboard/buyer/account-directory" className="app-page-btn-outline">
              {t('buyerWorkspace.contactsLink')}
            </Link>
            <Link to={intelUrl} className="app-page-btn-outline">
              {t('buyerWorkspace.intelligenceLink')}
            </Link>
            <Link to="/notifications" className="app-page-btn-outline">
              {t('buyerWorkspace.notificationsLink')}
            </Link>
          </div>
        </div>

        {feedback && <p className="app-page-alert app-page-alert--success">{feedback}</p>}
        {error && <p className="app-page-alert app-page-alert--error">{error}</p>}

        {activeTab === 'track' && (

          <div className="app-page-card">
            <h3 className="bw-panel-title">{t('buyerWorkspace.tracking')}</h3>
            <p className="bw-panel-hint">{t('buyerWorkspace.trackHint')}</p>
            {trackRowsMerged.length === 0 ? (
              <div className="bw-shortlist-empty">
                <p>{t('buyerWorkspace.noRfqsYet')}</p>
                <Link to={BUYER_WORKSPACE_PATH} className="app-page-btn-primary">
                  {t('buyerWorkspace.createFirstRfq')}
                </Link>
              </div>
            ) : (
              <div className="stx-fluid-table-wrap">
                <table className="stx-fluid-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)', padding: 8 }}>{t('buyerWorkspace.thRfq')}</th>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)', padding: 8 }}>{t('buyerWorkspace.thDeadline')}</th>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)', padding: 8 }}>{t('buyerWorkspace.thInvited')}</th>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)', padding: 8 }}>{t('buyerWorkspace.thViewed')}</th>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)', padding: 8 }}>{t('buyerWorkspace.thResponded')}</th>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)', padding: 8 }}>{t('buyerWorkspace.thClosed')}</th>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)', padding: 8 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackRowsMerged.map((row) => (
                      <tr key={row.id}>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }} className="stx-text-wrap">
                          <div style={{ fontWeight: 600 }}>{row.buyerRef || row.id}</div>
                          <div className="stx-text-caption">{row.title}</div>
                        </td>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }}>{row.deadline || '—'}</td>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }}>{row.invited || 0}</td>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }}>{row.viewed || 0}</td>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }}>{row.responded || 0}</td>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }}>{row.closed || 0}</td>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {row.localId ? (
                              <>
                                <Link
                                  to={`/rfq-comparison/${row.localId}`}
                                  className="app-page-btn-secondary"
                                  style={{ padding: '6px 10px', fontSize: '0.8125rem' }}
                                >
                                  Track
                                </Link>
                                <Link
                                  to={`/rfq-comparison/${row.localId}`}
                                  className="app-page-btn-primary"
                                  style={{ padding: '6px 10px', fontSize: '0.8125rem' }}
                                >
                                  {row.quoteCount > 0
                                    ? t('buyerWorkspace.compareQuotes').replace('{count}', String(row.quoteCount))
                                    : 'Compare'}
                                </Link>
                              </>
                            ) : (
                              <span className="stx-text-caption">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
      </div>
    </AppLayout>
  )
}
