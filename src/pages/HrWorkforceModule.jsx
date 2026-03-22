import { useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import HrModuleShell from '../components/hr/HrModuleShell'
import useHrSpaceStore from '../store/hrSpaceStore'
import { hrSpacePath } from '../constants/hrSpaceRoutes'
import { useTranslation } from '../i18n/useTranslation'
import '../components/hr/HrModuleShell.css'

export default function HrWorkforceModule() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('plan')
  const [searchParams] = useSearchParams()
  const filterId = searchParams.get('employeeId') || ''

  const employees = useHrSpaceStore((s) => s.employees)
  const workforcePlans = useHrSpaceStore((s) => s.workforcePlans)
  const addWorkforcePlan = useHrSpaceStore((s) => s.addWorkforcePlan)
  const updateWorkforcePlan = useHrSpaceStore((s) => s.updateWorkforcePlan)
  const deleteWorkforcePlan = useHrSpaceStore((s) => s.deleteWorkforcePlan)
  const getEmployeeLabel = useHrSpaceStore((s) => s.getEmployeeLabel)

  const [form, setForm] = useState({
    title: '',
    department: 'Production',
    targetHeadcount: 10,
    currentAssigned: 0,
    shiftModel: '2x8',
    status: 'Active',
    notes: '',
  })

  const byDept = useMemo(() => {
    const m = {}
    employees.forEach((e) => {
      m[e.department] = (m[e.department] || 0) + 1
    })
    return m
  }, [employees])

  return (
    <AppLayout>
      <HrModuleShell
        title={t('hrSpace.page.workforce.label')}
        subtitle={t('hrSpace.page.workforce.desc')}
        tab={tab}
        onTab={setTab}
      >
        {filterId && (
          <p className="hr-mod-panel" style={{ marginTop: 0 }}>
            <Link to={hrSpacePath(`employees/${filterId}`)}>{getEmployeeLabel(filterId)}</Link>
            {' · '}
            <Link to={hrSpacePath('workforce')}>{t('hrSpace.showAll', 'Show all')}</Link>
          </p>
        )}

        {tab === 'plan' && (
          <div className="hr-mod-panel">
            <h3>{t('hrSpace.headcountByDept', 'Current headcount by department')}</h3>
            <ul>
              {Object.entries(byDept).map(([d, n]) => (
                <li key={d}><strong>{d}</strong>: {n}</li>
              ))}
            </ul>
            <h3>{t('hrSpace.workforcePlans', 'Staffing plans')}</h3>
            <table className="hr-mod-table">
              <thead>
                <tr>
                  <th>{t('hrSpace.planTitle', 'Plan')}</th>
                  <th>{t('qualificationMatrix.department', 'Department')}</th>
                  <th>{t('hrSpace.target', 'Target')}</th>
                  <th>{t('hrSpace.assigned', 'Assigned')}</th>
                </tr>
              </thead>
              <tbody>
                {workforcePlans.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td>{p.department}</td>
                    <td>{p.targetHeadcount}</td>
                    <td>{p.currentAssigned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'track' && (
          <div className="hr-mod-panel">
            <h3>{t('hrSpace.roster', 'Employee roster')}</h3>
            <table className="hr-mod-table">
              <thead>
                <tr>
                  <th>{t('hrSpace.empNumber', 'Emp #')}</th>
                  <th>{t('hrSpace.candidateName', 'Name')}</th>
                  <th>{t('qualificationMatrix.department', 'Department')}</th>
                  <th>{t('hrSpace.role', 'Role')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.filter((e) => !filterId || e.id === filterId).map((e) => (
                  <tr key={e.id}>
                    <td>{e.employeeNumber}</td>
                    <td><Link to={hrSpacePath(`employees/${e.id}`)}>{e.name}</Link></td>
                    <td>{e.department}</td>
                    <td>{e.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'manage' && (
          <>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.addWorkforcePlan', 'Add staffing plan')}</h3>
              <div className="hr-mod-grid2">
                <div className="hr-mod-field">
                  <label>{t('hrSpace.planTitle', 'Title')}</label>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('qualificationMatrix.department', 'Department')}</label>
                  <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.target', 'Target headcount')}</label>
                  <input type="number" value={form.targetHeadcount} onChange={(e) => setForm((f) => ({ ...f, targetHeadcount: Number(e.target.value) }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.assigned', 'Currently assigned')}</label>
                  <input type="number" value={form.currentAssigned} onChange={(e) => setForm((f) => ({ ...f, currentAssigned: Number(e.target.value) }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.shifts', 'Shift model')}</label>
                  <input value={form.shiftModel} onChange={(e) => setForm((f) => ({ ...f, shiftModel: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.status', 'Status')}</label>
                  <input value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
                </div>
              </div>
              <div className="hr-mod-field">
                <label>{t('hrSpace.notes', 'Notes')}</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <button
                type="button"
                className="hr-mod-btn hr-mod-btn--primary"
                onClick={() => {
                  if (!form.title.trim()) return
                  addWorkforcePlan({ ...form })
                  setForm({ title: '', department: 'Production', targetHeadcount: 10, currentAssigned: 0, shiftModel: '2x8', status: 'Active', notes: '' })
                }}
              >
                {t('hrSpace.create', 'Create')}
              </button>
            </div>
            <div className="hr-mod-panel">
              <table className="hr-mod-table">
                <thead>
                  <tr>
                    <th>{t('hrSpace.planTitle', 'Plan')}</th>
                    <th>{t('hrSpace.target', 'Target')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {workforcePlans.map((p) => (
                    <tr key={p.id}>
                      <td><input defaultValue={p.title} onBlur={(e) => updateWorkforcePlan(p.id, { title: e.target.value })} /></td>
                      <td><input type="number" defaultValue={p.targetHeadcount} onBlur={(e) => updateWorkforcePlan(p.id, { targetHeadcount: Number(e.target.value) })} /></td>
                      <td><button type="button" className="hr-mod-btn hr-mod-btn--danger" onClick={() => deleteWorkforcePlan(p.id)}>{t('hrSpace.delete', 'Delete')}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </HrModuleShell>
    </AppLayout>
  )
}
