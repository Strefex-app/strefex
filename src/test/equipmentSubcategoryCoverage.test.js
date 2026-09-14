import { describe, expect, it } from 'vitest'
import { EQUIPMENT_CATEGORIES_BY_INDUSTRY } from '../data/equipmentCategoriesByIndustry'
import {
  EQUIPMENT_BY_INDUSTRY_CATEGORY,
  getEquipmentCategoryTreeForIndustry,
} from '../data/equipmentByIndustryCategory'

describe('equipment subcategory coverage', () => {
  it('gives every industry equipment category related subcategories', () => {
    const missing = []
    const thin = []
    Object.entries(EQUIPMENT_CATEGORIES_BY_INDUSTRY).forEach(([industryId, cats]) => {
      const tree = getEquipmentCategoryTreeForIndustry(industryId)
      cats.forEach((cat) => {
        const node = tree.find((c) => c.id === cat.id)
        const n = node?.subcategories?.length || 0
        if (!n) missing.push(`${industryId}/${cat.id}`)
        else if (n < 4) thin.push(`${industryId}/${cat.id} (${n})`)
      })
    })
    expect(missing, `empty equipment subtrees: ${missing.join(', ')}`).toEqual([])
    expect(thin, `thin equipment subtrees: ${thin.join(', ')}`).toEqual([])
  })

  it('keeps unique subcategory ids', () => {
    const seen = new Map()
    const dupes = []
    Object.entries(EQUIPMENT_BY_INDUSTRY_CATEGORY).forEach(([k, items]) => {
      items.forEach((item) => {
        if (seen.has(item.id)) dupes.push(`${item.id} (${seen.get(item.id)} and ${k})`)
        else seen.set(item.id, k)
      })
    })
    expect(dupes, `duplicate ids: ${dupes.join(', ')}`).toEqual([])
  })
})
