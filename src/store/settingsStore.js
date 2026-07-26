import { create } from 'zustand'
import { LANGUAGE_CODES } from '../i18n/languages'
import { normalizeTheme, syncDomTheme } from '../theme/syncDomTheme'

const ALLOWED_LANG = new Set(LANGUAGE_CODES)

function normalizeLanguage(code) {
  const c = String(code || 'en').trim().toLowerCase()
  return ALLOWED_LANG.has(c) ? c : 'en'
}

const getStoredTheme = () => {
  try {
    return normalizeTheme(localStorage.getItem('strefex-theme') || 'light')
  } catch {
    return 'light'
  }
}
const getStoredLang = () => {
  try {
    return normalizeLanguage(localStorage.getItem('strefex-lang') || 'en')
  } catch {
    return 'en'
  }
}

const getStoredPush = () => {
  try {
    const raw = localStorage.getItem('strefex-push-notifications')
    if (raw === null) return true
    return raw === 'true'
  } catch {
    return true
  }
}

export const useSettingsStore = create((set) => ({
  theme: getStoredTheme(),
  language: getStoredLang(),
  pushNotifications: getStoredPush(),

  setPushNotifications: (enabled) => {
    try { localStorage.setItem('strefex-push-notifications', enabled ? 'true' : 'false') } catch {}
    set({ pushNotifications: enabled })
  },

  setTheme: (theme) => {
    const t = normalizeTheme(theme)
    try { localStorage.setItem('strefex-theme', t) } catch {}
    syncDomTheme(t)
    set({ theme: t })
  },

  toggleTheme: () => {
    set((state) => {
      const next = normalizeTheme(state.theme === 'light' ? 'dark' : 'light')
      try { localStorage.setItem('strefex-theme', next) } catch {}
      syncDomTheme(next)
      return { theme: next }
    })
  },

  setLanguage: (language) => {
    const next = normalizeLanguage(language)
    try {
      localStorage.setItem('strefex-lang', next)
    } catch {}
    set({ language: next })
  },
}))
