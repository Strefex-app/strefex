/**
 * HR Space — single source of truth for employees (employee numbers), all HR modules,
 * hiring (positions + candidates), and automatic seeding when an employee is created or hired.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage } from '../utils/tenantStorage'
import { scoreCvAgainstPosition } from '../utils/hrCvFitScore'
import { deleteCvFile, cloneCvFile } from '../utils/hrCvFileStorage'

/**
 * Talent pool entry (persisted in Zustand). Binary CV is in IndexedDB at cvStoredFileId.
 * @typedef {Object} TalentPoolEntry
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 * @property {string} cvFileName
 * @property {string} cvMimeType
 * @property {string|null} cvStoredFileId
 * @property {string} cvExtractedText
 * @property {string[]} industries — sectors / tags for future role matching
 * @property {string[]} matchedRoles — position titles this profile was associated with
 * @property {number|null} lastFitScore
 * @property {string[]} lastFitReasons
 * @property {string} notes
 * @property {string} createdAt ISO date
 * @property {string|null} [sourceCandidateId]
 */

export function formatEmployeeNumber(seq) {
  return `EMP-${String(seq).padStart(5, '0')}`
}

const ONBOARDING_TEMPLATE = [
  'IT access & accounts',
  'Safety orientation',
  'HR paperwork & handbook',
  'Team introduction',
  'Role-specific training plan',
  'Probation review schedule',
]

const QUALIFICATIONS_SEED = [
  'Machine Operation',
  'Quality Control',
  'Safety Procedures',
  'Lean Manufacturing',
  'Problem Solving',
  'Measurement Tools',
  'Documentation',
  'Team Leadership',
]

const DEPTS_SEED = ['Production', 'Quality', 'Maintenance', 'Assembly', 'Engineering']

const EMPLOYEES_SEED = [
  { id: 'e1', name: 'Martin Weber', role: 'CNC Operator', department: 'Production', email: 'martin.weber@company.local', status: 'active', hireDate: '2022-03-01' },
  { id: 'e2', name: 'Sarah Klein', role: 'Quality Inspector', department: 'Quality', email: 'sarah.klein@company.local', status: 'active', hireDate: '2021-06-15' },
  { id: 'e3', name: 'Thomas Müller', role: 'Maintenance Tech', department: 'Maintenance', email: 'thomas.m@company.local', status: 'active', hireDate: '2020-11-01' },
  { id: 'e4', name: 'Anna Fischer', role: 'Assembly Lead', department: 'Assembly', email: 'anna.fischer@company.local', status: 'active', hireDate: '2019-04-20' },
  { id: 'e5', name: 'Klaus Schmidt', role: 'Process Engineer', department: 'Engineering', email: 'klaus.s@company.local', status: 'active', hireDate: '2018-09-10' },
  { id: 'e6', name: 'Lisa Braun', role: 'Shift Supervisor', department: 'Production', email: 'lisa.braun@company.local', status: 'active', hireDate: '2017-02-28' },
  { id: 'e7', name: 'Peter Wagner', role: 'Welding Specialist', department: 'Production', email: 'peter.w@company.local', status: 'active', hireDate: '2023-01-09' },
  { id: 'e8', name: 'Maria Hoffmann', role: 'Lab Technician', department: 'Quality', email: 'maria.h@company.local', status: 'active', hireDate: '2022-08-22' },
]

function buildSeedRatings(employeeIds, qCount) {
  const ratings = {}
  employeeIds.forEach((eid) => {
    for (let q = 0; q < qCount; q += 1) {
      ratings[`${eid}-${q}`] = Math.floor(Math.random() * 5) + 1
    }
  })
  return ratings
}

const DIALOGUES_SEED = [
  {
    id: 'r1',
    employeeId: 'e1',
    employeeName: 'Martin Weber',
    reviewDate: '2025-01-15',
    reviewer: 'John Manager',
    status: 'Completed',
    overallRating: 4,
    type: 'Annual',
    performanceAssessment: { technical: 4, communication: 5, teamwork: 4, leadership: 3, problemSolving: 4 },
    strengths: 'Strong reliability and quality mindset.',
    areasForImprovement: 'Further leadership exposure.',
    goalsReview: ['Increase OEE by 5%'],
    developmentPlan: [{ action: 'Leadership workshop', timeline: 'Q2 2025' }],
    employeeFeedback: 'Thanks for the support.',
    managerComments: 'Solid performer.',
    employeeAcknowledged: true,
    managerSigned: true,
  },
  {
    id: 'r2',
    employeeId: 'e2',
    employeeName: 'Sarah Klein',
    reviewDate: '2025-02-01',
    reviewer: 'Sarah Director',
    status: 'In Progress',
    overallRating: 5,
    type: 'Mid-Year',
    performanceAssessment: { technical: 5, communication: 4, teamwork: 5, leadership: 4, problemSolving: 5 },
    strengths: 'Excellent inspection rigor.',
    areasForImprovement: 'Presentation skills.',
    goalsReview: ['Reduce defect rate below 0.5%'],
    developmentPlan: [{ action: 'Storytelling training', timeline: 'Q3 2025' }],
    employeeFeedback: '',
    managerComments: 'Top performer.',
    employeeAcknowledged: false,
    managerSigned: true,
  },
]

const GOALS_SEED = [
  { id: 'g1', employeeId: 'e1', title: 'Increase OEE by 5%', description: 'Focus on availability and quality metrics', category: 'Performance', targetDate: '2025-06-30', progress: 45, status: 'In Progress', priority: 'High' },
  { id: 'g2', employeeId: 'e1', title: 'Complete VDA 6.3 training', description: 'Internal auditor certification', category: 'Development', targetDate: '2025-04-15', progress: 80, status: 'In Progress', priority: 'Medium' },
  { id: 'g3', employeeId: 'e2', title: 'Zero recordable injuries', description: 'Maintain safety standards in work area', category: 'Safety', targetDate: '2025-12-31', progress: 100, status: 'Completed', priority: 'High' },
  { id: 'g4', employeeId: 'e2', title: 'Reduce defect rate below 0.5%', description: 'Quality improvement initiative', category: 'Quality', targetDate: '2025-05-01', progress: 30, status: 'In Progress', priority: 'High' },
  { id: 'g5', employeeId: 'e3', title: 'Lead 5S audit team', description: 'Coordinate quarterly 5S audits', category: 'Leadership', targetDate: '2025-03-20', progress: 0, status: 'Not Started', priority: 'Medium' },
  { id: 'g6', employeeId: 'e3', title: 'Mentor 2 new operators', description: 'Onboarding and skills transfer', category: 'Development', targetDate: '2025-02-28', progress: 100, status: 'Completed', priority: 'Low' },
  { id: 'g7', employeeId: 'e4', title: 'Implement Poka-Yoke on line 3', description: 'Error-proofing for critical step', category: 'Quality', targetDate: '2024-12-15', progress: 60, status: 'Overdue', priority: 'High' },
  { id: 'g8', employeeId: 'e5', title: 'Complete IATF awareness training', description: 'Annual IATF 16949 refresh', category: 'Development', targetDate: '2025-01-31', progress: 100, status: 'Completed', priority: 'Low' },
]

const seedEmployeeIds = EMPLOYEES_SEED.map((e) => e.id)

const TALENT_POOL_SEED = [
  {
    id: 'tp-seed-1',
    name: 'Talent pool example — Quality',
    email: 'talent.pool.example@local',
    phone: '',
    cvFileName: '',
    cvMimeType: '',
    cvStoredFileId: null,
    cvExtractedText: 'quality engineer apqp ppap vda automotive supplier audit iatf iso 9001',
    industries: ['Automotive', 'Quality'],
    matchedRoles: ['Senior Quality Engineer', 'Quality Manager'],
    lastFitScore: null,
    lastFitReasons: [],
    notes: 'No file attached — example row for industry/role filters. Add real CVs via archive actions or upload below.',
    createdAt: '2026-01-05',
    sourceCandidateId: null,
  },
]

const useHrSpaceStore = create(
  persist(
    (set, get) => ({
      _version: 2,

      nextEmployeeSeq: 8,

      employees: EMPLOYEES_SEED.map((e, i) => ({
        ...e,
        employeeNumber: formatEmployeeNumber(i + 1),
      })),

      qualificationNames: [...QUALIFICATIONS_SEED],
      departments: [...DEPTS_SEED],

      ratings: buildSeedRatings(seedEmployeeIds, QUALIFICATIONS_SEED.length),

      goals: [...GOALS_SEED],

      dialogues: [...DIALOGUES_SEED],

      hrDocuments: [
        { id: 'd1', name: 'Employment Contract - Martin Weber', category: 'Employment Contracts', employeeId: 'e1', dateCreated: '2024-01-15', status: 'Active', expiryDate: '2026-01-14', fileType: 'pdf' },
        { id: 'd2', name: 'Employment Contract - Sarah Klein', category: 'Employment Contracts', employeeId: 'e2', dateCreated: '2024-03-20', status: 'Active', expiryDate: '2026-03-19', fileType: 'pdf' },
        { id: 'd3', name: 'NDA Template', category: 'Company Policies', employeeId: null, dateCreated: '2023-11-01', status: 'Active', expiryDate: null, fileType: 'docx' },
      ],

      trainingRecords: [
        { id: 'tr1', employeeId: 'e1', title: 'ISO 9001 awareness', provider: 'Internal', completedDate: '2024-06-01', expiryDate: '2027-06-01', status: 'Valid', notes: '' },
        { id: 'tr2', employeeId: 'e2', title: 'Measurement systems', provider: 'TÜV', completedDate: '2023-09-10', expiryDate: '2026-09-10', status: 'Valid', notes: '' },
      ],

      workforcePlans: [
        { id: 'wp1', title: 'Q1 Production staffing', department: 'Production', targetHeadcount: 24, currentAssigned: 8, shiftModel: '2x8', status: 'Active', notes: 'Include overtime buffer' },
      ],

      onboardingTasks: ONBOARDING_TEMPLATE.map((title, i) => ({
        id: `ot-seed-e1-${i}`,
        employeeId: 'e1',
        title,
        done: i < 3,
        dueDate: '',
      })),

      attendanceEntries: [
        { id: 'a1', employeeId: 'e1', date: '2026-02-17', type: 'present', hours: 8, note: '' },
        { id: 'a2', employeeId: 'e2', date: '2026-02-17', type: 'present', hours: 8, note: '' },
      ],

      openPositions: [
        {
          id: 'pos1',
          title: 'Senior Quality Engineer',
          department: 'Quality',
          description: 'Lead APQP and PPAP activities',
          industry: 'Automotive',
          mustHaveKeywords: 'APQP, PPAP, VDA, IATF',
          preferredExperience: '5+ years quality engineering',
          aiMatchHints: 'Prefer candidates with supplier development and audit background.',
          status: 'open',
          createdAt: '2026-01-10',
        },
        {
          id: 'pos2',
          title: 'CNC Operator (night shift)',
          department: 'Production',
          description: '5-axis experience preferred',
          industry: 'Machinery',
          mustHaveKeywords: 'CNC, Fanuc, Siemens, 5-axis',
          preferredExperience: 'Shift work, manufacturing floor',
          aiMatchHints: '',
          status: 'open',
          createdAt: '2026-02-01',
        },
      ],

      candidates: [
        {
          id: 'c1',
          positionId: 'pos1',
          name: 'Alex Richter',
          email: 'alex.r@email.test',
          phone: '+49 170 0000000',
          cvFileName: 'Alex_Richter_CV.pdf',
          cvMimeType: '',
          cvStoredFileId: null,
          archived: false,
          cvSummary: '8 years in automotive quality, VDA 6.3 auditor.',
          cvExtractedText: 'automotive quality engineer apqp ppap vda 6.3 auditor supplier development iatf',
          fitScore: 72,
          fitReasons: ['Matched terms: automotive, quality, apqp, ppap, vda'],
          status: 'screening',
          linkedEmployeeId: null,
        },
        {
          id: 'c2',
          positionId: 'pos2',
          name: 'Julia Meier',
          email: 'julia.m@email.test',
          phone: '+49 171 1111111',
          cvFileName: '',
          cvMimeType: '',
          cvStoredFileId: null,
          archived: false,
          cvSummary: 'CNC programming Fanuc / Siemens.',
          cvExtractedText: 'cnc programmer fanuc siemens 5 axis milling',
          fitScore: 65,
          fitReasons: ['Matched terms: cnc, fanuc, siemens'],
          status: 'applied',
          linkedEmployeeId: null,
        },
      ],

      talentPoolEntries: [...TALENT_POOL_SEED],

      getEmployeeById: (employeeId) => get().employees.find((e) => e.id === employeeId),

      getEmployeeLabel: (employeeId) => {
        const e = get().getEmployeeById(employeeId)
        return e ? `${e.employeeNumber} — ${e.name}` : employeeId
      },

      /** Seed ratings, onboarding tasks, default training placeholder for a new employee */
      _seedModulesForEmployee: (employeeId) => {
        const { qualificationNames, ratings, onboardingTasks, trainingRecords } = get()
        const nextRatings = { ...ratings }
        qualificationNames.forEach((_, qIdx) => {
          const key = `${employeeId}-${qIdx}`
          if (nextRatings[key] == null) nextRatings[key] = 1
        })
        const newTasks = ONBOARDING_TEMPLATE.map((title, i) => ({
          id: `ot-${employeeId}-${Date.now()}-${i}`,
          employeeId,
          title,
          done: false,
          dueDate: '',
        }))
        const induction = {
          id: `tr-ind-${employeeId}-${Date.now()}`,
          employeeId,
          title: 'Company induction & policies',
          provider: 'HR',
          completedDate: '',
          expiryDate: '',
          status: 'Planned',
          notes: 'Auto-created on hire / onboarding',
        }
        set({
          ratings: nextRatings,
          onboardingTasks: [...onboardingTasks, ...newTasks],
          trainingRecords: [...trainingRecords, induction],
        })
      },

      createEmployee: ({ name, email, department, role, hireDate, candidateId }) => {
        const seq = get().nextEmployeeSeq + 1
        const id = `e${seq}`
        const employeeNumber = formatEmployeeNumber(seq)
        const employee = {
          id,
          name: name.trim(),
          email: (email || '').trim(),
          department: department || 'Production',
          role: role || 'Employee',
          status: 'active',
          hireDate: hireDate || new Date().toISOString().slice(0, 10),
          candidateId: candidateId || null,
        }
        set((s) => ({
          employees: [...s.employees, { ...employee, employeeNumber }],
          nextEmployeeSeq: seq,
        }))
        get()._seedModulesForEmployee(id)
        if (candidateId) {
          set((s) => ({
            candidates: s.candidates.map((c) =>
              c.id === candidateId ? { ...c, status: 'hired', linkedEmployeeId: id } : c
            ),
          }))
        }
        return id
      },

      hireCandidate: (candidateId, { department, role, hireDate }) => {
        const c = get().candidates.find((x) => x.id === candidateId)
        if (!c || c.status === 'hired') return null
        const employeeId = get().createEmployee({
          name: c.name,
          email: c.email,
          department: department || get().openPositions.find((p) => p.id === c.positionId)?.department || 'Production',
          role: role || get().openPositions.find((p) => p.id === c.positionId)?.title || 'Employee',
          hireDate: hireDate || new Date().toISOString().slice(0, 10),
          candidateId: c.id,
        })
        const posId = c.positionId
        if (posId) {
          set((s) => ({
            openPositions: s.openPositions.map((p) =>
              p.id === posId ? { ...p, status: 'filled', filledByEmployeeId: employeeId, filledAt: new Date().toISOString().slice(0, 10) } : p
            ),
          }))
        }
        set((s) => ({
          hrDocuments: [
            ...s.hrDocuments,
            {
              id: `d-cv-${candidateId}-${Date.now()}`,
              name: `CV / Application — ${c.name}`,
              category: 'Performance Records',
              employeeId,
              dateCreated: new Date().toISOString().slice(0, 10),
              status: 'Active',
              expiryDate: null,
              fileType: c.cvFileName?.endsWith('pdf') ? 'pdf' : 'default',
            },
          ],
        }))
        return employeeId
      },

      updateEmployee: (employeeId, patch) => {
        set((s) => ({
          employees: s.employees.map((e) => (e.id === employeeId ? { ...e, ...patch } : e)),
        }))
      },

      deleteEmployee: (employeeId) => {
        set((s) => ({
          employees: s.employees.filter((e) => e.id !== employeeId),
          goals: s.goals.filter((g) => g.employeeId !== employeeId),
          dialogues: s.dialogues.filter((d) => d.employeeId !== employeeId),
          hrDocuments: s.hrDocuments.map((d) => (d.employeeId === employeeId ? { ...d, employeeId: null } : d)),
          trainingRecords: s.trainingRecords.filter((t) => t.employeeId !== employeeId),
          onboardingTasks: s.onboardingTasks.filter((t) => t.employeeId !== employeeId),
          attendanceEntries: s.attendanceEntries.filter((a) => a.employeeId !== employeeId),
        }))
        const { ratings, qualificationNames } = get()
        const next = { ...ratings }
        qualificationNames.forEach((_, qIdx) => {
          delete next[`${employeeId}-${qIdx}`]
        })
        set({ ratings: next })
      },

      setRating: (employeeId, qualIndex, value) => {
        set((s) => ({
          ratings: { ...s.ratings, [`${employeeId}-${qualIndex}`]: value },
        }))
      },

      addQualification: (name) => {
        const n = name.trim()
        if (!n || get().qualificationNames.includes(n)) return
        const newIndex = get().qualificationNames.length
        set((s) => {
          const ratings = { ...s.ratings }
          s.employees.forEach((e) => {
            ratings[`${e.id}-${newIndex}`] = 1
          })
          return { qualificationNames: [...s.qualificationNames, n], ratings }
        })
      },

      removeQualification: (index) => {
        set((s) => {
          const names = s.qualificationNames.filter((_, i) => i !== index)
          const ratings = {}
          s.employees.forEach((e) => {
            names.forEach((_, newIdx) => {
              const oldIdx = newIdx < index ? newIdx : newIdx + 1
              ratings[`${e.id}-${newIdx}`] = s.ratings[`${e.id}-${oldIdx}`] ?? 1
            })
          })
          return { qualificationNames: names, ratings }
        })
      },

      addDepartment: (name) => {
        const n = name.trim()
        if (!n || get().departments.includes(n)) return
        set((s) => ({ departments: [...s.departments, n] }))
      },

      addGoal: (goal) => {
        const id = `g-${Date.now()}`
        set((s) => ({ goals: [...s.goals, { ...goal, id }] }))
      },

      updateGoal: (id, patch) => {
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
      },

      deleteGoal: (id) => {
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
      },

      addDialogue: (row) => {
        const id = `dg-${Date.now()}`
        set((s) => ({ dialogues: [...s.dialogues, { ...row, id }] }))
      },

      updateDialogue: (id, patch) => {
        set((s) => ({ dialogues: s.dialogues.map((d) => (d.id === id ? { ...d, ...patch } : d)) }))
      },

      deleteDialogue: (id) => {
        set((s) => ({ dialogues: s.dialogues.filter((d) => d.id !== id) }))
      },

      addHrDocument: (doc) => {
        const id = `d-${Date.now()}`
        set((s) => ({ hrDocuments: [...s.hrDocuments, { ...doc, id }] }))
      },

      updateHrDocument: (id, patch) => {
        set((s) => ({ hrDocuments: s.hrDocuments.map((d) => (d.id === id ? { ...d, ...patch } : d)) }))
      },

      deleteHrDocument: (id) => {
        set((s) => ({ hrDocuments: s.hrDocuments.filter((d) => d.id !== id) }))
      },

      addTrainingRecord: (row) => {
        const id = `tr-${Date.now()}`
        set((s) => ({ trainingRecords: [...s.trainingRecords, { ...row, id }] }))
      },

      updateTrainingRecord: (id, patch) => {
        set((s) => ({
          trainingRecords: s.trainingRecords.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }))
      },

      deleteTrainingRecord: (id) => {
        set((s) => ({ trainingRecords: s.trainingRecords.filter((t) => t.id !== id) }))
      },

      addWorkforcePlan: (row) => {
        const id = `wp-${Date.now()}`
        set((s) => ({ workforcePlans: [...s.workforcePlans, { ...row, id }] }))
      },

      updateWorkforcePlan: (id, patch) => {
        set((s) => ({
          workforcePlans: s.workforcePlans.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        }))
      },

      deleteWorkforcePlan: (id) => {
        set((s) => ({ workforcePlans: s.workforcePlans.filter((w) => w.id !== id) }))
      },

      addOnboardingTask: (row) => {
        const id = `ot-${Date.now()}`
        set((s) => ({ onboardingTasks: [...s.onboardingTasks, { ...row, id, done: !!row.done }] }))
      },

      updateOnboardingTask: (id, patch) => {
        set((s) => ({
          onboardingTasks: s.onboardingTasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }))
      },

      deleteOnboardingTask: (id) => {
        set((s) => ({ onboardingTasks: s.onboardingTasks.filter((t) => t.id !== id) }))
      },

      addAttendance: (row) => {
        const id = `at-${Date.now()}`
        set((s) => ({ attendanceEntries: [...s.attendanceEntries, { ...row, id }] }))
      },

      updateAttendance: (id, patch) => {
        set((s) => ({
          attendanceEntries: s.attendanceEntries.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }))
      },

      deleteAttendance: (id) => {
        set((s) => ({ attendanceEntries: s.attendanceEntries.filter((a) => a.id !== id) }))
      },

      addOpenPosition: (row) => {
        const id = `pos-${Date.now()}`
        set((s) => ({
          openPositions: [
            ...s.openPositions,
            {
              industry: '',
              mustHaveKeywords: '',
              preferredExperience: '',
              aiMatchHints: '',
              ...row,
              id,
              status: 'open',
              createdAt: new Date().toISOString().slice(0, 10),
            },
          ],
        }))
      },

      updateOpenPosition: (id, patch) => {
        set((s) => ({
          openPositions: s.openPositions.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }))
      },

      deleteOpenPosition: (id) => {
        const toDrop = get().candidates.filter((c) => c.positionId === id)
        toDrop.forEach((c) => {
          if (c.cvStoredFileId) void deleteCvFile(c.cvStoredFileId)
        })
        set((s) => ({
          openPositions: s.openPositions.filter((p) => p.id !== id),
          candidates: s.candidates.filter((c) => c.positionId !== id),
        }))
      },

      addCandidate: (row) => {
        const id = `c-${Date.now()}`
        const cvStoredFileId =
          row.cvStoredFileId != null && String(row.cvStoredFileId).trim() !== ''
            ? String(row.cvStoredFileId).trim()
            : null
        set((s) => ({
          candidates: [
            ...s.candidates,
            {
              cvExtractedText: '',
              fitScore: null,
              fitReasons: [],
              ...row,
              id,
              status: row.status || 'applied',
              linkedEmployeeId: null,
              cvStoredFileId,
              cvMimeType: row.cvMimeType || '',
            },
          ],
        }))
      },

      /** Append many candidates at once (e.g. bulk CV import). */
      addCandidatesBulk: (positionId, rows) => {
        if (!positionId || !Array.isArray(rows) || rows.length === 0) return
        const base = Date.now()
        set((s) => ({
          candidates: [
            ...s.candidates,
            ...rows.map((row, i) => {
              const cvStoredFileId =
                row.cvStoredFileId != null && String(row.cvStoredFileId).trim() !== ''
                  ? String(row.cvStoredFileId).trim()
                  : null
              return {
                archived: false,
                cvStoredFileId: null,
                cvMimeType: '',
                cvExtractedText: '',
                fitScore: null,
                fitReasons: [],
                ...row,
                positionId,
                id: `c-${base}-${i}`,
                status: row.status || 'applied',
                linkedEmployeeId: null,
                cvStoredFileId,
                cvMimeType: row.cvMimeType || '',
              }
            }),
          ],
        }))
      },

      /** Re-run heuristic fit scores for all candidates tied to a position. */
      recomputeFitScoresForPosition: (positionId) => {
        const pos = get().openPositions.find((p) => p.id === positionId)
        if (!pos) return
        set((s) => ({
          candidates: s.candidates.map((c) => {
            if (c.positionId !== positionId) return c
            const text = c.cvExtractedText || c.cvSummary || ''
            if (!String(text).trim()) {
              const { score, reasons } = scoreCvAgainstPosition(pos, '')
              return { ...c, fitScore: score, fitReasons: reasons }
            }
            const { score, reasons } = scoreCvAgainstPosition(pos, text)
            return { ...c, fitScore: score, fitReasons: reasons }
          }),
        }))
      },

      updateCandidate: (id, patch) => {
        set((s) => ({
          candidates: s.candidates.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }))
      },

      deleteCandidate: (id) => {
        const c = get().candidates.find((x) => x.id === id)
        if (c?.cvStoredFileId) void deleteCvFile(c.cvStoredFileId)
        set((s) => ({ candidates: s.candidates.filter((x) => x.id !== id) }))
      },

      archiveCandidate: (id) => {
        set((s) => ({
          candidates: s.candidates.map((c) => (c.id === id ? { ...c, archived: true } : c)),
        }))
      },

      restoreCandidate: (id) => {
        set((s) => ({
          candidates: s.candidates.map((c) => (c.id === id ? { ...c, archived: false } : c)),
        }))
      },

      /**
       * Copy CV file into talent archive (IndexedDB), tag industries/roles from current open position, mark candidate archived.
       */
      promoteCandidateToTalentPool: (candidateId, { notes = '', extraIndustries = [] } = {}) => {
        const c = get().candidates.find((x) => x.id === candidateId)
        if (!c) return null
        const pos = get().openPositions.find((p) => p.id === c.positionId)
        const poolId = `tp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const industries = [
          ...new Set([
            ...(pos?.industry ? [String(pos.industry).trim()] : []),
            ...(Array.isArray(extraIndustries) ? extraIndustries.map((x) => String(x || '').trim()).filter(Boolean) : []),
          ]),
        ]
        const matchedRoles = pos?.title ? [String(pos.title)] : []
        const entry = {
          id: poolId,
          name: c.name,
          email: c.email || '',
          phone: c.phone || '',
          cvFileName: c.cvFileName || '',
          cvMimeType: c.cvMimeType || '',
          cvStoredFileId: c.cvStoredFileId ? poolId : null,
          cvExtractedText: c.cvExtractedText || '',
          industries,
          matchedRoles,
          lastFitScore: c.fitScore ?? null,
          lastFitReasons: Array.isArray(c.fitReasons) ? [...c.fitReasons] : [],
          notes: String(notes || ''),
          createdAt: new Date().toISOString(),
          sourceCandidateId: c.id,
        }
        const pushAndArchive = (e) => {
          set((s) => ({
            talentPoolEntries: [...s.talentPoolEntries, e],
            candidates: s.candidates.map((x) => (x.id === candidateId ? { ...x, archived: true } : x)),
          }))
        }
        if (c.cvStoredFileId) {
          void cloneCvFile(c.cvStoredFileId, poolId)
            .then(() => pushAndArchive(entry))
            .catch(() => pushAndArchive({ ...entry, cvStoredFileId: null }))
        } else {
          pushAndArchive(entry)
        }
        return poolId
      },

      addTalentPoolEntry: (row) => {
        const id = row.id || `tp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        set((s) => ({
          talentPoolEntries: [
            ...s.talentPoolEntries,
            {
              name: '',
              email: '',
              phone: '',
              cvFileName: '',
              cvMimeType: '',
              cvStoredFileId: null,
              cvExtractedText: '',
              industries: [],
              matchedRoles: [],
              lastFitScore: null,
              lastFitReasons: [],
              notes: '',
              createdAt: new Date().toISOString(),
              sourceCandidateId: null,
              ...row,
              id,
              cvStoredFileId:
                row.cvStoredFileId != null && String(row.cvStoredFileId).trim() !== ''
                  ? String(row.cvStoredFileId).trim()
                  : null,
              cvMimeType: row.cvMimeType || '',
            },
          ],
        }))
        return id
      },

      updateTalentPoolEntry: (id, patch) => {
        set((s) => ({
          talentPoolEntries: s.talentPoolEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }))
      },

      removeTalentPoolEntry: (id) => {
        const e = get().talentPoolEntries.find((x) => x.id === id)
        if (e?.cvStoredFileId) void deleteCvFile(e.cvStoredFileId)
        set((s) => ({ talentPoolEntries: s.talentPoolEntries.filter((x) => x.id !== id) }))
      },

      /** Re-score archived pool CV text against any open position (future hiring). */
      recalculateTalentPoolFit: (entryId, positionId) => {
        const e = get().talentPoolEntries.find((x) => x.id === entryId)
        const pos = get().openPositions.find((p) => p.id === positionId)
        if (!e || !pos) return null
        const { score, reasons } = scoreCvAgainstPosition(pos, e.cvExtractedText || '')
        set((s) => ({
          talentPoolEntries: s.talentPoolEntries.map((row) =>
            row.id === entryId ? { ...row, lastFitScore: score, lastFitReasons: reasons } : row
          ),
        }))
        return score
      },
    }),
    {
      name: 'strefex-hr-space',
      version: 2,
      storage: createTenantStorage(),
      migrate: (state, fromVersion) => {
        if (!state || typeof state !== 'object') return state
        if (fromVersion < 2) {
          const st = { ...state }
          if (!Array.isArray(st.talentPoolEntries)) {
            st.talentPoolEntries = [...TALENT_POOL_SEED]
          }
          if (Array.isArray(st.candidates)) {
            st.candidates = st.candidates.map((c) => ({
              archived: c.archived === true,
              cvStoredFileId: c.cvStoredFileId ?? null,
              cvMimeType: c.cvMimeType || '',
              ...c,
            }))
          }
          st._version = 2
          return st
        }
        return state
      },
      partialize: (s) => ({
        _version: s._version,
        nextEmployeeSeq: s.nextEmployeeSeq,
        employees: s.employees,
        qualificationNames: s.qualificationNames,
        departments: s.departments,
        ratings: s.ratings,
        goals: s.goals,
        dialogues: s.dialogues,
        hrDocuments: s.hrDocuments,
        trainingRecords: s.trainingRecords,
        workforcePlans: s.workforcePlans,
        onboardingTasks: s.onboardingTasks,
        attendanceEntries: s.attendanceEntries,
        openPositions: s.openPositions,
        candidates: s.candidates,
        talentPoolEntries: s.talentPoolEntries,
      }),
    }
  )
)

export default useHrSpaceStore
