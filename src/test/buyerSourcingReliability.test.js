import { describe, it, expect } from 'vitest'
import {
  coverageStats,
  enhanceSupplierReliability,
  inferReliabilityFromSupplier,
  scoreReliabilityCard,
} from '../utils/buyerSourcingReliability'
import { execSummaryRowToCardRow } from '../utils/buyerWorkspaceSuppliers'
import {
  getIndustryQualityProfile,
  inferStandardsFromCerts,
  industryPlantFolderSeed,
  matchesIndustryPrimaryStandard,
} from '../data/industryQualityProfiles'

describe('buyer sourcing reliability', () => {
  it('infers automotive standards from directory certifications', () => {
    const card = inferReliabilityFromSupplier({
      display_name: 'Auto Parts Co',
      certifications: ['ISO 9001', 'IATF 16949'],
    }, 'automotive')
    expect(card?.standards?.iatf_16949?.valid).toBe(true)
    expect(scoreReliabilityCard(card, 'automotive')).toBeGreaterThanOrEqual(60)
  })

  it('infers medical standards from directory certifications', () => {
    const card = inferReliabilityFromSupplier({
      display_name: 'MedDevice GmbH',
      certifications: ['ISO 13485', 'FDA'],
    }, 'medical')
    expect(card?.standards?.iso_13485?.valid).toBe(true)
    expect(card?.standards?.fda?.valid).toBe(true)
    expect(matchesIndustryPrimaryStandard(card, 'medical')).toBe(true)
    expect(scoreReliabilityCard(card, 'medical')).toBeGreaterThanOrEqual(60)
  })

  it('passes certifications through exec summary card rows', () => {
    const row = execSummaryRowToCardRow({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Precision Motors Ltd',
      country: 'DE',
      certifications: ['IATF 16949', 'ISO 9001'],
      rating: 4.2,
      riskLevel: 30,
      industries: ['automotive'],
      categories: ['stamping'],
    }, 'automotive')
    const enhanced = enhanceSupplierReliability(row, 'automotive')
    expect(enhanced.reliabilityCard?.standards?.iatf_16949?.valid).toBe(true)
    expect(enhanced.reliabilityScore).toBeGreaterThanOrEqual(60)
  })

  it('reports coverage above legacy published-only baseline for medical', () => {
    const list = [
      enhanceSupplierReliability({ id: '1', display_name: 'No certs' }, 'medical'),
      enhanceSupplierReliability({
        id: '2',
        display_name: 'Med supplier',
        certifications: ['ISO 13485'],
      }, 'medical'),
      enhanceSupplierReliability({
        id: '3',
        display_name: 'Regulated supplier',
        certifications: ['ISO 13485', 'FDA', 'CE'],
      }, 'medical'),
    ]
    const stats = coverageStats(list, 'medical')
    expect(stats.percent).toBeGreaterThan(45)
    expect(stats.withPrimary).toBe(2)
    expect(stats.primaryStandardLabel).toBe('ISO 13485')
  })
})

describe('industry quality profiles', () => {
  it('switches primary standard by industry', () => {
    expect(getIndustryQualityProfile('automotive').primaryStandardId).toBe('iatf_16949')
    expect(getIndustryQualityProfile('medical').primaryStandardId).toBe('iso_13485')
  })

  it('seeds medical plant folders', () => {
    const folders = industryPlantFolderSeed('medical')
    expect(folders.some((row) => row.id === 'folder-08-dhf')).toBe(true)
    expect(folders.some((row) => row.id === 'folder-09-validation')).toBe(true)
  })

  it('detects ISO 13485 in certification strings', () => {
    const standards = inferStandardsFromCerts(['ISO 13485', 'CE'], 'medical')
    expect(standards.iso_13485.valid).toBe(true)
    expect(standards.ce_mark.valid).toBe(true)
  })
})
