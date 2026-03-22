import { useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import HrModuleShell from '../components/hr/HrModuleShell'
import useHrSpaceStore from '../store/hrSpaceStore'
import { hrSpacePath } from '../constants/hrSpaceRoutes'
import { useTranslation } from '../i18n/useTranslation'
import '../components/hr/HrModuleShell.css'

const TYPES = ['present', 'absent', 'leave', 'overtime']

export default function HrAttendanceModule() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('track')
  const [searchParams] = useSearchParams()
  const filterId = searchParams.get('employeeId') || ''

  const employees = useHrSpaceStore((s) => s.employees)
  const attendanceEntries = useHrSpaceStore((s) => s.attendanceEntries)
  const addAttendance = useHrSpaceStore((s) => s.addAttendance)
  const updateAttendance = useHrSpaceStore((s) => s.updateAttendance)
  const deleteAttendance = useHrSpaceStore((s) => s.deleteAttendance)
  const getEmployeeLabel = useHrSpaceStore((s) => s.getEmployeeLabel)

  const [form, setForm] = useState({
    employeeId: filterId || '',
    date: new Date().toISOString().slice(0, 10),
    type: 'present',
    hours: 8,
    note: '',
  })

  const rows = useMemo(
    () => attendanceEntries.filter((a) => !filterId || a.employeeId === filterId),
    [attendanceEntries, filterId]
  )

  const hoursMonth = useMemo(() => rows.reduce((s, a) => s + (Number(a.hours) || 0), 0), [rows])

  return (
    <AppLayout>
      <HrModuleShell
        title={t('hrSpace.page.attendance.label')}
        subtitle={t('hrSpace.page.attendance.desc')}
        tab={tab}
        onTab={setTab}
      >
        {filterId && (
          <p className="hr-mod-panel" style={{ marginTop: 0 }}>
            <Link to={hrSpacePath(`employees/${filterId}`)}>{getEmployeeLabel(filterId)}</Link>
            {' · '}
            <Link to={hrSpacePath('attendance')}>{t('hrSpace.showAll', 'Show all')}</Link>
          </p>
        )}

        {tab === 'plan' && (
          <div className="hr-mod-panel">
            <h3>{t('hrSpace.attendancePlan', 'Attendance planning')}</h3>
            <div className="hr-mod-stat"><strong>{rows.length}</strong><span>{t('hrSpace.entries', 'entries (filtered)')}</span></div>
            <div className="hr-mod-stat"><strong>{hoursMonth}</strong><span>{t('hrSpace.hours', 'hours total')}</span></div>
            <p>{t('hrSpace.attendancePlanHint', 'Log daily attendance per employee; use Manage data for bulk corrections.')}</p>
          </div>
        )}

        {tab === 'track' && (
          <div className="hr-mod-panel">
            <h3>{t('hrSpace.attendanceLog', 'Log')}</h3>
            <table className="hr-mod-table">
              <thead>
                <tr>
                  <th>{t('hrSpace.employee', 'Employee')}</th>
                  <th>{t('hrSpace.date', 'Date')}</th>
                  <th>{t('hrSpace.type', 'Type')}</th>
                  <th>{t('hrSpace.hours', 'Hours')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td><Link to={hrSpacePath(`employees/${a.employeeId}`)}>{getEmployeeLabel(a.employeeId)}</Link></td>
                    <td>{a.date}</td>
                    <td>{a.type}</td>
                    <td>{a.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'manage' && (
          <>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.addAttendance', 'Add entry')}</h3>
              <div className="hr-mod-grid2">
                <div className="hr-mod-field">
                  <label>{t('hrSpace.employee', 'Employee')}</label>
                  <select value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}>
                    <option value="">{t('hrSpace.select', 'Select…')}</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.employeeNumber} — {e.name}</option>
                    ))}
                  </select>
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.date', 'Date')}</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.type', 'Type')}</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                    {TYPES.map((ty) => (
                      <option key={ty} value={ty}>{ty}</option>
                    ))}
                  </select>
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.hours', 'Hours')}</label>
                  <input type="number" step={0.5} value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="hr-mod-field">
                <label>{t('hrSpace.notes', 'Note')}</label>
                <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
              <button
                type="button"
                className="hr-mod-btn hr-mod-btn--primary"
                onClick={() => {
                  if (!form.employeeId) return
                  addAttendance({ ...form })
                  setForm({ employeeId: filterId || '', date: new Date().toISOString().slice(0, 10), type: 'present', hours: 8, note: '' })
                }}
              >
                {t('hrSpace.create', 'Create')}
              </button>
            </div>
            <div className="hr-mod-panel">
              <table className="hr-mod-table">
                <thead>
                  <tr>
                    <th>{t('hrSpace.date', 'Date')}</th>
                    <th>{t('hrSpace.employee', 'Employee')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {attendanceEntries.map((a) => (
                    <tr key={a.id}>
                      <td><input type="date" defaultValue={a.date} onBlur={(e) => updateAttendance(a.id, { date: e.target.value })} /></td>
                      <td>{getEmployeeLabel(a.employeeId)}</td>
                      <td><button type="button" className="hr-mod-btn hr-mod-btn--danger" onClick={() => deleteAttendance(a.id)}>{t('hrSpace.delete', 'Delete')}</button></td>
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
