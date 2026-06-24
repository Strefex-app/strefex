import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, tenantKey } from '../utils/tenantStorage'
import { devWarn } from '../utils/devLog'
import {
  currentYear,
  formatProgramNumber,
  formatProjectNumber,
  nextSeqFromNumbers,
  programNumberPattern,
} from '../utils/pmNumbering'

function syncProgramsCloudNow() {
  if (typeof window === 'undefined') return
  import('../services/workspaceCloudSync').then((m) => {
    if (typeof m.notifyWorkspaceKeyDirty === 'function') {
      m.notifyWorkspaceKeyDirty('programs', true)
    }
  }).catch((err) => devWarn('programs sync notify skipped', err))
}

function worstRag(projects) {
  const order = { red: 3, amber: 2, green: 1 }
  let worst = 'green'
  ;(projects || []).forEach((p) => {
    const r = String(p.portfolioRag || 'green').toLowerCase()
    if ((order[r] || 0) > (order[worst] || 0)) worst = r
  })
  return worst
}

export const useProgramStore = create(
  persist(
    (set, get) => ({
      programs: [],

      getProgramById: (id) => get().programs.find((p) => p.id === id),

      getProgramsForProjects: (projectList) => {
        const ids = new Set((projectList || []).map((p) => p.programId).filter(Boolean))
        return get().programs.filter((g) => ids.has(g.id))
      },

      allocateNextProgramNumber: () => {
        const year = currentYear()
        const seq = nextSeqFromNumbers(get().programs, programNumberPattern, year)
        return formatProgramNumber(year, seq)
      },

      addProgram: (data) => {
        const id = `pgm-${Date.now()}`
        const now = new Date().toISOString().slice(0, 10)
        const programNumber = data.programNumber || get().allocateNextProgramNumber()
        const program = {
          id,
          programNumber,
          name: data.name || 'New Program',
          sponsor: data.sponsor || '',
          description: data.description || '',
          plannedStart: data.plannedStart || now,
          plannedEnd: data.plannedEnd || '',
          budgetTarget: data.budgetTarget ?? null,
          currency: data.currency || 'USD',
          stage: data.stage || 'active',
          createdAt: now,
          createdBy: data.createdBy || getUserId(),
          _createdBy: getUserId(),
          nextProjectSeq: 1,
        }
        set((s) => ({ programs: [...s.programs, program] }))
        syncProgramsCloudNow()
        return id
      },

      updateProgram: (programId, updates) => {
        set((s) => ({
          programs: s.programs.map((p) => (p.id === programId ? { ...p, ...updates } : p)),
        }))
        syncProgramsCloudNow()
      },

      allocateNextProjectNumber: (programId) => {
        const program = get().getProgramById(programId)
        if (!program) return null
        const seq = program.nextProjectSeq || 1
        const projectNumber = formatProjectNumber(program.programNumber, seq)
        set((s) => ({
          programs: s.programs.map((p) =>
            p.id === programId ? { ...p, nextProjectSeq: seq + 1 } : p,
          ),
        }))
        syncProgramsCloudNow()
        return projectNumber
      },

      getProgramRollup: (programId, projects = []) => {
        const program = get().getProgramById(programId)
        const children = (projects || []).filter((p) => p.programId === programId)
        const sumBaseline = children.reduce(
          (s, p) => s + (p.costControl?.baselineBudget ?? p.budget ?? 0),
          0,
        )
        const sumSpent = children.reduce((s, p) => {
          const flat = []
          const walk = (tasks) => {
            ;(tasks || []).forEach((t) => {
              flat.push(t)
              if (t.children?.length) walk(t.children)
            })
          }
          walk(p.tasks)
          return s + flat.reduce((a, t) => a + (t.cost || 0), 0)
        }, 0)
        return {
          program,
          projectCount: children.length,
          activeCount: children.filter((p) => p.stage !== 'closed').length,
          sumBaseline,
          sumSpent,
          programRag: worstRag(children),
          projects: children,
        }
      },
    }),
    {
      name: 'program-storage',
      storage: createTenantStorage(),
      partialize: (state) => ({ programs: state.programs }),
    },
  ),
)

/** One-time migration: attach orphan projects to PGM-LEGACY-001 */
export function ensureLegacyProgramForOrphanProjects() {
  if (typeof window === 'undefined') return
  const marker = tenantKey('strefex-pm-program-migration-v1')
  if (localStorage.getItem(marker)) return

  import('./projectStore').then(({ useProjectStore }) => {
    const projects = useProjectStore.getState().projects || []
    const orphans = projects.filter((p) => !p.programId)
    if (orphans.length === 0) {
      localStorage.setItem(marker, '1')
      return
    }
    const { addProgram, allocateNextProjectNumber } = useProgramStore.getState()
    const legacyId = addProgram({
      name: 'Legacy projects',
      programNumber: 'PGM-LEGACY-001',
      stage: 'active',
      description: 'Auto-created for projects that existed before program numbering.',
    })
    orphans.forEach((p) => {
      const projectNumber = allocateNextProjectNumber(legacyId)
      useProjectStore.getState().updateProject(p.id, {
        programId: legacyId,
        projectNumber,
        stage: p.stage || 'execute',
        monitoring: p.monitoring || { baseCadence: 'monthly' },
      })
    })
    localStorage.setItem(marker, '1')
  }).catch((err) => devWarn('program migration skipped', err))
}

if (typeof window !== 'undefined') {
  queueMicrotask(() => ensureLegacyProgramForOrphanProjects())
}
