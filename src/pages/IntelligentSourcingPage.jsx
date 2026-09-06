/**
 * Network Intelligent Sourcing — embeds public/intelligent-sourcing design 1:1.
 * Create RFQ opens the unified form → rfqStore (same path as Executive Summary).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { fetchSourcingNetworkAccounts } from '../services/sourcingNetworkService'
import {
  createAndSendNetworkRfq,
  sourcingRfqOpenContext,
} from '../utils/networkRfqCreate'
import { getEquipmentCategoriesForIndustry } from '../data/equipmentCategoriesByIndustry'
import { getProductCategoriesForIndustry } from '../data/productCategoriesByIndustry'
import { isSeededSupplierDirectoryEnabled } from '../config/supplierDataMode'
import { useMarketplaceCatalogVisibilityEffective } from '../hooks/useMarketplaceCatalogVisibilityEffective'
import { buyerWorkspaceUrl } from '../constants/rfqPaths'
import { useSettingsStore } from '../store/settingsStore'
import { saveReceivingPlantsToAccount } from '../utils/receivingPlantsPersist'
import './IntelligentSourcing.css'

const PLATFORM_FONT_STACK = "'Quattrocento Sans', Candara, Calibri, 'Segoe UI', Roboto, Arial, sans-serif"

const SOURCING_NIGHT_CSS = `
html[data-theme="dark"] {
  color-scheme: dark;
  --navy-900: #0d0e10;
  --navy-800: #00d4ff;
  --navy-700: #5ce1ff;
  --navy-600: #7ee9ff;
  --navy-500: #9db1c8;
  --navy-400: #9db1c8;
  --navy-300: #6b7280;
  --steel-700: #9db1c8;
  --steel-600: #6b7280;
  --steel-500: rgba(255,255,255,0.13);
  --steel-400: rgba(255,255,255,0.1);
  --steel-300: rgba(255,255,255,0.07);
  --steel-200: #1a1d24;
  --steel-100: #0d0e10;
  --white: #13151a;
  --black: #e8eaf2;
  --surface-page: #0d0e10;
  --surface-card: #13151a;
  --surface-sunken: #1a1d24;
  --surface-inverse: #1a1d24;
  --surface-console: #0d0e10;
  --surface-panel: #13151a;
  --surface-field: #1a1d24;
  --text-strong: #e8eaf2;
  --text-body: rgba(232,234,242,0.75);
  --text-muted: #6b7280;
  --text-faint: #6b7280;
  --text-on-dark: #e8eaf2;
  --text-on-dark-muted: #9db1c8;
  --border-hairline: rgba(255,255,255,0.07);
  --border-strong: rgba(255,255,255,0.13);
  --border-on-dark: rgba(154,174,199,0.22);
  --action-primary: #00d4ff;
  --action-primary-hover: #5ce1ff;
  --action-primary-active: #7ee9ff;
  --focus-ring: rgba(0,212,255,0.35);
  --signal-running-bg: rgba(52,211,153,0.14);
  --signal-warning-bg: rgba(251,191,36,0.14);
  --signal-fault-bg: rgba(248,113,113,0.14);
  --signal-data: #00d4ff;
  --signal-data-bg: rgba(0,212,255,0.14);
  background: #0d0e10;
  color: #e8eaf2;
}
html[data-theme="dark"] body {
  background: #0d0e10 !important;
  color: #e8eaf2 !important;
}
html[data-theme="dark"] [style*="background:#fff"],
html[data-theme="dark"] [style*="background: #fff"],
html[data-theme="dark"] [style*="background:#FFFFFF"],
html[data-theme="dark"] [style*="background: #FFFFFF"],
html[data-theme="dark"] [style*="background:var(--white)"] {
  background: #13151a !important;
}
`

const SOURCING_MAP_NIGHT_SCRIPT = `
<script id="strefex-sourcing-map-night">
(function () {
  var DAY = {
    ocean: '#EEF0F2', land: '#DCE1E6', landStroke: '#F6F7F8',
    plant: '#0A2540', plantStroke: '#fff', plantLabel: '#0A2540',
    lane: '#0A2540', laneFaint: '#7A8794', tip: '#0A2540', tipText: '#ffffff',
    tipMuted: '#9DB1C8', tipStroke: '#C9D0D6', chip: '#ffffff', chipText: '#0A2540'
  };
  var NIGHT = {
    ocean: '#08090b', land: '#2f3644', landStroke: '#1c212b',
    plant: '#00d4ff', plantStroke: '#08090b', plantLabel: '#e8eaf2',
    lane: '#00d4ff', laneFaint: '#4b5563', tip: '#1a1d24', tipText: '#e8eaf2',
    tipMuted: '#9db1c8', tipStroke: 'rgba(255,255,255,0.18)', chip: '#1a1d24', chipText: '#e8eaf2',
    graticule: 'rgba(0,0,0,0.55)'
  };
  function theme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? NIGHT : DAY;
  }
  function recolor(root) {
    var t = theme();
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var scope = root || document;
    scope.querySelectorAll('svg').forEach(function (svg) {
      var label = (svg.getAttribute('aria-label') || '').toLowerCase();
      if (label.indexOf('supplier') === -1 && label.indexOf('location') === -1) {
        var bg = svg.style && svg.style.background;
        if (!bg || (bg.indexOf('EEF0F2') === -1 && bg.indexOf('eef0f2') === -1 && bg.indexOf('0d0e10') === -1 && bg.indexOf('08090b') === -1)) return;
      }
      svg.style.background = t.ocean;
      svg.querySelectorAll('path').forEach(function (p) {
        var fill = (p.getAttribute('fill') || '').toUpperCase();
        var stroke = (p.getAttribute('stroke') || '').toUpperCase();
        var sw = Number(p.getAttribute('stroke-width') || 0);
        if (fill === '#EEF0F2' || fill === '#0D0E10' || fill === '#08090B') p.setAttribute('fill', t.ocean);
        if (fill === '#DCE1E6' || fill === '#1A1D24' || fill === '#2F3644') p.setAttribute('fill', t.land);
        if (stroke === '#F6F7F8' || stroke === '#13151A' || stroke === '#1C212B') p.setAttribute('stroke', t.landStroke);
        if (stroke === '#0A2540' || stroke === '#00D4FF') p.setAttribute('stroke', t.lane);
        if (stroke === '#7A8794' || stroke === '#6B7280' || stroke === '#4B5563') p.setAttribute('stroke', t.laneFaint);
        if (stroke === '#DDE1E4' || stroke === 'RGBA(0,0,0,0.55)' || stroke === 'RGBA(232, 234, 242, 0.06)') {
          p.setAttribute('stroke', t.graticule || 'rgba(0,0,0,0.55)');
          p.setAttribute('stroke-width', '0.95');
        }
        if ((!fill || fill === 'NONE' || fill === 'TRANSPARENT') && sw > 0 && sw < 1.2) {
          p.setAttribute('stroke', t.graticule || 'rgba(0,0,0,0.55)');
          p.setAttribute('stroke-width', '0.95');
        }
      });
      svg.querySelectorAll('rect').forEach(function (r) {
        var fill = (r.getAttribute('fill') || '').toUpperCase();
        var stroke = (r.getAttribute('stroke') || '').toUpperCase();
        var w = Number(r.getAttribute('width') || 0);
        var h = Number(r.getAttribute('height') || 0);
        var isPlant = w > 0 && w <= 16 && h <= 16;
        var isDayChip = w >= 40 || h >= 18 || fill === '#FFF' || fill === '#FFFFFF';
        if (isPlant) {
          r.setAttribute('fill', t.plant);
          r.setAttribute('stroke', t.plantStroke);
          return;
        }
        if (isDayChip || fill === '#0A2540' || fill === '#1A1D24' || fill === '#00D4FF') {
          /* Transit / compare day windows — night card, not white */
          r.setAttribute('fill', dark ? t.chip : (fill === '#FFF' || fill === '#FFFFFF' ? t.chip : t.tip));
          if (stroke === '#C9D0D6' || stroke === '#FFF' || stroke === '#FFFFFF' || stroke === 'RGBA(255,255,255,0.18)' || dark) {
            r.setAttribute('stroke', t.tipStroke);
          }
        }
      });
      svg.querySelectorAll('text').forEach(function (tx) {
        var fill = (tx.getAttribute('fill') || '').toUpperCase();
        var content = (tx.textContent || '').trim();
        var lower = content.toLowerCase();
        var isTransitLabel = /[0-9]/.test(content)
          || lower.indexOf('eta') !== -1
          || lower.indexOf('make') !== -1
          || lower.indexOf('total') !== -1
          || lower.indexOf(' d') !== -1;
        if (fill === '#9DB1C8') {
          tx.setAttribute('fill', t.tipMuted);
          return;
        }
        if (fill === '#0A2540' || fill === '#E8EAF2' || fill === '#00D4FF' || fill === '#FFF' || fill === '#FFFFFF') {
          if (dark) {
            tx.setAttribute('fill', isTransitLabel ? t.chipText : t.plantLabel);
          } else if (fill === '#FFF' || fill === '#FFFFFF') {
            tx.setAttribute('fill', t.tipText);
          } else {
            tx.setAttribute('fill', isTransitLabel ? t.chipText : t.plantLabel);
          }
        }
      });
      svg.querySelectorAll('circle').forEach(function (c) {
        var stroke = (c.getAttribute('stroke') || '').toUpperCase();
        if (stroke === '#0A2540' || stroke === '#00D4FF') c.setAttribute('stroke', t.plant);
      });
    });
    scope.querySelectorAll('[data-skel]').forEach(function (el) {
      el.style.background = t.ocean;
    });
  }
  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode === 'dark' ? 'dark' : 'light');
    recolor(document);
  }
  window.__STREFEX_APPLY_SOURCING_THEME__ = applyTheme;
  var mo = new MutationObserver(function () { recolor(document); });
  if (document.body) mo.observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', function () {
    mo.observe(document.body, { childList: true, subtree: true });
    recolor(document);
  });
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.source !== 'strefex-platform' || d.action !== 'set-theme') return;
    applyTheme(d.theme);
  });
  applyTheme(window.__STREFEX_PLATFORM_THEME__ || 'light');
})();
</script>
`

function buildEmbedShellCss(theme = 'light') {
  const themeAttr = theme === 'dark' ? 'dark' : 'light'
  return `
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Quattrocento+Sans:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
<style id="strefex-embed-shell">
  aside { display: none !important; width: 0 !important; min-width: 0 !important; padding: 0 !important; overflow: hidden !important; }
  button[aria-label="Menu"] { display: none !important; }
  main > header { box-sizing: border-box !important; height: 77px !important; min-height: 77px !important; max-height: 77px !important; padding-top: 0 !important; padding-bottom: 0 !important; padding-left: 24px !important; padding-right: 24px !important; align-items: center !important; flex-wrap: nowrap !important; }
  :root {
    --font-serif: ${PLATFORM_FONT_STACK} !important;
    --font-serif-text: ${PLATFORM_FONT_STACK} !important;
    --font-sans: ${PLATFORM_FONT_STACK} !important;
    --font-condensed: ${PLATFORM_FONT_STACK} !important;
    --font-mono: ${PLATFORM_FONT_STACK} !important;
    --eyebrow-family: ${PLATFORM_FONT_STACK} !important;
  }
  html, body, button, input, select, textarea {
    font-family: ${PLATFORM_FONT_STACK} !important;
  }
  ${SOURCING_NIGHT_CSS}
</style>
<script>window.__STREFEX_PLATFORM_THEME__=${JSON.stringify(themeAttr)};</script>
${SOURCING_MAP_NIGHT_SCRIPT}
`
}

function injectPlatformPayload(html, payload, theme = 'light') {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c')
  const boot = `<script>window.__STREFEX_PLATFORM_SOURCING__=${json};</script>`
  const shell = buildEmbedShellCss(theme)
  let out = html
    // Absolute asset URLs so srcDoc / nested bases cannot miss /intelligent-sourcing/
    .replace(/(src|href)=(["'])assets\//gi, '$1=$2/intelligent-sourcing/assets/')
    .replace(/url\((["']?)assets\//gi, 'url($1/intelligent-sourcing/assets/')
    .replace(
      /<head([^>]*)>/i,
      `<head$1><base href="/intelligent-sourcing/">${boot}${shell}`,
    )
  if (theme === 'dark') {
    out = out.replace(/<html([^>]*)>/i, (match, attrs = '') => {
      if (/\bdata-theme\s*=/.test(attrs)) {
        return `<html${attrs.replace(/\bdata-theme\s*=\s*(['"]).*?\1/i, 'data-theme="dark"')}>`
      }
      return `<html${attrs} data-theme="dark">`
    })
  }
  return out
}

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
  const mergeNetworkAccounts = useAccountRegistry((s) => s.mergeNetworkAccounts)
  const updateAccount = useAccountRegistry((s) => s.updateAccount)
  const selectedIndustries = useIndustryStore((s) => s.selectedIndustries)
  const plant = useSourcingPlantStore((s) => s.plant)
  const setPlant = useSourcingPlantStore((s) => s.setPlant)
  const rfqs = useRfqStore((s) => s.rfqs)
  const getSafeRfqs = useRfqStore((s) => s.getSafeRfqs)
  const theme = useSettingsStore((s) => s.theme)
  const setTenant = useAuthStore((s) => s.setTenant)
  const showMarketplaceCatalog = useMarketplaceCatalogVisibilityEffective()
    || isSeededSupplierDirectoryEnabled()

  useEffect(() => {
    ensureAllAccountsSourcingFields()
  }, [ensureAllAccountsSourcingFields])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const rows = await fetchSourcingNetworkAccounts({ limit: 800 })
      if (cancelled || !rows.length) return
      mergeNetworkAccounts(rows)
    })()
    return () => { cancelled = true }
  }, [mergeNetworkAccounts, user?.email, tenant?.id])

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
      }),
      rfqs: buyerRfqs,
    }),
    [registrySellers, tenant, user, myAccount, selectedIndustries, buyerRfqs],
  )

  const payloadKey = useMemo(() => JSON.stringify(platformPayload), [platformPayload])

  const [srcDoc, setSrcDoc] = useState('')
  const [frameSrc, setFrameSrc] = useState('')
  const [status, setStatus] = useState('loading')
  const [showRfqModal, setShowRfqModal] = useState(false)
  const [rfqContext, setRfqContext] = useState(null)
  const [lastCreatedRfq, setLastCreatedRfq] = useState(null)
  const [sendError, setSendError] = useState('')
  const iframeRef = useRef(null)

  const pushPlatformToFrame = useCallback(() => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    try {
      win.postMessage(
        { source: 'strefex-platform', action: 'apply-platform', payload: JSON.parse(payloadKey) },
        '*',
      )
      win.postMessage(
        { source: 'strefex-platform', action: 'set-theme', theme },
        '*',
      )
    } catch { /* not ready */ }
  }, [payloadKey, theme])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setSrcDoc('')
    setFrameSrc('')

    // Direct same-origin iframe (React/Babel vendored under /intelligent-sourcing/vendor).
    // Avoids huge srcDoc documents that inherit production CSP and previously blocked unpkg.
    const loadDirect = () => {
      setSrcDoc('')
      const themeParam = theme === 'dark' ? 'dark' : 'light'
      setFrameSrc(`/intelligent-sourcing/index.html?embed=1&theme=${themeParam}&t=${Date.now()}`)
      setStatus('ready')
    }

    fetch(`${window.location.origin}/intelligent-sourcing/index.html`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((html) => {
        if (cancelled) return
        if (!html.includes('Intelligent Sourcing') || !html.includes('SOURCING_DATA')) {
          throw new Error('Intelligent Sourcing HTML not served (check vercel rewrite)')
        }
        loadDirect()
      })
      .catch(() => {
        if (cancelled) return
        // Last resort: still try the static URL (may recover after SW cache churn)
        loadDirect()
      })

    return () => { cancelled = true }
  }, [payloadKey, theme])

  useEffect(() => {
    if (status !== 'ready') return
    pushPlatformToFrame()
  }, [status, pushPlatformToFrame, frameSrc, srcDoc])

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
              <Link to="/executive-summary">Executive Summary</Link>
            </p>
          </div>
        ) : (
          <>
            {status === 'loading' && (
              <div className="intelligent-sourcing-loading" role="status">
                Loading Sourcing…
              </div>
            )}
            <iframe
              ref={iframeRef}
              className="intelligent-sourcing-frame"
              title="Intelligent Sourcing"
              src={frameSrc || undefined}
              srcDoc={!frameSrc && status === 'ready' ? srcDoc : undefined}
              onLoad={pushPlatformToFrame}
            />
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
