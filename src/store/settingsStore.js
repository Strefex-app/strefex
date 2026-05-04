import { create } from 'zustand'
import { normalizeTheme, syncDomTheme } from '../theme/syncDomTheme'

const getStoredTheme = () => {
  try {
    return normalizeTheme(localStorage.getItem('strefex-theme') || 'light')
  } catch {
    return 'light'
  }
}
const getStoredLang = () => {
  try { return localStorage.getItem('strefex-lang') || 'en' } catch { return 'en' }
}

export const useSettingsStore = create((set) => ({
  theme: getStoredTheme(),
  language: getStoredLang(),

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
    try { localStorage.setItem('strefex-lang', language) } catch {}
    set({ language })
  },
}))
