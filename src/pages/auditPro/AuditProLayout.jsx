import { useEffect, useMemo } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { useAccountRegistry } from '../../store/accountRegistry'
import useAuditProStore from '../../store/auditProStore'
import { auditProReminderTouchesDemoReminder } from '../../data/auditProDemoKit'
import { hydrateAuditProFromManagementTables } from '../../services/workspaceCloudSync'
import { useAuditProProgramAccess } from '../../utils/auditProgramAccess'
import { auditorsHubLeaf } from '../../utils/auditorsDirectory'
import { useAuthStore } from '../../store/authStore'
import { AuditorsHubNavContext } from './auditorsHubNavContext'
import '../../styles/app-page.css'
import '../../styles/managementShell.css'
import '../../pages/ManagementHub.css'
import '../../styles/auditPro.css'

const TITLES = {
  '': 'Calendar',
  pool: 'Supplier pool',
  conduct: 'On-site questionnaire',
  calendar: 'Calendar',
  findings: 'Findings report',
  record: 'Company record',
  auditors: 'Auditors & standards',
  standards: 'Auditors & standards',
  suppliers: 'Records',
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
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
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
    const later = window.setTimeout(() => {
      void useAuditProStore.getState().hydrateFromSupabase({ includePlatformDirectory: isSuperAdmin })
    }, 1200)

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
      window.clearTimeout(later)
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(intervalId)
    }
  }, [rehydrateRegistryFromStorage, ensureSeed, hydrateFromSupabase, isSuperAdmin])

  if (!canUse) {
    return <Navigate to="/management" replace />
  }

  const leaf = auditorsHubLeaf(location.pathname)
  const title = leaf === 'suppliers' || leaf === 'record'
    ? (leaf === 'record' ? 'Company record' : 'Records')
    : leaf === 'findings'
      ? 'Findings report'
      : leaf === 'standards' || leaf === 'auditors'
        ? 'Auditors & standards'
        : leaf === 'pool'
          ? 'Supplier pool'
          : leaf === 'calendar' || leaf === ''
            ? 'Calendar'
            : segmentTitle(leaf)
  const subtitle = leaf === 'auditors' || leaf === 'standards'
    ? 'Panel members and the questionnaires they use on site.'
    : leaf === 'suppliers' || leaf === 'record'
      ? 'Completed visits, reports, signatures and action plans. Status shows when a plan is still open.'
      : leaf === 'findings'
        ? 'Findings for this visit, the action plan and the signed closing report.'
        : leaf === 'pool'
          ? 'All sellers and assignment status. Assign an auditor here; only that auditor sees the company on Calendar.'
          : leaf === 'calendar' || leaf === ''
            ? 'Your assigned visits. Drag a company onto a day to plan the on-site date.'
            : 'Pick a date on Calendar, run the questionnaire, then file the signed report under Records.'
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
              <p className="audit-pro-ops-kicker">Supplier audit operations</p>
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
