import { describe, it, expect } from 'vitest'
import {
  itemMasterKey,
  buildItemMasterIndex,
  findCostProductForPart,
  findIatfPartForProduct,
  costProductDraftFromPart,
} from '../utils/itemMaster'

describe('item master', () => {
  it('normalizes keys across spacing and case', () => {
    expect(itemMasterKey(' ab-12 ')).toBe('AB-12')
    expect(itemMasterKey('ab 12')).toBe('AB12')
  })

  it('links IATF parts to cost products by part number / SKU', () => {
    const parts = [{ id: 'p1', partNumber: 'PN-100', name: 'Bracket' }]
    const products = [{ id: 'c1', sku: 'pn-100', name: 'Bracket cost' }]
    const index = buildItemMasterIndex({ parts, products })
    expect(index).toHaveLength(1)
    expect(index[0].part?.id).toBe('p1')
    expect(index[0].product?.id).toBe('c1')
    expect(findCostProductForPart(parts[0], products)?.id).toBe('c1')
    expect(findIatfPartForProduct(products[0], parts)?.id).toBe('p1')
  })

  it('drafts a cost product from an IATF part', () => {
    const draft = costProductDraftFromPart({ id: 'p9', partNumber: 'HX-1', name: 'Housing', revision: 'B' })
    expect(draft.sku).toBe('HX-1')
    expect(draft.iatfPartId).toBe('p9')
    expect(draft.version).toBe('B')
  })
})
