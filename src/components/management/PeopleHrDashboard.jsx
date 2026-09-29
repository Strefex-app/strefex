import { useMemo } from 'react'
import useHrSpaceStore from '../../store/hrSpaceStore'
import { useAccountRegistry } from '../../store/accountRegistry'
import { managementModulePath } from '../../constants/managementPaths'
import { buildPeopleManagementMetrics } from '../../utils/peopleHrDashboard'
import { BarChart, KpiTile } from './ManagementDashboardMetrics'
import '../../styles/managementShell.css'
import '../../pages/ManagementHub.css'

export default function PeopleHrDashboard() {
  const employees = useHrSpaceStore((s) => s.employees)
  const departments = useHrSpaceStore((s) => s.departments)
  const openPositions = useHrSpaceStore((s) => s.openPositions)
  const candidates = useHrSpaceStore((s) => s.candidates)
  const talentPool = useHrSpaceStore((s) => s.talentPoolEntries)
  const accounts = useAccountRegistry((s) => s.accounts)

  const teamMembers = useMemo(
    () => (Array.isArray(accounts) ? accounts : []).reduce((sum, acct) => sum + (acct.teamMembers?.length || 0), 0),
    [accounts],
  )

  const metrics = useMemo(
    () =>
      buildPeopleManagementMetrics({
        employees,
        departments,
        openPositions,
        candidates,
        talentPool,
        teamMembers,
      }),
    [employees, departments, openPositions, candidates, talentPool, teamMembers],
  )

  const { kpis } = metrics
  const teamPath = managementModulePath('people', 'team')
  const hrPath = managementModulePath('people', 'hr-space')
  const deptPath = managementModulePath('people', 'departments')

  return (
    <section className="mgmt-dash" aria-label="People overview metrics">
      <div className="page-header">
        <h1 className="page-title">People</h1>
        <p className="page-subtitle">Choose an area, then open the module you need</p>
      </div>

      <div className="stx-indicator-strip mgmt-dash-kpis">
        <KpiTile
          label="Team members"
          value={kpis.teamMembers}
          hint="Account seats"
          tone="vendor"
          to={teamPath}
        />
        <KpiTile
          label="Employees"
          value={kpis.employees}
          hint={`${kpis.active} active`}
          tone="pm"
          to={hrPath}
        />
        <KpiTile
          label="Departments"
          value={kpis.departments}
          hint="Workforce structure"
          tone="primary"
          to={deptPath}
        />
        <KpiTile
          label="Positions"
          value={kpis.jobTitles}
          hint={`${kpis.openRoles} open roles`}
          tone="proc"
          to={hrPath}
        />
        <KpiTile
          label="Hiring"
          value={kpis.candidates}
          hint={`${kpis.talentPool} in talent pool`}
          tone="warning"
          to={hrPath}
        />
      </div>

      <div className="mgmt-dash-charts">
        <div className="mgmt-dash-chart-card">
          <h3 className="mgmt-dash-chart-title">Headcount by department</h3>
          <BarChart items={metrics.departmentBars} />
        </div>
        <div className="mgmt-dash-chart-card">
          <h3 className="mgmt-dash-chart-title">Open roles</h3>
          <BarChart items={metrics.positionBars} />
        </div>
        <div className="mgmt-dash-chart-card">
          <h3 className="mgmt-dash-chart-title">Workforce by role</h3>
          <BarChart items={metrics.roleBars} />
        </div>
      </div>
    </section>
  )
}
