import { useMemo } from 'react'
import useHrSpaceStore from '../store/hrSpaceStore'
import useIatfControlStore from '../store/iatfControlStore'
import useQualityExcellenceStore from '../store/qualityExcellenceStore'
import { evaluateChain, listCompanyWorkflowInstances } from '../utils/companyWorkflowCompute'

export function useCompanyWorkflowContext() {
  const employees = useHrSpaceStore((s) => s.employees)
  const workforcePlans = useHrSpaceStore((s) => s.workforcePlans)
  const openPositions = useHrSpaceStore((s) => s.openPositions)
  const candidates = useHrSpaceStore((s) => s.candidates)
  const onboardingTasks = useHrSpaceStore((s) => s.onboardingTasks)
  const trainingRecords = useHrSpaceStore((s) => s.trainingRecords)
  const goals = useHrSpaceStore((s) => s.goals)
  const dialogues = useHrSpaceStore((s) => s.dialogues)
  const hrDocuments = useHrSpaceStore((s) => s.hrDocuments)
  const ratings = useHrSpaceStore((s) => s.ratings)
  const qualificationNames = useHrSpaceStore((s) => s.qualificationNames)
  const lots = useIatfControlStore((s) => s.lots)
  const ncrs = useIatfControlStore((s) => s.ncrs)
  const documents = useIatfControlStore((s) => s.documents)
  const changes = useIatfControlStore((s) => s.changes)
  const ppapPackages = useIatfControlStore((s) => s.ppapPackages)
  const awards = useIatfControlStore((s) => s.awards)
  const processes = useIatfControlStore((s) => s.processes)
  const parts = useIatfControlStore((s) => s.parts)
  const gauges = useIatfControlStore((s) => s.gauges)
  const qeRecords = useQualityExcellenceStore((s) => s.records)

  return useMemo(() => ({
    employees,
    workforcePlans,
    openPositions,
    candidates,
    onboardingTasks,
    trainingRecords,
    goals,
    dialogues,
    hrDocuments,
    ratings,
    qualificationNames,
    lots,
    ncrs,
    documents,
    changes,
    ppapPackages,
    awards,
    processes,
    parts,
    gauges,
    qeRecords,
  }), [
    employees, workforcePlans, openPositions, candidates, onboardingTasks,
    trainingRecords, goals, dialogues, hrDocuments, ratings, qualificationNames,
    lots, ncrs, documents, changes, ppapPackages, awards, processes, parts, gauges, qeRecords,
  ])
}

export function useCompanyWorkflowProgress(chainId, subject) {
  const ctx = useCompanyWorkflowContext()
  return useMemo(() => evaluateChain(chainId, ctx, subject), [chainId, ctx, subject])
}

export function useCompanyWorkflowInstances() {
  const ctx = useCompanyWorkflowContext()
  return useMemo(() => listCompanyWorkflowInstances(ctx), [ctx])
}
