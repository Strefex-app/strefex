import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import HrModuleShell from '../components/hr/HrModuleShell'
import useHrSpaceStore from '../store/hrSpaceStore'
import { hrSpacePath } from '../constants/hrSpaceRoutes'
import { useTranslation } from '../i18n/useTranslation'
import '../components/hr/HrModuleShell.css'

export default function HrHiringRecruitment() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('plan')

  const openPositions = useHrSpaceStore((s) => s.openPositions)
  const candidates = useHrSpaceStore((s) => s.candidates)
  const employees = useHrSpaceStore((s) => s.employees)
  const addOpenPosition = useHrSpaceStore((s) => s.addOpenPosition)
  const updateOpenPosition = useHrSpaceStore((s) => s.updateOpenPosition)
  const deleteOpenPosition = useHrSpaceStore((s) => s.deleteOpenPosition)
  const addCandidate = useHrSpaceStore((s) => s.addCandidate)
  const updateCandidate = useHrSpaceStore((s) => s.updateCandidate)
  const deleteCandidate = useHrSpaceStore((s) => s.deleteCandidate)
  const hireCandidate = useHrSpaceStore((s) => s.hireCandidate)

  const [posForm, setPosForm] = useState({ title: '', department: 'Production', description: '' })
  const [candForm, setCandForm] = useState({
    positionId: '',
    name: '',
    email: '',
    phone: '',
    cvFileName: '',
    cvSummary: '',
  })
  const [hireModal, setHireModal] = useState(null)
  const [hireForm, setHireForm] = useState({ department: '', role: '', hireDate: '' })

  const openList = useMemo(() => openPositions.filter((p) => p.status === 'open'), [openPositions])

  const runHire = () => {
    if (!hireModal) return
    hireCandidate(hireModal.id, {
      department: hireForm.department || undefined,
      role: hireForm.role || undefined,
      hireDate: hireForm.hireDate || undefined,
    })
    setHireModal(null)
    setHireForm({ department: '', role: '', hireDate: '' })
  }

  return (
    <AppLayout>
      <HrModuleShell
        title={t('hrSpace.page.hiring.label', 'Hiring & recruitment')}
        subtitle={t('hrSpace.page.hiring.desc', 'Open positions, candidate CVs, hire into HR Space with full module links')}
        tab={tab}
        onTab={setTab}
        extra={
          <Link to={hrSpacePath()} className="hr-mod-back" style={{ marginLeft: 'auto' }}>
            {t('hrSpace.backToHrHub', 'HR Space')}
          </Link>
        }
      >
        {tab === 'plan' && (
          <>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.hiringPlanTitle', 'Workforce plan')}</h3>
              <p>{t('hrSpace.hiringPlanBody', 'Define open roles first, then attach applicants. Hiring creates an employee number and seeds qualifications, onboarding tasks, training, and links across all HR modules.')}</p>
              <div className="hr-mod-stat">
                <strong>{openList.length}</strong>
                <span>{t('hrSpace.openRoles', 'open roles')}</span>
              </div>
              <div className="hr-mod-stat">
                <strong>{candidates.filter((c) => c.status !== 'hired').length}</strong>
                <span>{t('hrSpace.activeCandidates', 'active candidates')}</span>
              </div>
              <div className="hr-mod-stat">
                <strong>{employees.length}</strong>
                <span>{t('hrSpace.employeesTotal', 'employees')}</span>
              </div>
            </div>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.createPosition', 'Create open position')}</h3>
              <div className="hr-mod-field">
                <label>{t('hrSpace.jobTitle', 'Title')}</label>
                <input value={posForm.title} onChange={(e) => setPosForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="hr-mod-field">
                <label>{t('qualificationMatrix.department', 'Department')}</label>
                <input value={posForm.department} onChange={(e) => setPosForm((p) => ({ ...p, department: e.target.value }))} />
              </div>
              <div className="hr-mod-field">
                <label>{t('hrSpace.description', 'Description')}</label>
                <textarea rows={3} value={posForm.description} onChange={(e) => setPosForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <button
                type="button"
                className="hr-mod-btn hr-mod-btn--primary"
                onClick={() => {
                  if (!posForm.title.trim()) return
                  addOpenPosition({ title: posForm.title.trim(), department: posForm.department, description: posForm.description })
                  setPosForm({ title: '', department: 'Production', description: '' })
                }}
              >
                {t('hrSpace.addPosition', 'Add position')}
              </button>
            </div>
          </>
        )}

        {tab === 'track' && (
          <div className="hr-mod-panel">
            <h3>{t('hrSpace.pipeline', 'Pipeline')}</h3>
            <table className="hr-mod-table">
              <thead>
                <tr>
                  <th>{t('hrSpace.candidate', 'Candidate')}</th>
                  <th>{t('hrSpace.position', 'Position')}</th>
                  <th>{t('hrSpace.status', 'Status')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const pos = openPositions.find((p) => p.id === c.positionId)
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{pos?.title || '—'}</td>
                      <td>{c.status}</td>
                      <td>
                        {c.status !== 'hired' && (
                          <button type="button" className="hr-mod-btn hr-mod-btn--primary" onClick={() => { setHireModal(c); setHireForm({ department: pos?.department || '', role: pos?.title || '', hireDate: new Date().toISOString().slice(0, 10) }) }}>
                            {t('hrSpace.hire', 'Hire')}
                          </button>
                        )}
                        {c.linkedEmployeeId && (
                          <Link to={`${hrSpacePath(`employees/${c.linkedEmployeeId}`)}`}>{t('hrSpace.viewProfile', 'Profile')}</Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'manage' && (
          <>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.positionsManage', 'Positions — create / edit / delete')}</h3>
              <table className="hr-mod-table">
                <thead>
                  <tr>
                    <th>{t('hrSpace.jobTitle', 'Title')}</th>
                    <th>{t('qualificationMatrix.department', 'Department')}</th>
                    <th>{t('hrSpace.status', 'Status')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {openPositions.map((p) => (
                    <tr key={p.id}>
                      <td><input defaultValue={p.title} onBlur={(e) => updateOpenPosition(p.id, { title: e.target.value })} /></td>
                      <td><input defaultValue={p.department} onBlur={(e) => updateOpenPosition(p.id, { department: e.target.value })} /></td>
                      <td>{p.status}</td>
                      <td>
                        <button type="button" className="hr-mod-btn hr-mod-btn--danger" onClick={() => deleteOpenPosition(p.id)}>{t('hrSpace.delete', 'Delete')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.addCandidate', 'Add candidate (CV metadata)')}</h3>
              <div className="hr-mod-grid2">
                <div className="hr-mod-field">
                  <label>{t('hrSpace.position', 'Position')}</label>
                  <select value={candForm.positionId} onChange={(e) => setCandForm((f) => ({ ...f, positionId: e.target.value }))}>
                    <option value="">{t('hrSpace.select', 'Select…')}</option>
                    {openList.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.candidateName', 'Name')}</label>
                  <input value={candForm.name} onChange={(e) => setCandForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>Email</label>
                  <input type="email" value={candForm.email} onChange={(e) => setCandForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.phone', 'Phone')}</label>
                  <input value={candForm.phone} onChange={(e) => setCandForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="hr-mod-field">
                <label>{t('hrSpace.cvFile', 'CV file (local name)')}</label>
                <input type="file" onChange={(e) => setCandForm((f) => ({ ...f, cvFileName: e.target.files?.[0]?.name || '' }))} />
                {candForm.cvFileName && <span className="hr-emp-prof-hint">{candForm.cvFileName}</span>}
              </div>
              <div className="hr-mod-field">
                <label>{t('hrSpace.cvSummary', 'CV summary / notes')}</label>
                <textarea rows={3} value={candForm.cvSummary} onChange={(e) => setCandForm((f) => ({ ...f, cvSummary: e.target.value }))} />
              </div>
              <button
                type="button"
                className="hr-mod-btn hr-mod-btn--primary"
                onClick={() => {
                  if (!candForm.positionId || !candForm.name.trim()) return
                  addCandidate({
                    positionId: candForm.positionId,
                    name: candForm.name.trim(),
                    email: candForm.email,
                    phone: candForm.phone,
                    cvFileName: candForm.cvFileName,
                    cvSummary: candForm.cvSummary,
                  })
                  setCandForm({ positionId: '', name: '', email: '', phone: '', cvFileName: '', cvSummary: '' })
                }}
              >
                {t('hrSpace.saveCandidate', 'Save candidate')}
              </button>
            </div>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.candidatesManage', 'Candidates')}</h3>
              <table className="hr-mod-table">
                <thead>
                  <tr>
                    <th>{t('hrSpace.candidateName', 'Name')}</th>
                    <th>Email</th>
                    <th>{t('hrSpace.cvSummary', 'CV')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.email}</td>
                      <td><small>{c.cvSummary?.slice(0, 80)}{c.cvSummary?.length > 80 ? '…' : ''}</small></td>
                      <td>
                        <div className="hr-mod-actions">
                          <select value={c.status} onChange={(e) => updateCandidate(c.id, { status: e.target.value })}>
                            {['applied', 'screening', 'offer', 'hired', 'rejected'].map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                          <button type="button" className="hr-mod-btn hr-mod-btn--danger" onClick={() => deleteCandidate(c.id)}>{t('hrSpace.delete', 'Delete')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {hireModal && (
          <div className="hm-modal-overlay" style={{ zIndex: 6000 }} role="dialog" aria-modal>
            <div className="hm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="hm-modal-header">
                <h3>{t('hrSpace.hireConfirm', 'Hire')} — {hireModal.name}</h3>
                <button type="button" className="hm-modal-close" onClick={() => setHireModal(null)}>×</button>
              </div>
              <div className="hm-modal-body">
                <p>{t('hrSpace.hireExplain', 'Creates employee number, seeds qualifications (baseline stars), onboarding checklist, planned induction training, and links modules. Position can be marked filled.')}</p>
                <div className="hr-mod-field">
                  <label>{t('qualificationMatrix.department', 'Department')}</label>
                  <input value={hireForm.department} onChange={(e) => setHireForm((f) => ({ ...f, department: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.role', 'Role / title')}</label>
                  <input value={hireForm.role} onChange={(e) => setHireForm((f) => ({ ...f, role: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.startDate', 'Start date')}</label>
                  <input type="date" value={hireForm.hireDate} onChange={(e) => setHireForm((f) => ({ ...f, hireDate: e.target.value }))} />
                </div>
              </div>
              <div className="hm-modal-footer">
                <button type="button" className="hm-modal-cancel" onClick={() => setHireModal(null)}>{t('hrSpace.cancel', 'Cancel')}</button>
                <button type="button" className="hm-modal-save" onClick={runHire}>{t('hrSpace.confirmHire', 'Confirm hire')}</button>
              </div>
            </div>
          </div>
        )}
      </HrModuleShell>
    </AppLayout>
  )
}
