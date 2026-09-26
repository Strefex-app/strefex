const LABEL_OVERRIDES = {
  'oil-gas': 'Oil & Gas',
}

/** Title-case a slug or free-text label for UI (automotive → Automotive, raw-materials → Raw Materials). */
export function formatDisplayLabel(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const override = LABEL_OVERRIDES[raw.toLocaleLowerCase()]
  if (override) return override
  return raw
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .map((word) => {
      if (!word) return word
      if (word === word.toUpperCase() && /[A-Z]/.test(word) && word.length <= 5) return word
      return word.charAt(0).toLocaleUpperCase() + word.slice(1)
    })
    .join(' ')
}

export function normalizeLabelKey(value) {
  return formatDisplayLabel(value).toLocaleLowerCase()
}
