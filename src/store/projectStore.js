import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, getUserRole, tenantKey } from '../utils/tenantStorage'
import { filterByCompanyRole, canEdit as guardCanEdit } from '../utils/companyGuard'
import { applyMonitoringPatch, MONITORING_CADENCE } from '../utils/pmEscalation'
import {
  currentYear,
  formatStandaloneProjectNumber,
  nextSeqFromNumbers,
  standaloneProjectNumberPattern,
} from '../utils/pmNumbering'

import { devWarn } from '../utils/devLog'

function syncProjectsCloudNow() {
  if (typeof window === 'undefined') return
  import('../services/workspaceCloudSync').then((m) => {
    if (typeof m.notifyWorkspaceKeyDirty === 'function') {
      m.notifyWorkspaceKeyDirty('projects', true)
    }
  }).catch((err) => devWarn('workspace sync notify skipped', err))
}

// Helper to calculate duration in days
const calcDuration = (start, end) => {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Math.max(1, Math.ceil((e - s) / (24 * 60 * 60 * 1000)) + 1)
}

// Helper to calculate end date from start and duration
const calcEndDate = (start, durationDays) => {
  if (!start || !durationDays || durationDays < 1) return start
  const d = new Date(start)
  d.setDate(d.getDate() + durationDays - 1)
  return d.toISOString().slice(0, 10)
}

// Add days to a date string
const addDays = (dateStr, days) => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/* Seed data removed for production — projects start empty */

function defaultCostControl(budget = 0) {
  return {
    baselineBudget: budget,
    baselineLockedAt: null,
    baselineLockedBy: null,
    contingencyPct: 10,
    approvedChanges: 0,
    otherActuals: 0,
  }
}

function defaultMonitoring() {
  return {
    baseCadence: MONITORING_CADENCE.MONTHLY,
    effectiveCadence: MONITORING_CADENCE.MONTHLY,
    escalationLevel: 0,
    escalationReason: '',
    escalatedAt: null,
    lastReviewAt: null,
    nextReviewDue: null,
  }
}

function enrichProject(project, patch = {}) {
  const merged = { ...project, ...patch }
  return { ...merged, ...applyMonitoringPatch(merged) }
}

function isAdminRole() {
  const role = getUserRole()
  return role === 'admin' || role === 'superadmin'
}

export const useProjectStore = create(
  persist(
    (set, get) => ({
      projects: [],

      allocateNextProjectNumber: () => {
        const year = currentYear()
        const seq = nextSeqFromNumbers(get().projects, standaloneProjectNumberPattern, year, 'projectNumber')
        return formatStandaloneProjectNumber(year, seq)
      },

      addProject: (projectData) => {
        const id = 'proj-' + Date.now()
        const now = new Date().toISOString().slice(0, 10)
        const budget = projectData.budget || 0
        let projectNumber = projectData.projectNumber || ''

        if (!projectNumber) {
          projectNumber = get().allocateNextProjectNumber()
        }

        const base = {
          id,
          name: projectData.name || 'New Project',
          budget,
          currency: projectData.currency || 'USD',
          programId: null,
          projectNumber,
          stage: projectData.stage || 'charter',
          sponsor: projectData.sponsor || '',
          createdAt: now,
          createdBy: projectData.createdBy || getUserId(),
          _createdBy: getUserId(),
          tasks: [],
          revisions: [{ id: 'rev-' + Date.now(), date: now, note: 'Project created', snapshot: null }],
          resources: projectData.resources || [],
          portfolioRag: projectData.portfolioRag || 'green',
          tags: Array.isArray(projectData.tags) ? projectData.tags : [],
          benefitNote: projectData.benefitNote || '',
          kpis: Array.isArray(projectData.kpis) ? projectData.kpis : [],
          risks: Array.isArray(projectData.risks) ? projectData.risks : [],
          costControl: projectData.costControl || defaultCostControl(budget),
          monitoring: projectData.monitoring || defaultMonitoring(),
          links: {
            opportunityIds: [],
            quotationIds: [],
            procurementIds: [],
            contractIds: [],
            ...(projectData.links || {}),
          },
        }
        const newProject = enrichProject(base)
        set((state) => ({ projects: [...state.projects, newProject] }))
        syncProjectsCloudNow()
        return id
      },

      updateProject: (projectId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p
            const merged = { ...p, ...updates }
            if (updates.risks || updates.portfolioRag) {
              return enrichProject(merged)
            }
            return merged
          }),
        }))
        syncProjectsCloudNow()
      },

      appendProjectLink: (projectId, field, entityId) => {
        if (!projectId || !entityId) return
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return
        const current = project.links?.[field] || []
        if (current.includes(entityId)) return
        get().updateProject(projectId, {
          links: {
            ...(project.links || {}),
            [field]: [...current, entityId],
          },
        })
      },

      lockCostBaseline: (projectId) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return false
        const now = new Date().toISOString().slice(0, 10)
        const baseline = project.costControl?.baselineBudget ?? project.budget ?? 0
        get().updateProject(projectId, {
          stage: project.stage === 'charter' || project.stage === 'idea' ? 'baseline' : project.stage,
          costControl: {
            ...(project.costControl || defaultCostControl(baseline)),
            baselineBudget: baseline,
            baselineLockedAt: now,
            baselineLockedBy: getUserId(),
          },
        })
        return true
      },

      unlockCostBaseline: (projectId) => {
        if (!isAdminRole()) return false
        const project = get().projects.find((p) => p.id === projectId)
        if (!project?.costControl?.baselineLockedAt) return false
        get().updateProject(projectId, {
          costControl: {
            ...(project.costControl || {}),
            baselineLockedAt: null,
            baselineLockedBy: null,
          },
        })
        return true
      },

      recordProjectReview: (projectId) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return false
        const now = new Date().toISOString().slice(0, 10)
        const patched = enrichProject({
          ...project,
          monitoring: { ...(project.monitoring || {}), lastReviewAt: now },
        })
        get().updateProject(projectId, { monitoring: patched.monitoring })
        return true
      },

      deleteProject: (projectId) => {
        set((state) => ({ projects: state.projects.filter((p) => p.id !== projectId) }))
        syncProjectsCloudNow()
      },

      addTask: (projectId, task) => {
        const startDate = task.startDate || new Date().toISOString().slice(0, 10)
        const endDate = task.duration
          ? calcEndDate(startDate, task.duration)
          : (task.endDate || startDate)
        const newTask = {
          id: 't' + Date.now(),
          name: task.name || 'New Task',
          startDate,
          endDate,
          baselineStart: startDate,
          baselineEnd: endDate,
          progressPercent: task.progressPercent ?? 0,
          status: task.status || 'not-started',
          assignee: task.assignee || '',
          cost: task.cost ?? 0,
          predecessors: task.predecessors || [],
          children: task.children,
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, tasks: [...(p.tasks || []), newTask] } : p
          ),
        }))
        syncProjectsCloudNow()
        return newTask.id
      },

      updateTask: (projectId, taskId, updates) => {
        if (typeof updates.progressPercent === 'number') {
          if (updates.progressPercent >= 100) updates.status = 'complete'
          else if (updates.progressPercent > 0) updates.status = 'in-progress'
          else updates.status = 'not-started'
        }
        if (updates.duration && updates.startDate) {
          updates.endDate = calcEndDate(updates.startDate, updates.duration)
        }
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p
            const mapTask = (t) =>
              t.id === taskId ? { ...t, ...updates } : { ...t, children: t.children?.map(mapTask) }
            return { ...p, tasks: (p.tasks || []).map(mapTask) }
          }),
        }))
        syncProjectsCloudNow()
      },

      deleteTask: (projectId, taskId) => {
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p
            return {
              ...p,
              tasks: (p.tasks || [])
                .filter((t) => t.id !== taskId)
                .map((t) => ({ ...t, children: t.children?.filter((c) => c.id !== taskId) })),
            }
          }),
        }))
        syncProjectsCloudNow()
      },

      addResource: (projectId, resourceName) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, resources: [...new Set([...(p.resources || []), resourceName])] }
              : p
          ),
        }))
        syncProjectsCloudNow()
      },

      removeResource: (projectId, resourceName) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, resources: (p.resources || []).filter((r) => r !== resourceName) }
              : p
          ),
        }))
        syncProjectsCloudNow()
      },

      saveRevision: (projectId, note) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return
        const snapshot = JSON.parse(JSON.stringify(project.tasks))
        const revision = {
          id: 'rev-' + Date.now(),
          date: new Date().toISOString().slice(0, 10),
          note: note || 'Revision saved',
          snapshot,
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, revisions: [...(p.revisions || []), revision] } : p
          ),
        }))
        syncProjectsCloudNow()
        return revision.id
      },

      deleteRevision: (projectId, revisionId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, revisions: (p.revisions || []).filter((r) => r.id !== revisionId) }
              : p
          ),
        }))
        syncProjectsCloudNow()
      },

      setBaseline: (projectId) => {
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p
            const setBl = (tasks) =>
              (tasks || []).map((t) => ({
                ...t,
                baselineStart: t.startDate,
                baselineEnd: t.endDate,
                children: t.children ? setBl(t.children) : undefined,
              }))
            return { ...p, tasks: setBl(p.tasks) }
          }),
        }))
        syncProjectsCloudNow()
      },

      restoreRevision: (projectId, revisionId) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return
        const revision = project.revisions?.find((r) => r.id === revisionId)
        if (!revision || !revision.snapshot) return
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, tasks: JSON.parse(JSON.stringify(revision.snapshot)) } : p
          ),
        }))
        syncProjectsCloudNow()
      },

      getSafeProjects: () => filterByCompanyRole(get().projects, { creatorField: 'createdBy' }),

      canEditProject: () => guardCanEdit(),

      getProjectById: (id) => get().projects.find((p) => p.id === id),

      getProjectStats: (projectId) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return null
        const flatTasks = []
        const flatten = (tasks) => {
          (tasks || []).forEach((t) => { flatTasks.push(t); if (t.children) flatten(t.children) })
        }
        flatten(project.tasks)
        const totalTasks = flatTasks.length
        const completedTasks = flatTasks.filter((t) => t.status === 'complete').length
        const inProgressTasks = flatTasks.filter((t) => t.status === 'in-progress').length
        const totalCost = flatTasks.reduce((sum, t) => sum + (t.cost || 0), 0)
        const avgProgress = totalTasks > 0
          ? Math.round(flatTasks.reduce((sum, t) => sum + (t.progressPercent || 0), 0) / totalTasks)
          : 0
        const risks = project.risks || []
        const openRisks = risks.filter((r) => r && r.status !== 'closed' && r.status !== 'mitigated').length
        const escalatedRisks = risks.filter((r) => r && r.escalated && r.status !== 'closed').length
        return {
          totalTasks, completedTasks, inProgressTasks,
          notStartedTasks: totalTasks - completedTasks - inProgressTasks,
          totalCost, budget: project.budget || 0,
          budgetRemaining: (project.budget || 0) - totalCost,
          avgProgress,
          openRisks,
          escalatedRisks,
        }
      },

      calcDuration,
      calcEndDate,
      addDays,
    }),
    {
      name: 'project-storage',
      storage: createTenantStorage(),
      partialize: (state) => ({ projects: state.projects }),
    }
  )
)

if (typeof window !== 'undefined') {
  const starterMarkerKey = tenantKey('strefex-launch-starter-project-v1')
  if (!localStorage.getItem(starterMarkerKey)) {
    const state = useProjectStore.getState()
    if (!Array.isArray(state.projects) || state.projects.length === 0) {
      const today = new Date().toISOString().slice(0, 10)
      useProjectStore.setState({
        projects: [
          {
            id: 'proj-starter-001',
            name: 'Starter Launch Project',
            budget: 50000,
            currency: 'USD',
            createdAt: today,
            createdBy: 'admin',
            _createdBy: getUserId(),
            resources: [],
            revisions: [{ id: 'rev-starter-001', date: today, note: 'Starter project created', snapshot: null }],
            portfolioRag: 'green',
            tags: ['onboarding', 'pilot'],
            benefitNote: 'Reduce time-to-first RFQ for the tenant.',
            kpis: [
              { id: 'kpi-starter-1', name: 'Suppliers shortlisted', target: 10, current: 0, unit: 'count' },
            ],
            risks: [],
            tasks: [
              {
                id: 'task-starter-001',
                name: 'Prepare Supplier Onboarding',
                startDate: today,
                endDate: today,
                baselineStart: today,
                baselineEnd: today,
                progressPercent: 0,
                status: 'not-started',
                assignee: '',
                cost: 0,
                predecessors: [],
                children: [],
              },
            ],
          },
        ],
      })
    }
    localStorage.setItem(starterMarkerKey, '1')
  }
}
