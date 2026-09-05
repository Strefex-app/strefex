import { getWorkflowChain } from '../data/companyWorkflows'

function ratingsFor(employeeId, ratings = {}, qualCount = 0) {
  const values = []
  for (let i = 0; i < qualCount; i += 1) {
    const v = ratings[`${employeeId}-${i}`]
    if (v != null) values.push(Number(v) || 0)
  }
  return values
}

export function peopleHireDone(stepId, employee, ctx = {}) {
  const employeeId = employee?.id
  const tasks = (ctx.onboardingTasks || []).filter((row) => row.employeeId === employeeId)
  const training = (ctx.trainingRecords || []).filter((row) => row.employeeId === employeeId)
  const goals = (ctx.goals || []).filter((row) => row.employeeId === employeeId)
  const dialogues = (ctx.dialogues || []).filter((row) => row.employeeId === employeeId)
  const docs = (ctx.hrDocuments || []).filter((row) => row.employeeId === employeeId)
  const quals = ratingsFor(employeeId, ctx.ratings, (ctx.qualificationNames || []).length)

  switch (stepId) {
    case 'workforce':
      return Boolean(employeeId)
    case 'hiring':
      return Boolean(employeeId)
    case 'hired':
      return Boolean(employeeId)
    case 'onboarding':
      return tasks.length > 0 && tasks.every((row) => row.done)
    case 'qualification':
      return quals.some((n) => n > 1)
    case 'training':
      return training.some((row) => row.status === 'Valid' || row.completedDate)
    case 'goals':
      return goals.length > 0
    case 'dialogue':
      return dialogues.length > 0
    case 'hr-docs':
      return docs.length > 0
    case 'department':
      return Boolean(employee?.department)
    default:
      return false
  }
}

export function orgPeopleHireDone(stepId, ctx = {}) {
  switch (stepId) {
    case 'workforce':
      return (ctx.workforcePlans || []).length > 0
    case 'hiring': {
      const open = (ctx.openPositions || []).some((row) => row.status === 'open')
      const pipeline = (ctx.candidates || []).some((row) => row.status !== 'hired')
      if (open || pipeline) return false
      return (ctx.employees || []).length > 0
    }
    case 'hired':
      return (ctx.employees || []).length > 0
    case 'onboarding':
      return (ctx.employees || []).some((emp) => peopleHireDone('onboarding', emp, ctx))
    case 'qualification':
      return (ctx.employees || []).some((emp) => peopleHireDone('qualification', emp, ctx))
    case 'training':
      return (ctx.employees || []).some((emp) => peopleHireDone('training', emp, ctx))
    case 'goals':
      return (ctx.employees || []).some((emp) => peopleHireDone('goals', emp, ctx))
    case 'dialogue':
      return (ctx.employees || []).some((emp) => peopleHireDone('dialogue', emp, ctx))
    case 'hr-docs':
      return (ctx.hrDocuments || []).length > 0
    case 'department':
      return (ctx.employees || []).some((emp) => emp.department)
    default:
      return false
  }
}

export function qualityContainDone(stepId, ncr, ctx = {}) {
  const lots = ctx.lots || []
  const changes = ctx.changes || []
  const documents = ctx.documents || []
  const packages = ctx.ppapPackages || []
  const ncrLots = lots.filter((lot) => (ncr.lotIds || []).includes(lot.id))
  switch (stepId) {
    case 'lot':
      return ncrLots.length > 0
    case 'ncr':
      return Boolean(ncr?.id)
    case 'eightd':
      return Boolean(ncr?.eightDRecordId)
    case 'change':
      return changes.some((row) => ncr.partId && row.partId === ncr.partId)
    case 'document':
      return documents.some((doc) => (
        (ncr.partId && doc.partId === ncr.partId)
        || (ncr.department && doc.department === ncr.department)
      ) && (doc.status === 'approved' || doc.changeFlag))
    case 'ppap':
      return packages.some((pkg) => ncr.partId && pkg.partId === ncr.partId)
    case 'department':
      return Boolean(ncr?.department || ncrLots.some((lot) => lot.department))
    default:
      return false
  }
}

export function sourcingAwardDone(stepId, award = {}) {
  switch (stepId) {
    case 'rfq':
      return Boolean(award.rfqId)
    case 'award':
      return Boolean(award.id || award.awardedAt)
    case 'project':
      return Boolean(award.projectId)
    case 'po':
      return Boolean(award.poId)
    case 'binder':
      return Boolean(award.id)
    case 'ppap':
      return Boolean(award.partId)
    default:
      return false
  }
}

export function productionReleaseDone(stepId, ctx = {}) {
  const processes = ctx.processes || []
  const parts = ctx.parts || []
  const documents = ctx.documents || []
  const gauges = ctx.gauges || []
  const lots = ctx.lots || []
  switch (stepId) {
    case 'process':
      return processes.length > 0
    case 'part':
      return parts.length > 0
    case 'wi':
      return documents.some((doc) => doc.type === 'work_instruction' && doc.status === 'approved')
    case 'gauge':
      return gauges.length > 0
    case 'lot':
      return lots.some((lot) => lot.status === 'released' || lot.status === 'shipped')
    default:
      return false
  }
}

export function evaluateChain(chainId, ctx = {}, subject) {
  const chain = getWorkflowChain(chainId)
  if (!chain) return null
  const pathCtx = {
    employeeId: subject?.id || ctx.employeeId,
    department: subject?.department || ctx.department,
    eightDRecordId: subject?.eightDRecordId,
    rfqId: subject?.rfqId,
    projectId: subject?.projectId,
    partId: subject?.partId,
  }
  const doneFn = {
    'people-hire': (stepId) => (
      subject?.id ? peopleHireDone(stepId, subject, ctx) : orgPeopleHireDone(stepId, ctx)
    ),
    'quality-contain': (stepId) => qualityContainDone(stepId, subject || {}, ctx),
    'sourcing-award': (stepId) => sourcingAwardDone(stepId, subject || {}),
    'production-release': (stepId) => productionReleaseDone(stepId, ctx),
  }[chainId]
  const steps = chain.steps.map((step) => {
    const done = doneFn ? doneFn(step.id) : false
    return {
      id: step.id,
      label: step.label,
      path: typeof step.path === 'function' ? step.path(pathCtx) : step.path,
      done,
    }
  })
  const currentIndex = steps.findIndex((step) => !step.done)
  return {
    id: chain.id,
    label: chain.label,
    description: chain.description,
    clusterId: chain.clusterId,
    steps,
    currentIndex: currentIndex === -1 ? steps.length - 1 : currentIndex,
    complete: currentIndex === -1,
    doneCount: steps.filter((step) => step.done).length,
  }
}

export function listCompanyWorkflowInstances(ctx = {}) {
  const rows = []
  ;(ctx.employees || []).forEach((employee) => {
    const progress = evaluateChain('people-hire', ctx, employee)
    if (!progress || progress.complete) return
    const current = progress.steps[progress.currentIndex]
    rows.push({
      id: `hire-${employee.id}`,
      chainId: 'people-hire',
      title: employee.name,
      hint: `${employee.employeeNumber || employee.id} · ${current.label}`,
      path: current.path,
      doneCount: progress.doneCount,
      total: progress.steps.length,
    })
  })
  ;(ctx.openPositions || []).filter((row) => row.status === 'open').forEach((pos) => {
    rows.push({
      id: `pos-${pos.id}`,
      chainId: 'people-hire',
      title: pos.title,
      hint: `${pos.department || 'Hiring'} · open role`,
      path: getWorkflowChain('people-hire').steps.find((s) => s.id === 'hiring').path({}),
      doneCount: 1,
      total: getWorkflowChain('people-hire').steps.length,
    })
  })
  ;(ctx.ncrs || []).filter((ncr) => ncr.status !== 'closed').forEach((ncr) => {
    const progress = evaluateChain('quality-contain', ctx, ncr)
    if (!progress || progress.complete) return
    const current = progress.steps[progress.currentIndex]
    rows.push({
      id: `ncr-${ncr.id}`,
      chainId: 'quality-contain',
      title: ncr.number || ncr.id,
      hint: current.label,
      path: current.path,
      doneCount: progress.doneCount,
      total: progress.steps.length,
    })
  })
  ;(ctx.awards || []).forEach((award) => {
    const progress = evaluateChain('sourcing-award', ctx, award)
    if (!progress || progress.complete) return
    const current = progress.steps[progress.currentIndex]
    rows.push({
      id: `awd-${award.id}`,
      chainId: 'sourcing-award',
      title: award.title || award.buyerRef || award.rfqId,
      hint: current.label,
      path: current.path,
      doneCount: progress.doneCount,
      total: progress.steps.length,
    })
  })
  const plant = evaluateChain('production-release', ctx)
  if (plant && !plant.complete) {
    const current = plant.steps[plant.currentIndex]
    rows.push({
      id: 'plant-release',
      chainId: 'production-release',
      title: 'Process to lot release',
      hint: current.label,
      path: current.path,
      doneCount: plant.doneCount,
      total: plant.steps.length,
    })
  }
  return rows.slice(0, 16)
}

export function nextPeopleStepsForDepartment(department, ctx = {}) {
  return (ctx.employees || [])
    .filter((employee) => employee.department === department)
    .map((employee) => {
      const progress = evaluateChain('people-hire', ctx, employee)
      if (!progress || progress.complete) return null
      const current = progress.steps[progress.currentIndex]
      return {
        employeeId: employee.id,
        name: employee.name,
        label: current.label,
        path: current.path,
        doneCount: progress.doneCount,
        total: progress.steps.length,
      }
    })
    .filter(Boolean)
}

export function nextQualityStepsForDepartment(ncrs = [], ctx = {}) {
  return ncrs
    .map((ncr) => {
      const progress = evaluateChain('quality-contain', ctx, ncr)
      if (!progress || progress.complete) return null
      const current = progress.steps[progress.currentIndex]
      return {
        ncrId: ncr.id,
        title: ncr.number || ncr.id,
        label: current.label,
        path: current.path,
        doneCount: progress.doneCount,
        total: progress.steps.length,
      }
    })
    .filter(Boolean)
}
