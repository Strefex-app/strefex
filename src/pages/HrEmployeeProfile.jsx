import { Link, useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useHrSpaceStore from '../store/hrSpaceStore'
import { hrSpacePath } from '../constants/hrSpaceRoutes'
import { useTranslation } from '../i18n/useTranslation'
import './HrEmployeeProfile.css'

const MODULE_LINKS = [
  { key: 'qualification-matrix', labelKey: 'hrSpace.page.qualification-matrix.label' },
  { key: 'goals', labelKey: 'hrSpace.page.goals.label' },
  { key: 'dialogue', labelKey: 'hrSpace.page.dialogue.label' },
  { key: 'hr-docs', labelKey: 'hrSpace.page.hr-docs.label' },
  { key: 'training', labelKey: 'hrSpace.page.training.label' },
  { key: 'workforce', labelKey: 'hrSpace.page.workforce.label' },
  { key: 'onboarding', labelKey: 'hrSpace.page.onboarding.label' },
  { key: 'attendance', labelKey: 'hrSpace.page.attendance.label' },
  { key: 'hiring', labelKey: 'hrSpace.page.hiring.label' },
]

export default function HrEmployeeProfile() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const employee = useHrSpaceStore((s) => s.getEmployeeById(employeeId))
  const deleteEmployee = useHrSpaceStore((s) => s.deleteEmployee)

  if (!employee) {
    return (
      <AppLayout>
        <div className="hr-emp-prof">
          <p>{t('hrSpace.employeeNotFound', 'Employee not found.')}</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="hr-emp-prof">
        <header className="hr-emp-prof-head">
          <div>
            <h1 className="hr-emp-prof-name">{employee.name}</h1>
            <p className="hr-emp-prof-num">{employee.employeeNumber}</p>
          </div>
          <div className="hr-emp-prof-meta">
            <span>{employee.department}</span>
            <span>{employee.role}</span>
            <span>{employee.status}</span>
            {employee.hireDate && <span>{t('hrSpace.hired', 'Hired')}: {employee.hireDate}</span>}
          </div>
        </header>

        <section className="hr-emp-prof-section">
          <h2>{t('hrSpace.employeeModuleLinks', 'Open in module (filtered / linked)')}</h2>
          <ul className="hr-emp-prof-links">
            {MODULE_LINKS.map((m) => (
              <li key={m.key}>
                <Link to={`${hrSpacePath(m.key)}?employeeId=${employee.id}`}>
                  {t(m.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="hr-emp-prof-section hr-emp-prof-danger">
          <h2>{t('hrSpace.dataAdmin', 'Data administration')}</h2>
          <p className="hr-emp-prof-hint">
            {t('hrSpace.deleteEmployeeHint', 'Removes this person from the directory and unlinks module rows (documents may become unassigned).')}
          </p>
          <button
            type="button"
            className="hr-emp-prof-del stx-click-feedback"
            onClick={() => {
              if (window.confirm(t('hrSpace.confirmDeleteEmployee', 'Delete this employee and related HR data?'))) {
                deleteEmployee(employee.id)
                navigate(hrSpacePath())
              }
            }}
          >
            {t('hrSpace.deleteEmployee', 'Delete employee')}
          </button>
        </section>
      </div>
    </AppLayout>
  )
}
