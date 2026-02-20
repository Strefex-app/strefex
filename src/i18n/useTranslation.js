import { useCallback } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import translations from './translations'

/**
 * Hook that returns a `t(key, fallback?)` function.
 * - If key exists in translations, returns the value for the current language.
 * - Falls back to English, then to the provided fallback, then to the key itself.
 */
export function useTranslation() {
  const language = useSettingsStore((s) => s.language)

  const t = useCallback(
    (key, fallback) => {
      const entry = translations[key]
      if (!entry) return fallback ?? key
      return entry[language] ?? entry.en ?? fallback ?? key
    },
    [language]
  )

  return { t, language }
}
