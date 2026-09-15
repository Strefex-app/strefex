import { describe, it, expect } from 'vitest'
import {
  emptySourcingMetricsForm,
  parseSourcingMetricsForm,
  sourcingMetricsFormFromSource,
  sourcingMetricsRegistryPatch,
  flattenSourcingMetricsFromAccount,
  mergeSourcingMetricsIntoMetadata,
  SOURCING_METRIC_QUESTIONNAIRE_NUMBER_FIELDS,
  SOURCING_METRIC_QUESTIONNAIRE_TEXT_FIELDS,
} from '../utils/sourcingMetrics'

describe('sourcingMetrics', () => {
  it('parses form numbers and lists', () => {
    const parsed = parseSourcingMetricsForm({
      ...emptySourcingMetricsForm(),
      fitLevel: '88',
      riskLevel: '',
      annualSpend: '12.5',
      languages: 'EN, DE',
      certificationsText: 'IATF 16949, ISO 9001',
      financialGrade: 'A',
    })
    expect(parsed.fitLevel).toBe(88)
    expect(parsed.riskLevel).toBeNull()
    expect(parsed.annualSpend).toBe(12.5)
    expect(parsed.languages).toEqual(['EN', 'DE'])
    expect(parsed.certifications).toEqual(['IATF 16949', 'ISO 9001'])
    expect(parsed.financialGrade).toBe('A')
  })

  it('hydrates from nested metadata and flat registry', () => {
    const form = sourcingMetricsFormFromSource({
      metadata: { sourcing_metrics: { fitLevel: 70, languages: ['EN'] } },
    }, { riskLevel: 22, employees: 100 })
    expect(form.fitLevel).toBe('70')
    expect(form.riskLevel).toBe('22')
    expect(form.employees).toBe('100')
    expect(form.languages).toBe('EN')
  })

  it('flattens nested metrics for mappers', () => {
    const flat = flattenSourcingMetricsFromAccount({
      company: 'Acme',
      metadata: { sourcing_metrics: { fitLevel: 91, onTimePct: 97 } },
    })
    expect(flat.fitLevel).toBe(91)
    expect(flat.onTimePct).toBe(97)
    expect(flat.company).toBe('Acme')
  })

  it('writes registry patch aliases', () => {
    const patch = sourcingMetricsRegistryPatch(parseSourcingMetricsForm({
      ...emptySourcingMetricsForm(),
      fitLevel: '80',
      tariffRegime: 'None',
      auditDueDays: '-3',
    }))
    expect(patch.fitLevel).toBe(80)
    expect(patch.tariff).toBe('None')
    expect(patch.auditIn).toBe(-3)
  })

  it('limits the questionnaire to purchasing supplier facts', () => {
    expect(SOURCING_METRIC_QUESTIONNAIRE_NUMBER_FIELDS.map((f) => f.key)).toEqual([
      'leadTimeDays',
      'quoteTurnDays',
      'capacityLevel',
      'onTimePct',
      'qualityPpm',
      'employees',
    ])
    expect(SOURCING_METRIC_QUESTIONNAIRE_TEXT_FIELDS.map((f) => f.key)).toEqual([
      'certificationsText',
    ])
  })

  it('merges metadata blob', () => {
    const md = mergeSourcingMetricsIntoMetadata({ industries: ['automotive'] }, parseSourcingMetricsForm({
      ...emptySourcingMetricsForm(),
      capacityLevel: '75',
    }))
    expect(md.industries).toEqual(['automotive'])
    expect(md.sourcing_metrics.capacityLevel).toBe(75)
  })
})
