import { useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import HrModuleShell from '../components/hr/HrModuleShell'
import useHrSpaceStore from '../store/hrSpaceStore'
import { hrSpacePath } from '../constants/hrSpaceRoutes'
import { useTranslation } from '../i18n/useTranslation'
import '../components/hr/HrModuleShell.css'

export default function HrTrainingModule() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('track')
  const [searchParams] = useSearchParams()
  const filterId = searchParams.get('employeeId') || ''

  const employees = useHrSpaceStore((s) => s.employees)
  const trainingRecords = useHrSpaceStore((s) => s.trainingRecords)
  const addTrainingRecord = useHrSpaceStore((s) => s.addTrainingRecord)
  const updateTrainingRecord = useHrSpaceStore((s) => s.updateTrainingRecord)
  const deleteTrainingRecord = useHrSpaceStore((s) => s.deleteTrainingRecord)
  const getEmployeeLabel = useHrSpaceStore((s) => s.getEmployeeLabel)

  const [form, setForm] = useState({
    employeeId: filterId || '',
    title: '',
    provider: '',
    completedDate: '',
    expiryDate: '',
    status: 'Planned',
    notes: '',
  })

  const rows = useMemo(
    () => trainingRecords.filter((r) => !filterId || r.employeeId === filterId),
    [trainingRecords, filterId]
  )

  const valid = useMemo(() => rows.filter((r) => r.status === 'Valid').length, [rows])
  const planned = useMemo(() => rows.filter((r) => r.status === 'Planned').length, [rows])

  return (
    <AppLayout>
      <HrModuleShell
        title={t('hrSpace.page.training.label')}
        subtitle={t('hrSpace.page.training.desc')}
        tab={tab}
        onTab={setTab}
      >
        {filterId && (
          <p className="hr-mod-panel" style={{ marginTop: 0 }}>
            {t('hrSpace.filteredFor', 'Filtered for')}:{' '}
            <Link to={hrSpacePath(`employees/${filterId}`)}>{getEmployeeLabel(filterId)}</Link>
            {' · '}
            <Link to={hrSpacePath('training')}>{t('hrSpace.showAll', 'Show all')}</Link>
          </p>
        )}

        {tab === 'plan' && (
          <div className="hr-mod-panel">
            <h3>{t('hrSpace.trainingPlan', 'Training plan overview')}</h3>
            <div className="hr-mod-stat"><strong>{rows.length}</strong><span>{t('hrSpace.records', 'records')}</span></div>
            <div className="hr-mod-stat"><strong>{valid}</strong><span>{t('hrSpace.valid', 'valid')}</span></div>
            <div className="hr-mod-stat"><strong>{planned}</strong><span>{t('hrSpace.planned', 'planned')}</span></div>
            <p>{t('hrSpace.trainingPlanHint', 'Use Manage data to add certifications and induction rows; new hires get a planned induction record automatically.')}</p>
          </div>
        )}

        {tab === 'track' && (
          <div className="hr-mod-panel">
            <h3>{t('hrSpace.trackRecords', 'Track records')}</h3>
            <table className="hr-mod-table">
              <thead>
                <tr>
                  <th>{t('hrSpace.employee', 'Employee')}</th>
                  <th>{t('hrSpace.trainingTitle', 'Training')}</th>
                  <th>{t('hrSpace.provider', 'Provider')}</th>
                  <th>{t('hrSpace.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={hrSpacePath(`employees/${r.employeeId}`)}>{getEmployeeLabel(r.employeeId)}</Link>
                    </td>
                    <td>{r.title}</td>
                    <td>{r.provider}</td>
                    <td>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'manage' && (
          <>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.addTraining', 'Add / edit / delete')}</h3>
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
                  <label>{t('hrSpace.status', 'Status')}</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    {['Planned', 'Valid', 'Expired', 'Waived'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.trainingTitle', 'Training title')}</label>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.provider', 'Provider')}</label>
                  <input value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.completed', 'Completed')}</label>
                  <input type="date" value={form.completedDate} onChange={(e) => setForm((f) => ({ ...f, completedDate: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.expiry', 'Expiry')}</label>
                  <input type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
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
                  if (!form.employeeId || !form.title.trim()) return
                  addTrainingRecord({ ...form })
                  setForm({ employeeId: filterId || '', title: '', provider: '', completedDate: '', expiryDate: '', status: 'Planned', notes: '' })
                }}
              >
                {t('hrSpace.create', 'Create')}
              </button>
            </div>
            <div className="hr-mod-panel">
              <table className="hr-mod-table">
                <thead>
                  <tr>
                    <th>{t('hrSpace.employee', 'Employee')}</th>
                    <th>{t('hrSpace.trainingTitle', 'Training')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {trainingRecords.map((r) => (
                    <tr key={r.id}>
                      <td>{getEmployeeLabel(r.employeeId)}</td>
                      <td>
                        <input defaultValue={r.title} onBlur={(e) => updateTrainingRecord(r.id, { title: e.target.value })} />
                      </td>
                      <td>
                        <button type="button" className="hr-mod-btn hr-mod-btn--danger" onClick={() => deleteTrainingRecord(r.id)}>{t('hrSpace.delete', 'Delete')}</button>
                      </td>
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
