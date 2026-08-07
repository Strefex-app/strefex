import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import ManagementBreadcrumb from '../components/management/ManagementBreadcrumb'
import { useProjectStore } from '../store/projectStore'
import { useAuthStore } from '../store/authStore'
import { useLimit } from '../services/featureFlags'
import { useTranslation } from '../i18n/useTranslation'
/* jspdf & html2canvas loaded dynamically only when exporting PDF */
import '../styles/app-page.css'
import './ProgramManagement.css'
import './ProjectManagement.css'
import '../styles/projectControl.css'
import '../styles/managementShell.css'

/* ═══════════════════════════════════════════════════════
 *  CONSTANTS
 * ═══════════════════════════════════════════════════════ */
const ROW_H = 34                // pixels per task row
/** Default visible task rows in the Gantt body when the project has fewer tasks (no viewport fill). */
const DEFAULT_GANTT_VISIBLE_ROWS = 12
const HANDLE_W = 6              // drag handle width (px)
const PROJECT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const STATUS_COLORS = { complete: '#16a34a', 'in-progress': '#2563eb', 'not-started': '#64748b' }
const STATUS_BAR_CLASS = { complete: 'gc-bar-body--complete', 'in-progress': 'gc-bar-body--in-progress', 'not-started': 'gc-bar-body--planned' }
const DEP_LABELS = { FS: 'Finish → Start', SS: 'Start → Start' }
const RAG_OPTIONS = [
  { value: 'green', label: 'On track' },
  { value: 'amber', label: 'Watch' },
  { value: 'red', label: 'At risk' },
]

/* ═══════════════════════════════════════════════════════
 *  HELPERS
 * ═══════════════════════════════════════════════════════ */
function flattenTasks(tasks) {
  const out = []
  ;(tasks || []).forEach((t) => { out.push(t); if (t.children?.length) out.push(...flattenTasks(t.children)) })
  return out
}
function getInitials(name) {
  if (!name?.trim()) return '—'
  return name.trim().split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}
function fmtShortDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getDate()} ${dt.toLocaleString('en', { month: 'short' })}`
}
function ragDotClass(rag) {
  const r = String(rag || 'green').toLowerCase()
  if (r === 'red') return 'gc-rag gc-rag--red'
  if (r === 'amber') return 'gc-rag gc-rag--amber'
  return 'gc-rag gc-rag--green'
}

import {
  loadStrefexLogoForPdf,
  drawPmPdfHeader,
  drawPmPdfSubtitleBar,
  addPmPdfCanvasFit,
  drawPmPdfFooter,
  exportHtmlToStrefexPdfOnePage,
  PM_PDF_CAPTURE_WIDTH,
} from '../utils/pmPdfExport'
import {
  GANTT_SCALES,
  getGanttScale,
  buildDateRange,
  buildGridColumns,
  buildHeaderGroups,
  extendDateRangeToFillWidth,
  dateToPx as scaleDateToPx,
  pxToDate as scalePxToDate,
  pxDeltaToDays,
  timelineWidthPx,
  minBarWidthPx,
} from '../utils/ganttTimelineScale'

/* ═══════════════════════════════════════════════════════
 *  MAIN COMPONENT
 * ═══════════════════════════════════════════════════════ */
const ProjectManagement = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const viewFromQuery = searchParams.get('view')
  const ganttRef = useRef(null)
  const fitWrapRef = useRef(null)
  const taskListRef = useRef(null)
  const timelineRef = useRef(null)
  const dragRef = useRef(null)
  const portfolioExportRef = useRef(null)
  const portfolioSummaryExportRef = useRef(null)
  const tableExportRef = useRef(null)
  const storeProjects = useProjectStore((s) => s.projects)
  const _addProject = useProjectStore((s) => s.addProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const addTask = useProjectStore((s) => s.addTask)
  const updateTask = useProjectStore((s) => s.updateTask)
  const deleteTask = useProjectStore((s) => s.deleteTask)
  const addResource = useProjectStore((s) => s.addResource)
  const removeResource = useProjectStore((s) => s.removeResource)
  const saveRevision = useProjectStore((s) => s.saveRevision)
  const deleteRevision = useProjectStore((s) => s.deleteRevision)
  const setBaseline = useProjectStore((s) => s.setBaseline)
  const restoreRevision = useProjectStore((s) => s.restoreRevision)
  const getProjectStats = useProjectStore((s) => s.getProjectStats)
  const calcDuration = useProjectStore((s) => s.calcDuration)
  const calcEndDate = useProjectStore((s) => s.calcEndDate)
  const addDays = useProjectStore((s) => s.addDays)

  const currentUser = useAuthStore((s) => s.user)
  const authRole = useAuthStore((s) => s.role)
  /* getSafeProjects uses session in localStorage (getUserId / getUserRole), so the list stays
   * correct when React auth is briefly empty after mobile back-navigation — unlike filtering by
   * currentUser?.email here, which hid all rows with a set createdBy. */
  const projects = useMemo(
    () => useProjectStore.getState().getSafeProjects(),
    [storeProjects, currentUser, authRole],
  )
  const addProject = (data) => _addProject({ ...data })
  const projectLimit = useLimit('maxProjects', projects.length)

  /* ── UI State ─────────────────────────────────────── */
  const [view, setView] = useState(viewFromQuery === 'portfolio' ? 'portfolio' : 'timeline') // timeline | table | portfolio
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || null)
  const [timeScale, setTimeScale] = useState('week') // day | week | month | year
  const [expandedPhases, setExpandedPhases] = useState({ t4: true })

  const [showFilter, setShowFilter] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')

  const [showAddProject, setShowAddProject] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showEditTask, setShowEditTask] = useState(null)
  const [showRevisions, setShowRevisions] = useState(false)
  const [showResources, setShowResources] = useState(false)
  const [showBaseline, setShowBaseline] = useState(false)
  const [showFalconKpis, setShowFalconKpis] = useState(false)
  const [showFalconRisks, setShowFalconRisks] = useState(false)
  const [showFalconTags, setShowFalconTags] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [pmExportFeedback, setPmExportFeedback] = useState('')
  const [showPortfolioPdfModal, setShowPortfolioPdfModal] = useState(false)
  const [portfolioPdfOrientation, setPortfolioPdfOrientation] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pm-portfolio-pdf-orientation')
      return saved === 'l' ? 'l' : 'p'
    } catch {
      return 'p'
    }
  })
  const [portfolioPdfExporting, setPortfolioPdfExporting] = useState(false)
  const [revisionNote, setRevisionNote] = useState('')
  const [newResourceName, setNewResourceName] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [editTaskProjectId, setEditTaskProjectId] = useState(null)
  const [fitState, setFitState] = useState(null) // null = normal, { scale, contentW, contentH } = fitted
  const [timelineViewportW, setTimelineViewportW] = useState(0)
  const [, forceRender] = useState(0)

  /* Predecessor selector state (controlled — avoids DOM getElementById bugs) */
  const [newPredTask, setNewPredTask] = useState('')
  const [newPredType, setNewPredType] = useState('FS')
  const [editPredTask, setEditPredTask] = useState('')
  const [editPredType, setEditPredType] = useState('FS')

  const [newProject, setNewProject] = useState({ name: '', budget: '', currency: 'USD' })
  const [newTask, setNewTask] = useState({ name: '', startDate: '', duration: '', assignee: '', cost: '', predecessors: [] })
  const [editTask, setEditTask] = useState({})

  const selectedProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : null
  const stats = selectedProjectId ? getProjectStats(selectedProjectId) : null

  /* ── Flatten tasks for display ───────────────────── */
  const allTasksFlat = useMemo(() => {
    const proj = selectedProject || projects[0]
    if (!proj) return []
    const rows = []
    ;(proj.tasks || []).forEach((t) => {
      if (t.children?.length) {
        rows.push({ ...t, _isPhase: true })
        if (expandedPhases[t.id]) {
          t.children.forEach((c) => rows.push({ ...c, _isChild: true }))
        }
      } else {
        rows.push(t)
      }
    })
    let list = rows
    if (filterStatus) list = list.filter((t) => t.status === filterStatus)
    if (filterAssignee) list = list.filter((t) => t.assignee === filterAssignee)
    return list
  }, [selectedProject, projects, expandedPhases, filterStatus, filterAssignee])

  const taskRowMap = useMemo(() => {
    const map = {}
    allTasksFlat.forEach((t, i) => { map[t.id] = i })
    return map
  }, [allTasksFlat])

  const assignees = useMemo(() => {
    const set = new Set()
    allTasksFlat.forEach((t) => t.assignee && set.add(t.assignee))
    return [...set].sort()
  }, [allTasksFlat])

  const portfolioRows = useMemo(() => {
    return projects.map((p, i) => {
      const st = getProjectStats(p.id)
      const rag = p.portfolioRag || 'green'
      const tags = (p.tags || []).join(', ') || '—'
      const kpiList = p.kpis || []
      let kpiOk = 0
      kpiList.forEach((k) => {
        const t = Number(k.target) || 0
        const c = Number(k.current) || 0
        if (t <= 0) return
        if (c >= t * 0.85) kpiOk += 1
      })
      const kpiLabel = kpiList.length ? `${kpiOk}/${kpiList.length} ≥85% target` : '—'
      return {
        project: p,
        color: PROJECT_COLORS[i % PROJECT_COLORS.length],
        rag,
        tags,
        kpiLabel,
        stats: st,
      }
    })
  }, [projects, getProjectStats])

  /** Falcon-style portfolio executive summary (roll-up across all workspaces). */
  const portfolioExecutiveSummary = useMemo(() => {
    const reportDate = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    let ragGreen = 0
    let ragAmber = 0
    let ragRed = 0
    let totalTasks = 0
    let completedTasks = 0
    let sumProgressWeighted = 0
    let totalBudget = 0
    let totalSpent = 0
    let openRisksAll = 0
    let escalatedRisksAll = 0
    let kpiTotal = 0
    let kpiOnTrack = 0
    const atRiskNames = []
    const riskHotList = []
    const benefitLines = []

    projects.forEach((p) => {
      const st = getProjectStats(p.id)
      const rag = String(p.portfolioRag || 'green').toLowerCase()
      if (rag === 'red') {
        ragRed += 1
        atRiskNames.push(p.name)
      } else if (rag === 'amber') ragAmber += 1
      else ragGreen += 1

      const n = st?.totalTasks ?? 0
      totalTasks += n
      completedTasks += st?.completedTasks ?? 0
      if (n > 0) sumProgressWeighted += (st?.avgProgress ?? 0) * n

      totalBudget += Number(p.budget) || 0
      totalSpent += st?.totalCost ?? 0
      openRisksAll += st?.openRisks ?? 0
      escalatedRisksAll += st?.escalatedRisks ?? 0

      ;(p.kpis || []).forEach((k) => {
        kpiTotal += 1
        const t = Number(k.target) || 0
        const c = Number(k.current) || 0
        if (t > 0 && c >= t * 0.85) kpiOnTrack += 1
      })

      const bn = (p.benefitNote || '').trim()
      if (bn) benefitLines.push({ name: p.name, text: bn })

      ;(p.risks || []).forEach((r) => {
        if (!r || r.status === 'closed' || r.status === 'mitigated') return
        if (r.severity === 'high' || r.escalated) {
          riskHotList.push({
            project: p.name,
            title: (r.title || '').trim() || '(Untitled risk)',
            severity: r.severity || 'med',
            escalated: Boolean(r.escalated),
          })
        }
      })
    })

    const weightedAvgProgress = totalTasks > 0 ? Math.round(sumProgressWeighted / totalTasks) : 0
    const primaryCurrency = projects[0]?.currency || 'USD'
    const budgetRemaining = totalBudget - totalSpent
    const narrative = (() => {
      if (projects.length === 0) return 'No projects in the portfolio yet. Create a workspace to begin tracking delivery, KPIs, and risks.'
      const parts = []
      parts.push(`The portfolio comprises ${projects.length} project${projects.length === 1 ? '' : 's'} with ${totalTasks} scheduled task${totalTasks === 1 ? '' : 's'}.`)
      parts.push(`Weighted delivery progress is ${weightedAvgProgress}%.`)
      if (ragRed > 0) parts.push(`${ragRed} project${ragRed === 1 ? '' : 's'} ${ragRed === 1 ? 'is' : 'are'} marked at risk (red).`)
      else if (ragAmber > 0) parts.push(`${ragAmber} project${ragAmber === 1 ? '' : 's'} require attention (amber).`)
      else parts.push('All projects are marked on track (green) at portfolio level.')
      if (openRisksAll > 0) parts.push(`${openRisksAll} open risk${openRisksAll === 1 ? '' : 's'} across the portfolio${escalatedRisksAll > 0 ? `, including ${escalatedRisksAll} escalated (red flag)` : ''}.`)
      if (kpiTotal > 0) parts.push(`KPI attainment: ${kpiOnTrack} of ${kpiTotal} KPIs at or above 85% of target.`)
      parts.push(`Financial roll-up: ${primaryCurrency} ${totalSpent.toLocaleString()} spent of ${primaryCurrency} ${totalBudget.toLocaleString()} budget (${budgetRemaining >= 0 ? 'under' : 'over'} plan).`)
      return parts.join(' ')
    })()

    return {
      reportDate,
      projectCount: projects.length,
      ragGreen,
      ragAmber,
      ragRed,
      totalTasks,
      completedTasks,
      weightedAvgProgress,
      totalBudget,
      totalSpent,
      budgetRemaining,
      openRisksAll,
      escalatedRisksAll,
      kpiTotal,
      kpiOnTrack,
      atRiskNames,
      riskHotList: riskHotList.slice(0, 14),
      benefitLines,
      primaryCurrency,
      narrative,
    }
  }, [projects, getProjectStats])

  /* ── Date range & timeline scale ─────────────────── */
  const scaleConfig = getGanttScale(timeScale)
  const pxPerDay = scaleConfig.pxPerDay

  const dateRange = useMemo(() => {
    const base = buildDateRange(allTasksFlat, timeScale)
    if (view !== 'timeline' || timelineViewportW <= 0) return base
    return extendDateRangeToFillWidth(base, timeScale, pxPerDay, timelineViewportW)
  }, [allTasksFlat, timeScale, timelineViewportW, view, pxPerDay])

  const gridColumns = useMemo(
    () => buildGridColumns(timeScale, dateRange.min, dateRange.max, pxPerDay),
    [timeScale, dateRange.min, dateRange.max, pxPerDay],
  )

  const headerGroups = useMemo(
    () => buildHeaderGroups(timeScale, gridColumns, dateRange.minMs, pxPerDay),
    [timeScale, gridColumns, dateRange.minMs, pxPerDay],
  )

  const timelineWidth = useMemo(
    () => timelineWidthPx(dateRange.minMs, dateRange.maxMs, pxPerDay),
    [dateRange.minMs, dateRange.maxMs, pxPerDay],
  )

  /* ── Pixel helpers ───────────────────────────────── */
  const dateToPx = useCallback(
    (dateStr) => scaleDateToPx(dateStr, dateRange.minMs, pxPerDay),
    [dateRange.minMs, pxPerDay],
  )

  const pxToDate = useCallback(
    (px) => scalePxToDate(px, dateRange.minMs, pxPerDay),
    [dateRange.minMs, pxPerDay],
  )

  const minBarW = minBarWidthPx(pxPerDay, timeScale)

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayPx = dateToPx(todayStr)

  const taskGridBodyPx = allTasksFlat.length * ROW_H
  /** Task list + calendar share the same row count: minimum DEFAULT_GANTT_VISIBLE_ROWS empty slots; grows with each added task past that. */
  const displayedTaskRowCount = Math.max(allTasksFlat.length, DEFAULT_GANTT_VISIBLE_ROWS)
  const paddedEmptyTaskRows = Math.max(0, DEFAULT_GANTT_VISIBLE_ROWS - allTasksFlat.length)
  const ganttTmBodyHeightPx = displayedTaskRowCount * ROW_H
  const ganttRowLineCount = Math.max(1, displayedTaskRowCount)

  useEffect(() => {
    if (view !== 'timeline') return undefined
    const el = timelineRef.current
    if (!el) return undefined
    const measure = () => setTimelineViewportW(el.clientWidth || 0)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [view, timeScale, selectedProjectId, allTasksFlat.length])

  /* ── Scroll sync (name rail ↔ timeline) ────────────── */
  const syncScroll = useCallback((src) => {
    if (src === 'names' && taskListRef.current && timelineRef.current) {
      timelineRef.current.scrollTop = taskListRef.current.scrollTop
    } else if (src === 'timeline' && taskListRef.current && timelineRef.current) {
      taskListRef.current.scrollTop = timelineRef.current.scrollTop
    }
  }, [])

  /* ═══════════════════════════════════════════════════
   *  DRAG & RESIZE — via ref + force-render
   * ═══════════════════════════════════════════════════ */
  const handleBarMouseDown = useCallback((e, task, projectId, mode) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      taskId: task.id, projectId, mode,
      startX: e.clientX,
      origStartDate: task.startDate,
      origEndDate: task.endDate,
      dx: 0,
    }
    forceRender((n) => n + 1)
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return
      dragRef.current.dx = e.clientX - dragRef.current.startX
      forceRender((n) => n + 1)
    }
    const onUp = () => {
      if (!dragRef.current) return
      const dr = dragRef.current
      const daysDelta = pxDeltaToDays(dr.dx, pxPerDay, scaleConfig.snapDays)
      const pid = dr.projectId
      if (daysDelta !== 0) {
        if (dr.mode === 'move') {
          updateTask(pid, dr.taskId, { startDate: addDays(dr.origStartDate, daysDelta), endDate: addDays(dr.origEndDate, daysDelta) })
        } else if (dr.mode === 'resize-end') {
          const newEnd = addDays(dr.origEndDate, daysDelta)
          if (newEnd >= dr.origStartDate) updateTask(pid, dr.taskId, { endDate: newEnd })
        } else if (dr.mode === 'resize-start') {
          const newStart = addDays(dr.origStartDate, daysDelta)
          if (newStart <= dr.origEndDate) updateTask(pid, dr.taskId, { startDate: newStart })
        }
      }
      dragRef.current = null
      forceRender((n) => n + 1)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [updateTask, addDays, pxPerDay, scaleConfig.snapDays])

  /* ── Dependency arrow paths (SVG) ────────────────── */
  const arrowPaths = useMemo(() => {
    const paths = []
    allTasksFlat.forEach((task) => {
      ;(task.predecessors || []).forEach((dep) => {
        const fromIdx = taskRowMap[dep.taskId]
        const toIdx = taskRowMap[task.id]
        if (fromIdx == null || toIdx == null) return
        const pred = allTasksFlat[fromIdx]
        if (!pred) return

        const fromLeft = dateToPx(pred.startDate)
        const fromRight = dateToPx(pred.endDate) + minBarW
        const toLeft = dateToPx(task.startDate)
        const fromY = fromIdx * ROW_H + ROW_H / 2
        const toY = toIdx * ROW_H + ROW_H / 2
        const pad = 10

        let d
        if (dep.type === 'FS') {
          const midX = fromRight + pad
          if (toLeft > fromRight + pad * 2) {
            d = `M${fromRight},${fromY} L${midX},${fromY} L${midX},${toY} L${toLeft},${toY}`
          } else {
            const downY = Math.max(fromY, toY) + ROW_H * 0.6
            d = `M${fromRight},${fromY} L${midX},${fromY} L${midX},${downY} L${toLeft - pad},${downY} L${toLeft - pad},${toY} L${toLeft},${toY}`
          }
        } else {
          const midX = Math.min(fromLeft, toLeft) - pad
          d = `M${fromLeft},${fromY} L${midX},${fromY} L${midX},${toY} L${toLeft},${toY}`
        }
        paths.push({ d, type: dep.type, key: `${dep.taskId}-${task.id}` })
      })
    })
    return paths
  }, [allTasksFlat, taskRowMap, dateToPx, minBarW])

  /* ── Get predecessor label for task table ─────────── */
  const getPredLabel = (task) => {
    if (!task.predecessors?.length) return '—'
    return task.predecessors.map((p) => {
      const idx = allTasksFlat.findIndex((t) => t.id === p.taskId)
      return idx >= 0 ? `${idx + 1}${p.type}` : p.type
    }).join(', ')
  }

  /* ═══════════════════════════════════════════════════
   *  HANDLERS
   * ═══════════════════════════════════════════════════ */
  const handleAddProject = () => {
    if (!newProject.name.trim()) return
    if (!projectLimit.allowed) return
    const id = addProject({ name: newProject.name.trim(), budget: parseFloat(newProject.budget) || 0, currency: newProject.currency })
    setSelectedProjectId(id)
    setNewProject({ name: '', budget: '', currency: 'USD' })
    setShowAddProject(false)
  }

  const handleDeleteProject = (projectId) => {
    const pid = projectId || selectedProjectId
    if (!pid) return
    const proj = projects.find((p) => p.id === pid)
    if (!proj || !window.confirm(`Delete project "${proj.name}" and all its tasks?`)) return
    deleteProject(pid)
    const next = projects.filter((p) => p.id !== pid)
    if (selectedProjectId === pid) setSelectedProjectId(next[0]?.id || null)
  }

  const handleAddTask = () => {
    const pid = selectedProjectId || projects[0]?.id
    if (!newTask.name.trim() || !pid) return
    const startDate = newTask.startDate || new Date().toISOString().slice(0, 10)
    const dur = parseInt(newTask.duration) || 1
    addTask(pid, {
      name: newTask.name.trim(), startDate,
      endDate: calcEndDate(startDate, dur),
      assignee: newTask.assignee, cost: parseFloat(newTask.cost) || 0,
      predecessors: newTask.predecessors || [],
    })
    setNewTask({ name: '', startDate: '', duration: '', assignee: '', cost: '', predecessors: [] })
    setShowAddTask(false)
  }

  const handleEditTaskOpen = (task, projectId) => {
    setEditTask({
      ...task,
      duration: calcDuration(task.startDate, task.endDate),
      predecessors: task.predecessors || [],
    })
    setEditPredTask('')
    setEditPredType('FS')
    setShowEditTask(task.id)
    setEditTaskProjectId(projectId ?? selectedProjectId)
  }

  const handleEditTaskSave = () => {
    const pid = editTaskProjectId ?? selectedProjectId
    if (!showEditTask || !pid) return
    const dur = parseInt(editTask.duration) || calcDuration(editTask.startDate, editTask.endDate)
    updateTask(pid, showEditTask, {
      name: editTask.name,
      startDate: editTask.startDate,
      endDate: calcEndDate(editTask.startDate, dur),
      progressPercent: parseInt(editTask.progressPercent) || 0,
      assignee: editTask.assignee,
      cost: parseFloat(editTask.cost) || 0,
      predecessors: editTask.predecessors || [],
    })
    setShowEditTask(null)
    setEditTask({})
    setEditTaskProjectId(null)
  }

  const handleDeleteTask = (taskId) => {
    const pid = contextMenu?.projectId ?? selectedProjectId
    if (!pid || !window.confirm('Delete this task?')) return
    deleteTask(pid, taskId)
    setContextMenu(null)
  }

  const handleContextMenu = (e, task, projectId) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, task, projectId: projectId ?? selectedProjectId })
  }

  /* ── Fit-to-Screen toggle — shrink everything to one window ─── */
  const handleFitToggle = useCallback(() => {
    if (fitState) {
      setFitState(null)
      return
    }
    const gantt = ganttRef.current
    const timeline = timelineRef.current
    if (!gantt || !timeline) return

    /* Available space from parent wrapper */
    const wrap = fitWrapRef.current || gantt.parentElement
    const availW = wrap?.clientWidth || gantt.clientWidth
    const availH = wrap?.clientHeight || gantt.clientHeight

    /* Full content dimensions */
    const nameRailW = taskListRef.current?.offsetWidth || 148
    const fullW = nameRailW + timeline.scrollWidth
    const fullH = Math.max(timeline.scrollHeight, gantt.scrollHeight)

    if (fullW <= availW && fullH <= availH) return // already fits

    const sx = availW / fullW
    const sy = availH / fullH
    setFitState({ scale: Math.min(sx, sy, 1), contentW: fullW, contentH: fullH })
  }, [fitState])

  const runPortfolioPdfExport = useCallback(async (orientation) => {
    setPmExportFeedback('')
    setPortfolioPdfExporting(true)
    const printedBy = currentUser?.name || currentUser?.companyName || currentUser?.email || 'Unknown'
    const el = portfolioSummaryExportRef.current
    if (!el) {
      setPmExportFeedback('Nothing to export.')
      setPortfolioPdfExporting(false)
      setTimeout(() => setPmExportFeedback(''), 4000)
      return
    }

    let narrativeWasOpen = false
    let narrativeEl = null

    try {
      const s = portfolioExecutiveSummary
      await exportHtmlToStrefexPdfOnePage(el, {
        orientation,
        captureWidthPx: orientation === 'l'
          ? PM_PDF_CAPTURE_WIDTH.landscape
          : PM_PDF_CAPTURE_WIDTH.portrait,
        title: 'Portfolio executive summary',
        subtitle: `Roll-up as of ${s.reportDate} · ${s.projectCount} project${s.projectCount === 1 ? '' : 's'} · On track ${s.ragGreen} · Watch ${s.ragAmber} · At risk ${s.ragRed}`,
        filename: 'portfolio-executive-summary.pdf',
        printedBy,
        beforeCapture: (root) => {
          narrativeEl = root.querySelector('details.pm-portfolio-narrative-details')
          narrativeWasOpen = narrativeEl ? narrativeEl.open : false
          if (narrativeEl) narrativeEl.open = true
        },
        afterCapture: () => {
          if (narrativeEl && !narrativeWasOpen) narrativeEl.open = false
        },
      })
      try {
        sessionStorage.setItem('pm-portfolio-pdf-orientation', orientation)
      } catch { /* ignore */ }
      setShowPortfolioPdfModal(false)
      setPmExportFeedback('PDF saved.')
      setTimeout(() => setPmExportFeedback(''), 4000)
    } catch (err) {
      console.error('Portfolio PDF export:', err)
      setPmExportFeedback('Could not create PDF.')
      setTimeout(() => setPmExportFeedback(''), 5000)
    } finally {
      setPortfolioPdfExporting(false)
    }
  }, [portfolioExecutiveSummary, currentUser])

  const handleExportPDF = useCallback(async () => {
    if (view === 'portfolio') {
      setShowPortfolioPdfModal(true)
      return
    }

    setPmExportFeedback('')
    const printedBy = currentUser?.name || currentUser?.companyName || currentUser?.email || 'Unknown'
    const html2canvas = (await import('html2canvas')).default
    const { default: jsPDF } = await import('jspdf')

    const finishGanttFit = (wasFitted) => {
      if (wasFitted) setTimeout(() => handleFitToggle(), 200)
    }

    try {
      if (view === 'table') {
        const el = tableExportRef.current
        if (!el) {
          setPmExportFeedback('Nothing to export.')
          setTimeout(() => setPmExportFeedback(''), 4000)
          return
        }
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          width: el.scrollWidth,
          height: el.scrollHeight,
          windowWidth: el.scrollWidth,
          windowHeight: el.scrollHeight,
          scrollX: 0,
          scrollY: 0,
        })
        const logo = await loadStrefexLogoForPdf()
        const pdf = new jsPDF('l', 'mm', 'a4')
        const w = pdf.internal.pageSize.getWidth()
        const pageH = pdf.internal.pageSize.getHeight()
        const title = selectedProject?.name ? `Task register — ${selectedProject.name}` : 'Task register'
        const headerH = drawPmPdfHeader(pdf, w, title, logo)
        let subText = ''
        if (stats && selectedProject) {
          subText = `Tasks: ${stats.totalTasks}  |  Done: ${stats.completedTasks}  |  Progress: ${stats.avgProgress}%  |  Budget: ${selectedProject.currency} ${stats.budget.toLocaleString()}  |  Spent: ${selectedProject.currency} ${stats.totalCost.toLocaleString()}`
        }
        const subH = drawPmPdfSubtitleBar(pdf, w, headerH, subText)
        const contentTop = headerH + subH + 2
        addPmPdfCanvasFit(pdf, canvas, w, pageH, contentTop)
        drawPmPdfFooter(pdf, w, pageH, 'Page 1 of 1', printedBy)
        const safe = (selectedProject?.name || 'project').replace(/[/\\?%*:|"<>]/g, '-')
        pdf.save(`${safe}-tasks.pdf`)
        setPmExportFeedback('PDF saved.')
        setTimeout(() => setPmExportFeedback(''), 4000)
        return
      }

      if (!ganttRef.current) {
        setPmExportFeedback('Nothing to export.')
        setTimeout(() => setPmExportFeedback(''), 4000)
        return
      }
      const wasFitted = !!fitState
      if (wasFitted) setFitState(null)
      await new Promise((r) => setTimeout(r, 150))

      const el = ganttRef.current
      const timeline = timelineRef.current
      const fitWrap = fitWrapRef.current

      const saved = []
      const expand = (node, styles) => {
        if (!node) return
        const orig = {}
        Object.keys(styles).forEach((k) => { orig[k] = node.style[k]; node.style[k] = styles[k] })
        saved.push({ node, orig })
      }

      const fullTimelineW = timeline ? timeline.scrollWidth : timelineWidth
      const fullTimelineH = timeline ? timeline.scrollHeight : allTasksFlat.length * ROW_H + 60
      const nameRailW = taskListRef.current?.offsetWidth || 148
      const fullW = nameRailW + fullTimelineW
      const fullH = fullTimelineH

      expand(fitWrap, { overflow: 'visible', width: `${fullW}px`, height: `${fullH}px`, maxHeight: 'none' })
      expand(el, { overflow: 'visible', width: `${fullW}px`, height: `${fullH}px`, maxHeight: 'none', flex: 'none' })
      expand(timeline, { overflow: 'visible', width: `${fullTimelineW}px`, height: `${fullTimelineH}px`, maxHeight: 'none', flex: 'none' })

      await new Promise((r) => setTimeout(r, 100))

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        width: el.scrollWidth || fullW,
        height: el.scrollHeight || fullH,
        windowWidth: el.scrollWidth || fullW,
        windowHeight: el.scrollHeight || fullH,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      })

      saved.forEach(({ node, orig }) => {
        Object.keys(orig).forEach((k) => { node.style[k] = orig[k] })
      })

      const logo = await loadStrefexLogoForPdf()
      const pdf = new jsPDF('l', 'mm', 'a4')
      const w = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const headerH = drawPmPdfHeader(pdf, w, selectedProject?.name || 'Project Timeline', logo)
      let subText = ''
      if (stats && selectedProject) {
        subText = `Tasks: ${stats.totalTasks}  |  Done: ${stats.completedTasks}  |  Progress: ${stats.avgProgress}%  |  Budget: ${selectedProject.currency} ${stats.budget.toLocaleString()}  |  Spent: ${selectedProject.currency} ${stats.totalCost.toLocaleString()}`
      }
      const subH = drawPmPdfSubtitleBar(pdf, w, headerH, subText)
      const contentTop = headerH + subH + 2
      addPmPdfCanvasFit(pdf, canvas, w, pageH, contentTop)
      drawPmPdfFooter(pdf, w, pageH, 'Page 1 of 1', printedBy)
      const safe = (selectedProject?.name || 'project').replace(/[/\\?%*:|"<>]/g, '-')
      pdf.save(`${safe}-gantt.pdf`)
      setPmExportFeedback('PDF saved.')
      setTimeout(() => setPmExportFeedback(''), 4000)
      finishGanttFit(wasFitted)
    } catch (err) {
      console.error('PDF export:', err)
      setPmExportFeedback('Could not create PDF.')
      setTimeout(() => setPmExportFeedback(''), 5000)
    }
  }, [
    view,
    fitState,
    stats,
    selectedProject,
    currentUser,
    timelineWidth,
    allTasksFlat,
    handleFitToggle,
  ])

  const togglePhase = (id) => setExpandedPhases((p) => ({ ...p, [id]: !p[id] }))
  const handleCloseContextMenu = () => setContextMenu(null)

  /* ═══════════════════════════════════════════════════
   *  RENDER — Gantt Bar
   * ═══════════════════════════════════════════════════ */
  const renderGanttBar = (task, rowIdx, projectId, color) => {
    const dr = dragRef.current
    const isDragging = dr && dr.taskId === task.id
    let left = dateToPx(task.startDate)
    let width = Math.max(minBarW, dateToPx(task.endDate) - dateToPx(task.startDate) + minBarW)

    if (isDragging) {
      const dx = dr.dx || 0
      if (dr.mode === 'move') { left += dx }
      else if (dr.mode === 'resize-end') { width = Math.max(minBarW, width + dx) }
      else if (dr.mode === 'resize-start') { left += dx; width = Math.max(minBarW, width - dx) }
    }

    const pct = task.progressPercent ?? 0
    const statusKey = task.status || 'not-started'
    const barStatusClass = STATUS_BAR_CLASS[statusKey] || STATUS_BAR_CLASS['not-started']
    const isPhase = task._isPhase
    const pid = projectId || selectedProjectId

    return (
      <div
        key={task.id}
        className={`gc-bar-row ${isDragging ? 'gc-dragging' : ''}`}
        style={{ top: rowIdx * ROW_H, height: ROW_H }}
        onContextMenu={(e) => handleContextMenu(e, task, pid)}
        onDoubleClick={() => handleEditTaskOpen(task, pid)}
      >
        {/* Baseline ghost */}
        {showBaseline && task.baselineStart && task.baselineEnd && (
          <div
            className="gc-bar-baseline"
            style={{ left: dateToPx(task.baselineStart), width: Math.max(minBarW, dateToPx(task.baselineEnd) - dateToPx(task.baselineStart) + minBarW) }}
          />
        )}
        {/* Main bar */}
        <div
          className={`gc-bar ${isPhase ? 'gc-bar-phase' : ''} ${isDragging ? 'gc-bar-active' : ''}`}
          style={{ left, width }}
        >
          {/* Left resize handle */}
          <div className="gc-bar-handle gc-bar-handle-l" onMouseDown={(e) => handleBarMouseDown(e, task, pid, 'resize-start')} />
          {/* Bar body — drag to move */}
          <div className={`gc-bar-body ${barStatusClass}`} onMouseDown={(e) => handleBarMouseDown(e, task, pid, 'move')} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
            {statusKey === 'in-progress' && pct > 0 && pct < 100 ? (
              <>
                <div className="gc-bar-fill" style={{ width: `${pct}%` }} />
                <div className="gc-bar-remaining" style={{ width: `${100 - pct}%` }} />
              </>
            ) : null}
          </div>
          {/* Right resize handle */}
          <div className="gc-bar-handle gc-bar-handle-r" onMouseDown={(e) => handleBarMouseDown(e, task, pid, 'resize-end')} />
          {/* Label */}
          <span className="gc-bar-label" title={task.name}>
            {width > 48 ? task.name : ''}{pct > 0 ? (width > 72 ? ` · ${pct}%` : ` ${pct}%`) : ''}
          </span>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════
   *  RENDER — Main
   * ═══════════════════════════════════════════════════ */
  const pid = selectedProjectId || projects[0]?.id
  const projColor = PROJECT_COLORS[(projects.findIndex((p) => p.id === pid) || 0) % PROJECT_COLORS.length]

  return (
    <AppLayout>
      <div className="gc-page" onClick={handleCloseContextMenu}>
        {pmExportFeedback ? (
          <div className="gc-pm-export-feedback app-page-alert app-page-alert--success" role="status">
            {pmExportFeedback}
          </div>
        ) : null}

        <div className="gc-body">
          <div className="gc-pm-workbench">
            {/* ── Single compact control widget ─────────────── */}
            <div className="gc-pm-control">
              <div className="gc-pm-control-head">
                <div className="gc-pm-control-head-left">
                  <ManagementBreadcrumb trail={[{ label: 'Project Management' }]} />
                  <div className="gc-pm-title-row">
                    <h1 className="gc-title">Project Management</h1>
                    <div className="gc-view-tabs" role="tablist" aria-label="Schedule view">
                      <button type="button" role="tab" aria-selected={view === 'timeline'} className={`gc-vtab ${view === 'timeline' ? 'active' : ''}`} onClick={() => setView('timeline')}>Gantt</button>
                      <button type="button" role="tab" aria-selected={view === 'table'} className={`gc-vtab ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</button>
                      <button type="button" role="tab" aria-selected={view === 'portfolio'} className={`gc-vtab ${view === 'portfolio' ? 'active' : ''}`} onClick={() => setView('portfolio')}>Portfolio</button>
                    </div>
                  </div>
                </div>
                <div className="gc-pm-control-head-actions">
                  <button type="button" className="app-page-btn-outline app-page-btn-sm gc-toolbar-btn gc-pm-add-btn" onClick={() => projectLimit.allowed ? setShowAddProject(true) : alert(`Project limit reached (${projectLimit.limit}).`)}>
                    + Project{projectLimit.limit !== Infinity ? ` (${projectLimit.remaining})` : ''}
                  </button>
                  <button type="button" className="app-page-btn-primary app-page-btn-sm gc-toolbar-btn gc-pm-add-btn" onClick={() => setShowAddTask(true)}>+ Task</button>
                </div>
              </div>

              <div className="gc-project-strip">
                <div className="gc-project-strip-scroll">
                  <button type="button" className={`gc-project-chip ${!selectedProjectId ? 'active' : ''}`} onClick={() => setSelectedProjectId(null)}>
                    <span className="gc-ws-dot" style={{ background: '#94a3b8' }} />
                    All
                  </button>
                  {projects.map((p, i) => (
                    <div key={p.id} className={`gc-project-chip-wrap ${selectedProjectId === p.id ? 'active' : ''}`}>
                      <button type="button" className="gc-project-chip" onClick={() => setSelectedProjectId(p.id)}>
                        <span className={ragDotClass(p.portfolioRag)} title="RAG" aria-hidden />
                        <span className="gc-ws-dot" style={{ background: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                        <span className="gc-project-chip-name">{p.name}</span>
                        <span className="gc-ws-count">{flattenTasks(p.tasks).length}</span>
                      </button>
                      <select className="gc-ws-rag-select gc-ws-rag-select--chip" aria-label={`RAG for ${p.name}`} value={p.portfolioRag || 'green'} onClick={(e) => e.stopPropagation()} onChange={(e) => updateProject(p.id, { portfolioRag: e.target.value })}>
                        {RAG_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                      </select>
                      <button type="button" className="gc-ws-del gc-ws-del--chip" onClick={() => handleDeleteProject(p.id)} aria-label={`Delete ${p.name}`}>×</button>
                    </div>
                  ))}
                  <span className="gc-ws-badge gc-ws-badge--inline">{projects.length}{projectLimit.limit !== Infinity ? `/${projectLimit.limit}` : ''}</span>
                </div>
              </div>

              <div className="gc-pm-control-bar">
                {selectedProjectId ? (
                  <div className="gc-pm-control-section gc-pm-control-section--tools">
                    <div className="gc-toolbar-group gc-toolbar-group--wrap gc-toolbar-group--dense">
                      <button type="button" className="gc-chip-btn" onClick={() => setShowRevisions(true)}>Revisions</button>
                      <button type="button" className="gc-chip-btn" onClick={() => setShowResources(true)}>Resources</button>
                      <button type="button" className="gc-chip-btn" onClick={() => { setBaseline(selectedProjectId); setShowBaseline(true) }}>Baseline</button>
                      <button type="button" className={`gc-chip-btn ${showBaseline ? 'active' : ''}`} onClick={() => setShowBaseline(!showBaseline)}>{showBaseline ? 'Hide BL' : 'Show BL'}</button>
                      <button type="button" className="gc-chip-btn" onClick={() => setShowFalconKpis(true)}>KPIs</button>
                      <button type="button" className="gc-chip-btn" onClick={() => setShowFalconRisks(true)}>Risks</button>
                      <button type="button" className="gc-chip-btn" onClick={() => setShowFalconTags(true)}>Tags</button>
                    </div>
                  </div>
                ) : null}

                {view === 'timeline' && (
                  <div className="gc-pm-control-section">
                    <div className="gc-scale-tabs" role="tablist" aria-label="Timeline scale">
                      {Object.values(GANTT_SCALES).map((s) => (
                        <button key={s.id} type="button" role="tab" aria-selected={timeScale === s.id} className={`gc-scale-tab ${timeScale === s.id ? 'active' : ''}`} onClick={() => setTimeScale(s.id)}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="gc-pm-control-section gc-pm-control-section--view">
                  <button type="button" className={`gc-chip-btn gc-chip-btn--icon ${showFilter ? 'active' : ''}`} onClick={() => setShowFilter(!showFilter)} title="Filter">Filter</button>
                  <button type="button" className="gc-chip-btn gc-chip-btn--icon" onClick={handleExportPDF} title="Save PDF">PDF</button>
                  {view === 'timeline' && (
                    <button type="button" className={`gc-chip-btn gc-chip-btn--icon ${fitState ? 'active' : ''}`} onClick={handleFitToggle} title={fitState ? 'Reset zoom' : 'Fit to screen'}>{fitState ? 'Reset' : 'Fit'}</button>
                  )}
                </div>

                {stats && selectedProject && view !== 'portfolio' && (
                  <div className="gc-pm-control-section gc-pm-control-section--stats">
                    <div className="gc-stats-inline">
                      <span className="gc-stats-inline-item"><strong>{stats.totalTasks}</strong> tasks</span>
                      <span className="gc-stats-inline-item gc-stat-green"><strong>{stats.completedTasks}</strong> done</span>
                      <span className="gc-stats-inline-item gc-stat-blue"><strong>{stats.avgProgress}%</strong></span>
                      <span className="gc-stats-inline-item"><strong>{selectedProject.currency} {(stats.budget / 1000).toFixed(0)}k</strong> budget</span>
                      <span className="gc-stats-inline-item gc-stat-orange"><strong>{selectedProject.currency} {(stats.totalCost / 1000).toFixed(0)}k</strong> spent</span>
                      <span className={`gc-stats-inline-item ${stats.budgetRemaining < 0 ? 'gc-stat-red' : 'gc-stat-green'}`}>
                        <strong>{selectedProject.currency} {(stats.budgetRemaining / 1000).toFixed(0)}k</strong> left
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {showFilter && (
                <div className="gc-filter-row gc-filter-row--inline">
                  <label>{t('pmFilter.statusLabel')} <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="">{t('pmFilter.all')}</option><option value="not-started">{t('pmFilter.task.not-started')}</option><option value="in-progress">{t('pmFilter.task.in-progress')}</option><option value="complete">{t('pmFilter.task.complete')}</option></select></label>
                  <label>{t('pmFilter.assigneeLabel')} <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}><option value="">{t('pmFilter.all')}</option>{assignees.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
                </div>
              )}
            </div>

          {/* Main Area */}
          <main className={`gc-main${view === 'portfolio' ? ' gc-main--portfolio' : ''}`}>
            {view === 'portfolio' && (
              <div ref={portfolioExportRef} className="pm-portfolio-shell app-page">
                <div ref={portfolioSummaryExportRef} className="app-page-card pm-portfolio-report">
                  <div className="pm-portfolio-report-header">
                    <div className="pm-portfolio-report-intro">
                      <h2 className="app-page-title">Portfolio executive summary</h2>
                      <p className="app-page-subtitle pm-portfolio-report-meta">
                        Roll-up as of <strong>{portfolioExecutiveSummary.reportDate}</strong>
                        {' · '}
                        {portfolioExecutiveSummary.projectCount} project{portfolioExecutiveSummary.projectCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="pm-portfolio-report-actions pm-pdf-exclude">
                      <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={handleExportPDF}>
                        Save PDF
                      </button>
                    </div>
                  </div>

                  <details className="pm-portfolio-narrative-details">
                    <summary className="pm-portfolio-narrative-summary">
                      Executive narrative
                      <span className="pm-portfolio-narrative-hint">Optional detail — metrics below are authoritative</span>
                    </summary>
                    <p className="app-page-body pm-portfolio-narrative">{portfolioExecutiveSummary.narrative}</p>
                  </details>

                  <div className="app-page-section-label pm-portfolio-pulse-heading">Portfolio pulse</div>
                  <div className="pm-portfolio-kpi-grid pm-metric-grid">
                    <div className="pm-metric-tile pm-metric-tile--muted">
                      <div className="pm-metric-tile-value">{portfolioExecutiveSummary.projectCount}</div>
                      <div className="pm-metric-tile-label">Projects</div>
                    </div>
                    <div className="pm-metric-tile pm-metric-tile--green">
                      <div className="pm-metric-tile-value">{portfolioExecutiveSummary.ragGreen}</div>
                      <div className="pm-metric-tile-label">On track</div>
                    </div>
                    <div className="pm-metric-tile pm-metric-tile--amber">
                      <div className="pm-metric-tile-value">{portfolioExecutiveSummary.ragAmber}</div>
                      <div className="pm-metric-tile-label">Watch</div>
                    </div>
                    <div className="pm-metric-tile pm-metric-tile--red">
                      <div className="pm-metric-tile-value">{portfolioExecutiveSummary.ragRed}</div>
                      <div className="pm-metric-tile-label">At risk</div>
                    </div>
                    <div className="pm-metric-tile pm-metric-tile--blue">
                      <div className="pm-metric-tile-value">{portfolioExecutiveSummary.weightedAvgProgress}%</div>
                      <div className="pm-metric-tile-label">Weighted progress</div>
                    </div>
                    <div className="pm-metric-tile pm-metric-tile--muted">
                      <div className="pm-metric-tile-value">{portfolioExecutiveSummary.completedTasks}/{portfolioExecutiveSummary.totalTasks}</div>
                      <div className="pm-metric-tile-label">Tasks complete</div>
                    </div>
                    <div className="pm-metric-tile pm-metric-tile--orange">
                      <div className="pm-metric-tile-value">{portfolioExecutiveSummary.primaryCurrency} {portfolioExecutiveSummary.totalSpent.toLocaleString()}</div>
                      <div className="pm-metric-tile-label">Total spent</div>
                    </div>
                    <div className={`pm-metric-tile ${portfolioExecutiveSummary.budgetRemaining < 0 ? 'pm-metric-tile--red' : 'pm-metric-tile--green'}`}>
                      <div className="pm-metric-tile-value">{portfolioExecutiveSummary.primaryCurrency} {portfolioExecutiveSummary.budgetRemaining.toLocaleString()}</div>
                      <div className="pm-metric-tile-label">Budget remaining</div>
                    </div>
                    <div className="pm-metric-tile pm-metric-tile--muted">
                      <div className="pm-metric-tile-value">{portfolioExecutiveSummary.openRisksAll}</div>
                      <div className="pm-metric-tile-label">Open risks</div>
                    </div>
                    <div className={`pm-metric-tile ${portfolioExecutiveSummary.escalatedRisksAll > 0 ? 'pm-metric-tile--red' : 'pm-metric-tile--muted'}`}>
                      <div className="pm-metric-tile-value">{portfolioExecutiveSummary.escalatedRisksAll}</div>
                      <div className="pm-metric-tile-label">Escalated</div>
                    </div>
                    <div className="pm-metric-tile pm-metric-tile--muted">
                      <div className="pm-metric-tile-value">
                        {portfolioExecutiveSummary.kpiTotal > 0
                          ? `${portfolioExecutiveSummary.kpiOnTrack}/${portfolioExecutiveSummary.kpiTotal}`
                          : '—'}
                      </div>
                      <div className="pm-metric-tile-label">KPIs ≥85% target</div>
                    </div>
                  </div>

                  {portfolioExecutiveSummary.atRiskNames.length > 0 && (
                    <div className="app-page-section pm-portfolio-at-risk">
                      <div className="app-page-section-label">Projects at risk (RAG red)</div>
                      <p className="app-page-section-value">{portfolioExecutiveSummary.atRiskNames.join(' · ')}</p>
                    </div>
                  )}

                  <div className="pm-portfolio-exec-columns">
                    <div className="app-page-section pm-portfolio-exec-col">
                      <div className="app-page-section-label">Risk &amp; escalation highlights</div>
                      {portfolioExecutiveSummary.riskHotList.length === 0 ? (
                        <p className="app-page-body pm-portfolio-exec-body">No high-severity or escalated open risks logged.</p>
                      ) : (
                        <ul className="pm-portfolio-bullet-list">
                          {portfolioExecutiveSummary.riskHotList.map((r, idx) => (
                            <li key={`${r.project}-${idx}`}>
                              <strong>{r.project}</strong> — {r.title}
                              <span className="pm-portfolio-meta">
                                {' '}
                                ({r.severity}
                                {r.escalated ? ', escalated' : ''})
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="app-page-section pm-portfolio-exec-col pm-portfolio-exec-col--benefits">
                      <div className="app-page-section-label">Strategic benefits (per project)</div>
                      {portfolioExecutiveSummary.benefitLines.length === 0 ? (
                        <p className="app-page-body pm-portfolio-exec-body">Add narrative under KPIs &amp; benefits for each project to surface outcomes here.</p>
                      ) : (
                        <ul className="pm-portfolio-benefit-list">
                          {portfolioExecutiveSummary.benefitLines.map((b) => (
                            <li key={b.name}>
                              <span className="pm-portfolio-benefit-name">{b.name}</span>
                              <span className="pm-portfolio-benefit-text">{b.text}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <div className="app-page-card pm-portfolio-register">
                  <h3 className="app-page-section-heading">Project register</h3>
                  <p className="app-page-subtitle" style={{ marginTop: -4 }}>
                    Traffic-light status, tags, delivery, finance, risks, and KPI snapshot. Use actions to open the Gantt for detail scheduling.
                  </p>
                  <div className="stx-fluid-table-wrap">
                    <table className="stx-fluid-table">
                      <thead>
                        <tr>
                          <th>RAG</th>
                          <th>Project #</th>
                          <th>Project</th>
                          <th>Tags</th>
                          <th>Tasks</th>
                          <th>Done</th>
                          <th>Progress</th>
                          <th>Budget</th>
                          <th>Spent</th>
                          <th>Open risks</th>
                          <th>KPIs (≥85%)</th>
                          <th className="pm-pdf-exclude">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioRows.length === 0 && (
                          <tr>
                            <td colSpan={12} className="app-page-list-empty">
                              No projects yet. Create one from + Project.
                            </td>
                          </tr>
                        )}
                        {portfolioRows.map((row) => {
                          const p = row.project
                          const st = row.stats
                          return (
                            <tr key={p.id}>
                              <td>
                                <select
                                  className="pm-portfolio-table-rag"
                                  value={row.rag}
                                  onChange={(e) => updateProject(p.id, { portfolioRag: e.target.value })}
                                  aria-label="RAG status"
                                >
                                  {RAG_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </td>
                              <td><code className="pcc-ref-id">{p.projectNumber || '—'}</code></td>
                              <td>
                                <span className="gc-ws-dot" style={{ background: row.color }} />
                                <strong>{p.name}</strong>
                              </td>
                              <td className="pm-portfolio-tags-cell">{row.tags}</td>
                              <td>{st?.totalTasks ?? 0}</td>
                              <td>{st?.completedTasks ?? 0}</td>
                              <td>{st?.avgProgress ?? 0}%</td>
                              <td>{p.currency} {(p.budget || 0).toLocaleString()}</td>
                              <td>{p.currency} {(st?.totalCost ?? 0).toLocaleString()}</td>
                              <td>
                                {st?.openRisks ?? 0}
                                {st?.escalatedRisks ? (
                                  <span className="pm-portfolio-meta"> ({st.escalatedRisks} escalated)</span>
                                ) : null}
                              </td>
                              <td>{row.kpiLabel}</td>
                              <td className="pm-pdf-exclude">
                                <button
                                  type="button"
                                  className="app-page-btn-outline app-page-btn-sm"
                                  onClick={() => navigate(`/project-management/project/${p.id}/control`)}
                                >
                                  Control
                                </button>
                                <button
                                  type="button"
                                  className="app-page-btn-primary app-page-btn-sm"
                                  onClick={() => {
                                    setSelectedProjectId(p.id)
                                    setView('timeline')
                                  }}
                                >
                                  Open Gantt
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {view === 'table' && (
              <div ref={tableExportRef} className="gc-table-wrap">
                <table className="gc-table">
                  <thead><tr><th>#</th><th>Task</th><th>Duration</th><th>Start</th><th>End</th><th>Assignee</th><th>Status</th><th>Progress</th><th>Predecessors</th></tr></thead>
                  <tbody>
                    {allTasksFlat.length === 0 && <tr><td colSpan={9} className="gc-empty">No tasks. Click "+ New Task" to create one.</td></tr>}
                    {allTasksFlat.map((t, i) => (
                      <tr key={t.id} className={t._isPhase ? 'gc-row-phase' : t._isChild ? 'gc-row-child' : ''} onContextMenu={(e) => handleContextMenu(e, t)} onDoubleClick={() => handleEditTaskOpen(t)}>
                        <td className="gc-col-num">{i + 1}</td>
                        <td className="gc-col-name">
                          {t._isPhase && <button className="gc-expand-btn" onClick={() => togglePhase(t.id)}>{expandedPhases[t.id] ? '▼' : '▶'}</button>}
                          {t._isChild && <span className="gc-indent" />}
                          {t.name}
                        </td>
                        <td className="gc-col-dur">{calcDuration(t.startDate, t.endDate)}d</td>
                        <td className="gc-col-date">{fmtShortDate(t.startDate)}</td>
                        <td className="gc-col-date">{fmtShortDate(t.endDate)}</td>
                        <td className="gc-col-assign">{t.assignee || '—'}</td>
                        <td><span className={`gc-status gc-status-${t.status}`}>{t.status === 'complete' ? 'Done' : t.status === 'in-progress' ? 'Active' : 'Pending'}</span></td>
                        <td className="gc-col-pct">{t.progressPercent ?? 0}%</td>
                        <td className="gc-col-pred">{getPredLabel(t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {view === 'timeline' && (
              <div className={`gc-fit-wrapper ${fitState ? 'gc-fit-active' : ''}`} ref={fitWrapRef}>
                <div
                  className={`gc-gantt gc-gantt--${timeScale} ${fitState ? 'gc-gantt-fitted' : ''}`}
                  ref={ganttRef}
                  style={fitState ? {
                    transform: `scale(${fitState.scale})`,
                    transformOrigin: '0 0',
                    width: fitState.contentW,
                    height: fitState.contentH,
                  } : {}}
                >
                {/* Slim task name rail (no full task grid) */}
                <div className="gc-gantt-names">
                  <div className="gc-gantt-names-head">Task</div>
                  <div className="gc-gantt-names-scroll" ref={taskListRef} onScroll={() => syncScroll('names')}>
                    {allTasksFlat.map((t, i) => (
                      <div
                        key={t.id}
                        className={`gc-gantt-name-row ${t._isPhase ? 'gc-gantt-name-row--phase' : ''} ${t._isChild ? 'gc-gantt-name-row--child' : ''}`}
                        style={{ height: ROW_H }}
                        onDoubleClick={() => handleEditTaskOpen(t)}
                        onContextMenu={(e) => handleContextMenu(e, t)}
                        title={t.name}
                      >
                        {t._isPhase && (
                          <button type="button" className="gc-expand-btn" onClick={() => togglePhase(t.id)}>
                            {expandedPhases[t.id] ? '▼' : '▶'}
                          </button>
                        )}
                        <span className="gc-gantt-name-text">{t.name}</span>
                      </div>
                    ))}
                    {paddedEmptyTaskRows > 0
                      ? Array.from({ length: paddedEmptyTaskRows }, (_, i) => (
                          <div key={`nm-empty-${i}`} className="gc-gantt-name-row gc-gantt-name-row--empty" style={{ height: ROW_H }} aria-hidden />
                        ))
                      : null}
                  </div>
                </div>

                {/* Timeline */}
                <div className={`gc-timeline gc-timeline--${timeScale}`} ref={timelineRef} onScroll={() => syncScroll('timeline')}>
                  <div className="gc-tm-months" style={{ width: Math.max(timelineWidth, timelineViewportW || 0) }}>
                    {headerGroups.map((m) => (
                      <div key={m.key} className="gc-tm-month" style={{ width: m.width }}>{m.label}</div>
                    ))}
                  </div>
                  <div className="gc-tm-days" style={{ width: Math.max(timelineWidth, timelineViewportW || 0) }}>
                    {gridColumns.map((c) => (
                      <div
                        key={c.key}
                        className={`gc-tm-day ${c.isWeekend ? 'gc-tm-weekend' : ''} ${c.isToday ? 'gc-tm-today' : ''}`}
                        style={{ width: c.width }}
                        title={c.sub || c.label}
                      >
                        <span className="gc-tm-day-main">{c.label}</span>
                        {c.sub && timeScale === 'week' ? (
                          <span className="gc-tm-day-sub">{c.sub}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="gc-tm-body" style={{ width: Math.max(timelineWidth, timelineViewportW || 0), height: ganttTmBodyHeightPx }}>
                    {gridColumns.map((c) => (
                      <div
                        key={`gl-${c.key}`}
                        className={`gc-tm-gridline ${c.isWeekend ? 'gc-tm-gl-weekend' : ''}`}
                        style={{ left: c.left, width: c.width, height: '100%' }}
                      />
                    ))}
                    {Array.from({ length: ganttRowLineCount }, (_, i) => (
                      <div key={i} className="gc-tm-rowline" style={{ top: (i + 1) * ROW_H }} />
                    ))}
                    {todayPx > 0 && todayPx < timelineWidth && (
                      <div className="gc-today-line" style={{ left: todayPx + minBarW / 2 }}>
                        <span className="gc-today-label">Today</span>
                      </div>
                    )}
                    <svg className="gc-arrows-svg" width={Math.max(timelineWidth, timelineViewportW || 0)} height={taskGridBodyPx} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                      <defs>
                        <marker id="arrowFS" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#e74c3c" /></marker>
                        <marker id="arrowSS" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f39c12" /></marker>
                      </defs>
                      {arrowPaths.map((a) => (
                        <path key={a.key} d={a.d} fill="none" stroke={a.type === 'FS' ? '#e74c3c' : '#f39c12'} strokeWidth="1.5" markerEnd={`url(#arrow${a.type})`} opacity="0.7" />
                      ))}
                    </svg>
                    {allTasksFlat.map((t, i) => renderGanttBar(t, i, pid, projColor))}
                  </div>
                </div>
                </div>
              </div>
            )}

            {/* Legend */}
            {view === 'timeline' && (
              <div className="gc-legend gc-legend--compact">
                <span className="gc-legend-item"><span className="gc-legend-box gc-legend-planned" /> Planned</span>
                <span className="gc-legend-item"><span className="gc-legend-box gc-legend-progress" /> In progress</span>
                <span className="gc-legend-item"><span className="gc-legend-box gc-legend-complete" /> Complete</span>
                <span className="gc-legend-item"><span className="gc-legend-line" style={{ background: '#e74c3c' }} /> FS</span>
                <span className="gc-legend-item"><span className="gc-legend-line" style={{ background: '#f39c12' }} /> SS</span>
                {showBaseline && <span className="gc-legend-item"><span className="gc-legend-box gc-legend-bl" /> Baseline</span>}
              </div>
            )}
          </main>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
         *  MODALS
         * ═══════════════════════════════════════════════ */}

        {/* Falcon-style PPM: KPIs & benefits */}
        {showFalconKpis && selectedProject && selectedProjectId && (
          <div className="pm-modal-overlay" onClick={() => setShowFalconKpis(false)}>
            <div className="pm-modal pm-modal-lg pm-modal--platform" onClick={(e) => e.stopPropagation()}>
              <h3 className="app-page-title" style={{ fontSize: 18 }}>KPIs &amp; strategic benefits</h3>
              <p className="app-page-body gc-falcon-hint">
                Measurable targets and benefit narrative for executives — complements the Gantt schedule.
              </p>
              <div className="pm-form-group">
                <label className="pm-label">Benefits / strategic note</label>
                <textarea
                  className="pm-input"
                  rows={3}
                  value={selectedProject.benefitNote || ''}
                  onChange={(e) => updateProject(selectedProjectId, { benefitNote: e.target.value })}
                  placeholder="Expected outcomes, savings, time-to-market…"
                />
              </div>
              <h4 className="app-page-section-label" style={{ marginTop: 16 }}>KPIs</h4>
              {(selectedProject.kpis || []).length === 0 ? (
                <p className="pm-no-tasks">No KPIs yet. Add one to track attainment vs target.</p>
              ) : null}
              {(selectedProject.kpis || []).map((k, idx) => (
                <div key={k.id} className="gc-falcon-kpi-row">
                  <input
                    className="pm-input"
                    value={k.name}
                    placeholder="KPI name"
                    onChange={(e) => {
                      const kpis = [...(selectedProject.kpis || [])]
                      kpis[idx] = { ...kpis[idx], name: e.target.value }
                      updateProject(selectedProjectId, { kpis })
                    }}
                  />
                  <input
                    type="number"
                    className="pm-input gc-falcon-num"
                    value={k.current}
                    title="Current"
                    onChange={(e) => {
                      const kpis = [...(selectedProject.kpis || [])]
                      kpis[idx] = { ...kpis[idx], current: parseFloat(e.target.value) || 0 }
                      updateProject(selectedProjectId, { kpis })
                    }}
                  />
                  <span className="gc-falcon-slash">/</span>
                  <input
                    type="number"
                    className="pm-input gc-falcon-num"
                    value={k.target}
                    title="Target"
                    onChange={(e) => {
                      const kpis = [...(selectedProject.kpis || [])]
                      kpis[idx] = { ...kpis[idx], target: parseFloat(e.target.value) || 0 }
                      updateProject(selectedProjectId, { kpis })
                    }}
                  />
                  <input
                    className="pm-input gc-falcon-unit"
                    value={k.unit || ''}
                    placeholder="unit"
                    onChange={(e) => {
                      const kpis = [...(selectedProject.kpis || [])]
                      kpis[idx] = { ...kpis[idx], unit: e.target.value }
                      updateProject(selectedProjectId, { kpis })
                    }}
                  />
                    <button
                      type="button"
                      className="app-page-btn-danger app-page-btn-sm"
                      onClick={() => {
                        const kpis = (selectedProject.kpis || []).filter((_, j) => j !== idx)
                        updateProject(selectedProjectId, { kpis })
                      }}
                    >
                      Remove
                    </button>
                </div>
              ))}
              <div className="pm-modal-buttons pm-modal-buttons--platform" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="app-page-btn-outline app-page-btn-sm"
                  onClick={() => {
                    const kpis = [...(selectedProject.kpis || []), {
                      id: `kpi-${Date.now()}`,
                      name: '',
                      target: 100,
                      current: 0,
                      unit: 'count',
                    }]
                    updateProject(selectedProjectId, { kpis })
                  }}
                >
                  + Add KPI
                </button>
                <button type="button" className="app-page-btn-primary app-page-btn-sm" onClick={() => setShowFalconKpis(false)}>Done</button>
              </div>
            </div>
          </div>
        )}

        {/* Falcon-style PPM: risk register */}
        {showFalconRisks && selectedProject && selectedProjectId && (
          <div className="pm-modal-overlay" onClick={() => setShowFalconRisks(false)}>
            <div className="pm-modal pm-modal-lg pm-modal--platform" onClick={(e) => e.stopPropagation()}>
              <h3 className="app-page-title" style={{ fontSize: 18 }}>Risk register</h3>
              <p className="app-page-body gc-falcon-hint">
                Track issues with severity and status; mark <strong>Escalated</strong> for red-flag governance.
              </p>
              {(selectedProject.risks || []).length === 0 ? (
                <p className="pm-no-tasks">No risks logged.</p>
              ) : null}
              {(selectedProject.risks || []).map((r, idx) => (
                <div key={r.id} className="gc-falcon-risk-card">
                  <input
                    className="pm-input"
                    value={r.title}
                    placeholder="Risk / issue title"
                    onChange={(e) => {
                      const risks = [...(selectedProject.risks || [])]
                      risks[idx] = { ...risks[idx], title: e.target.value }
                      updateProject(selectedProjectId, { risks })
                    }}
                  />
                  <div className="pm-form-row gc-falcon-risk-controls">
                    <label className="pm-label">Severity</label>
                    <select
                      className="pm-select"
                      value={r.severity || 'med'}
                      onChange={(e) => {
                        const risks = [...(selectedProject.risks || [])]
                        risks[idx] = { ...risks[idx], severity: e.target.value }
                        updateProject(selectedProjectId, { risks })
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="med">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <label className="pm-label">Status</label>
                    <select
                      className="pm-select"
                      value={r.status || 'open'}
                      onChange={(e) => {
                        const risks = [...(selectedProject.risks || [])]
                        risks[idx] = { ...risks[idx], status: e.target.value }
                        updateProject(selectedProjectId, { risks })
                      }}
                    >
                      <option value="open">Open</option>
                      <option value="mitigated">Mitigated</option>
                      <option value="closed">Closed</option>
                    </select>
                    <label className="gc-falcon-check">
                      <input
                        type="checkbox"
                        checked={Boolean(r.escalated)}
                        onChange={(e) => {
                          const risks = [...(selectedProject.risks || [])]
                          risks[idx] = { ...risks[idx], escalated: e.target.checked }
                          updateProject(selectedProjectId, { risks })
                        }}
                      />
                      Escalated (red flag)
                    </label>
                    <button
                      type="button"
                      className="app-page-btn-danger app-page-btn-sm"
                      onClick={() => {
                        const risks = (selectedProject.risks || []).filter((_, j) => j !== idx)
                        updateProject(selectedProjectId, { risks })
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <div className="pm-modal-buttons pm-modal-buttons--platform">
                <button
                  type="button"
                  className="app-page-btn-outline app-page-btn-sm"
                  onClick={() => {
                    const risks = [...(selectedProject.risks || []), {
                      id: `risk-${Date.now()}`,
                      title: '',
                      severity: 'med',
                      status: 'open',
                      escalated: false,
                    }]
                    updateProject(selectedProjectId, { risks })
                  }}
                >
                  + Add risk
                </button>
                <button type="button" className="app-page-btn-primary app-page-btn-sm" onClick={() => setShowFalconRisks(false)}>Done</button>
              </div>
            </div>
          </div>
        )}

        {/* Falcon-style PPM: tags */}
        {showFalconTags && selectedProject && selectedProjectId && (
          <div className="pm-modal-overlay" onClick={() => setShowFalconTags(false)}>
            <div className="pm-modal pm-modal--platform" onClick={(e) => e.stopPropagation()}>
              <h3 className="app-page-title" style={{ fontSize: 18 }}>Portfolio tags</h3>
              <p className="app-page-body gc-falcon-hint">Flexible labels for matrix orgs, programs, or customers (shown in the portfolio register).</p>
              <div className="gc-falcon-tags">
                {(selectedProject.tags || []).map((tag) => (
                  <span key={tag} className="gc-falcon-tag">
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove ${tag}`}
                      onClick={() => {
                        const tags = (selectedProject.tags || []).filter((t) => t !== tag)
                        updateProject(selectedProjectId, { tags })
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="pm-form-group">
                <label className="pm-label">Add tag</label>
                <input
                  className="pm-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    const t = tagInput.trim()
                    if (!t) return
                    const tags = [...new Set([...(selectedProject.tags || []), t])]
                    updateProject(selectedProjectId, { tags })
                    setTagInput('')
                  }}
                  placeholder="Type and press Enter"
                />
              </div>
              <div className="pm-modal-buttons pm-modal-buttons--platform">
                <button type="button" className="app-page-btn-primary app-page-btn-sm" onClick={() => { setTagInput(''); setShowFalconTags(false) }}>Done</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Project */}
        {showPortfolioPdfModal && (
          <div className="pm-modal-overlay" onClick={() => !portfolioPdfExporting && setShowPortfolioPdfModal(false)}>
            <div className="pm-modal pm-modal--platform pm-portfolio-pdf-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="pm-portfolio-pdf-title">
              <h3 id="pm-portfolio-pdf-title">Save portfolio report as PDF</h3>
              <p className="app-page-body pm-portfolio-pdf-modal-lead">
                Choose page orientation for a one-page executive summary. Layout and indicator sizing adjust automatically to fit a single A4 page.
              </p>
              <fieldset className="pm-portfolio-pdf-orientation">
                <legend className="pm-portfolio-pdf-orientation-legend">Page layout</legend>
                <label className={`pm-portfolio-pdf-option${portfolioPdfOrientation === 'p' ? ' pm-portfolio-pdf-option--active' : ''}`}>
                  <input
                    type="radio"
                    name="portfolio-pdf-orientation"
                    value="p"
                    checked={portfolioPdfOrientation === 'p'}
                    onChange={() => setPortfolioPdfOrientation('p')}
                    disabled={portfolioPdfExporting}
                  />
                  <span className="pm-portfolio-pdf-option-title">Portrait (vertical)</span>
                  <span className="pm-portfolio-pdf-option-desc">Compact KPI grid and stacked narrative — best for board packs.</span>
                </label>
                <label className={`pm-portfolio-pdf-option${portfolioPdfOrientation === 'l' ? ' pm-portfolio-pdf-option--active' : ''}`}>
                  <input
                    type="radio"
                    name="portfolio-pdf-orientation"
                    value="l"
                    checked={portfolioPdfOrientation === 'l'}
                    onChange={() => setPortfolioPdfOrientation('l')}
                    disabled={portfolioPdfExporting}
                  />
                  <span className="pm-portfolio-pdf-option-title">Landscape (horizontal)</span>
                  <span className="pm-portfolio-pdf-option-desc">Wide KPI row and two-column risks/benefits — best for executive briefings.</span>
                </label>
              </fieldset>
              <div className="pm-modal-buttons pm-modal-buttons--platform">
                <button
                  type="button"
                  className="pm-btn-secondary"
                  onClick={() => setShowPortfolioPdfModal(false)}
                  disabled={portfolioPdfExporting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pm-btn-primary"
                  onClick={() => runPortfolioPdfExport(portfolioPdfOrientation)}
                  disabled={portfolioPdfExporting}
                >
                  {portfolioPdfExporting ? 'Generating…' : 'Download PDF'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddProject && (
          <div className="pm-modal-overlay" onClick={() => setShowAddProject(false)}>
            <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
              <h3>New Project</h3>
              <div className="pm-form-group"><label className="pm-label">Project Name *</label><input className="pm-input" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} placeholder="My Project" /></div>
              <div className="pm-form-row">
                <div className="pm-form-group"><label className="pm-label">Budget</label><input type="number" className="pm-input" value={newProject.budget} onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })} placeholder="50000" /></div>
                <div className="pm-form-group"><label className="pm-label">Currency</label><select className="pm-select" value={newProject.currency} onChange={(e) => setNewProject({ ...newProject, currency: e.target.value })}><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="RUB">RUB</option><option value="CNY">CNY</option></select></div>
              </div>
              <div className="pm-modal-buttons"><button className="pm-btn-secondary" onClick={() => setShowAddProject(false)}>Cancel</button><button className="pm-btn-primary" onClick={handleAddProject}>Create</button></div>
            </div>
          </div>
        )}

        {/* Add Task */}
        {showAddTask && (
          <div className="pm-modal-overlay" onClick={() => setShowAddTask(false)}>
            <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
              <h3>New Task</h3>
              <div className="pm-form-group"><label className="pm-label">Task Name *</label><input className="pm-input" value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} placeholder="Task name" /></div>
              <div className="pm-form-row">
                <div className="pm-form-group"><label className="pm-label">Start Date</label><input type="date" className="pm-input" value={newTask.startDate} onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })} /></div>
                <div className="pm-form-group">
                  <label className="pm-label">Duration (days)</label>
                  <input type="number" min="1" className="pm-input" value={newTask.duration} onChange={(e) => setNewTask({ ...newTask, duration: e.target.value })} placeholder="5" />
                </div>
              </div>
              {newTask.startDate && newTask.duration && (
                <div className="gc-calc-date">End Date: <strong>{calcEndDate(newTask.startDate, parseInt(newTask.duration) || 1)}</strong></div>
              )}
              <div className="pm-form-row">
                <div className="pm-form-group"><label className="pm-label">Assignee</label><select className="pm-select" value={newTask.assignee} onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}><option value="">Unassigned</option>{(selectedProject?.resources || assignees || []).map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                <div className="pm-form-group"><label className="pm-label">Cost</label><input type="number" className="pm-input" value={newTask.cost} onChange={(e) => setNewTask({ ...newTask, cost: e.target.value })} placeholder="0" /></div>
              </div>
              {/* Predecessor selector (controlled React state) */}
              {allTasksFlat.length > 0 && (
                <div className="pm-form-group">
                  <label className="pm-label">Predecessor</label>
                  <div className="gc-pred-selector">
                    <select className="pm-select" value={newPredTask} onChange={(e) => setNewPredTask(e.target.value)}>
                      <option value="">Select task…</option>
                      {allTasksFlat.map((t, i) => <option key={t.id} value={t.id}>{i + 1}. {t.name}</option>)}
                    </select>
                    <select className="pm-select gc-pred-type" value={newPredType} onChange={(e) => setNewPredType(e.target.value)}>
                      <option value="FS">FS</option><option value="SS">SS</option>
                    </select>
                    <button className="gc-btn-sm gc-btn-outline" onClick={() => {
                      if (!newPredTask) return
                      const already = (newTask.predecessors || []).some((p) => p.taskId === newPredTask && p.type === newPredType)
                      if (already) return
                      setNewTask((prev) => ({ ...prev, predecessors: [...(prev.predecessors || []), { taskId: newPredTask, type: newPredType }] }))
                      setNewPredTask('')
                    }}>Add</button>
                  </div>
                  {newTask.predecessors?.length > 0 && (
                    <div className="gc-pred-tags">
                      {newTask.predecessors.map((p, i) => {
                        const idx = allTasksFlat.findIndex((t) => t.id === p.taskId)
                        return <span key={i} className="gc-pred-tag">{idx >= 0 ? `${idx + 1}` : '?'} {p.type} <button onClick={() => setNewTask((prev) => ({ ...prev, predecessors: prev.predecessors.filter((_, j) => j !== i) }))}>×</button></span>
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="pm-modal-buttons"><button className="pm-btn-secondary" onClick={() => setShowAddTask(false)}>Cancel</button><button className="pm-btn-primary" onClick={handleAddTask}>Add Task</button></div>
            </div>
          </div>
        )}

        {/* Edit Task */}
        {showEditTask && (
          <div className="pm-modal-overlay" onClick={() => setShowEditTask(null)}>
            <div className="pm-modal pm-modal-lg" onClick={(e) => e.stopPropagation()}>
              <h3>Edit Task</h3>
              <div className="pm-form-group"><label className="pm-label">Task Name</label><input className="pm-input" value={editTask.name || ''} onChange={(e) => setEditTask({ ...editTask, name: e.target.value })} /></div>
              <div className="pm-form-row">
                <div className="pm-form-group"><label className="pm-label">Start Date</label><input type="date" className="pm-input" value={editTask.startDate || ''} onChange={(e) => {
                  const dur = parseInt(editTask.duration) || calcDuration(editTask.startDate, editTask.endDate)
                  setEditTask({ ...editTask, startDate: e.target.value, endDate: calcEndDate(e.target.value, dur), duration: dur })
                }} /></div>
                <div className="pm-form-group"><label className="pm-label">Duration (days)</label><input type="number" min="1" className="pm-input" value={editTask.duration || ''} onChange={(e) => {
                  const dur = parseInt(e.target.value) || 1
                  setEditTask({ ...editTask, duration: dur, endDate: editTask.startDate ? calcEndDate(editTask.startDate, dur) : editTask.endDate })
                }} /></div>
                <div className="pm-form-group"><label className="pm-label">End Date</label><input type="date" className="pm-input" value={editTask.endDate || ''} onChange={(e) => setEditTask({ ...editTask, endDate: e.target.value, duration: calcDuration(editTask.startDate, e.target.value) })} /></div>
              </div>
              <div className="pm-form-row">
                <div className="pm-form-group"><label className="pm-label">Assignee</label><select className="pm-select" value={editTask.assignee || ''} onChange={(e) => setEditTask({ ...editTask, assignee: e.target.value })}><option value="">Unassigned</option>{(selectedProject?.resources || assignees || []).map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                <div className="pm-form-group"><label className="pm-label">Cost</label><input type="number" className="pm-input" value={editTask.cost || ''} onChange={(e) => setEditTask({ ...editTask, cost: e.target.value })} /></div>
              </div>
              <div className="pm-form-group"><label className="pm-label">Completion: {editTask.progressPercent || 0}%</label><input type="range" min="0" max="100" className="pm-range" value={editTask.progressPercent || 0} onChange={(e) => setEditTask({ ...editTask, progressPercent: parseInt(e.target.value) })} /></div>
              {/* Dependency editor (controlled React state) */}
              <div className="pm-form-group">
                <label className="pm-label">Predecessors</label>
                <div className="gc-pred-selector">
                  <select className="pm-select" value={editPredTask} onChange={(e) => setEditPredTask(e.target.value)}>
                    <option value="">Select task…</option>
                    {allTasksFlat.filter((t) => t.id !== showEditTask).map((t) => <option key={t.id} value={t.id}>{allTasksFlat.indexOf(t) + 1}. {t.name}</option>)}
                  </select>
                  <select className="pm-select gc-pred-type" value={editPredType} onChange={(e) => setEditPredType(e.target.value)}>
                    <option value="FS">FS</option><option value="SS">SS</option>
                  </select>
                  <button className="gc-btn-sm gc-btn-outline" onClick={() => {
                    if (!editPredTask) return
                    const already = (editTask.predecessors || []).some((p) => p.taskId === editPredTask && p.type === editPredType)
                    if (already) return
                    setEditTask((prev) => ({ ...prev, predecessors: [...(prev.predecessors || []), { taskId: editPredTask, type: editPredType }] }))
                    setEditPredTask('')
                  }}>Add</button>
                </div>
                {editTask.predecessors?.length > 0 && (
                  <div className="gc-pred-tags">
                    {editTask.predecessors.map((p, i) => {
                      const idx = allTasksFlat.findIndex((t) => t.id === p.taskId)
                      return <span key={i} className="gc-pred-tag">{idx >= 0 ? `${idx + 1}` : '?'} {p.type} <button onClick={() => setEditTask((prev) => ({ ...prev, predecessors: prev.predecessors.filter((_, j) => j !== i) }))}>×</button></span>
                    })}
                  </div>
                )}
              </div>
              {editTask.baselineStart && <div className="pm-baseline-info"><strong>Baseline:</strong> {editTask.baselineStart} → {editTask.baselineEnd}{editTask.startDate !== editTask.baselineStart || editTask.endDate !== editTask.baselineEnd ? <span className="pm-variance"> (Variance)</span> : null}</div>}
              <div className="pm-modal-buttons"><button className="pm-btn-secondary" onClick={() => setShowEditTask(null)}>Cancel</button><button className="pm-btn-primary" onClick={handleEditTaskSave}>Save</button></div>
            </div>
          </div>
        )}

        {/* Revisions */}
        {showRevisions && (
          <div className="pm-modal-overlay" onClick={() => setShowRevisions(false)}>
            <div className="pm-modal pm-modal-lg" onClick={(e) => e.stopPropagation()}>
              <h3>Revision History</h3>
              <div className="pm-form-group">
                <div className="pm-form-row"><input className="pm-input" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="Note..." style={{ flex: 1 }} /><button className="pm-btn-primary" onClick={() => { saveRevision(selectedProjectId, revisionNote || 'Manual save'); setRevisionNote('') }}>Save</button></div>
              </div>
              <div className="pm-revisions-list">
                {(selectedProject?.revisions || []).length === 0 ? <p className="pm-no-tasks">No revisions.</p> : (selectedProject?.revisions || []).slice().reverse().map((rev) => (
                  <div key={rev.id} className="pm-revision-item">
                    <div className="pm-revision-info"><span className="pm-revision-date">{rev.date}</span><span className="pm-revision-note">{rev.note}</span></div>
                    <div className="pm-revision-actions">{rev.snapshot && <button className="pm-btn-sm" onClick={() => restoreRevision(selectedProjectId, rev.id)}>Restore</button>}<button className="pm-btn-sm pm-btn-danger" onClick={() => deleteRevision(selectedProjectId, rev.id)}>Delete</button></div>
                  </div>
                ))}
              </div>
              <div className="pm-modal-buttons"><button className="pm-btn-secondary" onClick={() => setShowRevisions(false)}>Close</button></div>
            </div>
          </div>
        )}

        {/* Resources */}
        {showResources && (
          <div className="pm-modal-overlay" onClick={() => setShowResources(false)}>
            <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Resources</h3>
              <div className="pm-form-group"><div className="pm-form-row"><input className="pm-input" value={newResourceName} onChange={(e) => setNewResourceName(e.target.value)} placeholder="Name..." style={{ flex: 1 }} /><button className="pm-btn-primary" onClick={() => { if (newResourceName.trim()) { addResource(selectedProjectId, newResourceName.trim()); setNewResourceName('') } }}>Add</button></div></div>
              <div className="pm-resources-list">
                {(selectedProject?.resources || []).length === 0 ? <p className="pm-no-tasks">No resources.</p> : (selectedProject?.resources || []).map((r) => (
                  <div key={r} className="pm-resource-item"><span>{r}</span><button className="pm-btn-sm pm-btn-danger" onClick={() => removeResource(selectedProjectId, r)}>Remove</button></div>
                ))}
              </div>
              <div className="pm-modal-buttons"><button className="pm-btn-secondary" onClick={() => setShowResources(false)}>Close</button></div>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div className="pm-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
            <button className="pm-context-item" onClick={() => { handleEditTaskOpen(contextMenu.task, contextMenu.projectId); setContextMenu(null) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Task
            </button>
            <button className="pm-context-item pm-context-danger" onClick={() => { handleDeleteTask(contextMenu.task.id); setContextMenu(null) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              Delete Task
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ProjectManagement
