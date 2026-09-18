import { useEffect, useMemo } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { useAccountRegistry } from '../../store/accountRegistry'
import useAuditProStore from '../../store/auditProStore'
import { auditProReminderTouchesDemoReminder } from '../../data/auditProDemoKit'
import { hydrateAuditProFromManagementTables } from '../../services/workspaceCloudSync'
import { useAuditProProgramAccess } from '../../utils/auditProgramAccess'
import { auditorsHubLeaf } from '../../utils/auditorsDirectory'
import { AuditorsHubNavContext } from './auditorsHubNavContext'
import '../../styles/app-page.css'
import '../../styles/managementShell.css'
import '../../pages/ManagementHub.css'
import '../../styles/auditPro.css'

const TITLES = {
  '': 'Assignment pool',
  dashboard: 'Dashboard',
  'new-audit': 'Create New Audit Plan',
  conduct: 'Conduct Audit',
  plans: 'Audit Plans',
  calendar: 'Audit schedule',
  findings: 'Audits & findings',
  record: 'Company record',
  auditors: 'Auditor database',
  standards: 'Standards & questionnaires',
  suppliers: 'Supplier Registry',
  'risk-matrix': 'Risk Matrix',
  logs: 'Audit Activity Logs',
  reports: 'Analytics & Reports',
  print: 'Print Report',
}

function segmentTitle(segment) {
  if (segment.startsWith('conduct')) return TITLES.conduct
  if (segment.startsWith('print')) return TITLES.print
  if (segment.startsWith('findings')) return TITLES.findings
  if (segment.startsWith('record')) return TITLES.record
  return TITLES[segment] || 'Audit Pro'
}

export default function AuditProLayout() {
  const location = useLocation()
  const canUse = useAuditProProgramAccess()

  const rehydrateRegistryFromStorage = useAccountRegistry((s) => s.rehydrateRegistryFromStorage)
  const ensureSeed = useAuditProStore((s) => s.ensureSeed)
  const hydrateFromSupabase = useAuditProStore((s) => s.hydrateFromSupabase)
  const reminders = useAuditProStore((s) => s.reminders)
  const toast = useAuditProStore((s) => s.toast)
  const audits = useAuditProStore((s) => s.audits)
  const auditors = useAuditProStore((s) => s.auditors)
  const suppliers = useAuditProStore((s) => s.suppliers)

  const openRemindersForNav = useMemo(() => {
    const open = (reminders || []).filter((r) => r.status === 'Open')
    return open.filter((r) => !auditProReminderTouchesDemoReminder(r, audits, auditors, suppliers))
  }, [reminders, audits, auditors, suppliers])

  useEffect(() => {
    rehydrateRegistryFromStorage()
    ensureSeed()
    void hydrateFromSupabase()

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void hydrateAuditProFromManagementTables()
      }
    }
    document.addEventListener('visibilitychange', onVis)

    const intervalId = window.setInterval(() => {
      void hydrateAuditProFromManagementTables()
    }, 120_000)

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(intervalId)
    }
  }, [rehydrateRegistryFromStorage, ensureSeed, hydrateFromSupabase])

  if (!canUse) {
    return <Navigate to="/management" replace />
  }

  const leaf = auditorsHubLeaf(location.pathname)
  const view = new URLSearchParams(location.search).get('view')
  const title = leaf === 'calendar' && view === 'findings'
    ? 'Audits & findings'
    : leaf === 'calendar' && view === 'capa'
      ? 'CAPA tracker'
      : leaf === 'suppliers' && view === 'self'
        ? 'Supplier self-assessment'
        : leaf === 'suppliers' && view === 'certs'
          ? 'Approval certificates'
          : leaf === 'suppliers' && view === 'records'
            ? 'Company records'
            : leaf === 'suppliers'
              ? 'Supplier register'
              : leaf === 'standards'
                ? 'Standards & questionnaires'
              : leaf === 'auditors'
                ? 'Auditor database'
              : segmentTitle(leaf)
  const subtitle = leaf === 'auditors'
    ? 'An audit can only be assigned to an auditor qualified for every module in its scope. Provisional modules need a qualified lead; expired calibration or medical clearance blocks assignment.'
    : leaf === 'standards'
      ? 'Question sets mapped to clauses, with what to look at on site and attached evidence references.'
      : leaf === 'suppliers' && view === 'self'
        ? 'Questionnaires go out before the visit; answers marked for verification become on-site checks.'
        : leaf === 'suppliers' && view === 'certs'
          ? 'STREFEX approval certificates and third-party certificates held by each supplier.'
          : leaf === 'suppliers' && view === 'records'
            ? 'Year-on-year audit ratings and element scorecards for each supplier.'
            : leaf === 'suppliers'
              ? 'Approval state, lapse date, and the next visit on the calendar.'
              : leaf === 'calendar' && view === 'findings'
                ? 'Completed visits, results, and the corrective actions they raised.'
                : leaf === 'calendar' && view === 'capa'
                  ? 'Corrective actions stay open until evidence is verified — late majors first.'
                  : leaf === 'calendar'
                    ? 'Initial, surveillance and follow-up visits. Move the date; the rest is generated from registrations, expiry and open findings.'
                    : leaf === 'record'
                      ? 'Supplier audit history, scores and related standards.'
                      : 'Unassigned visits this year. Assign only auditors qualified for the full scope.'
  const openRems = openRemindersForNav.length
  const overdue = openRemindersForNav.filter(
    (r) => new Date(r.dueDate) < new Date(new Date().toISOString().slice(0, 10)),
  ).length

  const suppliersPage = leaf === 'suppliers'
  const standardsPage = leaf === 'standards'

  return (
    <AuditorsHubNavContext.Provider value={{ openRems, overdue }}>
    <AppLayout>
      <div className={`app-page audit-pro-app-wrap${suppliersPage ? ' audit-pro-app-wrap--suppliers' : ''}${standardsPage ? ' audit-pro-app-wrap--standards' : ''}${leaf === 'auditors' ? ' audit-pro-app-wrap--panel' : ''}`}>
        <div className="audit-pro-app-shell">
          <header className="page-header audit-pro-app-head-row">
            <div className="audit-pro-app-head-copy">
              <h1 className="page-title stx-text-wrap">{title}</h1>
              <p className="page-subtitle stx-text-wrap">{subtitle}</p>
            </div>
          </header>

          <div className="ap-root ap-root--platform ap-scrollbar stx-text-wrap">
            <Outlet />
          </div>
        </div>

        {toast && (
          <div className={`ap-toast-fixed${toast.type === 'success' ? ' ap-toast-success' : ' ap-toast-error'}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </AppLayout>
    </AuditorsHubNavContext.Provider>
  )
}
