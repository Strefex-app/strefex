/**
 * Tenant-scoped store rehydration after login/logout.
 * Kept separate from authStore to avoid circular imports (featureFlags → authStore).
 * Store modules are loaded via dynamic import() at runtime only.
 */
import { devWarn } from '../utils/devLog'
import { getLegacyTenantIds, tenantKey } from '../utils/tenantStorage'

const readTenantScopedRaw = (baseKey, fallback = null) => {
  try {
    const canonical = localStorage.getItem(tenantKey(baseKey))
    if (canonical != null) return canonical
    const legacyTenantIds = getLegacyTenantIds()
    for (let i = 0; i < legacyTenantIds.length; i += 1) {
      const legacyRaw = localStorage.getItem(`${baseKey}::${legacyTenantIds[i]}`)
      if (legacyRaw != null) return legacyRaw
    }
    return fallback
  } catch {
    return fallback
  }
}

/** Stop Supabase workspace sync before clearing auth (dynamic import avoids bundle cycle). */
export function stopWorkspaceCloudSyncOnLogout() {
  import('../services/workspaceCloudSync')
    .then((m) => m.stopWorkspaceCloudSync())
    .catch((err) => devWarn('workspace cloud sync stop skipped', err))
}

/**
 * Re-read all tenant-scoped stores for the current auth tenant (or guest after logout).
 * @param {() => object} getAuthState — authStore `get` accessor
 */
export function scheduleRehydrateTenantStores(getAuthState) {
  setTimeout(async () => {
    try {
      const [
        projectMod,
        productionMod,
        costMod,
        enterpriseMod,
        rfqMod,
        contractMod,
        procurementMod,
        vendorMod,
        auditorHubMod,
        auditMod,
        templateMod,
        companyRecognitionMod,
        myCalendarMod,
      ] = await Promise.all([
        import('./projectStore'),
        import('./productionStore'),
        import('./costStore'),
        import('./enterpriseStore'),
        import('./rfqStore'),
        import('./contractStore'),
        import('./procurementStore'),
        import('./vendorStore'),
        import('./auditorHubStore'),
        import('./auditStore'),
        import('./templateStore'),
        import('./companyRecognitionStore'),
        import('./myCalendarStore'),
      ])

      const persistStores = [
        projectMod.useProjectStore,
        productionMod.default,
        costMod.default,
        enterpriseMod.default,
        rfqMod.default,
        contractMod.default,
        procurementMod.default,
        vendorMod.default,
        auditorHubMod.default,
        auditMod.default,
        templateMod.useTemplateStore,
        companyRecognitionMod.useCompanyRecognitionStore,
        myCalendarMod.useMyCalendarStore,
      ]
      persistStores.forEach((store) => {
        try { store?.persist?.rehydrate?.() } catch { /* silent */ }
      })

      const [industryMod, serviceMod, featureMod, txMod, svcReqMod] = await Promise.all([
        import('./industryStore'),
        import('./serviceStore'),
        import('../services/featureFlags'),
        import('./transactionStore'),
        import('./serviceRequestStore'),
      ])

      try {
        const industries = JSON.parse(readTenantScopedRaw('strefex-selected-industries', '[]') || '[]')
        const categories = JSON.parse(readTenantScopedRaw('strefex-selected-categories', '{}') || '{}')
        industryMod.useIndustryStore.setState({ selectedIndustries: industries, selectedCategories: categories })
      } catch { /* silent */ }

      try {
        const services = JSON.parse(readTenantScopedRaw('strefex-selected-services', '[]') || '[]')
        serviceMod.useServiceStore.setState({ selectedServices: services })
      } catch { /* silent */ }

      try {
        const sub = JSON.parse(readTenantScopedRaw('strefex-subscription', '{}') || '{}')
        const auth = getAuthState()
        const fallbackAccountType = String(
          auth?.user?.primaryAccountType ||
          auth?.user?.accountType ||
          (Array.isArray(auth?.user?.accountTypes) ? auth.user.accountTypes[0] : '') ||
          'seller'
        ).toLowerCase()
        featureMod.useSubscriptionStore.setState({
          planId: sub.planId || 'start',
          accountType: sub.accountType || fallbackAccountType,
          status: sub.status || 'active',
          trialEndsAt: sub.trialEndsAt || null,
          overrides: sub.overrides || {},
        })
      } catch { /* silent */ }

      try {
        const txData = JSON.parse(readTenantScopedRaw('strefex-transactions', '[]') || '[]')
        txMod.useTransactionStore.setState({ transactions: txData })
      } catch { /* silent */ }

      try {
        const store = svcReqMod.useServiceRequestStore.getState()
        if (typeof store.refreshFromStorage === 'function') {
          store.refreshFromStorage()
        } else {
          const reqKey = tenantKey('strefex-service-requests')
          const notifKey = tenantKey('strefex-service-notifications')
          const globalNotifKey = 'strefex-service-notifications-global'
          const reqData = JSON.parse(localStorage.getItem(reqKey) || '[]')
          const notifData = JSON.parse(localStorage.getItem(notifKey) || '[]')
          const globalNotifData = JSON.parse(localStorage.getItem(globalNotifKey) || '[]')
          svcReqMod.useServiceRequestStore.setState({
            requests: reqData,
            notifications: notifData,
            globalNotifications: Array.isArray(globalNotifData) ? globalNotifData : [],
          })
        }
      } catch { /* silent */ }
    } catch (err) {
      devWarn('tenant store rehydrate failed', err)
    }

    try {
      const m = await import('../services/workspaceCloudSync')
      if (getAuthState()?.sessionMode === 'demo') return
      await m.bootstrapWorkspaceCloudSync()
    } catch (err) {
      devWarn('workspace cloud sync bootstrap skipped', err)
    }
  }, 0)
}
