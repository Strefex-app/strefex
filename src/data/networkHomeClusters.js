const DIRECTORY_CLUSTERS = [
  {
    id: 'products',
    label: 'Product & component',
    description: 'Browse products and components across industries',
    icon: 'package',
    color: '#2e7d32',
    path: '/product-hub',
    meta: ['Directory'],
  },
  {
    id: 'equipment',
    label: 'Equipment',
    description: 'Equipment categories and plant suppliers',
    icon: 'wrench',
    color: '#16a085',
    path: '/equipment-hub',
    meta: ['Directory'],
  },
  {
    id: 'services',
    label: 'Services',
    description: 'Project, supplier, and quality services',
    icon: 'refresh',
    color: '#e65100',
    path: '/service-hub',
    meta: ['Directory'],
  },
]

export function getNetworkHomeClusters({
  accountTypes = [],
  isSuperAdmin = false,
  rfqStats,
  receivedRfqStats,
} = {}) {
  const types = new Set(accountTypes)
  const showSourcing = isSuperAdmin || types.has('buyer')
  const showQuoting = isSuperAdmin || types.has('seller') || types.has('service_provider')
  const clusters = []

  if (showSourcing) {
    clusters.push({
      id: 'intelligent-sourcing',
      label: 'Sourcing',
      description: 'Intelligent Sourcing — plant location, supplier map, compare, and RFQ',
      icon: 'search',
      color: '#0A2540',
      path: '/hub/procurement',
      meta: ['Buyer tools'],
      stats: rfqStats
        ? [
            { label: 'sent', value: rfqStats.sent },
            { label: 'active', value: rfqStats.active },
          ]
        : [],
    })
    clusters.push({
      id: 'executive-summary',
      label: 'Executive Summary',
      description: 'Supplier map, metrics, compare, and RFQ by industry',
      icon: 'chart',
      color: '#192a56',
      path: '/executive-summary',
      meta: ['Buyer tools'],
    })
  }

  if (showQuoting) {
    clusters.push({
      id: 'home-dashboard',
      label: 'Home dashboard',
      description: 'Status of RFQs, quotations, awards, and projects',
      icon: 'vendors',
      color: '#00d4ff',
      path: '/main-menu',
      meta: ['Status'],
      stats: receivedRfqStats
        ? [
            { label: 'pending', value: receivedRfqStats.pending },
            { label: 'awarded', value: receivedRfqStats.awarded },
          ]
        : [],
    })
  }

  return [...clusters, ...DIRECTORY_CLUSTERS]
}
