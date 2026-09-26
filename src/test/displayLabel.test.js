import { describe, expect, it } from 'vitest'
import { formatDisplayLabel, normalizeLabelKey } from '../utils/displayLabel'

describe('formatDisplayLabel', () => {
  it('capitalises slugs and hyphenated categories', () => {
    expect(formatDisplayLabel('automotive')).toBe('Automotive')
    expect(formatDisplayLabel('raw-materials')).toBe('Raw Materials')
    expect(formatDisplayLabel('oil-gas')).toBe('Oil & Gas')
    expect(formatDisplayLabel('Uncategorized')).toBe('Uncategorized')
    expect(formatDisplayLabel('ISO')).toBe('ISO')
  })

  it('matches labels ignoring case and separators', () => {
    expect(normalizeLabelKey('raw-materials')).toBe(normalizeLabelKey('Raw Materials'))
  })
})
