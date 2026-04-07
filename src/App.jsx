import { useEffect, useState, Suspense } from 'react'
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
import AppLayout from './components/AppLayout'
import authService from './services/authService'
import { flushPendingWorkspacePushes } from './services/workspaceCloudSync'
import { supabase } from './config/supabase'
import IndustryGuard from './components/IndustryGuard'

/* ── Code-split pages (see routes/lazyPages.js) ──────────── */
import {
  Login,
  Register,
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
  ProjectManagement,
  ProjectDetail,
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
  CommunitySupport,
  DeveloperDashboard,
  CompanyMessenger,
  SuperAdminDashboard,
  ServiceRequestManagement,
  EquipmentHub,
  ProductHub,
  ServiceHub,
  ServiceExecutiveSummary,
  AuditorExecutiveSummary,
  ProductIndustryLanding,
  ProductSubcategoryPage,
  ProductExecutiveSummary,
  RawMaterialsLanding,
  RawMaterialsCategory,
  MaterialSuppliers,
  SellerDashboard,
  BuyerDashboard,
  ServiceProviderDashboard,
  RfqComparison,
  VendorManagement,
  VendorDetail,
  SupplierProfilePage,
  SupplierDashboard,
  SupplierGovernanceAdmin,
  BuyerWorkspace,
  SupplierWorkspace,
  AdminDataIngestion,
  PlatformDirectoryPage,
  RegisteredSuppliersPage,
  AccountDirectoryPage,
  ProcurementHub,
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
  IntelligenceDashboard,
  IntelligenceMarkets,
  IntelligenceReports,
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
          borderTopColor: '#000888',
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

/** After in-app navigation (incl. browser back), push debounced workspace data so nothing is lost on idle. */
function WorkspaceSyncOnNavigate() {
  const location = useLocation()
  useEffect(() => {
    void flushPendingWorkspacePushes()
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
  const startRequestRefresh = useServiceRequestStore((s) => s.startRefreshSequence)
  const stopRequestRefresh = useServiceRequestStore((s) => s.stopRefreshSequence)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    // Guard against missing Supabase config in production to avoid
    // runtime crashes that can result in a blank screen.
    if (supabase?.auth?.getSession) {
      supabase.auth.getSession().catch(() => {})
    }
  }, []);

  useEffect(() => {
    authService.initSession().finally(() => setSessionChecked(true))

    // Listen for server-side session changes (sign-out from other tab, token revoked)
    const unsub = authService.onAuthStateChange((user) => {
      if (!user && useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().logout()
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!sessionChecked) return undefined
    if (isAuthenticated) {
      startRequestRefresh()
      return () => stopRequestRefresh()
    }
    stopRequestRefresh()
    return undefined
  }, [isAuthenticated, sessionChecked, startRequestRefresh, stopRequestRefresh])

  // While verifying the session, show a minimal loading screen
  // to prevent flash of login page or unauthorized protected content
  if (!sessionChecked) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#fafbfc',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #e0e0e0',
            borderTopColor: '#000888', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <p style={{ color: '#888', fontSize: 14, margin: 0 }}>Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <PWAUpdateBanner />
      <Router>
        <WorkspaceSyncOnNavigate />
        <AnalyticsProvider>
        <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* ── Public ────────────────────────────────────── */}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/main-menu" /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/main-menu" /> : <Register />} />

          {/* ── Core pages ────────────────────────────────── */}
          <Route path="/main-menu" element={<P><Home /></P>} />
          <Route path="/calendar" element={<P><PlatformCalendar /></P>} />
          <Route path="/settings" element={<P><Settings /></P>} />
          <Route path="/notifications" element={<P><Notifications /></P>} />
          <Route path="/payment" element={<P><Payment /></P>} />
          <Route path="/plans" element={<P><SubscriptionPlans /></P>} />
          <Route path="/team" element={<PlanGate feature="teamManagement" planName="Basic" requiredRole="admin"><TeamManagement /></PlanGate>} />
          <Route path="/resources" element={<P><Resources /></P>} />
          <Route path="/tasks" element={<P><Tasks /></P>} />
          <Route path="/project" element={<P><Project /></P>} />
          <Route path="/dashboard" element={<P><Dashboard /></P>} />
          <Route path="/intelligence" element={<Navigate to="/intelligence/dashboard" replace />} />
          <Route path="/intelligence/dashboard" element={<P><IntelligenceDashboard /></P>} />
          <Route path="/intelligence/markets" element={<P><IntelligenceMarkets /></P>} />
          <Route path="/intelligence/reports" element={<P><IntelligenceReports /></P>} />
          <Route path="/seller-dashboard" element={<AccountType allowed={['seller']}><SellerDashboard /></AccountType>} />
          <Route path="/buyer-dashboard" element={<AccountType allowed={['buyer']}><BuyerDashboard /></AccountType>} />
          <Route path="/hub/procurement" element={<P><ProcurementHub /></P>} />
          <Route path="/hub/partner" element={<P><PartnerHub /></P>} />
          <Route path="/hub/governance" element={<Admin><GovernanceHub /></Admin>} />
          <Route path="/dashboard/buyer" element={<P><BuyerWorkspace /></P>} />
          <Route path="/dashboard/buyer/account-directory" element={<P><AccountDirectoryPage /></P>} />
          <Route path="/dashboard/buyer/platform-directory" element={<SuperAdmin><PlatformDirectoryPage /></SuperAdmin>} />
          <Route path="/dashboard/buyer/registered-suppliers" element={<SuperAdmin><RegisteredSuppliersPage /></SuperAdmin>} />
          <Route path="/dashboard/supplier" element={<P><SupplierWorkspace /></P>} />
          <Route path="/service-provider-dashboard" element={<AccountType allowed={['service_provider']}><ServiceProviderDashboard /></AccountType>} />
          <Route path="/rfq-comparison/:rfqId" element={<P><RfqComparison /></P>} />

          {/* ── Vendor Management ────────────────────────── */}
          <Route path="/vendors" element={<P><VendorManagement /></P>} />
          <Route path="/vendors/:vendorId" element={<P><VendorDetail /></P>} />
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

          {/* ── Projects ──────────────────────────────────── */}
          <Route path="/project-management" element={<P><ProjectManagement /></P>} />
          <Route path="/project-management/project/:projectId" element={<P><ProjectDetail /></P>} />

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

          {/* ── Cost Management (Premium only) ────────────── */}
          <Route path="/cost-management" element={<PlanGate feature="costManagement" planName="Premium"><CostManagement /></PlanGate>} />
          <Route path="/cost-management/calculator" element={<PlanGate feature="costManagement" planName="Premium"><CostCalculator /></PlanGate>} />
          <Route path="/cost-management/bom" element={<PlanGate feature="costManagement" planName="Premium"><CostCalculator /></PlanGate>} />
          <Route path="/cost-management/breakdown" element={<PlanGate feature="costManagement" planName="Premium"><CostBreakdown /></PlanGate>} />
          <Route path="/cost-management/comparison" element={<PlanGate feature="costManagement" planName="Premium"><CostBreakdown /></PlanGate>} />
          <Route path="/cost-management/scenarios" element={<PlanGate feature="costManagement" planName="Premium"><CostScenarios /></PlanGate>} />
          <Route path="/cost-management/targets" element={<PlanGate feature="costManagement" planName="Premium"><CostTargets /></PlanGate>} />

          {/* ── Enterprise Management (Enterprise plan only) ── */}
          <Route path="/enterprise" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseManagement /></PlanGate>} />
          <Route path="/enterprise/fixed-costs" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseFixedCosts /></PlanGate>} />
          <Route path="/enterprise/variable-costs" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseVariableCosts /></PlanGate>} />
          <Route path="/enterprise/semi-variable-costs" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseSemiVariableCosts /></PlanGate>} />
          <Route path="/enterprise/direct-costs" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseDirectCosts /></PlanGate>} />
          <Route path="/enterprise/indirect-costs" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseIndirectCosts /></PlanGate>} />
          <Route path="/enterprise/opex" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseOpex /></PlanGate>} />
          <Route path="/enterprise/capex" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseCapex /></PlanGate>} />
          <Route path="/enterprise/personnel" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterprisePersonnel /></PlanGate>} />
          <Route path="/enterprise/financial" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseFinancial /></PlanGate>} />
          <Route path="/enterprise/exceptional" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseExceptional /></PlanGate>} />
          <Route path="/enterprise/risk" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseRisk /></PlanGate>} />
          <Route path="/enterprise/product-calculation" element={<PlanGate feature="enterpriseManagement" planName="Enterprise"><EnterpriseProductCalc /></PlanGate>} />

          {/* ── Production Management (Premium only) ────────── */}
          <Route path="/production" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionManagement /></PlanGate>} />
          <Route path="/production/5s" element={<PlanGate feature="productionManagement" planName="Premium"><Production5S /></PlanGate>} />
          <Route path="/production/iso9001" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionISO9001 /></PlanGate>} />
          <Route path="/production/iatf16949" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionIATF16949 /></PlanGate>} />
          <Route path="/production/vda63" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionVDA63 /></PlanGate>} />
          <Route path="/production/oee" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionOEE /></PlanGate>} />
          <Route path="/production/downtime" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionDowntime /></PlanGate>} />
          <Route path="/production/scrap" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionScrap /></PlanGate>} />
          <Route path="/production/output" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionOutput /></PlanGate>} />
          <Route path="/production/quality-kpis" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionQualityKPIs /></PlanGate>} />
          <Route path="/production/process-audit" element={<PlanGate feature="auditManagement" planName="Premium"><ProductionProcessAudit /></PlanGate>} />
          <Route path="/production/audit-history" element={<PlanGate feature="auditManagement" planName="Premium"><ProductionAuditHistory /></PlanGate>} />
          <Route path="/production/floor-layout" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionFloorLayout /></PlanGate>} />
          <Route path="/production/certifications" element={<PlanGate feature="productionManagement" planName="Premium"><ProductionCertifications /></PlanGate>} />
          <Route path="/production/audit-questionnaire" element={<PlanGate feature="auditManagement" planName="Premium"><AuditQuestionnaire /></PlanGate>} />
          <Route path="/production/workcenter-output" element={<PlanGate feature="productionManagement" planName="Premium"><WorkCenterOutput /></PlanGate>} />
          <Route path="/production/system-management" element={<PlanGate feature="productionManagement" planName="Premium"><SystemManagement /></PlanGate>} />
          <Route path="/production/system/:systemId" element={<PlanGate feature="productionManagement" planName="Premium"><SystemManagementPage /></PlanGate>} />

          {/* ── HR Space (Management hub; legacy /production/headcount → redirect) ─ */}
          <Route path="/hr-space" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HeadcountManagement /></PlanGate>} />
          <Route path="/hr-space/qualification-matrix" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><QualificationMatrix /></PlanGate>} />
          <Route path="/hr-space/goals" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><EmployeeGoals /></PlanGate>} />
          <Route path="/hr-space/dialogue" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><EmployeeDialogue /></PlanGate>} />
          <Route path="/hr-space/hr-docs" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HRDocumentation /></PlanGate>} />
          <Route path="/hr-space/training" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HrTrainingModule /></PlanGate>} />
          <Route path="/hr-space/workforce" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HrWorkforceModule /></PlanGate>} />
          <Route path="/hr-space/onboarding" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HrOnboardingModule /></PlanGate>} />
          <Route path="/hr-space/attendance" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HrAttendanceModule /></PlanGate>} />
          <Route path="/hr-space/hiring" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HrHiringRecruitment /></PlanGate>} />
          <Route path="/hr-space/employees/:employeeId" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><HrEmployeeProfile /></PlanGate>} />

          <Route path="/production/headcount" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/hr-space" /></PlanGate>} />
          <Route path="/production/headcount/qualification-matrix" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/hr-space/qualification-matrix" /></PlanGate>} />
          <Route path="/production/headcount/goals" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/hr-space/goals" /></PlanGate>} />
          <Route path="/production/headcount/dialogue" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/hr-space/dialogue" /></PlanGate>} />
          <Route path="/production/headcount/hr-docs" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/hr-space/hr-docs" /></PlanGate>} />
          <Route path="/production/headcount/training" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/hr-space/training" /></PlanGate>} />
          <Route path="/production/headcount/workforce" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/hr-space/workforce" /></PlanGate>} />
          <Route path="/production/headcount/onboarding" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/hr-space/onboarding" /></PlanGate>} />
          <Route path="/production/headcount/attendance" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/hr-space/attendance" /></PlanGate>} />
          <Route path="/production/headcount/hiring" element={<PlanGate feature="productionManagement" planName="Premium" requiredRole="manager"><LegacyHrRedirect to="/hr-space/hiring" /></PlanGate>} />

          {/* ── Buyer Features (company-isolated, role-guarded) ── */}
          <Route path="/procurement" element={<PlanGate feature="procurement" planName="Enterprise"><ProcurementDashboard /></PlanGate>} />
          <Route path="/contracts" element={<PlanGate feature="contractManagement" planName="Enterprise"><ContractDashboard /></PlanGate>} />
          <Route path="/spend-analysis" element={<PlanGate feature="spendAnalysis" planName="Enterprise" requiredRole="manager"><SpendAnalysis /></PlanGate>} />
          <Route path="/compliance" element={<PlanGate feature="complianceEsg" planName="Enterprise"><ComplianceDashboard /></PlanGate>} />
          <Route path="/ai-insights" element={<PlanGate feature="aiInsights" planName="Enterprise" requiredRole="manager"><AIInsights /></PlanGate>} />
          <Route path="/erp-integrations" element={<PlanGate feature="erpIntegrations" planName="Enterprise" requiredRole="admin"><ERPIntegrations /></PlanGate>} />
          <Route path="/templates" element={<PlanGate feature="templateLibrary" planName="Enterprise"><TemplateLibrary /></PlanGate>} />
          <Route path="/audit-logs" element={<PlanGate feature="auditLogs" planName="Enterprise" requiredRole="admin"><AuditLogs /></PlanGate>} />

          {/* ── Catch-all ─────────────────────────────────── */}
          <Route path="/" element={<Navigate to={isAuthenticated ? "/main-menu" : "/login"} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
        </AnalyticsProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
