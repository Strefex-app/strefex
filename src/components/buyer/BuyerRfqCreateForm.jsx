import { useEffect, useMemo, useRef, useState } from 'react'
import { ToggleCheckButton } from '../ToggleCheckButton'
import { useRfqInvitees } from '../../hooks/useRfqInvitees'
import { getIndustryQualityProfile } from '../../data/industryQualityProfiles'
import {
  EQUIPMENT_CATEGORIES_BY_INDUSTRY,
  getEquipmentCategoriesForIndustry,
} from '../../data/equipmentCategoriesByIndustry'
import {
  PRODUCT_CATEGORIES_BY_INDUSTRY,
  getProductCategoriesForIndustry,
} from '../../data/productCategoriesByIndustry'
import { SERVICE_CATALOG } from '../../data/serviceCatalog'
import { matchesIndustryPrimaryStandard } from '../../utils/buyerSourcingReliability'
import { defaultQualityLevelForIndustry } from '../../utils/networkRfqCreate'
import { useAccountRegistry } from '../../store/accountRegistry'
import {
  DEFAULT_ASK_REQUIREMENTS,
  INCOTERMS,
  PAYMENT_TERMS_ASK,
  QUALITY_LEVELS,
  RFQ_COVER_INDUSTRIES,
  RFQ_TYPES,
  RFQ_UNITS,
  TRANSPORT_MODES,
  labelOf,
} from '../../utils/standardRfqSchema'
import './BuyerRfqCreateForm.css'

const WIZARD_STEPS = [
  { id: 1, key: 'domain', label: 'Domain' },
  { id: 2, key: 'industry', label: 'Industry' },
  { id: 3, key: 'category', label: 'Category' },
  { id: 4, key: 'subcat', label: 'Subcategory' },
  { id: 5, key: 'rfq', label: 'RFQ & send' },
]

const EXTRA_INDUSTRIES = [
  { id: 'raw-materials', label: 'Raw materials' },
  { id: 'green-energy', label: 'Green energy' },
  { id: 'household-products', label: 'Household products' },
  { id: 'aerospace', label: 'Aerospace' },
]

function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function Field({ id, label, hint, children }) {
  return (
    <div>
      {label ? <label className="stx-rfq-label" htmlFor={id}>{label}</label> : null}
      {children}
      {hint ? <div className="stx-rfq-hint">{hint}</div> : null}
    </div>
  )
}

function industryLabel(id) {
  if (!id) return ''
  return RFQ_COVER_INDUSTRIES.find((r) => r.id === id)?.label
    || EXTRA_INDUSTRIES.find((r) => r.id === id)?.label
    || getIndustryQualityProfile(id).label
    || String(id).replace(/-/g, ' ')
}

function qualityTagFor(industryKey, qualityLevel) {
  if (!industryKey) return ''
  if (industryKey === 'aerospace') return 'AS9100'
  const profile = getIndustryQualityProfile(industryKey)
  const primary = profile.certStandards?.find((c) => c.primary) || profile.certStandards?.[0]
  return primary?.label || labelOf(QUALITY_LEVELS, qualityLevel)
}

function categoriesForDomain(industryId, domain) {
  if (!industryId && domain !== 'service') return []
  if (domain === 'equipment') return getEquipmentCategoriesForIndustry(industryId) || []
  if (domain === 'service') {
    const seen = new Set()
    return SERVICE_CATALOG.filter((row) => {
      if (!row?.id || seen.has(row.id)) return false
      seen.add(row.id)
      return true
    }).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      subcategories: [],
    }))
  }
  return getProductCategoriesForIndustry(industryId) || []
}

function accountToInviteRow(account) {
  return {
    id: account.id || account.email,
    name: account.company || account.name || account.email || 'Manufacturer',
    email: account.email || '',
    city: account.city || '',
    country: account.country || account.cc || '',
    source: 'registered',
  }
}

function listIndustries(accounts = []) {
  const map = new Map()
  const push = (id, label) => {
    if (!id || map.has(id)) return
    map.set(id, label || industryLabel(id))
  }
  RFQ_COVER_INDUSTRIES.forEach((r) => push(r.id, r.label))
  EXTRA_INDUSTRIES.forEach((r) => push(r.id, r.label))
  Object.keys(PRODUCT_CATEGORIES_BY_INDUSTRY).forEach((id) => push(id))
  Object.keys(EQUIPMENT_CATEGORIES_BY_INDUSTRY).forEach((id) => push(id))
  accounts.forEach((a) => {
    ;(a.industries || []).forEach((id) => push(id))
  })
  return [...map.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function initRequirements(draftReqs = {}) {
  return {
    ...DEFAULT_ASK_REQUIREMENTS,
    ...draftReqs,
    coveredIndustries: Array.isArray(draftReqs.coveredIndustries) ? draftReqs.coveredIndustries : [],
    qualityLevel: draftReqs.qualityLevel || '',
  }
}

export default function BuyerRfqCreateForm({
  industryId,
  categoryOptions: _categoryOptions = [],
  initialCategoryId: _initialCategoryId = '',
  shortlisted = [],
  showMarketplaceCatalog = false,
  isSuperAdmin = false,
  canSeeDetails = true,
  initialDraft = null,
  hideSupplierPicker = false,
  lockedSupplierIds = null,
  lockIndustry = false,
  submitLabel = 'Send RFQ',
  receivingPlantName = '',
  onContinue,
  onCancel,
}) {
  const fileInputRef = useRef(null)
  const accounts = useAccountRegistry((s) => s.accounts)
  const getRegisteredSellers = useAccountRegistry((s) => s.getRegisteredSellers)
  const getSellersByCategory = useAccountRegistry((s) => s.getSellersByCategory)
  const getSellersBySubcategory = useAccountRegistry((s) => s.getSellersBySubcategory)
  const getRegisteredServiceProviders = useAccountRegistry((s) => s.getRegisteredServiceProviders)
  const getServiceProvidersByCategory = useAccountRegistry((s) => s.getServiceProvidersByCategory)

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState(initialDraft?.title || '')
  const [rfqType, setRfqType] = useState(initialDraft?.rfqType || '')
  const [selectedIndustry, setSelectedIndustry] = useState(() => (
    lockIndustry && industryId ? industryId : ''
  ))
  const [parentCategoryId, setParentCategoryId] = useState('')
  const [subCategoryId, setSubCategoryId] = useState('')
  const [description, setDescription] = useState(initialDraft?.description || '')
  const [deadline, setDeadline] = useState(initialDraft?.deadline || '')
  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [requirements, setRequirements] = useState(() => {
    const base = initRequirements(initialDraft?.requirements)
    if (lockIndustry && industryId) {
      return {
        ...base,
        coveredIndustries: [industryId],
        qualityLevel: base.qualityLevel || defaultQualityLevelForIndustry(industryId),
      }
    }
    return { ...base, coveredIndustries: [] }
  })
  const [attachments, setAttachments] = useState(initialDraft?.attachments || [])
  const [formError, setFormError] = useState('')

  const activeIndustry = lockIndustry && industryId ? industryId : selectedIndustry
  const categoryId = subCategoryId || parentCategoryId
  const domainCategories = useMemo(
    () => categoriesForDomain(activeIndustry, rfqType || 'product'),
    [activeIndustry, rfqType],
  )
  const parentCategory = domainCategories.find((c) => c.id === parentCategoryId) || null
  const subcategories = parentCategory?.subcategories || []

  const industries = useMemo(() => listIndustries(accounts), [accounts])

  const registeredByIndustry = useMemo(() => {
    const counts = {}
    const isService = rfqType === 'service'
    industries.forEach((row) => {
      counts[row.id] = isService
        ? getRegisteredServiceProviders(row.id).length
        : getRegisteredSellers(row.id).length
    })
    return counts
  }, [industries, getRegisteredSellers, getRegisteredServiceProviders, accounts, rfqType])

  const registryShortlist = useMemo(() => {
    if (!activeIndustry && rfqType !== 'service') return []
    if (rfqType === 'service') {
      const byCat = parentCategoryId
        ? getServiceProvidersByCategory(parentCategoryId)
        : getRegisteredServiceProviders(activeIndustry || null)
      const scoped = activeIndustry
        ? byCat.filter((a) => (a.industries || []).includes(activeIndustry))
        : byCat
      return scoped.map(accountToInviteRow)
    }
    const bySub = (subCategoryId && parentCategoryId)
      ? getSellersBySubcategory(activeIndustry, parentCategoryId, subCategoryId, rfqType || 'product')
      : []
    const byParent = parentCategoryId
      ? getSellersByCategory(activeIndustry, parentCategoryId, rfqType || 'product')
      : []
    const byIndustry = getRegisteredSellers(activeIndustry)
    const preferred = bySub.length
      ? bySub
      : byParent.length
        ? byParent
        : byIndustry
    return preferred.map(accountToInviteRow)
  }, [
    activeIndustry,
    parentCategoryId,
    subCategoryId,
    rfqType,
    getSellersByCategory,
    getSellersBySubcategory,
    getRegisteredSellers,
    getServiceProvidersByCategory,
    getRegisteredServiceProviders,
    accounts,
  ])

  const recipientPool = useMemo(() => {
    const map = new Map()
    ;[...(shortlisted || []), ...registryShortlist].forEach((row) => {
      const id = row.supplier_id || row.id
      if (!id || map.has(id)) return
      map.set(id, { ...row, id })
    })
    return [...map.values()]
  }, [shortlisted, registryShortlist])

  const invitees = useRfqInvitees({
    shortlisted: recipientPool,
    initialSupplierIds: initialDraft?.supplierIds || [],
    lockedSupplierIds,
    hideSupplierPicker,
    canSeeDetails,
    industryId: activeIndustry,
    categoryId,
    showMarketplaceCatalog,
    isSuperAdmin,
  })

  const industryProfile = useMemo(() => getIndustryQualityProfile(activeIndustry), [activeIndustry])
  const covered = activeIndustry ? [activeIndustry] : []
  const showAutomotive = covered.includes('automotive') || industryProfile.rfqSectionId === 'automotive'
  const showMedical = covered.includes('medical') || industryProfile.rfqSectionId === 'medical'

  useEffect(() => {
    if (initialDraft?.requirements?.ppapLevel || initialDraft?.requirements?.iso13485Required) return
    if (!activeIndustry) return
    const hasPrimary = recipientPool.some((row) => matchesIndustryPrimaryStandard(row.reliabilityCard, activeIndustry))
    if (!hasPrimary) return
    setRequirements((prev) => {
      if (industryProfile.rfqSectionId === 'automotive' && !prev.ppapLevel) {
        return { ...prev, ppapLevel: '3', traceabilityRequired: true, qualityLevel: 'iatf_16949' }
      }
      if (industryProfile.rfqSectionId === 'medical' && !prev.iso13485Required) {
        return {
          ...prev,
          iso13485Required: true,
          designControlsRequired: true,
          udiRequired: true,
          qualityLevel: 'iso_13485',
        }
      }
      return prev
    })
  }, [recipientPool, initialDraft?.requirements, activeIndustry, industryProfile.rfqSectionId])

  const setReq = (patch) => setRequirements((prev) => ({ ...prev, ...patch }))

  const pathLabel = [
    RFQ_TYPES.find((t) => t.id === rfqType)?.label,
    industryLabel(activeIndustry),
    parentCategory?.name,
    subcategories.find((s) => s.id === subCategoryId)?.name,
  ].filter(Boolean).join(' · ')

  const pickDomain = (id) => {
    setRfqType(id)
    setSelectedIndustry(lockIndustry ? selectedIndustry : '')
    setParentCategoryId('')
    setSubCategoryId('')
    setReq({
      unit: id === 'equipment' ? 'machines' : id === 'service' ? 'hours' : 'pcs',
      coveredIndustries: lockIndustry && industryId ? [industryId] : [],
      itemName: '',
    })
    setStep(2)
  }

  const pickIndustry = (id) => {
    setSelectedIndustry(id)
    setParentCategoryId('')
    setSubCategoryId('')
    setRequirements((prev) => ({
      ...prev,
      coveredIndustries: id ? [id] : [],
      qualityLevel: id ? defaultQualityLevelForIndustry(id) : '',
      itemName: '',
    }))
    setStep(3)
  }

  const pickCategory = (cat) => {
    setParentCategoryId(cat.id)
    setSubCategoryId('')
    const subs = cat.subcategories || []
    setReq({
      itemName: cat.name,
    })
    if (!subs.length) {
      setStep(5)
      if (!title.trim()) {
        setTitle(`RFQ — ${industryLabel(activeIndustry)} / ${cat.name}`)
      }
      return
    }
    setStep(4)
  }

  const pickSubcategory = (sub) => {
    setSubCategoryId(sub.id)
    setReq({ itemName: `${parentCategory?.name || ''} · ${sub.name}`.trim() })
    if (!title.trim()) {
      setTitle(`RFQ — ${industryLabel(activeIndustry)} / ${parentCategory?.name || ''} / ${sub.name}`)
    }
    setStep(5)
  }

  const skipSubcategory = () => {
    setSubCategoryId('')
    if (!title.trim() && parentCategory) {
      setTitle(`RFQ — ${industryLabel(activeIndustry)} / ${parentCategory.name}`)
    }
    setStep(5)
  }

  const canSend = Boolean(title.trim() && activeIndustry && categoryId && invitees.hasInvitees)
  const blockedReason = !rfqType
    ? 'Select product, equipment, or service.'
    : !activeIndustry
      ? 'Select an industry.'
      : !categoryId
        ? 'Select a category.'
        : !title.trim()
          ? 'Enter an RFQ title.'
          : !invitees.hasInvitees
            ? 'Select at least one registered manufacturer or invite by email.'
            : ''

  const sendLabel = submitLabel
    || (invitees.inviteeIds.length
      ? `Send RFQ to ${invitees.inviteeIds.length} supplier${invitees.inviteeIds.length === 1 ? '' : 's'}`
      : 'Send RFQ')

  const checks = [
    { ok: Boolean(rfqType), label: rfqType ? (RFQ_TYPES.find((t) => t.id === rfqType)?.label || rfqType) : 'Domain required' },
    { ok: Boolean(activeIndustry), label: activeIndustry ? industryLabel(activeIndustry) : 'Industry required' },
    { ok: Boolean(categoryId), label: categoryId ? (requirements.itemName || 'Category set') : 'Category required' },
    { ok: invitees.hasInvitees, label: invitees.hasInvitees ? `${invitees.inviteeIds.length} recipient${invitees.inviteeIds.length === 1 ? '' : 's'}` : 'Add a plant' },
    { ok: attachments.length > 0, label: attachments.length ? `${attachments.length} file${attachments.length === 1 ? '' : 's'}` : 'Files optional' },
  ]

  const handleSend = (e) => {
    e.preventDefault()
    setFormError('')
    if (step < 5) {
      setStep(5)
      return
    }
    if (!canSend) {
      setFormError(blockedReason || 'Complete required fields to send.')
      return
    }
    try {
      onContinue?.({
        title: title.trim(),
        rfqType: rfqType || 'product',
        description: description.trim(),
        deadline: deadline || null,
        industryId: activeIndustry,
        categoryId,
        requirements: {
          ...requirements,
          coveredIndustries: covered,
          itemName: (requirements.itemName || '').trim() || description.trim().slice(0, 80),
          parentCategoryId,
          subCategoryId: subCategoryId || null,
        },
        attachments,
        supplierIds: invitees.inviteeIds,
        manualInvitees: invitees.manualInvitees.filter((row) => invitees.inviteeIds.includes(row.id)),
      })
    } catch (err) {
      setFormError(err?.message || 'Could not send RFQ.')
    }
  }

  const addInvite = () => {
    const result = invitees.addEmailInvite(inviteName, inviteEmail)
    if (!result.ok) {
      setInviteError(result.error)
      return
    }
    setInviteError('')
    setInviteName('')
    setInviteEmail('')
    setShowInvitePanel(false)
  }

  const goBack = () => {
    if (step <= 1) {
      onCancel?.()
      return
    }
    if (step === 5 && parentCategory && !(parentCategory.subcategories || []).length) {
      setStep(3)
      return
    }
    setStep((s) => s - 1)
  }

  return (
    <form className="stx-rfq-form" onSubmit={handleSend}>
      <div className="stx-rfq-form__header">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="stx-rfq-form__eyebrow">
            <span className="stx-rfq-form__eyebrow-bar" aria-hidden />
            <span className="stx-rfq-form__eyebrow-text">Network RFQ · same path as Sourcing</span>
          </div>
          <h2 className="stx-rfq-form__title-input stx-text-wrap" style={{ margin: '12px 0 6px' }}>
            {step < 5 ? WIZARD_STEPS[step - 1].label : (title || 'RFQ details')}
          </h2>
          <p className="stx-rfq-form__lead">
            {step < 5
              ? 'Follow the Sourcing path: domain → industry → category → subcategory → register the RFQ with manufacturers on that path.'
              : 'Confirm the ask and send to registered manufacturers on this industry path.'}
          </p>
          {pathLabel ? (
            <p className="stx-rfq-path stx-text-wrap">{pathLabel}</p>
          ) : null}
        </div>
        <div className="stx-rfq-form__header-actions">
          <button type="button" className="stx-rfq-ghost-btn" onClick={goBack}>
            {step <= 1 ? 'Cancel' : 'Back'}
          </button>
          {onCancel && step > 1 ? (
            <button type="button" className="stx-rfq-ghost-btn" onClick={onCancel}>Close</button>
          ) : null}
        </div>
      </div>

      <nav className="stx-rfq-steps" aria-label="RFQ path steps">
        {WIZARD_STEPS.map((row) => {
          const done = step > row.id
          const current = step === row.id
          return (
            <button
              key={row.id}
              type="button"
              className={`stx-rfq-step${done ? ' stx-rfq-step--done' : ''}${current ? ' stx-rfq-step--current' : ''}`}
              disabled={row.id > step}
              onClick={() => {
                if (row.id < step) setStep(row.id)
              }}
            >
              <span className="stx-rfq-step__num">{row.id}</span>
              <span className="stx-rfq-step__label">{row.label}</span>
            </button>
          )
        })}
      </nav>

      {step === 1 ? (
        <section className="stx-rfq-card">
          <div className="stx-rfq-card__title">1 · Domain</div>
          <p className="stx-rfq-hint" style={{ marginTop: 8 }}>What are you sourcing?</p>
          <div className="stx-rfq-pick-grid">
            {RFQ_TYPES.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`stx-rfq-pick${rfqType === row.id ? ' stx-rfq-pick--on' : ''}`}
                onClick={() => pickDomain(row.id)}
              >
                <span className="stx-rfq-pick__title">{row.label}</span>
                <span className="stx-rfq-pick__meta">
                  {row.id === 'product' && 'Components & assemblies'}
                  {row.id === 'equipment' && 'Machines & tooling'}
                  {row.id === 'service' && 'Process & support services'}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="stx-rfq-card">
          <div className="stx-rfq-card__head">
            <div className="stx-rfq-card__title">2 · Industry</div>
            <span className="stx-rfq-card__meta">
              {Object.values(registeredByIndustry).reduce((n, v) => n + v, 0)} registered plants
            </span>
          </div>
          {lockIndustry && activeIndustry ? (
            <div className="stx-rfq-chips" style={{ marginTop: 14 }}>
              <span className="stx-rfq-chip stx-rfq-chip--locked">
                {industryLabel(activeIndustry)}
                {qualityTagFor(activeIndustry, requirements.qualityLevel)
                  ? ` · ${qualityTagFor(activeIndustry, requirements.qualityLevel)}`
                  : ''}
              </span>
              <button type="button" className="stx-rfq-ghost-btn" onClick={() => setStep(3)}>Continue</button>
            </div>
          ) : (
            <div className="stx-rfq-pick-grid stx-rfq-pick-grid--dense" style={{ marginTop: 14 }}>
              {industries.map((row) => {
                const n = registeredByIndustry[row.id] || 0
                const hasCats = categoriesForDomain(row.id, rfqType || 'product').length > 0
                if (!hasCats && n === 0) return null
                return (
                  <button
                    key={row.id}
                    type="button"
                    className={`stx-rfq-pick${selectedIndustry === row.id ? ' stx-rfq-pick--on' : ''}`}
                    onClick={() => pickIndustry(row.id)}
                  >
                    <span className="stx-rfq-pick__title">{row.label}</span>
                    <span className="stx-rfq-pick__meta">
                      {n ? `${n} registered manufacturer${n === 1 ? '' : 's'}` : 'No registered accounts yet'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="stx-rfq-card">
          <div className="stx-rfq-card__title">3 · Category</div>
          {!domainCategories.length ? (
            <p className="stx-rfq-empty" style={{ marginTop: 12 }}>
              No {rfqType || 'product'} categories for this industry yet. Go back and pick another path.
            </p>
          ) : (
            <div className="stx-rfq-pick-grid stx-rfq-pick-grid--dense" style={{ marginTop: 14 }}>
              {domainCategories.map((cat) => {
                const n = rfqType === 'service'
                  ? getServiceProvidersByCategory(cat.id).filter((a) => (
                    !activeIndustry || (a.industries || []).includes(activeIndustry)
                  )).length
                  : getSellersByCategory(activeIndustry, cat.id, rfqType || 'product').length
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`stx-rfq-pick${parentCategoryId === cat.id ? ' stx-rfq-pick--on' : ''}`}
                    onClick={() => pickCategory(cat)}
                  >
                    <span className="stx-rfq-pick__title">{cat.name}</span>
                    <span className="stx-rfq-pick__meta stx-text-wrap">
                      {cat.description || ((cat.subcategories || []).length
                        ? `${cat.subcategories.length} subcategories`
                        : 'Select category')}
                      {n ? ` · ${n} registered` : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      ) : null}

      {step === 4 ? (
        <section className="stx-rfq-card">
          <div className="stx-rfq-card__head">
            <div className="stx-rfq-card__title">4 · Subcategory</div>
            <span className="stx-rfq-card__meta">{parentCategory?.name}</span>
          </div>
          {!subcategories.length ? (
            <div style={{ marginTop: 14 }}>
              <p className="stx-rfq-empty">No subcategory for this path — continue to RFQ registration.</p>
              <button type="button" className="stx-rfq-send" style={{ marginTop: 12 }} onClick={skipSubcategory}>
                Continue to RFQ
              </button>
            </div>
          ) : (
            <div className="stx-rfq-pick-grid stx-rfq-pick-grid--dense" style={{ marginTop: 14 }}>
              {subcategories.map((sub) => {
                const n = getSellersBySubcategory(
                  activeIndustry,
                  parentCategoryId,
                  sub.id,
                  rfqType || 'product',
                ).length
                return (
                  <button
                    key={sub.id}
                    type="button"
                    className={`stx-rfq-pick${subCategoryId === sub.id ? ' stx-rfq-pick--on' : ''}`}
                    onClick={() => pickSubcategory(sub)}
                  >
                    <span className="stx-rfq-pick__title">{sub.name}</span>
                    <span className="stx-rfq-pick__meta stx-text-wrap">
                      {sub.description || 'Deep-dive scope'}
                      {n ? ` · ${n} registered` : ''}
                    </span>
                  </button>
                )
              })}
              <button type="button" className="stx-rfq-pick stx-rfq-pick--muted" onClick={skipSubcategory}>
                <span className="stx-rfq-pick__title">Skip subcategory</span>
                <span className="stx-rfq-pick__meta">Use parent category only</span>
              </button>
            </div>
          )}
        </section>
      ) : null}

      {step === 5 ? (
        <div className="stx-rfq-form__layout">
          <div className="stx-rfq-form__main">
            <section className="stx-rfq-card">
              <div className="stx-rfq-card__title">5 · RFQ details</div>
              <div style={{ marginTop: 14 }}>
                <Field id="stx-rfq-title" label="RFQ title *">
                  <input
                    id="stx-rfq-title"
                    className="stx-rfq-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="RFQ title"
                  />
                </Field>
              </div>
              <div className="stx-rfq-grid-3" style={{ marginTop: 14 }}>
                <Field id="stx-rfq-qty" label="Quantity *">
                  <input
                    id="stx-rfq-qty"
                    className="stx-rfq-input stx-rfq-input--mono"
                    type="number"
                    min="1"
                    value={requirements.quantity ?? 1}
                    onChange={(e) => setReq({ quantity: parseInt(e.target.value, 10) || 1 })}
                  />
                </Field>
                <Field id="stx-rfq-unit" label="Unit">
                  <select
                    id="stx-rfq-unit"
                    className="stx-rfq-select"
                    value={requirements.unit || 'pcs'}
                    onChange={(e) => setReq({ unit: e.target.value })}
                  >
                    {RFQ_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                  </select>
                </Field>
                <Field id="stx-rfq-lead" label="Max lead time (days)">
                  <input
                    id="stx-rfq-lead"
                    className="stx-rfq-input stx-rfq-input--mono"
                    type="number"
                    min="1"
                    value={requirements.maxLeadTime ?? 90}
                    onChange={(e) => setReq({ maxLeadTime: parseInt(e.target.value, 10) || 90 })}
                  />
                </Field>
              </div>
              <div style={{ marginTop: 14 }}>
                <Field id="stx-rfq-notes" label="Notes for invitees">
                  <input
                    id="stx-rfq-notes"
                    className="stx-rfq-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Materials, tolerances, delivery…"
                  />
                </Field>
              </div>
              <div className="stx-rfq-drop" style={{ marginTop: 14 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setAttachments((prev) => [
                      ...prev,
                      ...files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
                    ])
                    e.target.value = ''
                  }}
                />
                <span className="stx-rfq-drop__text stx-text-wrap">
                  Drawings / specs —{' '}
                  <button type="button" className="stx-rfq-drop__browse" onClick={() => fileInputRef.current?.click()}>
                    browse
                  </button>
                </span>
                <span className="stx-rfq-drop__meta">
                  {attachments.length ? `${attachments.length} attached` : 'Optional'}
                </span>
              </div>
              {attachments.length > 0 ? (
                <div className="stx-rfq-attach-list">
                  {attachments.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="stx-rfq-attach-item">
                      <span className="stx-text-wrap">{file.name}</span>
                      <span className="stx-rfq-hint">{formatFileSize(file.size)}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <details className="stx-rfq-more">
                <summary>Commercial & quality</summary>
                <div className="stx-rfq-grid-3">
                  <Field id="stx-rfq-incoterms" label="Incoterms">
                    <select id="stx-rfq-incoterms" className="stx-rfq-select" value={requirements.incoterms || ''} onChange={(e) => setReq({ incoterms: e.target.value })}>
                      {INCOTERMS.map((row) => (
                        <option key={row.id || 'none'} value={row.id}>{row.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field id="stx-rfq-currency" label="Currency">
                    <select id="stx-rfq-currency" className="stx-rfq-select" value={requirements.currency || 'USD'} onChange={(e) => setReq({ currency: e.target.value })}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="CNY">CNY</option>
                    </select>
                  </Field>
                  <Field id="stx-rfq-payment" label="Payment terms">
                    <select id="stx-rfq-payment" className="stx-rfq-select" value={requirements.paymentTermsAsk || ''} onChange={(e) => setReq({ paymentTermsAsk: e.target.value })}>
                      {PAYMENT_TERMS_ASK.map((row) => (
                        <option key={row.id || 'none'} value={row.id}>{row.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field id="stx-rfq-target" label="Target price / unit">
                    <input id="stx-rfq-target" className="stx-rfq-input stx-rfq-input--mono" type="number" min="0" step="0.01" value={requirements.targetUnitPrice ?? ''} onChange={(e) => setReq({ targetUnitPrice: e.target.value })} />
                  </Field>
                  <Field id="stx-rfq-deadline" label="Quote deadline">
                    <input id="stx-rfq-deadline" className="stx-rfq-input stx-rfq-input--mono" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  </Field>
                  <Field id="stx-rfq-quality" label="Requested standard">
                    <select
                      id="stx-rfq-quality"
                      className="stx-rfq-select"
                      value={requirements.qualityLevel || 'iso_9001'}
                      onChange={(e) => setReq({ qualityLevel: e.target.value })}
                    >
                      {QUALITY_LEVELS.map((row) => (
                        <option key={row.id} value={row.id}>{row.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                {(showAutomotive || showMedical) ? (
                  <div className="stx-rfq-toggles" style={{ marginTop: 12 }}>
                    {showAutomotive ? (
                      <>
                        <Field id="stx-rfq-ppap" label="PPAP level">
                          <select id="stx-rfq-ppap" className="stx-rfq-select" value={requirements.ppapLevel || ''} onChange={(e) => setReq({ ppapLevel: e.target.value })}>
                            <option value="">Not specified</option>
                            {['1', '2', '3', '4', '5'].map((lvl) => (
                              <option key={lvl} value={lvl}>Level {lvl}</option>
                            ))}
                          </select>
                        </Field>
                        <ToggleCheckButton checked={Boolean(requirements.imdsRequired)} onChange={(v) => setReq({ imdsRequired: v })}>IMDS</ToggleCheckButton>
                        <ToggleCheckButton checked={Boolean(requirements.traceabilityRequired)} onChange={(v) => setReq({ traceabilityRequired: v })}>Traceability</ToggleCheckButton>
                      </>
                    ) : null}
                    {showMedical ? (
                      <>
                        <ToggleCheckButton checked={Boolean(requirements.iso13485Required)} onChange={(v) => setReq({ iso13485Required: v })}>ISO 13485</ToggleCheckButton>
                        <ToggleCheckButton checked={Boolean(requirements.designControlsRequired)} onChange={(v) => setReq({ designControlsRequired: v })}>Design controls</ToggleCheckButton>
                        <ToggleCheckButton checked={Boolean(requirements.udiRequired)} onChange={(v) => setReq({ udiRequired: v })}>UDI</ToggleCheckButton>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <div style={{ marginTop: 12 }}>
                  <span className="stx-rfq-label">Transport mode</span>
                  <div className="stx-rfq-mode-row" role="group" aria-label="Transport mode">
                    {TRANSPORT_MODES.map((m) => {
                      const on = (requirements.transportMode || 'sea') === m.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`stx-rfq-mode${on ? ' stx-rfq-mode--on' : ''}`}
                          onClick={() => setReq({ transportMode: m.id })}
                        >
                          {m.label}
                        </button>
                      )
                    })}
                  </div>
                  {receivingPlantName ? (
                    <div className="stx-rfq-hint" style={{ marginTop: 8 }}>Receiving plant: {receivingPlantName}</div>
                  ) : null}
                </div>
              </details>
            </section>
          </div>

          <aside className="stx-rfq-form__side">
            <section className="stx-rfq-card">
              <div className="stx-rfq-card__head">
                <div className="stx-rfq-card__title">Recipients</div>
                <span className="stx-rfq-card__meta">{invitees.inviteeIds.length}</span>
              </div>
              <p className="stx-rfq-hint" style={{ marginTop: 8 }}>
                Manufacturers registered on this industry
                {parentCategory ? ` / ${parentCategory.name}` : ''} path.
              </p>
              {!recipientPool.length && !invitees.hasInvitees ? (
                <p className="stx-rfq-empty">No registered accounts on this path yet — invite by email.</p>
              ) : null}
              {recipientPool.map((row) => {
                const selected = invitees.selectedIds.has(row.id) || invitees.inviteeIds.includes(row.id)
                const locked = invitees.lockedIds?.includes(row.id)
                return (
                  <button
                    key={row.id}
                    type="button"
                    className={`stx-rfq-recipient stx-rfq-recipient--pick${selected ? ' stx-rfq-recipient--on' : ''}`}
                    onClick={() => {
                      if (locked && invitees.lockedIds?.length === 1) return
                      invitees.toggle(row.id)
                    }}
                    disabled={Boolean(locked && invitees.lockedIds?.length === 1)}
                  >
                    <span className="stx-rfq-avatar">{initialsOf(row.name)}</span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span className="stx-rfq-recipient__name stx-text-wrap">{row.name}</span>
                      <span className="stx-rfq-recipient__meta stx-text-wrap">
                        {[row.city, row.country].filter(Boolean).join(' · ')
                          || row.email
                          || (row.source === 'registered' ? 'Registered account' : 'Network plant')}
                      </span>
                    </span>
                    <span className="stx-rfq-check__mark">{selected ? '✓' : '○'}</span>
                  </button>
                )
              })}
              {invitees.selectedRecipients
                .filter((r) => !recipientPool.some((s) => s.id === r.id))
                .map((r) => (
                  <div key={r.id} className="stx-rfq-recipient">
                    <span className="stx-rfq-avatar">{initialsOf(r.name)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="stx-rfq-recipient__name stx-text-wrap">{r.name}</span>
                      <span className="stx-rfq-recipient__meta stx-text-wrap">
                        {r.email || 'Email invite'}
                      </span>
                    </span>
                    <button type="button" className="stx-rfq-recipient__remove" aria-label={`Remove ${r.name}`} onClick={() => invitees.remove(r.id)}>×</button>
                  </div>
                ))}
              <button type="button" className="stx-rfq-invite-btn" onClick={() => setShowInvitePanel((v) => !v)}>
                Invite by email
              </button>
              {showInvitePanel ? (
                <div className="stx-rfq-invite-panel">
                  <Field id="stx-invite-name" label="Plant / company">
                    <input id="stx-invite-name" className="stx-rfq-input" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
                  </Field>
                  <Field id="stx-invite-email" label="Email *">
                    <input id="stx-invite-email" className="stx-rfq-input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                  </Field>
                  <button type="button" className="stx-rfq-ghost-btn" style={{ marginTop: 10, width: '100%' }} onClick={addInvite}>
                    Add invitee
                  </button>
                  {inviteError ? <p className="stx-rfq-error" style={{ marginTop: 8 }}>{inviteError}</p> : null}
                </div>
              ) : null}
            </section>

            <section className="stx-rfq-ready">
              <div className="stx-rfq-ready__title">Ready to send</div>
              <div className="stx-rfq-checks">
                {checks.map((c) => (
                  <div key={c.label} className={`stx-rfq-check${c.ok ? ' stx-rfq-check--ok' : ' stx-rfq-check--miss'}`}>
                    <span className="stx-rfq-check__mark">{c.ok ? '✓' : '○'}</span>
                    <span className="stx-text-wrap">{c.label}</span>
                  </div>
                ))}
              </div>
              <button type="submit" className="stx-rfq-send" disabled={!canSend}>{sendLabel}</button>
              {(formError || blockedReason) ? (
                <p className="stx-rfq-ready__note" role="alert" style={{ color: '#ffc9c9' }}>
                  {formError || blockedReason}
                </p>
              ) : (
                <p className="stx-rfq-ready__note">
                  Quotes land on Track RFQs under one number for comparison.
                </p>
              )}
            </section>
          </aside>
        </div>
      ) : null}
    </form>
  )
}
