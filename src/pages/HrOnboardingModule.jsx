import { useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import HrModuleShell from '../components/hr/HrModuleShell'
import useHrSpaceStore from '../store/hrSpaceStore'
import { hrSpacePath } from '../constants/hrSpaceRoutes'
import { useTranslation } from '../i18n/useTranslation'
import '../components/hr/HrModuleShell.css'

export default function HrOnboardingModule() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('track')
  const [searchParams] = useSearchParams()
  const filterId = searchParams.get('employeeId') || ''

  const employees = useHrSpaceStore((s) => s.employees)
  const onboardingTasks = useHrSpaceStore((s) => s.onboardingTasks)
  const createEmployee = useHrSpaceStore((s) => s.createEmployee)
  const addOnboardingTask = useHrSpaceStore((s) => s.addOnboardingTask)
  const updateOnboardingTask = useHrSpaceStore((s) => s.updateOnboardingTask)
  const deleteOnboardingTask = useHrSpaceStore((s) => s.deleteOnboardingTask)
  const getEmployeeLabel = useHrSpaceStore((s) => s.getEmployeeLabel)

  const [newEmp, setNewEmp] = useState({ name: '', email: '', department: 'Production', role: 'Employee', hireDate: '' })
  const [taskForm, setTaskForm] = useState({ employeeId: filterId || '', title: '', dueDate: '' })

  const rows = useMemo(
    () => onboardingTasks.filter((x) => !filterId || x.employeeId === filterId),
    [onboardingTasks, filterId]
  )
  const done = useMemo(() => rows.filter((x) => x.done).length, [rows])

  return (
    <AppLayout>
      <HrModuleShell
        title={t('hrSpace.page.onboarding.label')}
        subtitle={t('hrSpace.page.onboarding.desc')}
        tab={tab}
        onTab={setTab}
      >
        {filterId && (
          <p className="hr-mod-panel" style={{ marginTop: 0 }}>
            <Link to={hrSpacePath(`employees/${filterId}`)}>{getEmployeeLabel(filterId)}</Link>
            {' · '}
            <Link to={hrSpacePath('onboarding')}>{t('hrSpace.showAll', 'Show all')}</Link>
          </p>
        )}

        {tab === 'plan' && (
          <div className="hr-mod-panel">
            <h3>{t('hrSpace.onboardPlan', 'Onboarding plan')}</h3>
            <p>{t('hrSpace.onboardPlanBody', 'New employees receive a standard checklist and baseline qualification stars. Use “Register employee” to create the employee number and seed all modules.')}</p>
            <div className="hr-mod-stat"><strong>{rows.length}</strong><span>{t('hrSpace.tasks', 'tasks')}</span></div>
            <div className="hr-mod-stat"><strong>{done}</strong><span>{t('hrSpace.completed', 'completed')}</span></div>
          </div>
        )}

        {tab === 'track' && (
          <div className="hr-mod-panel">
            <h3>{t('hrSpace.checklist', 'Checklists')}</h3>
            <div className="hr-mod-table-scroll">
            <table className="hr-mod-table hr-mod-table--onboard-track">
              <thead>
                <tr>
                  <th>{t('hrSpace.employee', 'Employee')}</th>
                  <th>{t('hrSpace.task', 'Task')}</th>
                  <th>{t('hrSpace.done', 'Done')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.id}>
                    <td><Link to={hrSpacePath(`employees/${x.employeeId}`)}>{getEmployeeLabel(x.employeeId)}</Link></td>
                    <td>{x.title}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!x.done}
                        onChange={(e) => updateOnboardingTask(x.id, { done: e.target.checked })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {tab === 'manage' && (
          <>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.registerEmployee', 'Register employee (creates number + seeds modules)')}</h3>
              <div className="hr-mod-grid2">
                <div className="hr-mod-field">
                  <label>{t('hrSpace.candidateName', 'Full name')}</label>
                  <input value={newEmp.name} onChange={(e) => setNewEmp((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>Email</label>
                  <input type="email" value={newEmp.email} onChange={(e) => setNewEmp((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('qualificationMatrix.department', 'Department')}</label>
                  <input value={newEmp.department} onChange={(e) => setNewEmp((f) => ({ ...f, department: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.role', 'Role')}</label>
                  <input value={newEmp.role} onChange={(e) => setNewEmp((f) => ({ ...f, role: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.startDate', 'Start date')}</label>
                  <input type="date" value={newEmp.hireDate} onChange={(e) => setNewEmp((f) => ({ ...f, hireDate: e.target.value }))} />
                </div>
              </div>
              <button
                type="button"
                className="hr-mod-btn hr-mod-btn--primary"
                onClick={() => {
                  if (!newEmp.name.trim()) return
                  const id = createEmployee({
                    name: newEmp.name,
                    email: newEmp.email,
                    department: newEmp.department,
                    role: newEmp.role,
                    hireDate: newEmp.hireDate || new Date().toISOString().slice(0, 10),
                  })
                  setNewEmp({ name: '', email: '', department: 'Production', role: 'Employee', hireDate: '' })
                  window.alert(`${t('hrSpace.created', 'Created')} ${id}`)
                }}
              >
                {t('hrSpace.registerEmployeeBtn', 'Register & seed modules')}
              </button>
            </div>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.addTask', 'Add onboarding task')}</h3>
              <div className="hr-mod-grid2">
                <div className="hr-mod-field">
                  <label>{t('hrSpace.employee', 'Employee')}</label>
                  <select value={taskForm.employeeId} onChange={(e) => setTaskForm((f) => ({ ...f, employeeId: e.target.value }))}>
                    <option value="">{t('hrSpace.select', 'Select…')}</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.employeeNumber} — {e.name}</option>
                    ))}
                  </select>
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.due', 'Due date')}</label>
                  <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="hr-mod-field">
                <label>{t('hrSpace.task', 'Task')}</label>
                <input value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <button
                type="button"
                className="hr-mod-btn hr-mod-btn--primary"
                onClick={() => {
                  if (!taskForm.employeeId || !taskForm.title.trim()) return
                  addOnboardingTask({ employeeId: taskForm.employeeId, title: taskForm.title.trim(), dueDate: taskForm.dueDate, done: false })
                  setTaskForm({ employeeId: filterId || '', title: '', dueDate: '' })
                }}
              >
                {t('hrSpace.addTaskBtn', 'Add task')}
              </button>
            </div>
            <div className="hr-mod-panel">
              <div className="hr-mod-table-scroll">
              <table className="hr-mod-table hr-mod-table--onboard-manage">
                <thead>
                  <tr>
                    <th>{t('hrSpace.employee', 'Employee')}</th>
                    <th>{t('hrSpace.task', 'Task')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {onboardingTasks.map((x) => (
                    <tr key={x.id}>
                      <td>{getEmployeeLabel(x.employeeId)}</td>
                      <td>{x.title}</td>
                      <td>
                        <div className="hr-mod-actions">
                          <button type="button" className="hr-mod-btn hr-mod-btn--danger" onClick={() => deleteOnboardingTask(x.id)}>{t('hrSpace.delete', 'Delete')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}
      </HrModuleShell>
    </AppLayout>
  )
}
