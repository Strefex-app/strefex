/**
 * Network Intelligent Sourcing — embeds public/intelligent-sourcing design 1:1.
 * Create RFQ opens the unified form → rfqStore (same path as Executive Summary).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import BuyerRfqCreateForm from '../components/buyer/BuyerRfqCreateForm'
import { useAuthStore } from '../store/authStore'
import { useAccountRegistry } from '../store/accountRegistry'
import { useIndustryStore } from '../store/industryStore'
import useSourcingPlantStore from '../store/sourcingPlantStore'
import useRfqStore from '../store/rfqStore'
import {
  buildPlatformSourcingPayload,
  serializeSourcingRfqList,
} from '../utils/intelligentSourcingData'
import { mergeNetworkManufacturersWithAccounts } from '../utils/accountSourcingCompleteness'
import { usePersistentSourcingCanvas } from '../components/PersistentSourcingCanvas'
import { buildSourcingTaxonomyOverlay } from '../utils/unifiedSourcingTaxonomy'
import {
  createAndSendNetworkRfq,
  sourcingRfqOpenContext,
} from '../utils/networkRfqCreate'
import { getEquipmentCategoriesForIndustry } from '../data/equipmentCategoriesByIndustry'
import { getProductCategoriesForIndustry } from '../data/productCategoriesByIndustry'
import { isSeededSupplierDirectoryEnabled } from '../config/supplierDataMode'
import { useMarketplaceCatalogVisibilityEffective } from '../hooks/useMarketplaceCatalogVisibilityEffective'
import { buyerWorkspaceUrl } from '../constants/rfqPaths'
import { saveReceivingPlantsToAccount } from '../utils/receivingPlantsPersist'
import './IntelligentSourcing.css'

function categoryOptionsForIndustry(industryId, extraCategoryId = '', rfqType = 'product') {
  const map = new Map()
  const push = (id, name) => {
    if (!id || map.has(id)) return
    map.set(id, { id, name: name || String(id).replace(/-/g, ' ') })
  }

  if (industryId) {
    const equipment = getEquipmentCategoriesForIndustry(industryId) || []
    const products = getProductCategoriesForIndustry(industryId) || []
    // Prefer the RFQ type family first, then always append the other so the
    // dropdown never goes empty when the buyer switches Type in the form.
    const primary = rfqType === 'equipment' ? equipment : products
    const secondary = rfqType === 'equipment' ? products : equipment
    primary.forEach((c) => {
      push(c.id, c.name)
      ;(c.subcategories || []).forEach((sub) => push(sub.id, `${c.name} · ${sub.name}`))
    })
    secondary.forEach((c) => {
      push(c.id, c.name)
      ;(c.subcategories || []).forEach((sub) => push(sub.id, `${c.name} · ${sub.name}`))
    })
  }

  if (extraCategoryId) {
    push(extraCategoryId, String(extraCategoryId).replace(/-/g, ' '))
  }
  if (map.size === 0) {
    push(extraCategoryId || industryId || 'general', extraCategoryId || industryId || 'General')
  }
  return [...map.values()]
}

export default function IntelligentSourcingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const role = useAuthStore((s) => s.role)
  const isSuperAdmin = role === 'superadmin'
  const accounts = useAccountRegistry((s) => s.accounts)
  const ensureAllAccountsSourcingFields = useAccountRegistry((s) => s.ensureAllAccountsSourcingFields)
  const updateAccount = useAccountRegistry((s) => s.updateAccount)
  const selectedIndustries = useIndustryStore((s) => s.selectedIndustries)
  const plant = useSourcingPlantStore((s) => s.plant)
  const setPlant = useSourcingPlantStore((s) => s.setPlant)
  const rfqs = useRfqStore((s) => s.rfqs)
  const getSafeRfqs = useRfqStore((s) => s.getSafeRfqs)
  const setTenant = useAuthStore((s) => s.setTenant)
  const showMarketplaceCatalog = useMarketplaceCatalogVisibilityEffective()
    || isSeededSupplierDirectoryEnabled()

  useEffect(() => {
    ensureAllAccountsSourcingFields()
  }, [ensureAllAccountsSourcingFields])

  const myAccount = useMemo(() => {
    const email = String(user?.email || '').toLowerCase()
    if (!email) return null
    return accounts.find((a) => String(a.email || '').toLowerCase() === email) || null
  }, [accounts, user?.email])

  const registrySellers = useMemo(
    () => mergeNetworkManufacturersWithAccounts(accounts),
    [accounts],
  )

  const buyerRfqs = useMemo(() => {
    try {
      return serializeSourcingRfqList(getSafeRfqs?.() || rfqs || [])
    } catch {
      return serializeSourcingRfqList(rfqs || [])
    }
  }, [getSafeRfqs, rfqs])

  const platformPayload = useMemo(
    () => ({
      ...buildPlatformSourcingPayload({
        registrySellers,
        tenant,
        user,
        account: myAccount,
        buyerIndustries: selectedIndustries || myAccount?.industries || [],
        includeTaxonomy: false,
      }),
      rfqs: buyerRfqs,
    }),
    [registrySellers, tenant, user, myAccount, selectedIndustries, buyerRfqs],
  )

  const payloadKey = useMemo(() => JSON.stringify(platformPayload), [platformPayload])

  const [showRfqModal, setShowRfqModal] = useState(false)
  const [rfqContext, setRfqContext] = useState(null)
  const [lastCreatedRfq, setLastCreatedRfq] = useState(null)
  const [sendError, setSendError] = useState('')
  const slotRef = useRef(null)
  const taxonomySentRef = useRef(false)
  const { attachSlot, iframeRef, frameReady } = usePersistentSourcingCanvas()
  const status = frameReady ? 'ready' : 'loading'

  useLayoutEffect(() => {
    attachSlot(slotRef.current)
    return () => attachSlot(null)
  }, [attachSlot])

  const pushPlatformToFrame = useCallback(() => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    try {
      const payload = JSON.parse(payloadKey)
      if (!taxonomySentRef.current) {
        payload.taxonomy = buildSourcingTaxonomyOverlay()
        taxonomySentRef.current = true
      }
      win.postMessage(
        { source: 'strefex-platform', action: 'apply-platform', payload },
        '*',
      )
    } catch { /* not ready */ }
  }, [iframeRef, payloadKey])

  useEffect(() => {
    if (status !== 'ready') return
    pushPlatformToFrame()
  }, [status, pushPlatformToFrame])

  const openPlatformRfqForm = useCallback((payload = {}) => {
    if (payload?.buyer) setPlant(payload.buyer)
    const ctx = sourcingRfqOpenContext(payload, registrySellers)
    setRfqContext({
      ...ctx,
      plant: payload.buyer || plant,
    })
    setSendError('')
    setLastCreatedRfq(null)
    setShowRfqModal(true)
  }, [plant, registrySellers, setPlant])

  const handleSourcingMessage = useCallback((event) => {
    const data = event?.data
    if (!data || data.source !== 'strefex-intelligent-sourcing') return
    const { action, payload } = data
    if (action === 'ready') {
      taxonomySentRef.current = false
      pushPlatformToFrame()
      return
    }
    if (action === 'select-plant' && payload?.buyer) {
      setPlant(payload.buyer)
      return
    }
    if (action === 'update-plants' && Array.isArray(payload?.plants)) {
      void saveReceivingPlantsToAccount({
        plants: payload.plants,
        email: user?.email,
        companyId: tenant?.id,
        updateAccount,
        setTenant,
        tenant,
      }).then((result) => {
        if (result?.ok && result.plants?.length) {
          const activeId = plant?.id
          const nextActive = result.plants.find((p) => p.id === activeId) || result.plants[0]
          if (nextActive) setPlant(nextActive)
        }
      })
      return
    }
    if (action === 'open-rfq' || action === 'send-rfq') {
      openPlatformRfqForm(payload || {})
      return
    }
    if (action === 'track-rfq') {
      navigate(buyerWorkspaceUrl({ tab: 'track' }))
      return
    }
    if (action === 'compare-rfq' && payload?.id) {
      navigate(`/rfq-comparison/${payload.id}`)
      return
    }
    if (action === 'open-profile') {
      navigate('/profile')
    }
  }, [
    navigate,
    openPlatformRfqForm,
    plant?.id,
    pushPlatformToFrame,
    setPlant,
    setTenant,
    tenant,
    iframeRef,
    updateAccount,
    user?.email,
  ])

  useEffect(() => {
    window.addEventListener('message', handleSourcingMessage)
    return () => window.removeEventListener('message', handleSourcingMessage)
  }, [handleSourcingMessage])

  const categoryOptions = useMemo(
    () => categoryOptionsForIndustry(
      rfqContext?.industryId,
      rfqContext?.categoryId,
      rfqContext?.rfqType || 'product',
    ),
    [rfqContext?.industryId, rfqContext?.categoryId, rfqContext?.rfqType],
  )

  const closeRfqModal = () => {
    setShowRfqModal(false)
    setSendError('')
  }

  const handleSendRfqDraft = (draft) => {
    if (!draft?.categoryId) {
      setSendError('Select a category before sending.')
      return
    }
    if (!draft?.industryId && !rfqContext?.industryId) {
      setSendError('Select an industry before sending.')
      return
    }
    const result = createAndSendNetworkRfq(draft, {
      industryId: draft.industryId || rfqContext?.industryId || '',
      buyerEmail: user?.email || '',
      buyerCompany: user?.companyName || user?.company || tenant?.name || user?.email || 'Buyer',
      plant: rfqContext?.plant || plant,
      source: 'intelligent-sourcing',
    })
    if (!result.ok) {
      setSendError(result.error || 'Could not send RFQ.')
      return
    }
    setLastCreatedRfq(result.rfq)
    setShowRfqModal(false)
  }

  const plantName = rfqContext?.plant?.name
    || plant?.name
    || ''
  const inviteCount = rfqContext?.supplierIds?.length || 0

  return (
    <AppLayout>
      <div className="intelligent-sourcing-page">
        {status === 'error' ? (
          <div className="intelligent-sourcing-error app-page-card" role="alert">
            <h1 className="stx-text-page-title">Intelligent Sourcing</h1>
            <p className="stx-text-wrap">
              The Sourcing design could not load. Check that <code>/intelligent-sourcing/</code> is served as static files.
            </p>
            <p>
              <a href="/intelligent-sourcing/index.html">Open design directly</a>
              {' · '}
              <Link to="/sourcing">Retry Sourcing</Link>
            </p>
          </div>
        ) : (
          <>
            {status === 'loading' && (
              <div className="intelligent-sourcing-loading" role="status">
                Loading Sourcing…
              </div>
            )}
            <div ref={slotRef} className="intelligent-sourcing-frame" />
          </>
        )}

        {lastCreatedRfq && (
          <div className="intelligent-sourcing-rfq-banner" role="status">
            <div className="stx-text-wrap">
              <strong>RFQ sent</strong>
              {' — '}
              {lastCreatedRfq.buyerRefDisplay || lastCreatedRfq.id}
              {' is on Your RFQs (home). Use Track or Compare beside that row.'}
            </div>
            <div className="intelligent-sourcing-rfq-banner-actions">
              <button type="button" onClick={() => setLastCreatedRfq(null)}>Dismiss</button>
            </div>
          </div>
        )}

        {showRfqModal && rfqContext && (
          <div
            className="intelligent-sourcing-rfq-overlay"
            onClick={closeRfqModal}
            role="presentation"
          >
            <div
              className="intelligent-sourcing-rfq-panel"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Create Network RFQ"
            >
              <div className="intelligent-sourcing-rfq-panel-top">
                <button
                  type="button"
                  className="intelligent-sourcing-rfq-close"
                  onClick={closeRfqModal}
                  aria-label="Close RFQ form"
                >
                  ×
                </button>
              </div>
              {sendError && (
                <p className="stx-text-small" role="alert" style={{ color: 'var(--color-danger, #c62828)', marginTop: 0 }}>
                  {sendError}
                </p>
              )}
              <BuyerRfqCreateForm
                key={`${rfqContext.supplierIds.join(',')}-${rfqContext.suggestedTitle || 'rfq'}`}
                categoryOptions={categoryOptions}
                initialDraft={{
                  ...rfqContext.initialDraft,
                  categoryId: '',
                  title: rfqContext.initialDraft?.title || rfqContext.suggestedTitle || 'Network RFQ',
                  requirements: {
                    ...(rfqContext.initialDraft?.requirements || {}),
                    coveredIndustries: [],
                  },
                }}
                shortlisted={rfqContext.shortlisted}
                showMarketplaceCatalog={showMarketplaceCatalog}
                isSuperAdmin={isSuperAdmin}
                canSeeDetails
                hideSupplierPicker={inviteCount > 0}
                lockedSupplierIds={inviteCount > 0 ? rfqContext.supplierIds : null}
                submitLabel={
                  inviteCount
                    ? `Send RFQ to ${inviteCount} supplier${inviteCount === 1 ? '' : 's'}`
                    : 'Send RFQ'
                }
                receivingPlantName={plantName}
                onCancel={closeRfqModal}
                onContinue={handleSendRfqDraft}
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
