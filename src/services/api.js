/**
 * Centralized API client for the FastAPI backend.
 *
 * - Automatically attaches JWT from authStore.
 * - Handles 401 responses (auto-logout).
 * - Provides typed methods for every backend endpoint group.
 * - Falls back to mock behaviour when the backend is unreachable.
 */
import env from '../config/env'
import { useAuthStore } from '../store/authStore'

/* ── Helpers ─────────────────────────────────────────────── */

class ApiError extends Error {
  constructor(status, detail, data = null) {
    super(detail || `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.data = data
  }
}

function getToken() {
  return useAuthStore.getState().token
}

function handleUnauthorized() {
  useAuthStore.getState().logout()
  // Only redirect if we're in a browser context
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

/**
 * Core fetch wrapper.
 * @param {string} path   – relative to API_BASE_URL (e.g. "/auth/login")
 * @param {object} opts   – fetch options + { skipAuth, raw }
 */
async function request(path, opts = {}) {
  const { skipAuth = false, raw = false, ...fetchOpts } = opts

  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOpts.headers || {}),
  }

  if (!skipAuth) {
    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  // Remove Content-Type for FormData (browser sets it with boundary)
  if (fetchOpts.body instanceof FormData) {
    delete headers['Content-Type']
  }

  const url = `${env.API_BASE_URL}${path}`

  let response
  try {
    response = await fetch(url, { ...fetchOpts, headers })
  } catch (err) {
    // Network error — backend unreachable
    throw new ApiError(0, `Network error: ${err.message}`)
  }

  // Handle 401 globally
  if (response.status === 401) {
    handleUnauthorized()
    throw new ApiError(401, 'Session expired. Please log in again.')
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null
  }

  // Return raw response if requested (e.g. for blobs)
  if (raw) return response

  // Parse JSON
  let data
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new ApiError(response.status, data?.detail || response.statusText, data)
  }

  return data
}

/* ── HTTP method shortcuts ───────────────────────────────── */

const api = {
  get:    (path, opts)       => request(path, { method: 'GET', ...opts }),
  post:   (path, body, opts) => request(path, { method: 'POST', body: JSON.stringify(body), ...opts }),
  patch:  (path, body, opts) => request(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  put:    (path, body, opts) => request(path, { method: 'PUT', body: JSON.stringify(body), ...opts }),
  delete: (path, opts)       => request(path, { method: 'DELETE', ...opts }),
}

/* ── Auth endpoints ──────────────────────────────────────── */

export const authApi = {
  /**
   * Login with email/password. Returns { access_token, token_type, user, tenant }.
   */
  login: (email, password, tenantSlug = null) =>
    api.post('/auth/login', { email, password, tenant_slug: tenantSlug }, { skipAuth: true }),

  /**
   * Register a new user. Returns { access_token, token_type, user, tenant }.
   */
  register: (data) =>
    api.post('/auth/register', data, { skipAuth: true }),

  /** Get current authenticated user profile. */
  me: () => api.get('/auth/me'),
}

/* ── User endpoints ──────────────────────────────────────── */

export const usersApi = {
  list:   (params = {})    => api.get(`/users?${new URLSearchParams(params)}`),
  get:    (id)             => api.get(`/users/${id}`),
  create: (data)           => api.post('/users', data),
  update: (id, data)       => api.patch(`/users/${id}`, data),
  delete: (id)             => api.delete(`/users/${id}`),
}

/* ── Tenant endpoints ────────────────────────────────────── */

export const tenantsApi = {
  list:   (params = {})    => api.get(`/tenants?${new URLSearchParams(params)}`),
  get:    (id)             => api.get(`/tenants/${id}`),
  create: (data)           => api.post('/tenants', data),
  update: (id, data)       => api.patch(`/tenants/${id}`, data),
}

/* ── Project endpoints ───────────────────────────────────── */

export const projectsApi = {
  list:   (params = {})    => api.get(`/projects?${new URLSearchParams(params)}`),
  get:    (id)             => api.get(`/projects/${id}`),
  create: (data)           => api.post('/projects', data),
  update: (id, data)       => api.patch(`/projects/${id}`, data),
  delete: (id)             => api.delete(`/projects/${id}`),
}

/* ── Asset endpoints ─────────────────────────────────────── */

export const assetsApi = {
  list:   (params = {})    => api.get(`/assets?${new URLSearchParams(params)}`),
  get:    (id)             => api.get(`/assets/${id}`),
  create: (data)           => api.post('/assets', data),
  update: (id, data)       => api.patch(`/assets/${id}`, data),
  delete: (id)             => api.delete(`/assets/${id}`),
}

/* ── Subscription / billing endpoints (Stripe) ───────────── */

export const billingApi = {
  /** Get current subscription status for the tenant. */
  getSubscription: ()          => api.get('/billing/subscription'),
  /** Create a Stripe Checkout session for a plan upgrade. */
  createCheckout:  (planId)    => api.post('/billing/checkout', { plan_id: planId }),
  /** Open Stripe Customer Portal for managing billing. */
  createPortal:    ()          => api.post('/billing/portal'),
  /** Get available plans and pricing. */
  getPlans:        ()          => api.get('/billing/plans'),
  /**
   * Create a subscription directly with a payment method (used during signup).
   * @param {{ plan_id: string, payment_method_id: string }} data
   * @returns {{ subscription_id, status, client_secret? }}
   */
  createSubscription: (data)   => api.post('/billing/create-subscription', data),
}

/* ── Health ───────────────────────────────────────────────── */

export const healthApi = {
  check: () => fetch(`${env.API_BASE_URL.replace('/api/v1', '')}/health`).then(r => r.json()).catch(() => null),
}

/* ── Default export ──────────────────────────────────────── */
export { ApiError }
export default api
