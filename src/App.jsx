import { useEffect, useLayoutEffect, useRef, useState, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useServiceRequestStore } from './store/serviceRequestStore'
import { useSubscriptionStore } from './services/featureFlags'
import ProtectedRoute from './components/ProtectedRoute'
import AccountTypeRoute from './components/AccountTypeRoute'
import ErrorBoundary from './components/ErrorBoundary'
import AnalyticsProvider from './components/AnalyticsProvider'
import UpgradePrompt from './components/UpgradePrompt'
import PWAUpdateBanner from './components/PWAUpdateBanner'
import PwaNotificationPrompt from './components/PwaNotificationPrompt'
import AppLayout from './components/AppLayout'
import authService from './services/authService'
import {
  getNotificationPermission,
  isPushNotificationsEnabled,
  shouldOfferPwaNotificationPrompt,
  syncPushSubscription,
} from './services/pushNotificationService'
import { flushPendingWorkspacePushes } from './services/workspaceCloudSync'
import { supabase } from './config/supabase'
import IndustryGuard from './components/IndustryGuard'
import { FORGE_PATHS, FORGE_PATH_CLUB_DOC } from './constants/forgeSpaceRoutes'
import { useSettingsStore } from './store/settingsStore'
import { syncDomTheme } from './theme/syncDomTheme'
import RfqIntelligenceRedirect from './pages/RfqIntelligenceRedirect'
import LegacyCutDbRedirect from './routes/LegacyCutDbRedirect'
import { managementLegacyRedirectRoutes } from './routes/managementLegacyRedirectRoutes'

/* ── Code-split pages (see routes/lazyPages.js) ──────────── */
import {
  Login,
  Register,
  MarketingShell,
  MarketingHome,
  MarketingIntroBuyers,
  MarketingIntroManufacturers,
  MarketingIntroHowItWorks,
  VerifyEmail,
  SubscriptionPlans,
  TeamManagement,
  Home,
  PlatformCalendar,
  Dashboard,
  Settings,
  Notifications,
  Payment,
  Resources,
  Tasks,
  Project,
  MachineryIndustry,
  ExecutiveSummary,
  IndustryHub,
  IndustryOverview,
  IndustryEquipmentLanding,
  IndustryEquipmentCategory,
  IndustryEquipmentSuppliers,
  Profile,
  AddSupplier,
  AdminApproval,
  ManagementHub,
  ManagementClusterPage,
  AuditManagementHub,
  AuditProgramGate,
  AuditProLayout,
  AuditProDashboard,
  AuditProNewAudit,
  AuditProAuditPlans,
  AuditProCalendar,
  AuditProAuditorRegistry,
  AuditProSupplierRegistry,
  AuditProRiskMatrix,
  AuditProLogs,
  AuditProReports,
  AuditProConduct,
  AuditProPrintReport,
  ProjectManagement,
  ProjectDetail,
  ProjectCommandCenter,
  NewProjectPage,
  NewProcurementOpportunityPage,
  RfqManagementHub,
  EquipmentSupplierRequest,
  ServiceList,
  AuditRequest,
  CostManagement,
  CostCalculator,
  CostBreakdown,
  CostScenarios,
  CostTargets,
  EnterpriseManagement,
  EnterpriseFixedCosts,
  EnterpriseVariableCosts,
  EnterpriseSemiVariableCosts,
  EnterpriseDirectCosts,
  EnterpriseIndirectCosts,
  EnterpriseOpex,
  EnterpriseCapex,
  EnterprisePersonnel,
  EnterpriseFinancial,
  EnterpriseExceptional,
  EnterpriseRisk,
  EnterpriseProductCalc,
  QualityExcellenceHub,
  QualityExcellenceTool,
  IatfControlHub,
  TrustSetupPage,
  CompanyDatabase,
  ProductionManagement,
  Production5S,
  ProductionISO9001,
  ProductionIATF16949,
  ProductionVDA63,
  ProductionOEE,
  ProductionDowntime,
  ProductionScrap,
  ProductionOutput,
  ProductionQualityKPIs,
  ProductionProcessAudit,
  ProductionAuditHistory,
  ProductionFloorLayout,
  ProductionCertifications,
  AuditQuestionnaire,
  WorkCenterOutput,
  SystemManagement,
  SystemManagementPage,
  ProfileCalendar,
  HeadcountManagement,
  DepartmentHomes,
  CompanyWorkflowsHub,
  QualificationMatrix,
  EmployeeGoals,
  EmployeeDialogue,
  HRDocumentation,
  HrTrainingModule,
  HrWorkforceModule,
  HrOnboardingModule,
  HrAttendanceModule,
  HrHiringRecruitment,
  HrEmployeeProfile,
  ForgeHub,
  ForgeMembershipAssessment,
  ForgeProjects,
  ForgeClubDocumentPage,
  CommunitySupport,
  Forum,
  DeveloperDashboard,
  CompanyMessenger,
  SuperAdminDashboard,
  SuperAdminAccountDetailPage,
  ServiceRequestManagement,
  EquipmentHub,
  ProductHub,
  ServiceHub,
  ServiceExecutiveSummary,
  AuditorExecutiveSummary,
  ProductIndustryLanding,
  ProductSubcategoryPage,
  MachineDbCataloguePage,
  ProductExecutiveSummary,
  RawMaterialsLanding,
  RawMaterialsCategory,
  MaterialSuppliers,
  ServiceProviderDashboard,
  RfqComparison,
  RfqIntelligencePage,
  CompanyManufacturingCalculator,
  VendorManagement,
  VendorDetail,
  SupplierProfilePage,
  SupplierDashboard,
  SupplierGovernanceAdmin,
  NetworkSourcingRoute,
  SupplierWorkspace,
  AdminDataIngestion,
  PlatformDirectoryPage,
  RegisteredSuppliersPage,
  AccountDirectoryPage,
  PartnerHub,
  GovernanceHub,
  ProcurementDashboard,
  ContractDashboard,
  SpendAnalysis,
  ComplianceDashboard,
  AIInsights,
  ERPIntegrations,
  TemplateLibrary,
  AuditLogs,
  NotFoundPage,
} from './routes/lazyPages'

function RouteLoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '45vh',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid #e0e0e0',
          borderTopColor: '#00d4ff',
          borderRadius: '50%',
          animation: 'routeLazySpin 0.75s linear infinite',
        }}
      />
      <style>{`@keyframes routeLazySpin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

/* ── Shorthand wrappers ──────────────────────────────────── */
const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>
const Admin = ({ children }) => <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>
const SuperAdmin = ({ children }) => <ProtectedRoute requiredRole="superadmin">{children}</ProtectedRoute>
const AccountType = ({ children, allowed }) => (
  <P>
    <AccountTypeRoute allowed={allowed}>{children}</AccountTypeRoute>
  </P>
)
const Industry = ({ children, requiredTier = 'free' }) => (
  <P>
    <IndustryGuard requiredTier={requiredTier}>{children}</IndustryGuard>
  </P>
)

const WORKSPACE_FLUSH_DEBOUNCE_MS = 450

/** After navigation, debounce Supabase workspace pushes so rapid route changes do not queue redundant work. */
function WorkspaceSyncOnNavigate() {
  const location = useLocation()
  const debounceRef = useRef(null)

  useEffect(() => {
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      void flushPendingWorkspacePushes()
    }, WORKSPACE_FLUSH_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      void flushPendingWorkspacePushes()
    }
  }, [location.pathname, location.search])

  return null
}

/** Preserves query string when redirecting legacy /production/headcount/* → /hr-space/* */
function LegacyHrRedirect({ to }) {
  const { search } = useLocation()
  return <Navigate to={search ? `${to}${search}` : to} replace />
}

function PlanGate({ feature, planName, children, requiredRole }) {
  const hasFeature = useSubscriptionStore((s) => s.hasFeature)
  const inner = hasFeature(feature)
    ? children
    : <AppLayout><UpgradePrompt feature={feature.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())} requiredPlan={planName || 'a higher'} /></AppLayout>
  return requiredRole
    ? <ProtectedRoute requiredRole={requiredRole}>{inner}</ProtectedRoute>
    : <ProtectedRoute>{inner}</ProtectedRoute>
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const tenantReady = useAuthStore((state) => state.tenantReady)
  const startRequestRefresh = useServiceRequestStore((s) => s.startRefreshSequence)
  const stopRequestRefresh = useServiceRequestStore((s) => s.stopRefreshSequence)
  const theme = useSettingsStore((s) => s.theme)
  const [sessionChecked, setSessionChecked] = useState(false)

  useLayoutEffect(() => {
    syncDomTheme(theme)
  }, [theme])

  useEffect(() => {
    // Guard against missing Supabase config in production to avoid
    // runtime crashes that can result in a blank screen.
    if (supabase?.auth?.getSession) {
      supabase.auth.getSession().catch(() => {})
    }
  }, []);

  useEffect(() => {
    let finished = false
    let sessionReady = false
    const finish = () => {
      if (finished) return
      finished = true
      sessionReady = true
      setSessionChecked(true)
    }
    const timer = window.setTimeout(finish, 12000)
    authService.initSession().finally(() => {
      window.clearTimeout(timer)
      finish()
    })

    // Listen for server-side session changes (sign-out from other tab, token revoked)
    const unsub = authService.onAuthStateChange((user) => {
      if (!sessionReady) return
      if (!user && useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().logout()
      }
    })
    return () => {
      window.clearTimeout(timer)
      finish()
      unsub?.()
    }
  }, [])

  useEffect(() => {
    if (!sessionChecked) return undefined
    if (isAuthenticated) {
      startRequestRefresh()
      if (isPushNotificationsEnabled() && getNotificationPermission() === 'granted') {
        syncPushSubscription().catch(() => {})
      }
      return () => stopRequestRefresh()
    }
    stopRequestRefresh()
    return undefined
  }, [isAuthenticated, sessionChecked, startRequestRefresh, stopRequestRefresh])

  useEffect(() => {
    if (!isAuthenticated || tenantReady) return undefined
    const timer = window.setTimeout(() => {
      useAuthStore.getState().markTenantReady()
    }, 12000)
    return () => window.clearTimeout(timer)
  }, [isAuthenticated, tenantReady])

  const showPushPrompt = isAuthenticated && shouldOfferPwaNotificationPrompt()

  // While verifying the session, show a minimal loading screen
  // to prevent flash of login page or unauthorized protected content
  if (!sessionChecked || (isAuthenticated && !tenantReady)) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg-primary)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid var(--border-light)',
            borderTopColor: 'var(--btn-primary-bg)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <p className="stx-text-small" style={{ color: 'var(--color-muted)', margin: 0 }}>Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <PWAUpdateBanner />
      <Router>
        {showPushPrompt && <PwaNotificationPrompt />}
        <WorkspaceSyncOnNavigate />
        <AnalyticsProvider>
        <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* ── Public ────────────────────────────────────── */}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/main-menu" /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/main-menu" /> : <Register />} />

          {/* Public marketing site (www.strefex.pro) — always the introduction */}
          <Route path="/" element={<MarketingShell />}>
            <Route index element={<MarketingHome />} />
            <Route path="intro/buyers" element={<MarketingIntroBuyers />} />
            <Route path="intro/manufacturers" element={<MarketingIntroManufacturers />} />
            <Route path="intro/how-it-works" element={<MarketingIntroHowItWorks />} />
          </Route>

          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* ── Core pages ────────────────────────────────── */}
          <Route path="/main-menu" element={<P><Home /></P>} />
          <Route path="/calendar" element={<P><PlatformCalendar /></P>} />
          <Route path="/settings" element={<P><Settings /></P>} />
          <Route path="/notifications" element={<P><Notifications /></P>} />
          <Route path="/payment" element={<P><Payment /></P>} />
          <Route path="/plans" element={<P><SubscriptionPlans /></P>} />
          <Route path="/management/people/team" element={<PlanGate feature="teamManagement" planName="Basic" requiredRole="admin"><TeamManagement /></PlanGate>} />
          <Route path="/resources" element={<P><Resources /></P>} />
          <Route path="/tasks" element={<P><Tasks /></P>} />
          <Route path="/project" element={<P><Project /></P>} />
          <Route path="/dashboard" element={<P><Dashboard /></P>} />
          <Route path="/intelligence/*" element={<P><Navigate to="/main-menu" replace /></P>} />
          <Route path="/seller-dashboard" element={<P><Navigate to="/dashboard/supplier" replace /></P>} />
          <Route path="/buyer-dashboard" element={<Navigate to="/hub/procurement?tab=track" replace />} />
          <Route path="/hub/procurement" element={<P><NetworkSourcingRoute /></P>} />
          <Route path="/sourcing" element={<P><NetworkSourcingRoute /></P>} />
          <Route path="/hub/partner" element={<P><PartnerHub /></P>} />
          <Route path="/hub/governance" element={<Admin><GovernanceHub /></Admin>} />
          <Route path="/dashboard/buyer" element={<P><NetworkSourcingRoute /></P>} />
          <Route path="/dashboard/buyer/account-directory" element={<P><AccountDirectoryPage /></P>} />
          <Route path="/dashboard/buyer/platform-directory" element={<SuperAdmin><PlatformDirectoryPage /></SuperAdmin>} />
          <Route path="/dashboard/buyer/registered-suppliers" element={<SuperAdmin><RegisteredSuppliersPage /></SuperAdmin>} />
          <Route path="/dashboard/supplier" element={<P><SupplierWorkspace /></P>} />
          <Route path="/service-provider-dashboard" element={<AccountType allowed={['service_provider']}><ServiceProviderDashboard /></AccountType>} />
          <Route path="/rfq-comparison/:rfqId" element={<P><RfqComparison /></P>} />

          {/* ── Vendor Management ────────────────────────── */}
          <Route path="/management/sourcing/vendors" element={<P><VendorManagement /></P>} />
          <Route path="/management/sourcing/vendors/:vendorId" element={<P><VendorDetail /></P>} />
          <Route path="/suppliers/:supplierId" element={<P><SupplierProfilePage /></P>} />
          <Route path="/supplier-dashboard" element={<P><SupplierDashboard /></P>} />
          <Route path="/admin/supplier-governance" element={<SuperAdmin><SupplierGovernanceAdmin /></SuperAdmin>} />
          <Route path="/admin/data-ingestion" element={<SuperAdmin><AdminDataIngestion /></SuperAdmin>} />
          <Route path="/admin/platform-directory" element={<Navigate to="/dashboard/buyer/platform-directory" replace />} />

          {/* ── Hub pages (Home → Category → Industries) ──── */}
          <Route path="/equipment-hub" element={<P><EquipmentHub /></P>} />
          <Route path="/product-hub" element={<P><ProductHub /></P>} />
          <Route path="/product-hub/:industryId" element={<P><ProductIndustryLanding /></P>} />
          <Route path="/product-hub/:industryId/:categoryId" element={<P><ProductSubcategoryPage /></P>} />
          <Route path="/product-hub/:industryId/:categoryId/executive-summary" element={<Industry requiredTier="free"><ExecutiveSummary /></Industry>} />
          <Route path="/product-hub/:industryId/:categoryId/:processId/executive-summary" element={<P><ProductExecutiveSummary /></P>} />
          <Route path="/service-hub" element={<P><ServiceHub /></P>} />
          <Route path="/service-hub/executive-summary" element={<P><ServiceExecutiveSummary /></P>} />
          <Route path="/auditor-hub/executive-summary" element={<P><AuditorExecutiveSummary /></P>} />

          {/* ── Industry routes ───────────────────────────── */}
          <Route path="/machinery-industry" element={<P><MachineryIndustry /></P>} />
          <Route path="/industry/:industryId" element={<Industry requiredTier="free"><IndustryHub /></Industry>} />
          <Route path="/industry/:industryId/overview" element={<Industry requiredTier="free"><IndustryOverview /></Industry>} />
          <Route path="/industry/:industryId/dashboard" element={<Industry requiredTier="basic"><Dashboard /></Industry>} />
          <Route path="/industry/:industryId/equipment" element={<Industry requiredTier="basic"><IndustryEquipmentLanding /></Industry>} />
          <Route path="/industry/:industryId/equipment/:categoryId" element={<Industry requiredTier="basic"><IndustryEquipmentCategory /></Industry>} />
          <Route path="/industry/:industryId/equipment/:categoryId/:itemId/suppliers" element={<Industry requiredTier="basic"><IndustryEquipmentSuppliers /></Industry>} />
          <Route path="/industry/:industryId/equipment/:categoryId/executive-summary" element={<Industry requiredTier="free"><ExecutiveSummary /></Industry>} />
          <Route path="/raw-materials" element={<P><RawMaterialsLanding /></P>} />
          <Route path="/raw-materials/:category" element={<P><RawMaterialsCategory /></P>} />
          <Route path="/raw-materials/:category/:materialId/suppliers" element={<P><MaterialSuppliers /></P>} />

          {/* ── Management Hub ────────────────────────────── */}
          <Route path="/management" element={<P><ManagementHub /></P>} />
          <Route path="/management/people/forum" element={<P><Forum /></P>} />
          <Route path="/management/contracts-compliance/auditors" element={<P><AuditProgramGate /></P>}>
            <Route path="print/:auditId" element={<AuditProPrintReport />} />
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="overview" element={<AuditManagementHub />} />
            <Route element={<AuditProLayout />}>
              <Route path="dashboard" element={<AuditProDashboard />} />
              <Route path="new-audit" element={<AuditProNewAudit />} />
              <Route path="plans" element={<AuditProAuditPlans />} />
              <Route path="calendar" element={<AuditProCalendar />} />
              <Route path="auditors" element={<AuditProAuditorRegistry />} />
              <Route path="suppliers" element={<AuditProSupplierRegistry />} />
              <Route path="risk-matrix" element={<AuditProRiskMatrix />} />
              <Route path="logs" element={<AuditProLogs />} />
              <Route path="reports" element={<AuditProReports />} />
              <Route path="conduct/:auditId" element={<AuditProConduct />} />
            </Route>
          </Route>

          {/* ── Projects ──────────────────────────────────── */}
          <Route path="/management/ops/projects" element={<P><ProjectManagement /></P>} />
          <Route path="/management/ops/projects/new-project" element={<P><NewProjectPage /></P>} />
          <Route path="/management/ops/projects/new-program" element={<Navigate to="/management/ops/projects/new-project" replace />} />
          <Route path="/management/ops/projects/program/:programId" element={<Navigate to="/management/ops/projects?view=portfolio" replace />} />
          <Route path="/management/ops/projects/project/:projectId/control" element={<P><ProjectCommandCenter /></P>} />
          <Route path="/management/ops/projects/project/:projectId" element={<P><ProjectDetail /></P>} />
          <Route path="/management/sourcing/register/new" element={<P><NewProcurementOpportunityPage /></P>} />
          <Route path="/management/sourcing/workspace" element={<P><RfqManagementHub /></P>} />
          <Route path="/management/sourcing/price-calculator" element={<P><CompanyManufacturingCalculator /></P>} />
          <Route path="/management/sourcing/intelligence" element={<P><RfqIntelligencePage /></P>} />
          <Route path="/rfq-intelligence" element={<P><RfqIntelligenceRedirect /></P>} />

          {/* ── Services & suppliers ──────────────────────── */}
          <Route path="/equipment-request" element={<P><EquipmentSupplierRequest /></P>} />
          <Route path="/industry/:industryId/equipment-request" element={<P><EquipmentSupplierRequest /></P>} />
          <Route path="/services" element={<P><ServiceList /></P>} />
          <Route path="/industry/:industryId/services" element={<P><ServiceList /></P>} />
          <Route path="/audit-request" element={<P><AuditRequest /></P>} />
          <Route path="/industry/:industryId/audit-request" element={<P><AuditRequest /></P>} />
          <Route path="/executive-summary" element={<P><ExecutiveSummary /></P>} />
          <Route path="/industry/:industryId/executive-summary" element={<P><ExecutiveSummary /></P>} />

          {/* ── Profile ───────────────────────────────────── */}
          <Route path="/profile" element={<P><Profile /></P>} />
          <Route path="/cutdb" element={<LegacyCutDbRedirect />} />
          <Route path="/cutdb/*" element={<LegacyCutDbRedirect />} />
          <Route path="/profile/machine-intelligence/:catalogueId" element={<SuperAdmin><MachineDbCataloguePage /></SuperAdmin>} />
          <Route path="/profile/calendar" element={<P><ProfileCalendar /></P>} />
          <Route path="/request-service" element={<P><ServiceList /></P>} />
          <Route path="/add-supplier" element={<P><AddSupplier /></P>} />

          {/* ── Admin (role-protected) ────────────────────── */}
          <Route path="/admin/approvals" element={<Admin><AdminApproval /></Admin>} />
          <Route path="/admin/approve/:id" element={<Admin><AdminApproval /></Admin>} />

          {/* ── Communication & Support ────────────────────── */}
          <Route path="/support" element={<P><CommunitySupport /></P>} />
          <Route
            path="/messenger"
            element={
              <PlanGate feature="messenger" planName="Premium">
                <CompanyMessenger />
              </PlanGate>
            }
          />
          <Route path="/service-requests" element={<P><ServiceRequestManagement /></P>} />
          <Route path="/developer" element={<SuperAdmin><DeveloperDashboard /></SuperAdmin>} />
          <Route path="/admin-dashboard" element={<SuperAdmin><SuperAdminDashboard /></SuperAdmin>} />
          <Route path="/admin-dashboard/account/:companyId" element={<SuperAdmin><SuperAdminAccountDetailPage /></SuperAdmin>} />

          {/* ── Cost Management (Premium only) ────────────── */}
          <Route path="/management/finance/cost" element={<PlanGate feature="costManagement" planName="Premium"><CostManagement /></PlanGate>} />
          <Route path="/management/finance/cost/calculator" element={<PlanGate feature="costManagement" planName="Premium"><CostCalculator /></PlanGate>} />
          <Route path="/management/finance/cost/bom" element={<PlanGate feature="costManagement" planName="Premium"><CostCalculator /></PlanGate>} />
          <Route path="/management/finance/cost/breakdown" element={<PlanGate feature="costManagement" planName="Premium"><CostBreakdown /></PlanGate>} />
          <Route path="/management/finance/cost/comparison" element={<PlanGate feature="costManagement" planName="Premium"><CostBreakdown /></PlanGate>} />
          <Route path="/management/finance/cost/scenarios" element={<PlanGate feature="costManagement" planName="Premium"><CostScenarios /></PlanGate>} />
          <Route path="/management/finance/cost/targets" element={<PlanGate feature="costManagement" planName="Premium"><CostTargets /></PlanGate>} />

          {/* ── Multi-Site Management (Enterprise plan only) ── */}
          <Route path="/management/finance/enterprise" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseManagement /></PlanGate>} />
          <Route path="/management/finance/enterprise/fixed-costs" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseFixedCosts /></PlanGate>} />
          <Route path="/management/finance/enterprise/variable-costs" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseVariableCosts /></PlanGate>} />
          <Route path="/management/finance/enterprise/semi-variable-costs" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseSemiVariableCosts /></PlanGate>} />
          <Route path="/management/finance/enterprise/direct-costs" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseDirectCosts /></PlanGate>} />
          <Route path="/management/finance/enterprise/indirect-costs" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseIndirectCosts /></PlanGate>} />
          <Route path="/management/finance/enterprise/opex" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseOpex /></PlanGate>} />
          <Route path="/management/finance/enterprise/capex" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseCapex /></PlanGate>} />
          <Route path="/management/finance/enterprise/personnel" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterprisePersonnel /></PlanGate>} />
          <Route path="/management/finance/enterprise/financial" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseFinancial /></PlanGate>} />
          <Route path="/management/finance/enterprise/exceptional" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseExceptional /></PlanGate>} />
          <Route path="/management/finance/enterprise/risk" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseRisk /></PlanGate>} />
          <Route path="/management/finance/enterprise/product-calculation" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseProductCalc /></PlanGate>} />

          {/* ── Production Management (Premium only) ────────── */}
          <Route path="/management/ops/production" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionManagement /></PlanGate>} />
          <Route path="/management/ops/production/5s" element={<PlanGate feature="productionManagement" planName="Premium"><Production5S /></PlanGate>} />
          <Route path="/management/ops/production/iso9001" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionISO9001 /></PlanGate>} />
          <Route path="/management/ops/production/iatf16949" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionIATF16949 /></PlanGate>} />
          <Route path="/management/ops/production/vda63" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionVDA63 /></PlanGate>} />
          <Route path="/management/ops/production/oee" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionOEE /></PlanGate>} />
          <Route path="/management/ops/production/downtime" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionDowntime /></PlanGate>} />
          <Route path="/management/ops/production/scrap" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionScrap /></PlanGate>} />
          <Route path="/management/ops/production/output" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionOutput /></PlanGate>} />
          <Route path="/management/ops/production/quality-kpis" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionQualityKPIs /></PlanGate>} />
          <Route path="/management/ops/production/process-audit" element={<PlanGate feature="auditManagement" planName="Premium"><ProductionProcessAudit /></PlanGate>} />
          <Route path="/management/ops/production/audit-history" element={<PlanGate feature="auditManagement" planName="Premium"><ProductionAuditHistory /></PlanGate>} />
          <Route path="/management/ops/production/floor-layout" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionFloorLayout /></PlanGate>} />
          <Route path="/management/ops/production/certifications" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionCertifications /></PlanGate>} />
          <Route path="/management/ops/production/audit-questionnaire" element={<PlanGate feature="auditManagement" planName="Premium"><AuditQuestionnaire /></PlanGate>} />
          <Route path="/management/ops/production/workcenter-output" element={<PlanGate feature="productionManagement" planName="Premium"><WorkCenterOutput /></PlanGate>} />
          <Route path="/management/ops/production/system-management" element={<PlanGate feature="productionManagement" planName="Premium"><SystemManagement /></PlanGate>} />
          <Route path="/management/ops/production/system/:systemId" element={<PlanGate feature="productionManagement" planName="Premium"><SystemManagementPage /></PlanGate>} />

          {/* ── Quality Excellence (Premium) ───────────────── */}
          <Route path="/management/ops/quality-excellence" element={<PlanGate feature="productionManagement" planName="Premium"><QualityExcellenceHub /></PlanGate>} />
          <Route path="/management/ops/quality-excellence/:toolId" element={<PlanGate feature="productionManagement" planName="Premium"><QualityExcellenceTool /></PlanGate>} />
          <Route path="/management/ops/quality-excellence/:toolId/:recordId" element={<PlanGate feature="productionManagement" planName="Premium"><QualityExcellenceTool /></PlanGate>} />
          <Route path="/management/company-database" element={<Navigate to="/management/company-database/plant-qms" replace />} />
          <Route path="/management/company-database/:space" element={<PlanGate feature="productionManagement" planName="Premium"><CompanyDatabase /></PlanGate>} />
          <Route path="/management/company-database/:space/:folderId" element={<PlanGate feature="productionManagement" planName="Premium"><CompanyDatabase /></PlanGate>} />
          <Route path="/management/ops/iatf-control" element={<PlanGate feature="productionManagement" planName="Premium"><IatfControlHub /></PlanGate>} />
          <Route path="/management/ops/manufacturing-calculator" element={<Navigate to="/management/sourcing/price-calculator" replace />} />
          <Route path="/management/ops/trust-setup" element={<PlanGate feature="productionManagement" planName="Premium"><TrustSetupPage /></PlanGate>} />

          {/* ── HR Space ───────────────────────────────────── */}
          <Route path="/management/people/workflows" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><CompanyWorkflowsHub /></PlanGate>} />
          <Route path="/management/people/departments" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><DepartmentHomes /></PlanGate>} />
          <Route path="/management/people/departments/:deptKey" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><DepartmentHomes /></PlanGate>} />
          <Route path="/management/people/hr-space" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HeadcountManagement /></PlanGate>} />
          <Route path="/management/people/hr-space/qualification-matrix" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><QualificationMatrix /></PlanGate>} />
          <Route path="/management/people/hr-space/goals" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><EmployeeGoals /></PlanGate>} />
          <Route path="/management/people/hr-space/dialogue" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><EmployeeDialogue /></PlanGate>} />
          <Route path="/management/people/hr-space/hr-docs" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HRDocumentation /></PlanGate>} />
          <Route path="/management/people/hr-space/training" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HrTrainingModule /></PlanGate>} />
          <Route path="/management/people/hr-space/workforce" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HrWorkforceModule /></PlanGate>} />
          <Route path="/management/people/hr-space/onboarding" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HrOnboardingModule /></PlanGate>} />
          <Route path="/management/people/hr-space/attendance" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HrAttendanceModule /></PlanGate>} />
          <Route path="/management/people/hr-space/hiring" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HrHiringRecruitment /></PlanGate>} />
          <Route path="/management/people/hr-space/employees/:employeeId" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HrEmployeeProfile /></PlanGate>} />

          {/* Forge — superadmin only (community hub & onboarding tools) */}
          <Route path={FORGE_PATHS.membershipOnboarding} element={<SuperAdmin><ForgeMembershipAssessment /></SuperAdmin>} />
          <Route path={FORGE_PATHS.hub} element={<SuperAdmin><ForgeHub /></SuperAdmin>} />
          <Route path={FORGE_PATHS.projects} element={<SuperAdmin><ForgeProjects /></SuperAdmin>} />
          <Route path={FORGE_PATH_CLUB_DOC} element={<SuperAdmin><ForgeClubDocumentPage /></SuperAdmin>} />

          <Route path="/production/headcount" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/management/people/hr-space" /></PlanGate>} />
          <Route path="/production/headcount/qualification-matrix" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/management/people/hr-space/qualification-matrix" /></PlanGate>} />
          <Route path="/production/headcount/goals" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/management/people/hr-space/goals" /></PlanGate>} />
          <Route path="/production/headcount/dialogue" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/management/people/hr-space/dialogue" /></PlanGate>} />
          <Route path="/production/headcount/hr-docs" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/management/people/hr-space/hr-docs" /></PlanGate>} />
          <Route path="/production/headcount/training" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/management/people/hr-space/training" /></PlanGate>} />
          <Route path="/production/headcount/workforce" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/management/people/hr-space/workforce" /></PlanGate>} />
          <Route path="/production/headcount/onboarding" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/management/people/hr-space/onboarding" /></PlanGate>} />
          <Route path="/production/headcount/attendance" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/management/people/hr-space/attendance" /></PlanGate>} />
          <Route path="/production/headcount/hiring" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/management/people/hr-space/hiring" /></PlanGate>} />

          {/* ── Buyer Features (company-isolated, role-guarded) ── */}
          <Route path="/management/sourcing/procurement" element={<PlanGate feature="procurement" planName="Enterprise"><ProcurementDashboard /></PlanGate>} />
          <Route path="/management/contracts-compliance/contracts" element={<PlanGate feature="contractManagement" planName="Enterprise"><ContractDashboard /></PlanGate>} />
          <Route path="/management/finance/spend-analysis" element={<PlanGate feature="spendAnalysis" planName="Enterprise" requiredRole="manager"><SpendAnalysis /></PlanGate>} />
          <Route path="/management/contracts-compliance/compliance" element={<PlanGate feature="complianceEsg" planName="Enterprise"><ComplianceDashboard /></PlanGate>} />
          <Route path="/management/platform/ai-insights" element={<PlanGate feature="aiInsights" planName="Enterprise" requiredRole="manager"><AIInsights /></PlanGate>} />
          <Route path="/management/platform/erp" element={<PlanGate feature="erpIntegrations" planName="Enterprise" requiredRole="admin"><ERPIntegrations /></PlanGate>} />
          <Route path="/management/contracts-compliance/activity-log" element={<PlanGate feature="auditLogs" planName="Enterprise" requiredRole="admin"><AuditLogs /></PlanGate>} />

          <Route path="/templates" element={<PlanGate feature="templateLibrary" planName="Enterprise"><TemplateLibrary /></PlanGate>} />

          {managementLegacyRedirectRoutes()}

          <Route path="/management/:clusterId" element={<P><ManagementClusterPage /></P>} />

          {/* ── Catch-all ─────────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
        </AnalyticsProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
