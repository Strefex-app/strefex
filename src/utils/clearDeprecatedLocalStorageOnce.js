/**
 * One-time cleanup of localStorage keys left by removed product areas (no server DB was used).
 * Runs once per browser profile; safe to extend DEPRECATED_KEY_SUBSTRINGS when features are removed.
 */
const FLAG_KEY = 'strefex-deprecated-localstorage-cleared-v2'
/** @type {string[]} Key must include one of these substrings (tenant suffixes use `::`) */
const DEPRECATED_KEY_SUBSTRINGS = ['fin-market-portfolio']
const LEGACY_FLAG_KEYS_TO_REMOVE = ['strefex-fin-market-local-cleared-v1']

function keyMatchesDeprecated(key) {
  return DEPRECATED_KEY_SUBSTRINGS.some((sub) => key.includes(sub))
}

export function clearDeprecatedLocalStorageOnce() {
  try {
    if (localStorage.getItem(FLAG_KEY)) return
    for (const legacy of LEGACY_FLAG_KEYS_TO_REMOVE) {
      try {
        localStorage.removeItem(legacy)
      } catch {
        /* */
      }
    }
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const k = localStorage.key(i)
      if (k && keyMatchesDeprecated(k)) localStorage.removeItem(k)
    }
    localStorage.setItem(FLAG_KEY, '1')
  } catch {
    /* quota / private mode */
  }
}

/** @internal exported for tests */
export { keyMatchesDeprecated, FLAG_KEY, LEGACY_FLAG_KEYS_TO_REMOVE }
