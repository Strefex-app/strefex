import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage } from '../utils/tenantStorage'
import { normalizeDeclaredDocs } from '../services/platformRecognitionService'

const defaultDeclaredDocs = () => ({
  companyProfile: null,
  productPortfolio: null,
})

const initialDepartments = () => [{ id: `d-${Date.now()}`, name: '', headcount: '' }]

export const PLATFORM_AUDIT_STANDARDS = [
  { id: 'iatf16949', label: 'IATF 16949' },
  { id: 'vda63', label: 'VDA 6.3 / VDA audits' },
  { id: 'iso9001', label: 'ISO 9001' },
  { id: 'iso14001', label: 'ISO 14001' },
  { id: 'tisax', label: 'TISAX' },
  { id: 'as9100', label: 'AS9100 / aerospace quality' },
  { id: 'nadcap', label: 'Nadcap / special processes' },
  { id: 'iso13485', label: 'ISO 13485 (medical)' },
]

export const PLATFORM_AUDIT_INDUSTRIES = [
  { id: 'automotive', label: 'Automotive' },
  { id: 'medical', label: 'Medical devices' },
  { id: 'aerospace', label: 'Aerospace' },
  { id: 'oil_gas', label: 'Oil & gas' },
  { id: 'nuclear', label: 'Nuclear' },
]

export const useCompanyRecognitionStore = create(
  persist(
    (set) => ({
      registrationLegalName: '',
      addressLineOverride: '',
      countryOverride: '',
      cityOverride: '',
      contactPhoneOverride: '',
      licenseCertifications: '',
      productPortfolioText: '',
      departments: initialDepartments(),
      machinePark: '',
      manufacturingCapabilities: '',
      leadTimeAvgDays: '',
      leadTimeNote: '',
      auditLogsDetail: '',
      auditStandards: [],
      auditIndustryFocus: [],
      declaredDocs: defaultDeclaredDocs(),

      setField: (key, value) => set({ [key]: value }),

      setDeclaredFile: (key, fileMeta) =>
        set((s) => ({
          declaredDocs: normalizeDeclaredDocs({
            ...s.declaredDocs,
            [key]: fileMeta
              ? {
                  fileName: fileMeta.name,
                  savedAt: new Date().toISOString(),
                  sizeBytes: typeof fileMeta.size === 'number' ? fileMeta.size : undefined,
                }
              : null,
          }),
        })),

      clearDeclaredFile: (key) =>
        set((s) => ({
          declaredDocs: normalizeDeclaredDocs({ ...s.declaredDocs, [key]: null }),
        })),

      setDepartments: (departments) => set({ departments }),

      addDepartment: () =>
        set((s) => ({
          departments: [
            ...s.departments,
            { id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '', headcount: '' },
          ],
        })),

      removeDepartment: (id) =>
        set((s) => {
          const next = s.departments.filter((d) => d.id !== id)
          return { departments: next.length ? next : initialDepartments() }
        }),

      updateDepartment: (id, patch) =>
        set((s) => ({
          departments: s.departments.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),

      toggleAuditStandard: (id) =>
        set((s) => {
          const cur = new Set(s.auditStandards)
          if (cur.has(id)) cur.delete(id)
          else cur.add(id)
          return { auditStandards: [...cur] }
        }),

      toggleAuditIndustry: (id) =>
        set((s) => {
          const cur = new Set(s.auditIndustryFocus)
          if (cur.has(id)) cur.delete(id)
          else cur.add(id)
          return { auditIndustryFocus: [...cur] }
        }),

      mergeFromServer: (blob) => {
        if (!blob || typeof blob !== 'object') return
        set((prev) => ({
          registrationLegalName: blob.registrationLegalName ?? prev.registrationLegalName,
          addressLineOverride: blob.addressLineOverride ?? prev.addressLineOverride,
          countryOverride: blob.countryOverride ?? prev.countryOverride,
          cityOverride: blob.cityOverride ?? prev.cityOverride,
          contactPhoneOverride: blob.contactPhoneOverride ?? prev.contactPhoneOverride,
          licenseCertifications: blob.licenseCertifications ?? prev.licenseCertifications,
          productPortfolioText: blob.productPortfolioText ?? prev.productPortfolioText,
          departments: Array.isArray(blob.departments) && blob.departments.length ? blob.departments : prev.departments,
          machinePark: blob.machinePark ?? prev.machinePark,
          manufacturingCapabilities: blob.manufacturingCapabilities ?? prev.manufacturingCapabilities,
          leadTimeAvgDays: blob.leadTimeAvgDays ?? prev.leadTimeAvgDays,
          leadTimeNote: blob.leadTimeNote ?? prev.leadTimeNote,
          auditLogsDetail: blob.auditLogsDetail ?? prev.auditLogsDetail,
          auditStandards: Array.isArray(blob.auditStandards) ? blob.auditStandards : prev.auditStandards,
          auditIndustryFocus: Array.isArray(blob.auditIndustryFocus)
            ? blob.auditIndustryFocus
            : prev.auditIndustryFocus,
          declaredDocs: normalizeDeclaredDocs({
            ...prev.declaredDocs,
            ...(blob.declaredDocs && typeof blob.declaredDocs === 'object' ? blob.declaredDocs : {}),
          }),
        }))
      },

      patchFromTenantPrefill: (tenant) => {
        if (!tenant || typeof tenant !== 'object') return
        const md = tenant.metadata || {}
        set((prev) => ({
          registrationLegalName:
            prev.registrationLegalName || md.registration_legal_name || md.legal_registered_name || '',
          addressLineOverride: prev.addressLineOverride || tenant.address || md.address || '',
          countryOverride: prev.countryOverride || tenant.country || '',
          cityOverride: prev.cityOverride || tenant.city || '',
          contactPhoneOverride: prev.contactPhoneOverride || tenant.phone || '',
        }))
      },
    }),
    {
      name: 'strefex-platform-recognition',
      version: 2,
      migrate: (persisted) => ({
        ...(persisted && typeof persisted === 'object' ? persisted : {}),
        declaredDocs: normalizeDeclaredDocs(
          persisted && typeof persisted === 'object' && persisted.declaredDocs
            ? persisted.declaredDocs
            : {},
        ),
      }),
      storage: createTenantStorage(),
      partialize: (s) => ({
        registrationLegalName: s.registrationLegalName,
        addressLineOverride: s.addressLineOverride,
        countryOverride: s.countryOverride,
        cityOverride: s.cityOverride,
        contactPhoneOverride: s.contactPhoneOverride,
        licenseCertifications: s.licenseCertifications,
        productPortfolioText: s.productPortfolioText,
        departments: s.departments,
        machinePark: s.machinePark,
        manufacturingCapabilities: s.manufacturingCapabilities,
        leadTimeAvgDays: s.leadTimeAvgDays,
        leadTimeNote: s.leadTimeNote,
        auditLogsDetail: s.auditLogsDetail,
        auditStandards: s.auditStandards,
        auditIndustryFocus: s.auditIndustryFocus,
        declaredDocs: s.declaredDocs,
      }),
    },
  ),
)
