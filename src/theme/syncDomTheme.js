/** RFQ Intelligence palette · keep in sync with `index.css` + `index.html`. */
export const THEME_META = {
  light: {
    themeColor: '#0a2540',
    colorScheme: 'light dark',
    rootScheme: 'light',
  },
  dark: {
    themeColor: '#0d0e10',
    colorScheme: 'dark light',
    rootScheme: 'dark',
  },
}

/** @param {unknown} value */
export function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : 'light'
}

/**
 * Keep `<html data-theme>`, CSS `color-scheme`, PWA/nav meta aligned for night mode app-wide.
 * Call whenever the UI theme preference changes (see `DocumentThemeSync` in App).
 */
export function syncDomTheme(theme) {
  const t = normalizeTheme(theme)
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const meta = THEME_META[t]

  root.setAttribute('data-theme', t)
  root.style.colorScheme = meta.rootScheme

  try {
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }))
  } catch {
    /* ignore */
  }

  const themeColorMeta = document.querySelector('meta[name="theme-color"]')
  if (themeColorMeta) themeColorMeta.setAttribute('content', meta.themeColor)

  const schemeMeta = document.querySelector('meta[name="color-scheme"]')
  if (schemeMeta) schemeMeta.setAttribute('content', meta.colorScheme)
}
