import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useTranslation } from '../i18n/useTranslation'
import '../styles/app-page.css'
import './BuyerWorkspace.css'
import SupplierCard from '../components/SupplierCard'
import SupplierComparisonTable from '../components/SupplierComparisonTable'
import BuyerRfqCreateForm from '../components/buyer/BuyerRfqCreateForm'
import BuyerRfqSendReview from '../components/buyer/BuyerRfqSendReview'
import industrialIntelligenceService from '../services/industrialIntelligenceService'
import useRfqStore from '../store/rfqStore'
import { useIndustryStore } from '../store/industryStore'
import { useAccountRegistry } from '../store/accountRegistry'
import { useSubscriptionStore } from '../services/featureFlags'
import { useAuthStore } from '../store/authStore'
import { useMarketplaceCatalogVisibilityEffective } from '../hooks/useMarketplaceCatalogVisibilityEffective'
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

function getRegistrySellersForDiscover(industryId, categoryId) {
  const registry = useAccountRegistry.getState()
  if (categoryId) return registry.getSellersByCategory(industryId, categoryId)
  return registry.getRegisteredSellers(industryId)
}

const TABS = [
  { id: 'discover', labelKey: 'buyerWorkspace.tabDiscover' },
  { id: 'shortlist', labelKey: 'buyerWorkspace.tabShortlist' },
  { id: 'create', labelKey: 'buyerWorkspace.tabCreateRfq' },
  { id: 'send', labelKey: 'buyerWorkspace.tabSendRfq' },
  { id: 'track', labelKey: 'buyerWorkspace.tabTrack' },
]

const LEGACY_TAB_MAP = { rfq: 'create' }

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
  const normalizedTab = LEGACY_TAB_MAP[tabParam] || tabParam
  const initialTab = TABS.some((tab) => tab.id === normalizedTab)
    ? normalizedTab
    : 'discover'
  const [activeTab, setActiveTab] = useState(initialTab)

  const user = useAuthStore((s) => s.user)
  const addRfq = useRfqStore((s) => s.addRfq)
  const sendRfq = useRfqStore((s) => s.sendRfq)

  const selectedIndustries = useIndustryStore((s) => s.selectedIndustries)
  const selectedCategories = useIndustryStore((s) => s.selectedCategories)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const hasExecutiveSummary = useSubscriptionStore((s) => s.hasFeature('executiveSummary'))
  const showMarketplaceCatalog = useMarketplaceCatalogVisibilityEffective()

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
  const [discoverTotal, setDiscoverTotal] = useState(0)
  const [discoverSource, setDiscoverSource] = useState('connected')
  const [shortlisted, setShortlisted] = useState([])
  const [selectedForCompare, setSelectedForCompare] = useState([])
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [trackingRows, setTrackingRows] = useState([])
  const [rfqDraft, setRfqDraft] = useState(null)
  const [sendingRfq, setSendingRfq] = useState(false)
  const [, startTransition] = useTransition()
  const discoverRequestRef = useRef(0)

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
    const tab = searchParams.get('tab')
    const mapped = LEGACY_TAB_MAP[tab] || tab
    if (mapped && TABS.some((entry) => entry.id === mapped) && mapped !== activeTab) {
      setActiveTab(mapped)
    }
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

    const loadDirectoryFirstPage = async () => {
      try {
        const registeredSellers = getRegistrySellersForDiscover(selectedIndustry, selectedCategory)
        const page = await loadDiscoverDirectoryPage({
          industryId: selectedIndustry,
          categoryId: selectedCategory,
          categoryLabel: selectedCategoryLabel,
          registeredSellers,
          showMarketplaceCatalog,
          offset: 0,
          limit: DISCOVER_PAGE_SIZE,
          signal,
        })
        if (signal.cancelled || discoverRequestRef.current !== requestId) return
        startTransition(() => {
          setDiscoverSuppliers(page.rows)
          setDiscoverTotal(page.total)
          setDiscoverSource('directory')
        })
      } finally {
        if (discoverRequestRef.current === requestId) {
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
            setDiscoverSuppliers(connected)
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
    if (!selectedIndustry || !selectedCategory || discoverSource !== 'directory') return
    if (discoverSuppliers.length >= discoverTotal) return

    setLoadingMore(true)
    const requestId = discoverRequestRef.current
    const signal = { cancelled: false }
    try {
      const registeredSellers = getRegistrySellersForDiscover(selectedIndustry, selectedCategory)
      const page = await loadDiscoverDirectoryPage({
        industryId: selectedIndustry,
        categoryId: selectedCategory,
        categoryLabel: selectedCategoryLabel,
        registeredSellers,
        showMarketplaceCatalog,
        offset: discoverSuppliers.length,
        limit: DISCOVER_PAGE_SIZE,
        signal,
      })
      if (signal.cancelled || discoverRequestRef.current !== requestId) return
      startTransition(() => {
        setDiscoverSuppliers((prev) => [...prev, ...page.rows])
        setDiscoverTotal(page.total)
      })
    } finally {
      if (discoverRequestRef.current === requestId) {
        setLoadingMore(false)
      }
    }
  }, [selectedIndustry, selectedCategory, selectedCategoryLabel, discoverSource, discoverSuppliers.length, discoverTotal, showMarketplaceCatalog])

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
    setTab('shortlist')
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
      setTab('shortlist')
    } catch (err) {
      setError(err?.message || t('buyerWorkspace.errShortlist'))
    }
  }

  const rfqCandidateSuppliers = useMemo(() => {
    const map = new Map()
    ;[...shortlistedCards, ...discoverSuppliers].forEach((row) => {
      const key = supplierKey(row)
      if (key) map.set(key, row)
    })
    return [...map.values()]
  }, [shortlistedCards, discoverSuppliers])

  const createRfqDraft = (draft) => {
    setRfqDraft(draft)
    setTab('send')
  }

  const rfqSupplierRows = useMemo(() => {
    if (!rfqDraft) return []
    const lookup = new Map()
    ;[...discoverSuppliers, ...shortlistedCards, ...selectedForCompare].forEach((row, index) => {
      const id = supplierKey(row)
      if (!id) return
      lookup.set(id, {
        id,
        name: canSeeDetails
          ? supplierDisplayName(row)
          : formatMaskedManufacturerLabel(index),
        matchScore: row.overall_score || row.matchScore || row.fitLevel,
      })
    })
    return rfqDraft.supplierIds.map((id, index) => lookup.get(id) || {
      id,
      name: canSeeDetails ? String(id) : formatMaskedManufacturerLabel(index),
    })
  }, [rfqDraft, discoverSuppliers, shortlistedCards, selectedForCompare, canSeeDetails])

  const handleSendRfq = async () => {
    if (!rfqDraft) return
    setSendingRfq(true)
    setError('')
    try {
      const created = addRfq({
        title: rfqDraft.title,
        industryId: selectedIndustry,
        categoryId: rfqDraft.categoryId || selectedCategory,
        requirements: rfqDraft.requirements,
        suppliers: rfqDraft.supplierIds,
        attachments: (rfqDraft.attachments || []).map((a) => a.name),
        buyerEmail: user?.email || '',
        buyerCompany: user?.companyName || user?.company || user?.email || 'Buyer',
        description: rfqDraft.description,
        dueDate: rfqDraft.deadline,
      })
      if (created?.id) sendRfq(created.id)

      const uuidIds = rfqDraft.supplierIds.filter(isSupplierUuid)
      if (uuidIds.length > 0) {
        await industrialIntelligenceService.createRfq({
          title: rfqDraft.title,
          description: rfqDraft.description,
          deadline: rfqDraft.deadline,
          supplierIds: uuidIds,
          requirements: rfqDraft.requirements,
          skipCompletenessCheck: uuidIds.length !== rfqDraft.supplierIds.length,
        })
      }

      setFeedback(t('buyerWorkspace.feedbackRfq'))
      setRfqDraft(null)
      await loadTracking()
      setTab('track')
    } catch (err) {
      setError(err?.message || t('buyerWorkspace.errRfq'))
    } finally {
      setSendingRfq(false)
    }
  }

  const tabCounts = {
    discover: discoverTotal || discoverSuppliers.length,
    shortlist: shortlisted.length,
    create: rfqDraft ? 1 : 0,
    send: rfqDraft?.supplierIds?.length || 0,
    track: trackingRows.length,
  }

  const discoverSourceLabel = discoverSource === 'connected'
    ? t('buyerWorkspace.sourceConnected')
    : t('buyerWorkspace.sourceDirectory')

  return (
    <AppLayout>
      <div className="app-page bw-page">
        <div className="app-page-card bw-header">
          <div>
            <h2 className="app-page-title">{t('buyerWorkspace.title')}</h2>
            <p className="app-page-subtitle">{t('buyerWorkspace.subtitle')}</p>
          </div>
          <div className="bw-header__actions">
            <Link to="/hub/procurement" className="app-page-btn-outline">
              {t('buyerWorkspace.backToHub')}
            </Link>
            <Link to="/notifications" className="app-page-btn-outline">
              {t('buyerWorkspace.notificationsLink')}
            </Link>
          </div>
        </div>

        {feedback && <p className="app-page-alert app-page-alert--success">{feedback}</p>}
        {error && <p className="app-page-alert app-page-alert--error">{error}</p>}

        <div className="bw-steps" role="tablist" aria-label={t('buyerWorkspace.stepsAria')}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`bw-step${activeTab === tab.id ? ' bw-step--active' : ''}`}
              onClick={() => setTab(tab.id)}
            >
              {t(tab.labelKey)}
              {tabCounts[tab.id] > 0 && (
                <span className="bw-step__count">{tabCounts[tab.id]}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'discover' && (
          <div className="app-page-card">
            <h3 className="bw-panel-title">{t('buyerWorkspace.discoverTitle')}</h3>
            <p className="bw-panel-hint">{t('buyerWorkspace.discoverHint')}</p>

            {industryOptions.length === 0 ? (
              <div className="bw-shortlist-empty">
                <p>{t('buyerWorkspace.noIndustrySelected')}</p>
                <Link to="/hub/procurement" className="app-page-btn-primary">
                  {t('buyerWorkspace.registerIndustries')}
                </Link>
              </div>
            ) : (
              <>
                <div className="bw-industry-filter">
                  <label className="bw-industry-filter__field">
                    <span className="bw-industry-filter__label">{t('buyerWorkspace.industryLabel')}</span>
                    <select
                      className="bw-industry-filter__select"
                      value={selectedIndustry}
                      onChange={(e) => setSelectedIndustry(e.target.value)}
                    >
                      {industryOptions.map((slug) => (
                        <option key={slug} value={slug}>
                          {displayHubIndustryFromSlug(slug, t)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {categoryOptions.length > 0 && (
                    <label className="bw-industry-filter__field">
                      <span className="bw-industry-filter__label">{t('buyerWorkspace.categoryLabel')}</span>
                      <select
                        className="bw-industry-filter__select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        {categoryOptions.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {discoverSuppliers.length > 0 && (
                    <span className="bw-source-badge">{discoverSourceLabel}</span>
                  )}
                </div>

                {canSeeDetails && discoverSource === 'directory' && discoverSuppliers.length > 0 && (
                  <p className="bw-panel-hint" style={{ marginTop: 0 }}>
                    {t('buyerWorkspace.execSummaryDataHint')}
                  </p>
                )}

                {!canSeeDetails && discoverSuppliers.length > 0 && (
                  <div className="bw-plan-notice">
                    <span>{t('buyerWorkspace.maskedNotice')}</span>
                    <Link to="/plans" className="app-page-btn-outline">
                      {t('buyerWorkspace.upgradePlan')}
                    </Link>
                  </div>
                )}

                {discoverLoading && discoverSuppliers.length === 0 ? (
                  <p className="app-page-subtitle">{t('buyerWorkspace.loading')}</p>
                ) : discoverSuppliers.length === 0 ? (
                  <p className="app-page-subtitle">{t('buyerWorkspace.noManufacturers')}</p>
                ) : (
                  <>
                    <div className="bw-supplier-grid">
                      {discoverSuppliers.map((supplier, index) => (
                        <SupplierCard
                          key={`disc-${supplierKey(supplier)}`}
                          supplier={supplier}
                          masked={!canSeeDetails}
                          displayNameOverride={
                            canSeeDetails
                              ? undefined
                              : formatMaskedManufacturerLabel(index)
                          }
                          disableShortlist={!supplier._canShortlist}
                          onSelect={addCompare}
                          onShortlist={handleShortlist}
                          compareLabel={t('buyerWorkspace.addToCompare')}
                          shortlistLabel={t('buyerWorkspace.shortlistAction')}
                        />
                      ))}
                    </div>
                    {hasMoreDiscover && (
                      <div className="bw-next-step" style={{ marginTop: 12, borderTop: 'none', paddingTop: 0 }}>
                        <span className="app-page-subtitle" style={{ margin: 0 }}>
                          {t('buyerWorkspace.showingCount')
                            .replace('{shown}', String(discoverSuppliers.length))
                            .replace('{total}', String(discoverTotal))}
                        </span>
                        <button
                          type="button"
                          className="app-page-btn-outline"
                          disabled={loadingMore}
                          onClick={() => void loadMoreDirectory()}
                        >
                          {loadingMore ? t('buyerWorkspace.loading') : t('buyerWorkspace.loadMore')}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {shortlisted.length > 0 && (
                  <div className="bw-next-step">
                    <span className="app-page-subtitle" style={{ margin: 0 }}>
                      {t('buyerWorkspace.shortlistReady').replace('{count}', String(shortlisted.length))}
                    </span>
                    <button type="button" className="app-page-btn-primary" onClick={() => setTab('create')}>
                      {t('buyerWorkspace.goToRfq')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'shortlist' && (
          <div className="app-page-card">
            <h3 className="bw-panel-title">{t('buyerWorkspace.shortlistTitle')}</h3>
            <p className="bw-panel-hint">{t('buyerWorkspace.shortlistHint')}</p>

            {shortlistedCards.length === 0 ? (
              <div className="bw-shortlist-empty">
                <p>{t('buyerWorkspace.noShortlist')}</p>
                <button type="button" className="app-page-btn-primary" onClick={() => setTab('discover')}>
                  {t('buyerWorkspace.findSuppliers')}
                </button>
              </div>
            ) : (
              <>
                <div className="bw-supplier-grid">
                  {shortlistedCards.map((supplier) => (
                    <SupplierCard
                      key={`sl-${supplierKey(supplier)}`}
                      supplier={supplier}
                      onSelect={addCompare}
                      compareLabel={t('buyerWorkspace.addToCompare')}
                      hideShortlist
                    />
                  ))}
                </div>
                <h3 className="bw-panel-title" style={{ marginTop: 20 }}>{t('buyerWorkspace.comparison')}</h3>
                <SupplierComparisonTable rows={selectedForCompare} />
                <div className="bw-next-step">
                  <span className="app-page-subtitle" style={{ margin: 0 }}>
                    {t('buyerWorkspace.compareHint')}
                  </span>
                  <button type="button" className="app-page-btn-primary" onClick={() => setTab('create')}>
                    {t('buyerWorkspace.goToRfq')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="app-page-card">
            <h3 className="bw-panel-title">{t('buyerWorkspace.createRfqTitle')}</h3>
            <p className="bw-panel-hint">{t('buyerWorkspace.createRfqHint')}</p>
            {rfqCandidateSuppliers.length === 0 ? (
              <div className="bw-rfq-empty">
                <p>{t('buyerWorkspace.rfqNeedsShortlist')}</p>
                <button type="button" className="app-page-btn-primary" onClick={() => setTab('discover')}>
                  {t('buyerWorkspace.findSuppliers')}
                </button>
              </div>
            ) : (
              <BuyerRfqCreateForm
                industryId={selectedIndustry}
                categoryOptions={categoryOptions}
                initialCategoryId={selectedCategory}
                shortlisted={rfqCandidateSuppliers}
                showMarketplaceCatalog={showMarketplaceCatalog}
                isSuperAdmin={isSuperAdmin}
                canSeeDetails={canSeeDetails}
                initialDraft={rfqDraft}
                onContinue={createRfqDraft}
              />
            )}
          </div>
        )}

        {activeTab === 'send' && (
          <div className="app-page-card">
            <h3 className="bw-panel-title">{t('buyerWorkspace.sendRfqTitle')}</h3>
            <p className="bw-panel-hint">{t('buyerWorkspace.sendRfqHint')}</p>
            <BuyerRfqSendReview
              draft={rfqDraft}
              categoryLabel={selectedCategoryLabel}
              supplierRows={rfqSupplierRows}
              onBack={() => setTab('create')}
              onSend={() => void handleSendRfq()}
              sending={sendingRfq}
            />
          </div>
        )}

        {activeTab === 'track' && (
          <div className="app-page-card">
            <h3 className="bw-panel-title">{t('buyerWorkspace.tracking')}</h3>
            <p className="bw-panel-hint">{t('buyerWorkspace.trackHint')}</p>
            {trackingRows.length === 0 ? (
              <div className="bw-shortlist-empty">
                <p>{t('buyerWorkspace.noRfqsYet')}</p>
                <button type="button" className="app-page-btn-primary" onClick={() => setTab('create')}>
                  {t('buyerWorkspace.createFirstRfq')}
                </button>
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
                    </tr>
                  </thead>
                  <tbody>
                    {trackingRows.map((row) => (
                      <tr key={row.id}>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }}>{row.title}</td>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }}>{row.deadline || '—'}</td>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }}>{row.invited_count || 0}</td>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }}>{row.viewed_count || 0}</td>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }}>{row.responded_count || 0}</td>
                        <td style={{ borderBottom: '1px solid var(--border-light)', padding: 8 }}>{row.closed_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
