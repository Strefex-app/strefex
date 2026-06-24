import { describe, it, expect } from 'vitest'
import {
  hasActiveRiskEscalation,
  computeEscalationLevel,
  computeMonitoringState,
  MONITORING_CADENCE,
} from './pmEscalation'

describe('pmEscalation', () => {
  const baseProject = {
    createdAt: '2026-01-01',
    portfolioRag: 'green',
    risks: [],
    monitoring: { baseCadence: MONITORING_CADENCE.MONTHLY },
  }

  it('defaults to monthly when no risks', () => {
    const state = computeMonitoringState(baseProject, new Date('2026-02-01'))
    expect(state.effectiveCadence).toBe(MONITORING_CADENCE.MONTHLY)
    expect(state.escalationLevel).toBe(0)
  })

  it('escalates to weekly when high severity risk is open', () => {
    const project = {
      ...baseProject,
      risks: [{ id: '1', title: 'Supply delay', severity: 'high', status: 'open' }],
    }
    expect(hasActiveRiskEscalation(project)).toBe(true)
    const state = computeMonitoringState(project, new Date('2026-02-01'))
    expect(state.effectiveCadence).toBe(MONITORING_CADENCE.WEEKLY)
    expect(state.escalationLevel).toBe(1)
  })

  it('level 2 when RAG is red', () => {
    const project = {
      ...baseProject,
      portfolioRag: 'red',
      risks: [{ id: '1', title: 'Budget', severity: 'medium', status: 'open' }],
    }
    expect(computeEscalationLevel(project)).toBe(2)
  })
})
