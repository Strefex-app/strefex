import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserRole } from '../utils/tenantStorage'
import { canEdit as guardCanEdit, isAuditor } from '../utils/companyGuard'

const useEnterpriseStore = create(
  persist(
    (set, get) => ({
      // Fixed Costs - costs that remain constant regardless of production volume
      fixedCosts: [
        { id: 'fc-001', name: 'Office Rent', category: 'Facilities', amount: 15000, period: 'monthly', description: 'Main office building rent' },
        { id: 'fc-002', name: 'Equipment Lease', category: 'Equipment', amount: 8500, period: 'monthly', description: 'Manufacturing equipment lease' },
        { id: 'fc-003', name: 'Insurance Premium', category: 'Insurance', amount: 4200, period: 'monthly', description: 'Business liability and property insurance' },
        { id: 'fc-004', name: 'Software Licenses', category: 'IT', amount: 3500, period: 'monthly', description: 'ERP, CAD, and other software subscriptions' },
        { id: 'fc-005', name: 'Security Services', category: 'Facilities', amount: 2800, period: 'monthly', description: '24/7 security monitoring and guards' },
      ],

      // Variable Costs - costs that change with production volume
      variableCosts: [
        { id: 'vc-001', name: 'Raw Materials', category: 'Production', unitCost: 45.50, unit: 'per unit', description: 'Primary production materials' },
        { id: 'vc-002', name: 'Packaging Materials', category: 'Production', unitCost: 3.25, unit: 'per unit', description: 'Product packaging and boxing' },
        { id: 'vc-003', name: 'Shipping Costs', category: 'Logistics', unitCost: 8.75, unit: 'per unit', description: 'Outbound product shipping' },
        { id: 'vc-004', name: 'Sales Commission', category: 'Sales', unitCost: 12.00, unit: 'per unit', description: '5% commission on sales' },
        { id: 'vc-005', name: 'Production Utilities', category: 'Utilities', unitCost: 2.10, unit: 'per unit', description: 'Electricity for production equipment' },
      ],

      // Semi-Variable Costs - costs with both fixed and variable components
      semiVariableCosts: [
        { id: 'sv-001', name: 'Electricity', category: 'Utilities', fixedAmount: 2500, variableRate: 0.85, unit: 'per unit', description: 'Base charge + usage' },
        { id: 'sv-002', name: 'Maintenance', category: 'Equipment', fixedAmount: 3000, variableRate: 1.20, unit: 'per unit', description: 'Scheduled + production-based maintenance' },
        { id: 'sv-003', name: 'Quality Control', category: 'Production', fixedAmount: 4500, variableRate: 2.50, unit: 'per unit', description: 'QC team + per-unit testing' },
        { id: 'sv-004', name: 'Customer Support', category: 'Support', fixedAmount: 8000, variableRate: 1.50, unit: 'per unit', description: 'Support team + ticket handling' },
      ],

      // Direct Costs - costs directly attributable to products
      directCosts: [
        { id: 'dc-001', name: 'Direct Labor', category: 'Labor', hourlyRate: 28.50, hoursPerUnit: 2.5, description: 'Production line workers' },
        { id: 'dc-002', name: 'Direct Materials', category: 'Materials', costPerUnit: 52.00, description: 'Components directly used in products' },
        { id: 'dc-003', name: 'Machine Time', category: 'Equipment', hourlyRate: 45.00, hoursPerUnit: 1.2, description: 'CNC and assembly machine usage' },
        { id: 'dc-004', name: 'Subcontracted Work', category: 'Services', costPerUnit: 18.00, description: 'Outsourced assembly operations' },
      ],

      // Indirect Costs - overhead costs not directly tied to products
      indirectCosts: [
        { id: 'ic-001', name: 'Supervision', category: 'Labor', amount: 12000, period: 'monthly', description: 'Production supervisors' },
        { id: 'ic-002', name: 'Factory Utilities', category: 'Utilities', amount: 6500, period: 'monthly', description: 'Heating, lighting, water' },
        { id: 'ic-003', name: 'Depreciation', category: 'Assets', amount: 8200, period: 'monthly', description: 'Equipment and building depreciation' },
        { id: 'ic-004', name: 'Factory Supplies', category: 'Materials', amount: 3500, period: 'monthly', description: 'Consumables and tools' },
        { id: 'ic-005', name: 'Waste Disposal', category: 'Operations', amount: 1800, period: 'monthly', description: 'Industrial waste management' },
      ],

      // Operating Expenses (OPEX)
      opex: [
        { id: 'op-001', name: 'Marketing & Advertising', category: 'Marketing', amount: 25000, period: 'monthly', description: 'Digital and traditional marketing' },
        { id: 'op-002', name: 'Administrative Salaries', category: 'Admin', amount: 45000, period: 'monthly', description: 'Office and admin staff' },
        { id: 'op-003', name: 'Office Supplies', category: 'Admin', amount: 2500, period: 'monthly', description: 'General office supplies' },
        { id: 'op-004', name: 'Travel & Entertainment', category: 'Operations', amount: 8000, period: 'monthly', description: 'Business travel and client meetings' },
        { id: 'op-005', name: 'Professional Services', category: 'Services', amount: 12000, period: 'monthly', description: 'Legal, accounting, consulting' },
        { id: 'op-006', name: 'R&D Expenses', category: 'R&D', amount: 35000, period: 'monthly', description: 'Research and development' },
      ],

      // Capital Expenditures (CAPEX)
      capex: [
        { id: 'cx-001', name: 'CNC Machine', category: 'Equipment', amount: 250000, usefulLife: 10, yearAcquired: 2024, description: '5-axis CNC machining center' },
        { id: 'cx-002', name: 'Assembly Line Upgrade', category: 'Equipment', amount: 180000, usefulLife: 8, yearAcquired: 2025, description: 'Automated assembly system' },
        { id: 'cx-003', name: 'Building Expansion', category: 'Facilities', amount: 500000, usefulLife: 25, yearAcquired: 2025, description: 'New production wing' },
        { id: 'cx-004', name: 'IT Infrastructure', category: 'IT', amount: 75000, usefulLife: 5, yearAcquired: 2026, description: 'Servers and network equipment' },
        { id: 'cx-005', name: 'Quality Testing Lab', category: 'Equipment', amount: 120000, usefulLife: 12, yearAcquired: 2025, description: 'Quality control laboratory' },
      ],

      // Personnel Costs
      personnelCosts: [
        { id: 'pc-001', department: 'Production', headcount: 45, avgSalary: 4200, benefits: 1050, training: 200, description: 'Production workers' },
        { id: 'pc-002', department: 'Engineering', headcount: 12, avgSalary: 7500, benefits: 1875, training: 500, description: 'Engineers and technicians' },
        { id: 'pc-003', department: 'Quality', headcount: 8, avgSalary: 5200, benefits: 1300, training: 350, description: 'QA/QC team' },
        { id: 'pc-004', department: 'Sales', headcount: 15, avgSalary: 5800, benefits: 1450, training: 400, description: 'Sales representatives' },
        { id: 'pc-005', department: 'Admin', headcount: 10, avgSalary: 4800, benefits: 1200, training: 250, description: 'Administrative staff' },
        { id: 'pc-006', department: 'Management', headcount: 6, avgSalary: 12000, benefits: 3000, training: 800, description: 'Senior management' },
      ],

      // Financial Costs
      financialCosts: [
        { id: 'fn-001', name: 'Bank Loan Interest', category: 'Interest', amount: 8500, period: 'monthly', principal: 850000, rate: 6.5, description: 'Equipment financing loan' },
        { id: 'fn-002', name: 'Line of Credit Interest', category: 'Interest', amount: 2200, period: 'monthly', principal: 200000, rate: 8.0, description: 'Working capital credit line' },
        { id: 'fn-003', name: 'Bank Fees', category: 'Fees', amount: 850, period: 'monthly', description: 'Account and transaction fees' },
        { id: 'fn-004', name: 'Currency Exchange Costs', category: 'FX', amount: 1500, period: 'monthly', description: 'International transaction costs' },
        { id: 'fn-005', name: 'Factoring Fees', category: 'Fees', amount: 3200, period: 'monthly', description: 'Receivables factoring costs' },
      ],

      // Exceptional Costs
      exceptionalCosts: [
        { id: 'ex-001', name: 'Equipment Breakdown', category: 'Emergency', amount: 25000, date: '2026-01-15', description: 'Unplanned CNC repair', status: 'resolved' },
        { id: 'ex-002', name: 'Product Recall', category: 'Quality', amount: 45000, date: '2025-11-20', description: 'Batch recall and replacement', status: 'resolved' },
        { id: 'ex-003', name: 'Legal Settlement', category: 'Legal', amount: 75000, date: '2025-08-10', description: 'Contract dispute settlement', status: 'resolved' },
        { id: 'ex-004', name: 'Natural Disaster Recovery', category: 'Emergency', amount: 0, date: null, description: 'Potential flood/storm damage', status: 'provisioned', provision: 50000 },
      ],

      // Risk Costs (provisions and contingencies)
      riskCosts: [
        { id: 'rk-001', name: 'Bad Debt Provision', category: 'Credit', provisionRate: 2.5, baseAmount: 500000, description: 'Allowance for uncollectible accounts' },
        { id: 'rk-002', name: 'Warranty Reserve', category: 'Product', provisionRate: 3.0, baseAmount: 800000, description: 'Future warranty claims' },
        { id: 'rk-003', name: 'Inventory Obsolescence', category: 'Inventory', provisionRate: 5.0, baseAmount: 350000, description: 'Slow-moving inventory write-down' },
        { id: 'rk-004', name: 'Currency Hedge', category: 'FX', provisionRate: 1.5, baseAmount: 600000, description: 'FX exposure coverage' },
        { id: 'rk-005', name: 'Litigation Reserve', category: 'Legal', provisionRate: 0, baseAmount: 0, fixedProvision: 25000, description: 'Potential legal claims' },
      ],

      // Products for cost calculation
      products: [
        {
          id: 'prd-001',
          name: 'Industrial Controller Unit',
          sku: 'ICU-2026-A',
          sellingPrice: 450.00,
          unitsPerMonth: 850,
          directMaterialCost: 125.00,
          directLaborHours: 3.5,
          machineHours: 1.8,
          packagingCost: 8.50,
          shippingCost: 12.00,
        },
        {
          id: 'prd-002',
          name: 'Precision Sensor Module',
          sku: 'PSM-2026-B',
          sellingPrice: 185.00,
          unitsPerMonth: 2200,
          directMaterialCost: 48.00,
          directLaborHours: 1.2,
          machineHours: 0.6,
          packagingCost: 4.25,
          shippingCost: 6.50,
        },
        {
          id: 'prd-003',
          name: 'Power Distribution Panel',
          sku: 'PDP-2026-C',
          sellingPrice: 720.00,
          unitsPerMonth: 320,
          directMaterialCost: 245.00,
          directLaborHours: 5.5,
          machineHours: 2.8,
          packagingCost: 15.00,
          shippingCost: 28.00,
        },
      ],

      // Configuration
      config: {
        laborHourlyRate: 28.50,
        machineHourlyRate: 45.00,
        overheadAllocationBase: 'labor_hours', // labor_hours, machine_hours, direct_cost
        monthlyProductionUnits: 3370, // Total from all products
      },

      // Actions for Fixed Costs
      addFixedCost: (cost) => set((state) => ({
        fixedCosts: [...state.fixedCosts, { ...cost, id: `fc-${Date.now()}` }]
      })),
      updateFixedCost: (id, updates) => set((state) => ({
        fixedCosts: state.fixedCosts.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteFixedCost: (id) => set((state) => ({
        fixedCosts: state.fixedCosts.filter(c => c.id !== id)
      })),

      // Actions for Variable Costs
      addVariableCost: (cost) => set((state) => ({
        variableCosts: [...state.variableCosts, { ...cost, id: `vc-${Date.now()}` }]
      })),
      updateVariableCost: (id, updates) => set((state) => ({
        variableCosts: state.variableCosts.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteVariableCost: (id) => set((state) => ({
        variableCosts: state.variableCosts.filter(c => c.id !== id)
      })),

      // Actions for Semi-Variable Costs
      addSemiVariableCost: (cost) => set((state) => ({
        semiVariableCosts: [...state.semiVariableCosts, { ...cost, id: `sv-${Date.now()}` }]
      })),
      updateSemiVariableCost: (id, updates) => set((state) => ({
        semiVariableCosts: state.semiVariableCosts.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteSemiVariableCost: (id) => set((state) => ({
        semiVariableCosts: state.semiVariableCosts.filter(c => c.id !== id)
      })),

      // Actions for Direct Costs
      addDirectCost: (cost) => set((state) => ({
        directCosts: [...state.directCosts, { ...cost, id: `dc-${Date.now()}` }]
      })),
      updateDirectCost: (id, updates) => set((state) => ({
        directCosts: state.directCosts.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteDirectCost: (id) => set((state) => ({
        directCosts: state.directCosts.filter(c => c.id !== id)
      })),

      // Actions for Indirect Costs
      addIndirectCost: (cost) => set((state) => ({
        indirectCosts: [...state.indirectCosts, { ...cost, id: `ic-${Date.now()}` }]
      })),
      updateIndirectCost: (id, updates) => set((state) => ({
        indirectCosts: state.indirectCosts.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteIndirectCost: (id) => set((state) => ({
        indirectCosts: state.indirectCosts.filter(c => c.id !== id)
      })),

      // Actions for OPEX
      addOpex: (cost) => set((state) => ({
        opex: [...state.opex, { ...cost, id: `op-${Date.now()}` }]
      })),
      updateOpex: (id, updates) => set((state) => ({
        opex: state.opex.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteOpex: (id) => set((state) => ({
        opex: state.opex.filter(c => c.id !== id)
      })),

      // Actions for CAPEX
      addCapex: (cost) => set((state) => ({
        capex: [...state.capex, { ...cost, id: `cx-${Date.now()}` }]
      })),
      updateCapex: (id, updates) => set((state) => ({
        capex: state.capex.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteCapex: (id) => set((state) => ({
        capex: state.capex.filter(c => c.id !== id)
      })),

      // Actions for Personnel Costs
      addPersonnelCost: (cost) => set((state) => ({
        personnelCosts: [...state.personnelCosts, { ...cost, id: `pc-${Date.now()}` }]
      })),
      updatePersonnelCost: (id, updates) => set((state) => ({
        personnelCosts: state.personnelCosts.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deletePersonnelCost: (id) => set((state) => ({
        personnelCosts: state.personnelCosts.filter(c => c.id !== id)
      })),

      // Actions for Financial Costs
      addFinancialCost: (cost) => set((state) => ({
        financialCosts: [...state.financialCosts, { ...cost, id: `fn-${Date.now()}` }]
      })),
      updateFinancialCost: (id, updates) => set((state) => ({
        financialCosts: state.financialCosts.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteFinancialCost: (id) => set((state) => ({
        financialCosts: state.financialCosts.filter(c => c.id !== id)
      })),

      // Actions for Exceptional Costs
      addExceptionalCost: (cost) => set((state) => ({
        exceptionalCosts: [...state.exceptionalCosts, { ...cost, id: `ex-${Date.now()}` }]
      })),
      updateExceptionalCost: (id, updates) => set((state) => ({
        exceptionalCosts: state.exceptionalCosts.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteExceptionalCost: (id) => set((state) => ({
        exceptionalCosts: state.exceptionalCosts.filter(c => c.id !== id)
      })),

      // Actions for Risk Costs
      addRiskCost: (cost) => set((state) => ({
        riskCosts: [...state.riskCosts, { ...cost, id: `rk-${Date.now()}` }]
      })),
      updateRiskCost: (id, updates) => set((state) => ({
        riskCosts: state.riskCosts.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteRiskCost: (id) => set((state) => ({
        riskCosts: state.riskCosts.filter(c => c.id !== id)
      })),

      // Actions for Products
      addProduct: (product) => set((state) => ({
        products: [...state.products, { ...product, id: `prd-${Date.now()}` }]
      })),
      updateProduct: (id, updates) => set((state) => ({
        products: state.products.map(p => p.id === id ? { ...p, ...updates } : p)
      })),
      deleteProduct: (id) => set((state) => ({
        products: state.products.filter(p => p.id !== id)
      })),

      // Calculation Functions
      getTotalFixedCosts: () => {
        const state = get()
        return state.fixedCosts.reduce((sum, c) => sum + c.amount, 0)
      },

      getTotalVariableCostsPerUnit: () => {
        const state = get()
        return state.variableCosts.reduce((sum, c) => sum + c.unitCost, 0)
      },

      getTotalSemiVariableCosts: (units) => {
        const state = get()
        return state.semiVariableCosts.reduce((sum, c) => {
          return sum + c.fixedAmount + (c.variableRate * units)
        }, 0)
      },

      getTotalIndirectCosts: () => {
        const state = get()
        return state.indirectCosts.reduce((sum, c) => sum + c.amount, 0)
      },

      getTotalOpex: () => {
        const state = get()
        return state.opex.reduce((sum, c) => sum + c.amount, 0)
      },

      getMonthlyCapexDepreciation: () => {
        const state = get()
        return state.capex.reduce((sum, c) => {
          const monthlyDepreciation = c.amount / (c.usefulLife * 12)
          return sum + monthlyDepreciation
        }, 0)
      },

      getTotalPersonnelCosts: () => {
        const state = get()
        return state.personnelCosts.reduce((sum, c) => {
          return sum + (c.headcount * (c.avgSalary + c.benefits + c.training))
        }, 0)
      },

      getTotalFinancialCosts: () => {
        const state = get()
        return state.financialCosts.reduce((sum, c) => sum + c.amount, 0)
      },

      getTotalRiskProvisions: () => {
        const state = get()
        return state.riskCosts.reduce((sum, c) => {
          if (c.fixedProvision) return sum + c.fixedProvision
          return sum + (c.baseAmount * c.provisionRate / 100)
        }, 0)
      },

      // Calculate full product cost
      calculateProductCost: (productId) => {
        const state = get()
        const product = state.products.find(p => p.id === productId)
        if (!product) return null

        const totalUnits = state.products.reduce((sum, p) => sum + p.unitsPerMonth, 0)
        const productShare = product.unitsPerMonth / totalUnits

        // Direct costs
        const directMaterial = product.directMaterialCost
        const directLabor = product.directLaborHours * state.config.laborHourlyRate
        const machineTime = product.machineHours * state.config.machineHourlyRate
        const packaging = product.packagingCost
        const shipping = product.shippingCost
        const totalDirectCost = directMaterial + directLabor + machineTime + packaging + shipping

        // Variable costs per unit
        const variableCostPerUnit = state.getTotalVariableCostsPerUnit()

        // Fixed costs allocated per unit
        const totalFixed = state.getTotalFixedCosts()
        const fixedPerUnit = (totalFixed * productShare) / product.unitsPerMonth

        // Indirect costs allocated per unit
        const totalIndirect = state.getTotalIndirectCosts()
        const indirectPerUnit = (totalIndirect * productShare) / product.unitsPerMonth

        // OPEX allocated per unit
        const totalOpex = state.getTotalOpex()
        const opexPerUnit = (totalOpex * productShare) / product.unitsPerMonth

        // Depreciation per unit
        const monthlyDepreciation = state.getMonthlyCapexDepreciation()
        const depreciationPerUnit = (monthlyDepreciation * productShare) / product.unitsPerMonth

        // Personnel costs allocated per unit
        const totalPersonnel = state.getTotalPersonnelCosts()
        const personnelPerUnit = (totalPersonnel * productShare) / product.unitsPerMonth

        // Financial costs allocated per unit
        const totalFinancial = state.getTotalFinancialCosts()
        const financialPerUnit = (totalFinancial * productShare) / product.unitsPerMonth

        // Risk provisions per unit
        const totalRisk = state.getTotalRiskProvisions()
        const riskPerUnit = (totalRisk * productShare) / product.unitsPerMonth

        // Semi-variable costs
        const totalSemiVariable = state.getTotalSemiVariableCosts(product.unitsPerMonth)
        const semiVariablePerUnit = totalSemiVariable / product.unitsPerMonth

        // Total manufacturing cost
        const totalCostPerUnit = 
          totalDirectCost + 
          variableCostPerUnit + 
          fixedPerUnit + 
          indirectPerUnit + 
          opexPerUnit + 
          depreciationPerUnit + 
          personnelPerUnit + 
          financialPerUnit + 
          riskPerUnit + 
          semiVariablePerUnit

        // Margin calculation
        const grossMargin = product.sellingPrice - totalCostPerUnit
        const grossMarginPercent = (grossMargin / product.sellingPrice) * 100

        return {
          productId,
          productName: product.name,
          sku: product.sku,
          sellingPrice: product.sellingPrice,
          unitsPerMonth: product.unitsPerMonth,
          breakdown: {
            directMaterial,
            directLabor,
            machineTime,
            packaging,
            shipping,
            totalDirectCost,
            variableCostPerUnit,
            fixedPerUnit,
            indirectPerUnit,
            opexPerUnit,
            depreciationPerUnit,
            personnelPerUnit,
            financialPerUnit,
            riskPerUnit,
            semiVariablePerUnit,
          },
          totalCostPerUnit,
          grossMargin,
          grossMarginPercent,
          monthlyRevenue: product.sellingPrice * product.unitsPerMonth,
          monthlyCost: totalCostPerUnit * product.unitsPerMonth,
          monthlyProfit: grossMargin * product.unitsPerMonth,
        }
      },

      canEditEnterprise: () => guardCanEdit(),
      isReadOnly: () => isAuditor(),
      getAccessLevel: () => getUserRole(),

      getEnterpriseSummary: () => {
        const state = get()
        const totalFixed = state.getTotalFixedCosts()
        const totalIndirect = state.getTotalIndirectCosts()
        const totalOpex = state.getTotalOpex()
        const totalPersonnel = state.getTotalPersonnelCosts()
        const totalFinancial = state.getTotalFinancialCosts()
        const totalRisk = state.getTotalRiskProvisions()
        const monthlyDepreciation = state.getMonthlyCapexDepreciation()
        
        const totalUnits = state.products.reduce((sum, p) => sum + p.unitsPerMonth, 0)
        const totalSemiVariable = state.getTotalSemiVariableCosts(totalUnits)
        const totalVariable = state.getTotalVariableCostsPerUnit() * totalUnits

        const totalMonthlyCosts = 
          totalFixed + totalIndirect + totalOpex + totalPersonnel + 
          totalFinancial + totalRisk + monthlyDepreciation + 
          totalSemiVariable + totalVariable

        // Calculate total revenue and profit
        let totalRevenue = 0
        let totalCost = 0
        state.products.forEach(product => {
          const calc = state.calculateProductCost(product.id)
          if (calc) {
            totalRevenue += calc.monthlyRevenue
            totalCost += calc.monthlyCost
          }
        })

        const totalProfit = totalRevenue - totalCost
        const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

        return {
          totalFixed,
          totalVariable,
          totalSemiVariable,
          totalIndirect,
          totalOpex,
          totalPersonnel,
          totalFinancial,
          totalRisk,
          monthlyDepreciation,
          totalMonthlyCosts,
          totalRevenue,
          totalCost,
          totalProfit,
          overallMargin,
          totalProducts: state.products.length,
          totalUnits,
        }
      },
    }),
    {
      name: 'strefex-enterprise-storage',
      storage: createTenantStorage(),
    }
  )
)

export default useEnterpriseStore
