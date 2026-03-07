/**
 * Authentication service — orchestrates login/logout across:
 *   • Supabase Auth   (primary — email/password, OAuth, magic link)
 *   • Firebase Auth   (legacy SSO, email/password — when configured)
 *   • Backend JWT     (multi-tenant RBAC — always available)
 *   • Zustand store   (client-side session state)
 *
 * Priority order:
 *   1.  Supabase (when VITE_SUPABASE_URL is set)
 *   2.  Firebase (when VITE_FIREBASE_API_KEY is set)
 *   3.  Direct backend API
 *   4.  Offline / localStorage fallback
 */
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth as firebaseAuth, isFirebaseConfigured } from '../config/firebase'
import { isSupabaseConfigured } from '../config/supabase'
import env from '../config/env'
import { supabaseAuth, profilesService, companiesService } from './supabaseService'
import { authApi } from './api'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from './featureFlags'
import { analytics } from './analytics'
import { isSuperadminEmail } from './superadminAuth'
import {
  useIndustrySubscriptionStore,
  createFreeSubscription,
  createPendingSubscription,
} from './subscriptionService'
import { useIndustryStore } from '../store/industryStore'

const AUTH_TIMEOUT_MS = 12000
const VALID_ACCOUNT_TYPES = new Set(['seller', 'buyer', 'service_provider'])
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in',
  'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'proton.me', 'protonmail.com', 'pm.me',
  'mail.com', 'gmx.com', 'zoho.com', 'yandex.com', 'yandex.ru',
])

/* ── Internal helpers ────────────────────────────────────── */

async function withTimeout(promise, ms, message) {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

function capRole(role, email) {
  // The designated STREFEX account always keeps superadmin privileges.
  if (isSuperadminEmail(email)) return 'superadmin'
  if (role === 'superadmin' && !isSuperadminEmail(email)) return 'admin'
  return role || 'user'
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeAccountType(value, fallback = 'seller') {
  const normalized = String(value || '').trim().toLowerCase()
  return VALID_ACCOUNT_TYPES.has(normalized) ? normalized : fallback
}

function normalizeAccountTypes(values, preferredPrimary = 'seller') {
  const primary = normalizeAccountType(preferredPrimary)
  const normalized = Array.isArray(values)
    ? values.map((v) => normalizeAccountType(v, '')).filter(Boolean)
    : []
  if (normalized.includes(primary)) return [primary]
  if (normalized.length > 0) return [normalized[0]]
  return [primary]
}

function isBusinessEmail(email) {
  const normalized = normalizeEmail(email)
  const parts = normalized.split('@')
  if (parts.length !== 2) return false
  const domain = parts[1]
  if (!domain || !domain.includes('.')) return false
  return !PUBLIC_EMAIL_DOMAINS.has(domain)
}

function getEmailDomain(email) {
  const normalized = normalizeEmail(email)
  const parts = normalized.split('@')
  return parts.length === 2 ? parts[1].toLowerCase() : ''
}

function isDomainIndustryTakenFromRegistry(email, accountType, industryId) {
  try {
    const domain = getEmailDomain(email)
    if (!domain || !industryId) return false
    const raw = localStorage.getItem('strefex-account-registry')
    const accounts = raw ? JSON.parse(raw) : []
    return Array.isArray(accounts) && accounts.some((a) =>
      a?.status !== 'canceled' &&
      String(a?.accountType || '') === String(accountType || '') &&
      String(a?.email || '').split('@')[1]?.toLowerCase() === domain &&
      Array.isArray(a?.industries) &&
      a.industries.includes(industryId)
    )
  } catch {
    return false
  }
}

async function cleanupLaunchStarterExamples() {
  try {
    const [
      projectMod,
      procurementMod,
      vendorMod,
      contractMod,
      auditMod,
      costMod,
      enterpriseMod,
      productionMod,
    ] = await Promise.all([
      import('../store/projectStore'),
      import('../store/procurementStore'),
      import('../store/vendorStore'),
      import('../store/contractStore'),
      import('../store/auditStore'),
      import('../store/costStore'),
      import('../store/enterpriseStore'),
      import('../store/productionStore'),
    ])

    projectMod.useProjectStore.setState((s) => ({
      projects: (s.projects || []).filter((p) => !String(p.id || '').startsWith('proj-starter-')),
    }))
    procurementMod.default.setState((s) => ({
      requisitions: (s.requisitions || []).filter((r) => !String(r.id || '').startsWith('PR-STARTER-')),
      purchaseOrders: (s.purchaseOrders || []).filter((o) => !String(o.id || '').startsWith('PO-STARTER-')),
    }))
    vendorMod.default.setState((s) => ({
      vendors: (s.vendors || []).filter((v) => !String(v.id || '').startsWith('vnd-starter-')),
    }))
    contractMod.default.setState((s) => ({
      contracts: (s.contracts || []).filter((c) => !String(c.id || '').startsWith('CTR-STARTER-')),
    }))
    auditMod.default.setState((s) => ({
      logs: (s.logs || []).filter((l) => !String(l.id || '').startsWith('aud-starter-')),
    }))
    costMod.default.setState((s) => ({
      products: (s.products || []).filter((x) => !x?._starterExample),
      scenarios: (s.scenarios || []).filter((x) => !x?._starterExample),
      costCategories: (s.costCategories || []).filter((x) => !x?._starterExample),
    }))
    enterpriseMod.default.setState((s) => ({
      fixedCosts: (s.fixedCosts || []).filter((x) => !x?._starterExample),
      variableCosts: (s.variableCosts || []).filter((x) => !x?._starterExample),
      semiVariableCosts: (s.semiVariableCosts || []).filter((x) => !x?._starterExample),
      directCosts: (s.directCosts || []).filter((x) => !x?._starterExample),
      indirectCosts: (s.indirectCosts || []).filter((x) => !x?._starterExample),
      opex: (s.opex || []).filter((x) => !x?._starterExample),
      capex: (s.capex || []).filter((x) => !x?._starterExample),
      personnelCosts: (s.personnelCosts || []).filter((x) => !x?._starterExample),
      financialCosts: (s.financialCosts || []).filter((x) => !x?._starterExample),
      exceptionalCosts: (s.exceptionalCosts || []).filter((x) => !x?._starterExample),
      riskCosts: (s.riskCosts || []).filter((x) => !x?._starterExample),
      products: (s.products || []).filter((x) => !x?._starterExample),
    }))
    productionMod.default.setState((s) => ({
      fiveSAudits: (s.fiveSAudits || []).filter((x) => !x?._starterExample),
      vda63Audits: (s.vda63Audits || []).filter((x) => !x?._starterExample),
      oeeData: (s.oeeData || []).filter((x) => !x?._starterExample),
      downtimeRecords: (s.downtimeRecords || []).filter((x) => !x?._starterExample),
      scrapRecords: (s.scrapRecords || []).filter((x) => !x?._starterExample),
      productionOutput: (s.productionOutput || []).filter((x) => !x?._starterExample),
      equipment: (s.equipment || []).filter((x) => !x?._starterExample),
      auditHistory: (s.auditHistory || []).filter((x) => !x?._starterExample),
      processAudits: (s.processAudits || []).filter((x) => !x?._starterExample),
      workCenters: (s.workCenters || []).filter((x) => !x?._starterExample),
      certificationHistory: {
        iso9001: (s.certificationHistory?.iso9001 || []).filter((x) => !x?._starterExample),
        iatf16949: (s.certificationHistory?.iatf16949 || []).filter((x) => !x?._starterExample),
        other: (s.certificationHistory?.other || []).filter((x) => !x?._starterExample),
      },
    }))
  } catch {
    // Launch cleanup should never block authentication.
  }
}

/**
 * After successful Supabase auth, sync with Zustand store.
 */
async function storeSupabaseSession(session, profile) {
  const user = session?.user
  const role = capRole(profile?.role || 'user', user?.email)
  const metadata = profile?.metadata || {}
  const metadataAccountTypes = Array.isArray(metadata.account_types)
    ? metadata.account_types
    : []
  const fallbackAccountType = normalizeAccountType(
    metadata.account_type || user?.user_metadata?.account_type || metadataAccountTypes[0] || 'seller'
  )
  const accountTypes = normalizeAccountTypes(metadataAccountTypes, fallbackAccountType)
  const primaryAccountType = accountTypes[0] || fallbackAccountType

  useAuthStore.getState().login({
    role,
    token: session?.access_token || null,
    expiresAt: session?.expires_at ? session.expires_at * 1000 : Date.now() + 55 * 60 * 1000,
    user: {
      id: user?.id,
      email: user?.email,
      fullName: profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0],
      role,
      phone: profile?.phone,
      accountTypes,
      primaryAccountType,
    },
    tenant: profile?.company_id
      ? {
          id: profile.company_id,
          name: profile.companies?.name || profile.company_id,
          slug: profile.companies?.slug || profile.company_id,
        }
      : null,
  })

  analytics.track('user_login', {
    method: 'supabase',
    role,
    tenant: profile?.companies?.slug,
  })

  // Load non-critical data in background so login does not block on slow network.
  if (user?.id) {
    useIndustrySubscriptionStore
      .getState()
      .loadActiveSubscriptions(user.id)
      .catch(() => {})
  }

  // Restore supplier industry/category registrations asynchronously.
  Promise.resolve(useIndustryStore.getState().hydrateFromDatabase?.()).catch(() => {})

  // Keep UI account-type context aligned with profile metadata.
  useSubscriptionStore.getState().setAccountType(primaryAccountType)

  // After real auth, remove presentation starter examples from workspace data.
  cleanupLaunchStarterExamples().catch(() => {})
}

async function syncProfileFromRegistrationMetadata(user, profile) {
  if (!user) return profile

  const md = user.user_metadata || {}
  const superadminEmail = isSuperadminEmail(user?.email)
  const hasRegistrationMetadata = Boolean(md.tier || md.account_type || md.company_name || md.industry)
  if (!hasRegistrationMetadata) {
    // Even without registration metadata, keep superadmin role persistent.
    if (superadminEmail && profile?.role !== 'superadmin') {
      await profilesService.updateProfile({ role: 'superadmin' })
      return profilesService.getMyProfile()
    }
    return profile
  }

  const fullName = (md.full_name || profile?.full_name || '').trim()
  const phone = md.phone || profile?.phone || null
  const primaryMetadataAccountType = normalizeAccountType(
    md.account_type || profile?.metadata?.account_type || 'seller'
  )

  let companyId = profile?.company_id || null
  if (!companyId) {
    const companyName = (md.company_name || fullName || user.email?.split('@')[0] || 'Company').trim()
    const slugBase = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    try {
      const created = await companiesService.create({
        name: companyName,
        slug: `${slugBase}-${Date.now().toString(36)}`,
        email: user.email,
        phone: phone || null,
        account_type: primaryMetadataAccountType,
        plan: md.tier || 'free',
        status: 'active',
      })
      companyId = created?.id || null
    } catch {
      // Leave company_id as-is if company creation fails; profile still updates.
    }
  }

  const metadata = {
    ...(profile?.metadata || {}),
    account_type: primaryMetadataAccountType,
    account_types: [primaryMetadataAccountType],
    industry: md.industry || profile?.metadata?.industry || null,
    industries: Array.isArray(md.industries)
      ? md.industries
      : (Array.isArray(profile?.metadata?.industries)
        ? profile.metadata.industries
        : (md.industry ? [md.industry] : [])),
    categories: (md.categories && typeof md.categories === 'object')
      ? md.categories
      : (profile?.metadata?.categories || {}),
    tier: md.tier || profile?.metadata?.tier || 'free',
  }

  const allowedRoles = new Set(['superadmin', 'auditor_external', 'admin', 'auditor_internal', 'manager', 'user'])
  const metadataRoleRaw = md.invited_role || md.role || ''
  const metadataRole = allowedRoles.has(String(metadataRoleRaw).toLowerCase())
    ? String(metadataRoleRaw).toLowerCase()
    : ''
  const hadCompanyBefore = Boolean(profile?.company_id)

  // Preserve privileged role for the STREFEX superadmin account.
  // For invited users, prefer role from metadata instead of forcing admin.
  let nextRole = profile?.role || 'user'
  if (!profile?.role) {
    if (metadataRole) {
      nextRole = metadataRole
    } else if (companyId && !hadCompanyBefore) {
      // First account owner keeps admin by default.
      nextRole = 'admin'
    }
  }
  if (superadminEmail) {
    nextRole = 'superadmin'
  }
  const metadataChanged = JSON.stringify(profile?.metadata || {}) !== JSON.stringify(metadata)
  const needsUpdate = !profile
    || profile.full_name !== fullName
    || (profile.phone || null) !== (phone || null)
    || profile.company_id !== companyId
    || profile.role !== nextRole
    || metadataChanged

  if (!needsUpdate) return profile

  await profilesService.updateProfile({
    company_id: companyId,
    full_name: fullName || null,
    phone: phone || null,
    role: nextRole,
    metadata,
  })

  return profilesService.getMyProfile()
}

/**
 * After successful legacy (Firebase/backend) authentication, store the session.
 */
function storeSession(backendResponse) {
  const { access_token, user, tenant } = backendResponse || {}
  const expiresAt = Date.now() + 55 * 60 * 1000

  const role = capRole(user?.role, user?.email)
  const primaryAccountType = normalizeAccountType(user?.account_type || user?.account_types?.[0] || 'seller')
  const normalizedAccountTypes = normalizeAccountTypes(user?.account_types, primaryAccountType)

  useAuthStore.getState().login({
    role,
    token: access_token,
    expiresAt,
    user: user
      ? {
          id: user.id,
          email: user.email,
          fullName: user.full_name ?? user.fullName,
          role,
          accountTypes: normalizedAccountTypes,
          primaryAccountType,
        }
      : null,
    tenant: tenant
      ? { id: tenant.id, name: tenant.name, slug: tenant.slug }
      : null,
  })

  analytics.track('user_login', {
    method: isFirebaseConfigured ? 'firebase' : 'direct',
    role: user?.role,
    tenant: tenant?.slug,
  })
}

/* ── Public API ──────────────────────────────────────────── */

const authService = {
  /**
   * Sign in with email and password.
   * Tries Supabase first, then Firebase, then direct backend.
   */
  async loginWithEmail(email, password, tenantSlug = null) {
    const normalizedEmail = normalizeEmail(email)
    // ── Supabase path ──
    if (isSupabaseConfigured) {
      let signInResult
      try {
        signInResult = await withTimeout(
          supabaseAuth.signIn(normalizedEmail, password),
          AUTH_TIMEOUT_MS,
          'Login request timed out. Please try again.'
        )
      } catch (err) {
        if (String(err?.message || '').toLowerCase().includes('timed out')) {
          err.code = 'request_timeout'
        }
        throw err
      }
      const { session, user } = signInResult

      // Block login for users whose email is not yet confirmed
      if (user && !user.email_confirmed_at) {
        await supabaseAuth.signOut().catch(() => {})
        const err = new Error('Please verify your email before logging in.')
        err.code = 'email_not_confirmed'
        throw err
      }

      // If registration happened before email confirmation, ensure free tier
      // is materialized after first successful login.
      const metaTier = (user?.user_metadata?.tier || '').toLowerCase()
      const metaIndustry = user?.user_metadata?.industry || 'automotive'
      if (user?.id && metaTier === 'free') {
        await createFreeSubscription({ userId: user.id, industry: metaIndustry }).catch(() => {})
      }

      const rawProfile = await withTimeout(
        profilesService.getMyProfile(),
        AUTH_TIMEOUT_MS,
        'Login request timed out while loading profile. Please try again.'
      )
      const profile = await withTimeout(
        syncProfileFromRegistrationMetadata(user, rawProfile),
        AUTH_TIMEOUT_MS,
        'Login request timed out while finalizing your account. Please try again.'
      )
      await storeSupabaseSession(session, profile)
      return { session, user, profile }
    }

    // In production we require Supabase auth to avoid hitting legacy
    // backend routes that are not deployed on Vercel.
    if (env.IS_PROD) {
      const configErr = new Error(
        'Login service is not configured for this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel and redeploy.'
      )
      configErr.code = 'auth_not_configured'
      throw configErr
    }

    // ── Firebase path (sign-in only — never auto-create) ──
    if (isFirebaseConfigured) {
      try {
        await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password)
      } catch (fbError) {
        if (fbError.code === 'auth/user-not-found') {
          throw new Error('No account found with this email. Please register first.')
        } else if (fbError.code === 'auth/invalid-credential' || fbError.code === 'auth/wrong-password') {
          throw new Error('Invalid email or password')
        } else {
          throw new Error(fbError.message)
        }
      }
    }

    // ── Backend JWT path ──
    try {
      const response = await authApi.login(normalizedEmail, password, tenantSlug)
      storeSession(response)
      return response
    } catch (err) {
      if (err?.status === 404) {
        const configErr = new Error(
          env.IS_PROD
            ? 'Login service is not configured for this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel and redeploy.'
            : 'Login endpoint returned 404. Configure Supabase auth for this app.'
        )
        configErr.code = 'auth_not_configured'
        throw configErr
      }
      if (isFirebaseConfigured && firebaseAuth.currentUser) {
        await firebaseSignOut(firebaseAuth).catch(() => {})
      }
      throw err
    }
  },

  /**
   * Sign in with Google.
   * Prefers Supabase OAuth; falls back to Firebase popup.
   */
  async loginWithGoogle(tenantSlug = null) {
    void tenantSlug
    throw new Error('Google sign-in is disabled. Please use your business email and password.')
  },

  /**
   * Register a new user.
   * Supabase: creates auth user + company, then logs in.
   * Firebase: creates Firebase account, then calls backend register.
   */
  async register({
    fullName,
    email,
    password,
    phone,
    company,
    selectedPlan = 'start',
    accountType = 'seller',
    accountTypes = null,
    selectedIndustry = 'general',
    selectedIndustries = null,
    selectedCategories = null,
    selectedTier = 'free',
  }) {
    const normalizedEmail = normalizeEmail(email)
    if (!isBusinessEmail(normalizedEmail)) {
      throw new Error('Please register using your business email domain (no public email providers).')
    }
    const normalizedPrimaryIndustry = String(selectedIndustry || '').trim().toLowerCase() || 'general'
    const normalizedPrimaryAccountType = normalizeAccountType(accountType)
    if (isDomainIndustryTakenFromRegistry(normalizedEmail, normalizedPrimaryAccountType, normalizedPrimaryIndustry)) {
      throw new Error('This business domain is already registered for the selected account type and industry.')
    }
    // ── Supabase path ──
    if (isSupabaseConfigured) {
      const normalizedTier = (selectedTier || selectedPlan || 'free').toLowerCase()
      const normalizedAccountTypes = normalizeAccountTypes(accountTypes, accountType)
      const primaryAccountType = normalizedAccountTypes[0] || normalizeAccountType(accountType)
      void selectedIndustries
      const primaryIndustry = String(selectedIndustry || 'general').trim().toLowerCase() || 'general'
      const normalizedIndustries = [primaryIndustry]
      const normalizedCategories = (() => {
        void selectedCategories
        return {}
      })()
      const signUpData = await supabaseAuth.signUp({
        email: normalizedEmail,
        password,
        fullName,
        phone,
        metadata: {
          company_name: company || '',
          account_type: primaryAccountType,
          account_types: normalizedAccountTypes,
          industry: primaryIndustry,
          industries: normalizedIndustries,
          categories: normalizedCategories,
          tier: normalizedTier,
        },
      })
      const user = signUpData?.user
      const session = signUpData?.session

      // When Supabase has "Confirm email" enabled, session is null until the
      // user clicks the link.  We still create the company row so it's ready
      // when they confirm.
      if (user) {
        const companySlug = (company || fullName || email.split('@')[0])
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        try {
          const newCompany = await companiesService.create({
            name: company || fullName || email.split('@')[0],
            slug: `${companySlug}-${Date.now().toString(36)}`,
            email: normalizedEmail,
            phone: phone || null,
            account_type: primaryAccountType,
            plan: selectedPlan,
            status: 'active',
          })

          if (newCompany) {
            await profilesService.updateProfile({
              company_id: newCompany.id,
              full_name: fullName,
              phone: phone || null,
              role: 'admin',
              metadata: {
                account_type: primaryAccountType,
                account_types: normalizedAccountTypes,
                industry: primaryIndustry,
                industries: normalizedIndustries,
                categories: normalizedCategories,
                tier: normalizedTier,
              },
              email_verified: false,
              phone_verified: false,
            })
          }
        } catch (companyErr) {
          console.warn('[authService.register] Company/profile setup deferred — will complete after email confirmation:', companyErr.message)
        }

        // No session means email confirmation is pending
        if (!session) {
          analytics.track('user_register', {
            method: 'supabase',
            tier: normalizedTier,
            accountType: primaryAccountType,
            industry: primaryIndustry,
            industriesCount: normalizedIndustries.length,
            awaitingConfirmation: true,
          })
          return {
            user,
            emailConfirmationPending: true,
            selectedIndustry: primaryIndustry,
            selectedIndustries: normalizedIndustries,
            selectedTier: normalizedTier,
          }
        }

        // Session exists — email confirmation is disabled or auto-confirmed
        const profile = await profilesService.getMyProfile()
        await storeSupabaseSession(session, profile)

        // Free tier grants access immediately.
        if (normalizedTier === 'free') {
          await createFreeSubscription({ userId: user.id, industry: primaryIndustry })
        } else {
          // Paid tiers are pending until Stripe webhook confirms payment.
          await createPendingSubscription({ userId: user.id, industry: primaryIndustry, tier: normalizedTier })
        }

        await useIndustrySubscriptionStore.getState().loadActiveSubscriptions(user.id)
        analytics.track('user_register', {
          method: 'supabase',
          tier: normalizedTier,
          accountType: primaryAccountType,
          industry: primaryIndustry,
          industriesCount: normalizedIndustries.length,
        })
        return {
          session,
          user,
          profile,
          requiresPayment: normalizedTier !== 'free',
          tier: normalizedTier,
          industry: primaryIndustry,
          industries: normalizedIndustries,
        }
      }
      return signUpData
    }

    // Production deployments must use Supabase auth setup.
    if (env.IS_PROD) {
      const configErr = new Error(
        'Registration service is not configured for this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel and redeploy.'
      )
      configErr.code = 'auth_not_configured'
      throw configErr
    }

    // ── Firebase path ──
    if (isFirebaseConfigured) {
      try {
        await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password)
      } catch (fbError) {
        if (fbError.code === 'auth/email-already-in-use') {
          // Already exists in Firebase — proceed to backend
        } else {
          throw new Error(fbError.message)
        }
      }
    }

    // ── Backend path ──
    try {
      const response = await authApi.register({
        full_name: fullName,
        email: normalizedEmail,
        password,
        company_name: company,
        selected_plan: selectedPlan,
      })
      storeSession(response)
      analytics.track('user_register', {
        method: isFirebaseConfigured ? 'firebase' : 'direct',
        role: response.user?.role,
        plan: selectedPlan,
      })
      return response
    } catch (err) {
      if (err?.status === 404) {
        const configErr = new Error(
          env.IS_PROD
            ? 'Registration service is not configured for this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel and redeploy.'
            : 'Registration endpoint returned 404. Configure Supabase auth for this app.'
        )
        configErr.code = 'auth_not_configured'
        throw configErr
      }
      if (isFirebaseConfigured && firebaseAuth.currentUser) {
        await firebaseSignOut(firebaseAuth).catch(() => {})
      }
      throw err
    }
  },

  /**
   * Sign out from everything.
   */
  async logout() {
    analytics.track('user_logout')

    if (isSupabaseConfigured) {
      await supabaseAuth.signOut().catch(() => {})
    }
    if (isFirebaseConfigured && firebaseAuth?.currentUser) {
      await firebaseSignOut(firebaseAuth).catch(() => {})
    }
    useAuthStore.getState().logout()
  },

  /**
   * Refresh the user profile.
   */
  async refreshProfile() {
    try {
      if (isSupabaseConfigured) {
        const profile = await profilesService.getMyProfile()
        if (profile) {
          const store = useAuthStore.getState()
          store.setUser?.({
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            role: profile.role,
            phone: profile.phone,
            accountTypes: normalizeAccountTypes(
              profile?.metadata?.account_types,
              profile?.metadata?.account_type || 'seller'
            ),
            primaryAccountType: normalizeAccountType(profile?.metadata?.account_type || 'seller'),
          })
          return profile
        }
      }
      const user = await authApi.me()
      const store = useAuthStore.getState()
      store.setUser?.({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      })
      return user
    } catch {
      return null
    }
  },

  async sendPasswordReset(email) {
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      throw new Error('Please enter your account email first.')
    }
    if (isSupabaseConfigured) {
      try {
        await supabaseAuth.resetPassword(normalizedEmail)
        return { sent: true, confirmationResent: false }
      } catch (err) {
        const msg = String(err?.message || '').toLowerCase()
        if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
          await supabaseAuth.resendSignupConfirmation(normalizedEmail)
          return { sent: true, confirmationResent: true }
        }
        throw err
      }
    }
    throw new Error('Password reset is only available with Supabase auth configuration.')
  },

  async resendConfirmation(email) {
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      throw new Error('Please enter your account email first.')
    }
    if (isSupabaseConfigured) {
      await supabaseAuth.resendSignupConfirmation(normalizedEmail)
      return { sent: true }
    }
    throw new Error('Email confirmation resend is only available with Supabase auth configuration.')
  },

  /**
   * Listen for auth state changes.
   * Supabase takes priority; falls back to Firebase.
   */
  onAuthStateChange(callback) {
    if (isSupabaseConfigured) {
      const { data } = supabaseAuth.onAuthStateChange((event, session) => {
        callback(session?.user || null)
      })
      return data.subscription?.unsubscribe || (() => {})
    }
    if (!isFirebaseConfigured || !firebaseAuth) {
      return () => {}
    }
    return onAuthStateChanged(firebaseAuth, callback)
  },

  /**
   * Initialize auth — restore session on app load.
   * If no valid session exists, clears the Zustand store to prevent
   * stale localStorage state from granting access.
   */
  async initSession() {
    if (!isSupabaseConfigured) {
      // Without Supabase, check if the stored token has expired
      const { expiresAt, isAuthenticated } = useAuthStore.getState()
      if (isAuthenticated && expiresAt && Date.now() > expiresAt) {
        useAuthStore.getState().logout()
      }
      return null
    }
    try {
      const session = await supabaseAuth.getSession()
      if (session?.user) {
        const rawProfile = await profilesService.getMyProfile()
        const profile = await syncProfileFromRegistrationMetadata(session.user, rawProfile)
        await storeSupabaseSession(session, profile)
        await useIndustrySubscriptionStore.getState().loadActiveSubscriptions(session.user.id)
        return { session, profile }
      }
    } catch {
      // Silent — no session to restore
    }

    // No valid Supabase session — clear any stale auth state
    if (useAuthStore.getState().isAuthenticated) {
      useAuthStore.getState().logout()
    }
    return null
  },

  /** Google SSO is intentionally disabled. */
  isGoogleSSOAvailable: false,

  /** Whether Supabase is the primary auth provider. */
  isSupabaseConfigured,

  /** Whether Firebase is configured. */
  isFirebaseConfigured,
}

export default authService
