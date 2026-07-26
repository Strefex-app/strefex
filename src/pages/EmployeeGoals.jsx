import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import EmptyState from '../components/EmptyState'
import { useTranslation } from '../i18n/useTranslation'
import useHrSpaceStore from '../store/hrSpaceStore'
import { hrSpacePath } from '../constants/hrSpaceRoutes'
import HrModuleShell from '../components/hr/HrModuleShell'
import '../components/hr/HrModuleShell.css'
import './EmployeeGoals.css'

const GOAL_CATEGORIES = ['Performance', 'Development', 'Safety', 'Quality', 'Leadership']
const GOAL_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Overdue']
const PRIORITIES = ['Low', 'Medium', 'High']

const EmployeeGoals = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const employees = useHrSpaceStore((s) => s.employees)
  const goals = useHrSpaceStore((s) => s.goals)
  const addGoal = useHrSpaceStore((s) => s.addGoal)
  const updateGoalStore = useHrSpaceStore((s) => s.updateGoal)
  const deleteGoalStore = useHrSpaceStore((s) => s.deleteGoal)
  const getEmployeeLabel = useHrSpaceStore((s) => s.getEmployeeLabel)

  const [tab, setTab] = useState('track')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newGoal, setNewGoal] = useState({
    title: '', description: '', category: 'Performance', targetDate: '', progress: 0, status: 'Not Started', priority: 'Medium',
  })

  useEffect(() => {
    const q = searchParams.get('employeeId')
    if (q) setSelectedEmployee(q)
  }, [searchParams])

  const filteredGoals = goals.filter((g) => {
    const matchEmployee = !selectedEmployee || g.employeeId === selectedEmployee
    const matchStatus = !filterStatus || g.status === filterStatus
    const matchCategory = !filterCategory || g.category === filterCategory
    return matchEmployee && matchStatus && matchCategory
  })

  const summary = {
    total: goals.filter((g) => !selectedEmployee || g.employeeId === selectedEmployee).length,
    completed: goals.filter((g) => g.status === 'Completed' && (!selectedEmployee || g.employeeId === selectedEmployee)).length,
    inProgress: goals.filter((g) => g.status === 'In Progress' && (!selectedEmployee || g.employeeId === selectedEmployee)).length,
    overdue: goals.filter((g) => g.status === 'Overdue' && (!selectedEmployee || g.employeeId === selectedEmployee)).length,
  }

  const updateGoal = (id, field, value) => {
    updateGoalStore(id, { [field]: value })
  }

  const saveNewGoal = () => {
    if (!newGoal.title || !selectedEmployee) return
    addGoal({ employeeId: selectedEmployee, ...newGoal })
    setNewGoal({ title: '', description: '', category: 'Performance', targetDate: '', progress: 0, status: 'Not Started', priority: 'Medium' })
    setShowAddForm(false)
  }

  const removeGoal = (id) => {
    deleteGoalStore(id)
    setEditingId(null)
  }

  return (
    <AppLayout>
      <div className="eg-page">
        <HrModuleShell
          title={t('hrSpace.page.goals.label', 'Employee Goals')}
          subtitle={t('hrSpace.page.goals.desc', 'Goal tracking and KPI management')}
          tab={tab}
          onTab={setTab}
        />
        {tab === 'plan' && (
          <div className="hr-mod-panel" style={{ margin: '0 20px 16px' }}>
            <h3>{t('hrSpace.goalsPlan', 'Goals plan')}</h3>
            <p>{t('hrSpace.goalsPlanBody', 'Set objectives by employee; progress rolls up for reviews. Use Track for daily monitoring and Manage data to add or remove records.')}</p>
            <div className="hr-mod-stat"><strong>{summary.total}</strong><span>{t('hrSpace.goalsFiltered', 'goals (filtered)')}</span></div>
          </div>
        )}

        {tab === 'manage' && (
          <div className="hr-mod-panel" style={{ margin: '0 20px 16px' }}>
            <h3>{t('hrSpace.goalsManage', 'Manage goals')}</h3>
            <p>{t('hrSpace.goalsManageBody', 'Create, edit inline, or delete rows below. Each goal is stored per employee ID (employee number in directory).')}</p>
          </div>
        )}

        {(tab === 'track' || tab === 'manage') && (
          <>
        <div className="eg-header" style={{ paddingTop: 0 }}>
          {selectedEmployee && (
            <p className="eg-subtitle">
              <Link to={hrSpacePath(`employees/${selectedEmployee}`)}>{getEmployeeLabel(selectedEmployee)}</Link>
              {' · '}
              <Link to={hrSpacePath('goals')}>{t('hrSpace.showAll', 'Show all')}</Link>
            </p>
          )}
        </div>

        <div className="eg-toolbar">
          <div className="eg-employee-select-wrap">
            <label className="eg-label">Employee</label>
            <select
              className="eg-select"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">All employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.employeeNumber} — {emp.name}</option>
              ))}
            </select>
          </div>
          <div className="eg-filter-wrap">
            <label className="eg-label">Status</label>
            <select className="eg-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All</option>
              {GOAL_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="eg-filter-wrap">
            <label className="eg-label">Category</label>
            <select className="eg-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All</option>
              {GOAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button type="button" className="eg-btn eg-btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            Add Goal
          </button>
        </div>

        <div className="eg-summary">
          <div className="eg-summary-card">
            <span className="eg-summary-value">{summary.total}</span>
            <span className="eg-summary-label">Total Goals</span>
          </div>
          <div className="eg-summary-card eg-summary-completed">
            <span className="eg-summary-value">{summary.completed}</span>
            <span className="eg-summary-label">Completed</span>
          </div>
          <div className="eg-summary-card eg-summary-progress">
            <span className="eg-summary-value">{summary.inProgress}</span>
            <span className="eg-summary-label">In Progress</span>
          </div>
          <div className="eg-summary-card eg-summary-overdue">
            <span className="eg-summary-value">{summary.overdue}</span>
            <span className="eg-summary-label">Overdue</span>
          </div>
        </div>

        {showAddForm && (
          <div className="eg-card eg-form-card">
            <h2 className="eg-card-title">New Goal</h2>
            <div className="eg-form-grid">
              <div className="eg-form-group eg-form-full">
                <label className="eg-label">Title</label>
                <input
                  className="eg-input"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Goal title"
                />
              </div>
              <div className="eg-form-group eg-form-full">
                <label className="eg-label">Description</label>
                <textarea
                  className="eg-textarea"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Description"
                  rows={3}
                />
              </div>
              <div className="eg-form-group">
                <label className="eg-label">Category</label>
                <select
                  className="eg-select"
                  value={newGoal.category}
                  onChange={(e) => setNewGoal((p) => ({ ...p, category: e.target.value }))}
                >
                  {GOAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="eg-form-group">
                <label className="eg-label">Target date</label>
                <input
                  type="date"
                  className="eg-input"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal((p) => ({ ...p, targetDate: e.target.value }))}
                />
              </div>
              <div className="eg-form-group">
                <label className="eg-label">Progress %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="eg-input"
                  value={newGoal.progress}
                  onChange={(e) => setNewGoal((p) => ({ ...p, progress: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="eg-form-group">
                <label className="eg-label">Status</label>
                <select
                  className="eg-select"
                  value={newGoal.status}
                  onChange={(e) => setNewGoal((p) => ({ ...p, status: e.target.value }))}
                >
                  {GOAL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="eg-form-group">
                <label className="eg-label">Priority</label>
                <select
                  className="eg-select"
                  value={newGoal.priority}
                  onChange={(e) => setNewGoal((p) => ({ ...p, priority: e.target.value }))}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="eg-form-actions">
              <button type="button" className="eg-btn eg-btn-primary" onClick={saveNewGoal}>Save Goal</button>
              <button type="button" className="eg-btn eg-btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="eg-card">
          <h2 className="eg-card-title">Goals</h2>
          <p className="eg-card-subtitle">Click a cell to edit inline</p>
          <div className="eg-table-wrap">
            <table className="eg-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Target date</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredGoals.map((goal) => {
                  const isEditing = editingId === goal.id
                  return (
                    <tr key={goal.id}>
                      <td>
                        <Link to={hrSpacePath(`employees/${goal.employeeId}`)}>{getEmployeeLabel(goal.employeeId)}</Link>
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="eg-input eg-input-inline"
                            value={goal.title}
                            onChange={(e) => updateGoal(goal.id, 'title', e.target.value)}
                            onBlur={() => setEditingId(null)}
                            autoFocus
                          />
                        ) : (
                          <span
                            className="eg-editable"
                            onClick={() => setEditingId(goal.id)}
                            title="Click to edit"
                          >
                            {goal.title}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="eg-category-badge">{goal.category}</span>
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="date"
                            className="eg-input eg-input-inline"
                            value={goal.targetDate}
                            onChange={(e) => updateGoal(goal.id, 'targetDate', e.target.value)}
                            onBlur={() => setEditingId(null)}
                          />
                        ) : (
                          <span className="eg-editable" onClick={() => setEditingId(goal.id)}>{goal.targetDate || '—'}</span>
                        )}
                      </td>
                      <td>
                        <div className="eg-progress-cell">
                          <div className="eg-progress-bar">
                            <div
                              className="eg-progress-fill"
                              style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
                            />
                          </div>
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="eg-input eg-input-inline eg-progress-input"
                              value={goal.progress}
                              onChange={(e) => updateGoal(goal.id, 'progress', Number(e.target.value) || 0)}
                              onBlur={() => setEditingId(null)}
                            />
                          ) : (
                            <span className="eg-editable eg-progress-pct" onClick={() => setEditingId(goal.id)}>{goal.progress}%</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`eg-status-badge eg-status-${goal.status.replace(/\s+/g, '-').toLowerCase()}`}>
                          {goal.status}
                        </span>
                      </td>
                      <td>
                        <span className={`eg-priority-badge eg-priority-${goal.priority.toLowerCase()}`}>{goal.priority}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="eg-btn-icon"
                          onClick={() => removeGoal(goal.id)}
                          title="Delete"
                          aria-label="Delete goal"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredGoals.length === 0 && (
            <EmptyState icon="chart" title="No goals found" message="No goals match the current filters. Adjust the filters or add a new goal." />
          )}
        </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}

export default EmployeeGoals
