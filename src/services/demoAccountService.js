/**
 * Enter / exit isolated presentation demo — local data only, no Supabase sync.
 */
import {
  DEMO_SESSION_MODE,
  DEMO_TENANT_ID,
  assertDemoAccessAllowed,
  getDemoProfileMeta,
  isDemoModeActive,
} from '../config/demoAccount'
import { buildDemoSeedPayload, DEMO_SEED_VERSION } from '../data/demoAccountSeed'
import { isSupabaseConfigured, supabaseAuth } from './supabaseService'
import { useAuthStore } from '../store/authStore'
import { scheduleRehydrateTenantStores, stopWorkspaceCloudSyncOnLogout } from '../store/rehydrateTenantStores'
import { tenantKey } from '../utils/tenantStorage'

function writeDemoTenantValue(baseKey, value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)
  localStorage.setItem(`${baseKey}::${DEMO_TENANT_ID}`, serialized)
}

function seedDemoWorkspace(profileKey) {
  const payload = buildDemoSeedPayload(profileKey)
  Object.entries(payload).forEach(([baseKey, value]) => {
    writeDemoTenantValue(baseKey, value)
  })
}

async function disconnectLiveBackends() {
  stopWorkspaceCloudSyncOnLogout()
  if (isSupabaseConfigured) {
    try {
      await supabaseAuth.signOut()
    } catch {
      /* silent */
    }
  }
  try {
    const { signOut } = await import('firebase/auth')
    const { auth, isFirebaseConfigured } = await import('../config/firebase')
    if (isFirebaseConfigured && auth?.currentUser) {
      await signOut(auth)
    }
  } catch {
    /* silent */
  }
}

/**
 * @param {'buyer'|'seller'} profileKey
 */
export async function enterDemoAccount(profileKey = 'buyer') {
  assertDemoAccessAllowed()
  await disconnectLiveBackends()

  const meta = getDemoProfileMeta(profileKey)
  seedDemoWorkspace(profileKey)

  useAuthStore.getState().login({
    role: 'admin',
    token: null,
    expiresAt: null,
    sessionMode: DEMO_SESSION_MODE,
    user: {
      id: meta.id,
      email: meta.email,
      fullName: meta.fullName,
      name: meta.fullName,
      companyName: meta.companyName,
      accountType: meta.accountType,
      primaryAccountType: meta.primaryAccountType,
      accountTypes: meta.accountTypes,
    },
    tenant: {
      id: DEMO_TENANT_ID,
      name: meta.companyName,
      slug: 'strefex-demo',
    },
  })

  scheduleRehydrateTenantStores(useAuthStore.getState)
}

/** Re-apply demo seed (reset sandbox data). */
export async function resetDemoWorkspace() {
  if (!isDemoModeActive()) return
  const auth = useAuthStore.getState()
  const accountType = auth.user?.primaryAccountType || auth.user?.accountType || 'buyer'
  const profileKey = accountType === 'seller' ? 'seller' : 'buyer'
  seedDemoWorkspace(profileKey)
  scheduleRehydrateTenantStores(useAuthStore.getState)
}

export function demoSeedIsCurrent() {
  try {
    return localStorage.getItem(tenantKey('strefex-demo-seed-version')) === DEMO_SEED_VERSION
  } catch {
    return false
  }
}

export { isDemoModeActive }
