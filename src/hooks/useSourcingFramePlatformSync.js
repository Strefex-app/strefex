import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useAccountRegistry } from '../store/accountRegistry'
import { useIndustryStore } from '../store/industryStore'
import useRfqStore from '../store/rfqStore'
import { usePersistentSourcingCanvas } from '../components/PersistentSourcingCanvas'
import {
  buildPlatformSourcingPayload,
  serializeSourcingRfqList,
} from '../utils/intelligentSourcingData'
import { platformMessageTargetOrigin, isTrustedIframeMessage } from '../utils/platformMessageTrust'
import { buildSourcingTaxonomyOverlay } from '../utils/unifiedSourcingTaxonomy'
import { mergeNetworkManufacturersWithAccounts } from '../utils/accountSourcingCompleteness'

function registryFingerprint(sellers) {
  if (!Array.isArray(sellers) || !sellers.length) return '0'
  return `${sellers.length}:${sellers.map((a) => a.id || a.email || '').join('|')}`
}

function isPhoneShell() {
  try {
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(max-width: 720px)').matches) return true
      if (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 900) return true
    }
  } catch { /* */ }
  try {
    return /iPhone|iPod|Android.+Mobile/i.test(navigator.userAgent || '')
  } catch {
    return false
  }
}

/**
 * Keep the parked Intelligent Sourcing iframe in sync with the live registry.
 * iPhone Safari (Safari tab and PWA) often drops large structured-clone
 * postMessage payloads and reports a fake ~980px iframe width.
 */
export function useSourcingFramePlatformSync() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const accounts = useAccountRegistry((s) => s.accounts)
  const selectedIndustries = useIndustryStore((s) => s.selectedIndustries)
  const rfqs = useRfqStore((s) => s.rfqs)
  const getSafeRfqs = useRfqStore((s) => s.getSafeRfqs)
  const { iframeRef, frameReady, live } = usePersistentSourcingCanvas()

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

  const payload = useMemo(
    () => ({
      ...buildPlatformSourcingPayload({
        registrySellers,
        tenant,
        user,
        account: myAccount,
        buyerIndustries: selectedIndustries || myAccount?.industries || [],
        includeTaxonomy: false,
        rfqs: buyerRfqs,
      }),
      rfqs: buyerRfqs,
    }),
    [registrySellers, tenant, user, myAccount, selectedIndustries, buyerRfqs],
  )

  const payloadSig = `${registryFingerprint(registrySellers)}:${buyerRfqs.length}:${frameReady ? '1' : '0'}`
  const payloadRef = useRef(payload)
  payloadRef.current = payload
  const appliedCountRef = useRef(-1)
  const extraRetryRef = useRef(0)

  const pushViewport = useCallback(() => {
    const win = iframeRef.current?.contentWindow
    const frame = iframeRef.current
    if (!win || !frame) return
    const parentW = Math.min(
      window.innerWidth || 0,
      document.documentElement?.clientWidth || 0,
    ) || window.innerWidth || 0
    const frameW = frame.clientWidth || 0
    /* Parked canvas is 2×2 — never teach the iframe that width. */
    const shellW = live
      ? (frameW > 40 ? Math.min(frameW, parentW || frameW) : parentW)
      : (parentW > 0 && parentW < 720 ? parentW : 0)
    if (shellW < 20) return
    try {
      win.postMessage(
        { source: 'strefex-platform', action: 'set-viewport', width: shellW },
        platformMessageTargetOrigin(),
      )
    } catch { /* */ }
  }, [iframeRef, live])

  const pushPlatformToFrame = useCallback(() => {
    const win = iframeRef.current?.contentWindow
    if (!win) return false

    pushViewport()

    const postApply = (next) => {
      const json = JSON.stringify(next)
      win.postMessage(
        { source: 'strefex-platform', action: 'apply-platform', payloadJson: json },
        platformMessageTargetOrigin(),
      )
    }

    try {
      const full = payloadRef.current || {}
      const suppliers = Array.isArray(full.suppliers) ? full.suppliers : []
      const headBase = {
        buyers: full.buyers || [],
        registeredIndustryIds: full.registeredIndustryIds || [],
        rfqs: full.rfqs || [],
        userInitials: full.userInitials,
        allowDemoSeed: false,
      }
      const phone = isPhoneShell()
      const chunkAt = phone || suppliers.length > 16 ? 12 : 48
      try {
        postApply({ taxonomy: buildSourcingTaxonomyOverlay() })
      } catch { /* overlay is optional if stringify fails */ }
      if (suppliers.length > chunkAt) {
        postApply({ ...headBase, suppliers: suppliers.slice(0, chunkAt) })
        for (let i = chunkAt; i < suppliers.length; i += chunkAt) {
          postApply({ appendSuppliers: true, suppliers: suppliers.slice(i, i + chunkAt) })
        }
        return true
      }
      postApply({ ...headBase, suppliers })
      return true
    } catch {
      return false
    }
  }, [iframeRef, pushViewport])

  useEffect(() => {
    if (!frameReady) return undefined
    appliedCountRef.current = -1
    extraRetryRef.current = 0
    pushPlatformToFrame()
    const delays = isPhoneShell()
      ? [400, 1200, 2800, 6000, 12000, 20000]
      : [400, 1600, 4000]
    const timers = delays.map((ms) => window.setTimeout(pushPlatformToFrame, ms))
    return () => {
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [frameReady, payloadSig, pushPlatformToFrame])

  useEffect(() => {
    const onMsg = (event) => {
      if (!isTrustedIframeMessage(event, iframeRef.current?.contentWindow)) return
      const data = event?.data
      if (!data || data.source !== 'strefex-intelligent-sourcing') return
      if (data.action === 'ready' || data.action === 'app-ready') {
        pushPlatformToFrame()
        return
      }
      if (data.action === 'platform-applied') {
        const count = Number(data.payload?.count)
        appliedCountRef.current = Number.isFinite(count) ? count : appliedCountRef.current
        const expected = (payloadRef.current?.suppliers || []).length
        if (expected > 0 && appliedCountRef.current < expected && extraRetryRef.current < 6) {
          extraRetryRef.current += 1
          window.setTimeout(pushPlatformToFrame, 800)
        }
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [pushPlatformToFrame])

  useEffect(() => {
    if (!frameReady) return undefined
    pushViewport()
    const onResize = () => pushViewport()
    window.addEventListener('resize', onResize)
    try {
      window.visualViewport?.addEventListener('resize', onResize)
    } catch { /* */ }
    const el = iframeRef.current
    let ro
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => pushViewport())
      ro.observe(el)
    }
    return () => {
      window.removeEventListener('resize', onResize)
      try {
        window.visualViewport?.removeEventListener('resize', onResize)
      } catch { /* */ }
      ro?.disconnect()
    }
  }, [frameReady, iframeRef, live, pushViewport])

  return { pushPlatformToFrame, registrySellers }
}
