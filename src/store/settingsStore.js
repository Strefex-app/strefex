import { create } from 'zustand'

const getStoredTheme = () => {
  try { return localStorage.getItem('strefex-theme') || 'light' } catch { return 'light' }
}
const getStoredLang = () => {
  try { return localStorage.getItem('strefex-lang') || 'en' } catch { return 'en' }
}

export const useSettingsStore = create((set) => ({
  theme: getStoredTheme(),
  language: getStoredLang(),

  setTheme: (theme) => {
    try { localStorage.setItem('strefex-theme', theme) } catch {}
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },

  toggleTheme: () => {
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light'
      try { localStorage.setItem('strefex-theme', next) } catch {}
      document.documentElement.setAttribute('data-theme', next)
      return { theme: next }
    })
  },

  setLanguage: (language) => {
    try { localStorage.setItem('strefex-lang', language) } catch {}
    set({ language })
  },
}))
