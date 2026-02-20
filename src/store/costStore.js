import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserRole } from '../utils/tenantStorage'
import { canEdit as guardCanEdit, isAuditor } from '../utils/companyGuard'

const useCostStore = create(
  persist(
    (set, get) => ({
      // Products with cost structures
      products: [
        {
          id: 'prod-001',
          name: 'Automotive Dashboard Assembly',
          sku: 'ADA-2026-001',
          category: 'Automotive',
          targetCost: 125.00,
          currentCost: 132.50,
          sellingPrice: 176.67,
          currency: 'USD',
          status: 'active',
          version: '2.1',
          createdAt: '2026-01-10',
          updatedAt: '2026-01-28',
          costBreakdown: {
            materials: 78.50,
            labor: 22.00,
            overhead: 18.00,
            tooling: 8.00,
            logistics: 6.00,
          },
          bom: [
            { id: 'bom-001', name: 'ABS Plastic Housing', quantity: 1, unit: 'pc', unitCost: 28.50, totalCost: 28.50, supplier: 'Covestro AG' },
            { id: 'bom-002', name: 'PCB Controller Board', quantity: 1, unit: 'pc', unitCost: 18.00, totalCost: 18.00, supplier: 'ASM Pacific' },
            { id: 'bom-003', name: 'LCD Display 7"', quantity: 1, unit: 'pc', unitCost: 22.00, totalCost: 22.00, supplier: 'LG Display' },
            { id: 'bom-004', name: 'Wiring Harness', quantity: 1, unit: 'set', unitCost: 6.50, totalCost: 6.50, supplier: 'TE Connectivity' },
            { id: 'bom-005', name: 'Fasteners Kit', quantity: 1, unit: 'set', unitCost: 3.50, totalCost: 3.50, supplier: 'Wurth Group' },
          ],
        },
        {
          id: 'prod-002',
          name: 'Medical Device Housing',
          sku: 'MDH-2026-001',
          category: 'Medical',
          targetCost: 85.00,
          currentCost: 82.30,
          sellingPrice: 109.73,
          currency: 'USD',
          status: 'active',
          version: '1.3',
          createdAt: '2026-01-05',
          updatedAt: '2026-01-25',
          costBreakdown: {
            materials: 45.30,
            labor: 18.00,
            overhead: 12.00,
            tooling: 4.00,
            logistics: 3.00,
          },
          bom: [
            { id: 'bom-101', name: 'Medical Grade PC', quantity: 0.8, unit: 'kg', unitCost: 32.00, totalCost: 25.60, supplier: 'SABIC' },
            { id: 'bom-102', name: 'Silicone Gasket', quantity: 2, unit: 'pc', unitCost: 4.50, totalCost: 9.00, supplier: 'Parker Hannifin' },
            { id: 'bom-103', name: 'Stainless Steel Inserts', quantity: 4, unit: 'pc', unitCost: 2.25, totalCost: 9.00, supplier: 'Outokumpu' },
            { id: 'bom-104', name: 'Label Set', quantity: 1, unit: 'set', unitCost: 1.70, totalCost: 1.70, supplier: 'Avery Dennison' },
          ],
        },
        {
          id: 'prod-003',
          name: 'Industrial Sensor Module',
          sku: 'ISM-2026-001',
          category: 'Electronics',
          targetCost: 45.00,
          currentCost: 48.75,
          sellingPrice: 65.00,
          currency: 'USD',
          status: 'development',
          version: '0.9',
          createdAt: '2026-01-15',
          updatedAt: '2026-01-30',
          costBreakdown: {
            materials: 32.75,
            labor: 8.00,
            overhead: 5.00,
            tooling: 2.00,
            logistics: 1.00,
          },
          bom: [
            { id: 'bom-201', name: 'Sensor IC', quantity: 1, unit: 'pc', unitCost: 12.50, totalCost: 12.50, supplier: 'Texas Instruments' },
            { id: 'bom-202', name: 'PCB Assembly', quantity: 1, unit: 'pc', unitCost: 8.25, totalCost: 8.25, supplier: 'Jabil' },
            { id: 'bom-203', name: 'Aluminum Enclosure', quantity: 1, unit: 'pc', unitCost: 6.50, totalCost: 6.50, supplier: 'Alcoa' },
            { id: 'bom-204', name: 'Connector Set', quantity: 1, unit: 'set', unitCost: 4.00, totalCost: 4.00, supplier: 'Molex' },
            { id: 'bom-205', name: 'Thermal Paste', quantity: 1, unit: 'tube', unitCost: 1.50, totalCost: 1.50, supplier: 'Dow Chemical' },
          ],
        },
      ],

      // Cost scenarios for what-if analysis
      scenarios: [
        {
          id: 'scen-001',
          name: 'Baseline 2026',
          description: 'Current cost structure baseline',
          productId: 'prod-001',
          isBaseline: true,
          createdAt: '2026-01-10',
          adjustments: {},
        },
        {
          id: 'scen-002',
          name: 'Material Cost +10%',
          description: 'Impact of 10% material cost increase',
          productId: 'prod-001',
          isBaseline: false,
          createdAt: '2026-01-20',
          adjustments: { materials: 1.10 },
        },
        {
          id: 'scen-003',
          name: 'New Supplier Quote',
          description: 'Alternative supplier with lower material costs',
          productId: 'prod-001',
          isBaseline: false,
          createdAt: '2026-01-25',
          adjustments: { materials: 0.92, logistics: 1.15 },
        },
      ],

      // Cost categories for breakdown
      costCategories: [
        { id: 'materials', name: 'Materials', color: '#2196F3' },
        { id: 'labor', name: 'Labor', color: '#4CAF50' },
        { id: 'overhead', name: 'Overhead', color: '#FF9800' },
        { id: 'tooling', name: 'Tooling', color: '#9C27B0' },
        { id: 'logistics', name: 'Logistics', color: '#00BCD4' },
      ],

      // Actions
      addProduct: (product) => set((state) => ({
        products: [...state.products, {
          ...product,
          id: `prod-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
          version: '1.0',
          status: 'development',
          sellingPrice: product.sellingPrice || 0,
          bom: [],
          costBreakdown: { materials: 0, labor: 0, overhead: 0, tooling: 0, logistics: 0 },
          currentCost: 0,
        }],
      })),

      updateProduct: (id, updates) => set((state) => ({
        products: state.products.map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : p
        ),
      })),

      deleteProduct: (id) => set((state) => ({
        products: state.products.filter(p => p.id !== id),
        scenarios: state.scenarios.filter(s => s.productId !== id),
      })),

      addBomItem: (productId, item) => set((state) => ({
        products: state.products.map(p =>
          p.id === productId ? {
            ...p,
            bom: [...p.bom, { ...item, id: `bom-${Date.now()}`, totalCost: item.quantity * item.unitCost }],
            updatedAt: new Date().toISOString().split('T')[0],
          } : p
        ),
      })),

      updateBomItem: (productId, bomId, updates) => set((state) => ({
        products: state.products.map(p =>
          p.id === productId ? {
            ...p,
            bom: p.bom.map(b =>
              b.id === bomId ? { ...b, ...updates, totalCost: (updates.quantity || b.quantity) * (updates.unitCost || b.unitCost) } : b
            ),
            updatedAt: new Date().toISOString().split('T')[0],
          } : p
        ),
      })),

      deleteBomItem: (productId, bomId) => set((state) => ({
        products: state.products.map(p =>
          p.id === productId ? {
            ...p,
            bom: p.bom.filter(b => b.id !== bomId),
            updatedAt: new Date().toISOString().split('T')[0],
          } : p
        ),
      })),

      recalculateCosts: (productId) => set((state) => ({
        products: state.products.map(p => {
          if (p.id !== productId) return p
          const materialsCost = p.bom.reduce((sum, b) => sum + b.totalCost, 0)
          return {
            ...p,
            costBreakdown: { ...p.costBreakdown, materials: materialsCost },
            currentCost: materialsCost + p.costBreakdown.labor + p.costBreakdown.overhead + p.costBreakdown.tooling + p.costBreakdown.logistics,
            updatedAt: new Date().toISOString().split('T')[0],
          }
        }),
      })),

      addScenario: (scenario) => set((state) => ({
        scenarios: [...state.scenarios, {
          ...scenario,
          id: `scen-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
          isBaseline: false,
        }],
      })),

      deleteScenario: (id) => set((state) => ({
        scenarios: state.scenarios.filter(s => s.id !== id),
      })),

      // Calculate scenario cost
      calculateScenarioCost: (scenarioId) => {
        const state = get()
        const scenario = state.scenarios.find(s => s.id === scenarioId)
        if (!scenario) return null
        
        const product = state.products.find(p => p.id === scenario.productId)
        if (!product) return null
        
        const adjusted = { ...product.costBreakdown }
        Object.entries(scenario.adjustments).forEach(([key, multiplier]) => {
          if (adjusted[key] !== undefined) {
            adjusted[key] = product.costBreakdown[key] * multiplier
          }
        })
        
        return {
          ...adjusted,
          total: Object.values(adjusted).reduce((sum, v) => sum + v, 0),
        }
      },

      // Get cost summary statistics
      canEditCosts: () => guardCanEdit(),
      isReadOnly: () => isAuditor(),
      getAccessLevel: () => getUserRole(),

      getCostSummary: () => {
        const products = get().products
        const totalProducts = products.length
        const onTarget = products.filter(p => p.currentCost <= p.targetCost).length
        const overBudget = products.filter(p => p.currentCost > p.targetCost).length
        const totalCurrentCost = products.reduce((sum, p) => sum + p.currentCost, 0)
        const totalTargetCost = products.reduce((sum, p) => sum + p.targetCost, 0)
        const variance = totalCurrentCost - totalTargetCost
        const variancePercent = totalTargetCost > 0 ? ((variance / totalTargetCost) * 100).toFixed(1) : 0
        
        return {
          totalProducts,
          onTarget,
          overBudget,
          totalCurrentCost,
          totalTargetCost,
          variance,
          variancePercent,
        }
      },
    }),
    {
      name: 'strefex-cost-storage',
      storage: createTenantStorage(),
    }
  )
)

export default useCostStore
