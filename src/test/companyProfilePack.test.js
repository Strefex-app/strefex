import { describe, it, expect } from 'vitest'
import { PROFILE_ATTACHMENT_SLOT } from '../constants/companyProfileDirectory'
import {
  companyPackSummary,
  pickLatestForSlot,
  replacePackSlot,
} from '../utils/companyProfilePack'

describe('companyProfilePack', () => {
  it('keeps the latest file per pack slot', () => {
    const list = [
      { path: 'a/old.pdf', name: 'old.pdf', profile_slot: PROFILE_ATTACHMENT_SLOT.COMPANY_PRESENTATION },
      { path: 'a/new.pdf', name: 'new.pdf', profile_slot: PROFILE_ATTACHMENT_SLOT.COMPANY_PRESENTATION },
    ]
    expect(pickLatestForSlot(list, PROFILE_ATTACHMENT_SLOT.COMPANY_PRESENTATION).name).toBe('new.pdf')
    const next = replacePackSlot(list, PROFILE_ATTACHMENT_SLOT.COMPANY_PRESENTATION, {
      path: 'a/deck.pdf',
      name: 'deck.pdf',
    })
    expect(next).toHaveLength(1)
    expect(next[0].name).toBe('deck.pdf')
  })

  it('summarizes presentation, profile, and portfolio', () => {
    const summary = companyPackSummary([
      { path: 'p/deck.pdf', name: 'deck.pdf', profile_slot: PROFILE_ATTACHMENT_SLOT.COMPANY_PRESENTATION },
      { path: 'p/port.pdf', name: 'port.pdf', profile_slot: PROFILE_ATTACHMENT_SLOT.PRODUCT_PORTFOLIO_DOC },
    ])
    expect(summary.hasPresentation).toBe(true)
    expect(summary.hasProfile).toBe(false)
    expect(summary.hasPortfolio).toBe(true)
    expect(summary.items[0].path).toBeUndefined()
    expect(summary.hasCatalogue).toBe(false)
  })

  it('lists catalogue preview frames without treating them as source files', () => {
    const summary = companyPackSummary([
      { path: 'c/1.jpg', name: '1.jpg', profile_slot: PROFILE_ATTACHMENT_SLOT.PACK_CATALOGUE, pack_source_slot: PROFILE_ATTACHMENT_SLOT.COMPANY_PRESENTATION, page: 1 },
    ])
    expect(summary.hasCatalogue).toBe(true)
    expect(summary.catalogue).toHaveLength(1)
    expect(summary.hasPresentation).toBe(false)
  })
})
