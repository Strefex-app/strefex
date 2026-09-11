import { create } from 'zustand'
import { LANGUAGE_CODES } from '../i18n/languages'
import { normalizeTheme, syncDomTheme } from '../theme/syncDomTheme'

export const EMAIL_PREF_KEY = 'strefex-email-notifications'

const ALLOWED_LANG = new Set(LANGUAGE_CODES)

function normalizeLanguage(code) {
  const c = String(code || 'en').trim().toLowerCase()
  return ALLOWED_LANG.has(c) ? c : 'en'
}

function getStoredFlag(key, fallback = true) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === 'true'
  } catch {
    return fallback
  }
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

export function isEmailNotificationsEnabled() {
  return getStoredFlag(EMAIL_PREF_KEY, true)
}

export const useSettingsStore = create((set) => ({
  theme: getStoredTheme(),
  language: getStoredLang(),
  pushNotifications: getStoredFlag('strefex-push-notifications', true),
  emailNotifications: getStoredFlag(EMAIL_PREF_KEY, true),
  exhibitionReminders: getStoredFlag('strefex-exhibition-reminders', true),

  setPushNotifications: (enabled) => {
    const on = Boolean(enabled)
    try { localStorage.setItem('strefex-push-notifications', on ? 'true' : 'false') } catch {}
    set({ pushNotifications: on })
  },

  setEmailNotifications: (enabled) => {
    const on = Boolean(enabled)
    try { localStorage.setItem(EMAIL_PREF_KEY, on ? 'true' : 'false') } catch {}
    set({ emailNotifications: on })
  },

  setExhibitionReminders: (enabled) => {
    const on = Boolean(enabled)
    try { localStorage.setItem('strefex-exhibition-reminders', on ? 'true' : 'false') } catch {}
    set({ exhibitionReminders: on })
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
