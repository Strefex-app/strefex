/**
 * Display / registry registration codes aligned with Postgres `registration_code`:
 * S###### (seller), SP####### (service_provider), B####### (buyer), A###### (auditor).
 *
 * Uses `LX…` prefixed fallbacks only when Supabase rows are unavailable (offline / orphaned registry).
 */
const BY_EMAIL_KEY = 'strefex-platform-registration-by-email-v1'
const BY_COMPANY_KEY = 'strefex-platform-registration-by-company-v1'
const LOCAL_SEQ_KEYS = {
  seller: 'strefex-platform-reg-seq-local-seller',
  buyer: 'strefex-platform-reg-seq-local-buyer',
  service_provider: 'strefex-platform-reg-seq-local-sp',
  auditor: 'strefex-platform-reg-seq-local-auditor',
}

export function normalizeRegEmail(email) {
  return String(email || '').trim().toLowerCase()
}

/** Lowercase trimmed UUID — used when profile email is empty but company row exists */
export function normalizeRegCompanyId(companyId) {
  const s = String(companyId || '').trim().toLowerCase()
  if (!s) return ''
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : ''
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

function loadByCompanyMap() {
  try {
    const raw = localStorage.getItem(BY_COMPANY_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveByCompanyMap(map) {
  try {
    localStorage.setItem(BY_COMPANY_KEY, JSON.stringify(map))
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
 * `email` may be empty when only `companyId` is known (e.g. directory rows with company email).
 */
export function rememberOfficialRegistrationCode(email, code, companyId) {
  const c = String(code || '').trim()
  if (!c) return
  const ts = new Date().toISOString()
  const em = normalizeRegEmail(email)
  if (em) {
    const map = loadByEmailMap()
    map[em] = { code: c, source: 'db', updatedAt: ts }
    saveByEmailMap(map)
  }
  const cid = normalizeRegCompanyId(companyId)
  if (cid) {
    const mapC = loadByCompanyMap()
    mapC[cid] = { code: c, source: 'db', updatedAt: ts }
    saveByCompanyMap(mapC)
  }
}

function readStoredEntry(email) {
  const map = loadByEmailMap()
  return map[normalizeRegEmail(email)] || null
}

function readStoredEntryByCompany(companyId) {
  const cid = normalizeRegCompanyId(companyId)
  if (!cid) return null
  return loadByCompanyMap()[cid] || null
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
 * Same as {@link allocateTemporaryLocalRegistrationCode} but keyed by company UUID (no profile email).
 */
export function allocateTemporaryLocalRegistrationCodeByCompany(companyId, accountType) {
  const cid = normalizeRegCompanyId(companyId)
  if (!cid) return null
  const stored = readStoredEntryByCompany(cid)
  if (stored?.code && !isTemporaryLocalRegistrationCode(stored.code)) {
    return stored.code
  }
  if (stored?.code && isTemporaryLocalRegistrationCode(stored.code)) {
    return stored.code
  }
  const code = nextLocalCodeForAccountType(accountType)
  const map = loadByCompanyMap()
  map[cid] = { code, source: 'local', updatedAt: new Date().toISOString() }
  saveByCompanyMap(map)
  return code
}

/**
 * Canonical string for dashboards (DB code wins; then stored map; then temporary local).
 */
export function resolveRegistrationCodeForDashboard({ email, accountType, hints = {}, companyId } = {}) {
  const hc =
    hints.registrationCode ||
    hints.registration_code ||
    hints.companiesRegistrationCode ||
    null
  if (hc != null && String(hc).trim() !== '') {
    return String(hc).trim()
  }
  const cid = normalizeRegCompanyId(companyId)
  if (cid) {
    const fromCompany = readStoredEntryByCompany(cid)?.code || ''
    if (fromCompany) return fromCompany
  }
  const em = normalizeRegEmail(email)
  if (em) {
    const fromStore = readStoredEntry(em)?.code || ''
    if (fromStore) return fromStore
    return allocateTemporaryLocalRegistrationCode(em, accountType) || ''
  }
  if (cid) {
    return allocateTemporaryLocalRegistrationCodeByCompany(cid, accountType) || ''
  }
  return ''
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
