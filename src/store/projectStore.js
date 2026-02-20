import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, getUserRole } from '../utils/tenantStorage'
import { filterByCompanyRole, canEdit as guardCanEdit } from '../utils/companyGuard'

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

export const useProjectStore = create(
  persist(
    (set, get) => ({
      projects: [],

      addProject: (projectData) => {
        const id = 'proj-' + Date.now()
        const now = new Date().toISOString().slice(0, 10)
        const newProject = {
          id,
          name: projectData.name || 'New Project',
          budget: projectData.budget || 0,
          currency: projectData.currency || 'USD',
          createdAt: now,
          createdBy: projectData.createdBy || getUserId(),
          _createdBy: getUserId(),
          tasks: [],
          revisions: [{ id: 'rev-' + Date.now(), date: now, note: 'Project created', snapshot: null }],
          resources: projectData.resources || [],
        }
        set((state) => ({ projects: [...state.projects, newProject] }))
        return id
      },

      updateProject: (projectId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) => p.id === projectId ? { ...p, ...updates } : p),
        }))
      },

      deleteProject: (projectId) => {
        set((state) => ({ projects: state.projects.filter((p) => p.id !== projectId) }))
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
      },

      addResource: (projectId, resourceName) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, resources: [...new Set([...(p.resources || []), resourceName])] }
              : p
          ),
        }))
      },

      removeResource: (projectId, resourceName) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, resources: (p.resources || []).filter((r) => r !== resourceName) }
              : p
          ),
        }))
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
        return {
          totalTasks, completedTasks, inProgressTasks,
          notStartedTasks: totalTasks - completedTasks - inProgressTasks,
          totalCost, budget: project.budget || 0,
          budgetRemaining: (project.budget || 0) - totalCost,
          avgProgress,
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
