/**
 * Display / registry registration codes aligned with Postgres `registration_code`:
 * S###### (seller), SP####### (service_provider), B####### (buyer), A###### (auditor).
 *
 * Uses `LX…` prefixed fallbacks only when Supabase rows are unavailable (offline / orphaned registry).
 */
const BY_EMAIL_KEY = 'strefex-platform-registration-by-email-v1'
const LOCAL_SEQ_KEYS = {
  seller: 'strefex-platform-reg-seq-local-seller',
  buyer: 'strefex-platform-reg-seq-local-buyer',
  service_provider: 'strefex-platform-reg-seq-local-sp',
  auditor: 'strefex-platform-reg-seq-local-auditor',
}

export function normalizeRegEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function loadByEmailMap() {
  try {
    const raw = localStorage.getItem(BY_EMAIL_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveByEmailMap(map) {
  try {
    localStorage.setItem(BY_EMAIL_KEY, JSON.stringify(map))
  } catch {
    /* no-op */
  }
}

/** True for client-only provisional codes until a DB `registration_code` replaces them. */
export function isTemporaryLocalRegistrationCode(code) {
  const c = String(code || '').trim()
  return /^L(?:SP|[SBA])[0-9]+$/i.test(c)
}

/**
 * Persist official identifier from Supabase / server (replacing any local provisional row).
 */
export function rememberOfficialRegistrationCode(email, code) {
  const em = normalizeRegEmail(email)
  const c = String(code || '').trim()
  if (!em || !c) return
  const map = loadByEmailMap()
  map[em] = { code: c, source: 'db', updatedAt: new Date().toISOString() }
  saveByEmailMap(map)
}

function readStoredEntry(email) {
  const map = loadByEmailMap()
  return map[normalizeRegEmail(email)] || null
}

function bumpSequence(storageKey, padLen) {
  try {
    const raw = localStorage.getItem(storageKey)
    const prev = Number.parseInt(raw || '0', 10)
    const next = Number.isFinite(prev) && prev > 0 ? prev + 1 : 1
    localStorage.setItem(storageKey, String(next))
    return next.toString().padStart(padLen, '0')
  } catch {
    const n = `${Date.now()}`.slice(-padLen).padStart(padLen, '0')
    return n
  }
}

function nextLocalCodeForAccountType(accountType) {
  const type = String(accountType || 'seller').toLowerCase()
  if (type === 'service_provider') {
    const num = bumpSequence(LOCAL_SEQ_KEYS.service_provider, 7)
    return `LSP${num}`
  }
  if (type === 'buyer') {
    const num = bumpSequence(LOCAL_SEQ_KEYS.buyer, 7)
    return `LB${num}`
  }
  if (type === 'auditor') {
    const num = bumpSequence(LOCAL_SEQ_KEYS.auditor, 6)
    return `LA${num}`
  }
  const num = bumpSequence(LOCAL_SEQ_KEYS.seller, 6)
  return `LS${num}`
}

/**
 * Provisional code for accounts not yet synced to Postgres (distinct `L*` prefix vs live `S*` / `SP*` / etc.).
 */
export function allocateTemporaryLocalRegistrationCode(email, accountType) {
  const em = normalizeRegEmail(email)
  if (!em) return null
  const stored = readStoredEntry(em)
  if (stored?.code && !isTemporaryLocalRegistrationCode(stored.code)) {
    return stored.code
  }
  if (stored?.code && isTemporaryLocalRegistrationCode(stored.code)) {
    return stored.code
  }

  const code = nextLocalCodeForAccountType(accountType)
  const map = loadByEmailMap()
  map[em] = { code, source: 'local', updatedAt: new Date().toISOString() }
  saveByEmailMap(map)
  return code
}

/**
 * Canonical string for dashboards (DB code wins; then stored map; then temporary local).
 */
export function resolveRegistrationCodeForDashboard({ email, accountType, hints = {} }) {
  const hc =
    hints.registrationCode ||
    hints.registration_code ||
    hints.companiesRegistrationCode ||
    null
  if (hc != null && String(hc).trim() !== '') {
    return String(hc).trim()
  }
  const em = normalizeRegEmail(email)
  if (!em) return ''
  const fromStore = readStoredEntry(em)?.code || ''
  if (fromStore) return fromStore

  /* Only mint when missing — caller should pass hints from Postgres when available */
  return allocateTemporaryLocalRegistrationCode(em, accountType) || ''
}

export function mergeRegistrationPreference(prevCode, nextCode) {
  const a = String(prevCode || '').trim()
  const b = String(nextCode || '').trim()
  if (!a) return b
  if (!b) return a
  const ta = isTemporaryLocalRegistrationCode(a)
  const tb = isTemporaryLocalRegistrationCode(b)
  if (ta && !tb) return b
  if (!ta && tb) return a
  return b.length >= a.length ? b : a
}
