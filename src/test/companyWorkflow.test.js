import { describe, it, expect } from 'vitest'
import {
  evaluateChain,
  listCompanyWorkflowInstances,
  nextPeopleStepsForDepartment,
} from '../utils/companyWorkflowCompute'
import { hrCanon } from '../data/companyWorkflows'
import { searchCompanyRecords } from '../utils/companySearch'

describe('people-hire chain', () => {
  it('stays on onboarding after hire until checklist tasks are done', () => {
    const employee = { id: 'e1', name: 'Ada', department: 'Quality' }
    const ctx = {
      employees: [employee],
      onboardingTasks: [{ employeeId: 'e1', done: false, title: 'Induction' }],
      trainingRecords: [{ employeeId: 'e1', status: 'Planned' }],
      ratings: { 'e1-0': 1 },
      qualificationNames: ['Welding'],
      goals: [],
      dialogues: [],
      hrDocuments: [{ employeeId: 'e1', name: 'CV' }],
    }
    const progress = evaluateChain('people-hire', ctx, employee)
    expect(progress.steps.find((s) => s.id === 'hired').done).toBe(true)
    expect(progress.steps.find((s) => s.id === 'onboarding').done).toBe(false)
    expect(progress.steps[progress.currentIndex].id).toBe('onboarding')
    expect(progress.steps[progress.currentIndex].path).toContain(hrCanon('onboarding'))
    expect(progress.steps[progress.currentIndex].path).toContain('employeeId=e1')
  })

  it('treats org hiring as current while a role is open', () => {
    const ctx = {
      workforcePlans: [{ id: 'w1' }],
      openPositions: [{ id: 'p1', status: 'open', title: 'Welder' }],
      candidates: [],
      employees: [],
    }
    const progress = evaluateChain('people-hire', ctx)
    expect(progress.steps.find((s) => s.id === 'workforce').done).toBe(true)
    expect(progress.steps.find((s) => s.id === 'hiring').done).toBe(false)
    expect(progress.steps[progress.currentIndex].id).toBe('hiring')
  })

  it('lists incomplete employees on the department next-step rail', () => {
    const employee = { id: 'e1', name: 'Ada', department: 'Quality' }
    const ctx = {
      employees: [employee],
      onboardingTasks: [{ employeeId: 'e1', done: false }],
      trainingRecords: [],
      ratings: {},
      qualificationNames: [],
      goals: [],
      dialogues: [],
      hrDocuments: [],
    }
    const rows = nextPeopleStepsForDepartment('Quality', ctx)
    expect(rows).toHaveLength(1)
    expect(rows[0].label).toBe('Onboarding')
  })
})

describe('quality-contain chain', () => {
  it('keeps an NCR without 8D on the 8D step', () => {
    const ncr = { id: 'n1', number: 'NCR-1', lotIds: ['l1'], status: 'open' }
    const ctx = {
      lots: [{ id: 'l1' }],
      ncrs: [ncr],
      changes: [],
      documents: [],
      ppapPackages: [],
    }
    const progress = evaluateChain('quality-contain', ctx, ncr)
    expect(progress.steps.find((s) => s.id === 'lot').done).toBe(true)
    expect(progress.steps.find((s) => s.id === 'ncr').done).toBe(true)
    expect(progress.steps.find((s) => s.id === 'eightd').done).toBe(false)
    expect(progress.steps[progress.currentIndex].id).toBe('eightd')
  })
})

describe('open workflow instances', () => {
  it('includes incomplete hires and open positions', () => {
    const employee = { id: 'e1', name: 'Ada', department: 'Quality' }
    const rows = listCompanyWorkflowInstances({
      employees: [employee],
      onboardingTasks: [{ employeeId: 'e1', done: false }],
      trainingRecords: [],
      ratings: {},
      qualificationNames: [],
      goals: [],
      dialogues: [],
      hrDocuments: [],
      openPositions: [{ id: 'p1', status: 'open', title: 'Welder', department: 'Quality' }],
      ncrs: [],
      awards: [],
      processes: [],
      parts: [],
      documents: [],
      gauges: [],
      lots: [],
    })
    expect(rows.some((row) => row.id === 'hire-e1')).toBe(true)
    expect(rows.some((row) => row.id === 'pos-p1')).toBe(true)
  })
})

describe('company search workflows', () => {
  it('surfaces the company workflows hub', () => {
    const hits = searchCompanyRecords('onboarding', {})
    expect(hits.some((h) => h.kind === 'Workflow' && h.path.includes('/workflows'))).toBe(true)
  })
})
