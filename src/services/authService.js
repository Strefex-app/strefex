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
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth as firebaseAuth, isFirebaseConfigured } from '../config/firebase'
import { isSupabaseConfigured } from '../config/supabase'
import { supabaseAuth, profilesService, companiesService } from './supabaseService'
import { authApi } from './api'
import { useAuthStore } from '../store/authStore'
import { analytics } from './analytics'
import { isSuperadminEmail } from './superadminAuth'

const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null

/* ── Internal helpers ────────────────────────────────────── */

function capRole(role, email) {
  if (role === 'superadmin' && !isSuperadminEmail(email)) return 'admin'
  return role || 'user'
}

/**
 * After successful Supabase auth, sync with Zustand store.
 */
async function storeSupabaseSession(session, profile) {
  const user = session?.user
  const role = capRole(profile?.role || 'user', user?.email)

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
}

/**
 * After successful legacy (Firebase/backend) authentication, store the session.
 */
function storeSession(backendResponse) {
  const { access_token, user, tenant } = backendResponse || {}
  const expiresAt = Date.now() + 55 * 60 * 1000

  const role = capRole(user?.role, user?.email)

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
    // ── Supabase path ──
    if (isSupabaseConfigured) {
      const { session, user } = await supabaseAuth.signIn(email, password)
      const profile = await profilesService.getMyProfile()
      await storeSupabaseSession(session, profile)
      return { session, user, profile }
    }

    // ── Firebase path ──
    if (isFirebaseConfigured) {
      try {
        await signInWithEmailAndPassword(firebaseAuth, email, password)
      } catch (fbError) {
        if (fbError.code === 'auth/user-not-found') {
          await createUserWithEmailAndPassword(firebaseAuth, email, password)
        } else if (fbError.code === 'auth/invalid-credential' || fbError.code === 'auth/wrong-password') {
          throw new Error('Invalid email or password')
        } else {
          throw new Error(fbError.message)
        }
      }
    }

    // ── Backend JWT path ──
    try {
      const response = await authApi.login(email, password, tenantSlug)
      storeSession(response)
      return response
    } catch (err) {
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
    if (isSupabaseConfigured) {
      await supabaseAuth.signInWithOAuth('google')
      return
    }

    if (!isFirebaseConfigured || !googleProvider) {
      throw new Error('Google SSO requires Firebase or Supabase configuration.')
    }

    const result = await signInWithPopup(firebaseAuth, googleProvider)
    const idToken = await result.user.getIdToken()
    const gEmail = result.user.email

    try {
      const response = await authApi.login(gEmail, idToken, tenantSlug)
      storeSession(response)
      return response
    } catch (err) {
      if (isFirebaseConfigured && firebaseAuth.currentUser) {
        await firebaseSignOut(firebaseAuth).catch(() => {})
      }
      throw new Error(
        err.detail || 'Google SSO succeeded but backend registration is pending. Contact your administrator.'
      )
    }
  },

  /**
   * Register a new user.
   * Supabase: creates auth user + company, then logs in.
   * Firebase: creates Firebase account, then calls backend register.
   */
  async register({ fullName, email, password, phone, company, selectedPlan = 'start', accountType = 'seller' }) {
    // ── Supabase path ──
    if (isSupabaseConfigured) {
      const signUpData = await supabaseAuth.signUp({ email, password, fullName, phone })
      const user = signUpData?.user

      if (user) {
        // Create the company
        const companySlug = (company || fullName || email.split('@')[0])
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        const newCompany = await companiesService.create({
          name: company || fullName || email.split('@')[0],
          slug: `${companySlug}-${Date.now().toString(36)}`,
          email: email,
          phone: phone || null,
          account_type: accountType,
          plan: selectedPlan,
          status: 'active',
        })

        // Link profile to company and set admin role
        if (newCompany) {
          await profilesService.updateProfile({
            company_id: newCompany.id,
            full_name: fullName,
            phone: phone || null,
            role: 'admin',
            email_verified: false,
            phone_verified: false,
          })
        }

        // Sign in immediately
        const { session } = await supabaseAuth.signIn(email, password)
        const profile = await profilesService.getMyProfile()
        await storeSupabaseSession(session, profile)

        analytics.track('user_register', { method: 'supabase', plan: selectedPlan, accountType })
        return { session, user, profile }
      }
      return signUpData
    }

    // ── Firebase path ──
    if (isFirebaseConfigured) {
      try {
        await createUserWithEmailAndPassword(firebaseAuth, email, password)
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
        email,
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
   */
  async initSession() {
    if (!isSupabaseConfigured) return null
    try {
      const session = await supabaseAuth.getSession()
      if (session?.user) {
        const profile = await profilesService.getMyProfile()
        await storeSupabaseSession(session, profile)
        return { session, profile }
      }
    } catch {
      // Silent — no session to restore
    }
    return null
  },

  /** Whether Google SSO is available (via Supabase or Firebase). */
  isGoogleSSOAvailable: isSupabaseConfigured || isFirebaseConfigured,

  /** Whether Supabase is the primary auth provider. */
  isSupabaseConfigured,

  /** Whether Firebase is configured. */
  isFirebaseConfigured,
}

export default authService
