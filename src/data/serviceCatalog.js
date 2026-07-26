/** Paid service catalog — not connected to Stripe (request / manual billing). */
export const SERVICE_CATALOG = [
  {
    id: 'supplier-selection',
    category: 'Supplier Services',
    name: 'Supplier Selection Package',
    description: 'Complete supplier evaluation and selection service',
    price: 2500,
    currency: 'USD',
  },
  {
    id: 'supplier-audit',
    category: 'Supplier Services',
    name: 'Supplier Audit',
    description: 'On-site supplier quality audit',
    price: 3500,
    currency: 'USD',
  },
  {
    id: 'rfq-management',
    category: 'Supplier Services',
    name: 'RFQ Management',
    description: 'Full RFQ process management',
    price: 1500,
    currency: 'USD',
  },
  {
    id: 'production-followup',
    category: 'Supplier Services',
    name: 'Production Follow Up',
    description: 'On-site production monitoring and quality control',
    price: 2800,
    currency: 'USD',
  },
  {
    id: 'equipment-acceptance',
    category: 'Supplier Services',
    name: 'Equipment Acceptance',
    description: 'Equipment inspection, testing and acceptance verification',
    price: 4500,
    currency: 'USD',
  },
  {
    id: 'shipment-acceptance',
    category: 'Supplier Services',
    name: 'Shipment Acceptance',
    description: 'Shipment inspection, documentation and acceptance',
    price: 1800,
    currency: 'USD',
  },
  {
    id: 'project-basic',
    category: 'Project Management',
    name: 'Project Management - Basic',
    description: 'Basic project oversight and reporting',
    price: 5000,
    currency: 'USD',
  },
  {
    id: 'project-standard',
    category: 'Project Management',
    name: 'Project Management - Standard',
    description: 'Standard project management with regular reporting',
    price: 9500,
    currency: 'USD',
  },
  {
    id: 'project-premium',
    category: 'Project Management',
    name: 'Project Management - Premium',
    description: 'Full project management with dedicated team',
    price: 15000,
    currency: 'USD',
  },
  {
    id: 'consulting-hourly',
    category: 'Consulting',
    name: 'Consulting - Hourly',
    description: 'Expert consulting per hour',
    price: 250,
    currency: 'USD',
  },
  {
    id: 'consulting-daily',
    category: 'Consulting',
    name: 'Consulting - Daily Rate',
    description: 'Full day consulting service',
    price: 1800,
    currency: 'USD',
  },
]

export const SERVICE_CATEGORY_LINKS = [
  {
    id: 'project-management',
    label: 'Project Management',
    path: '/services?context=service&serviceCategory=project-management&serviceCategoryLabel=Project+Management',
    color: '#00d4ff',
  },
  {
    id: 'supplier-services',
    label: 'Supplier Services',
    path: '/services?context=service&serviceCategory=supplier-services&serviceCategoryLabel=Supplier+Services',
    color: '#e65100',
  },
  {
    id: 'quality-services',
    label: 'Quality & Compliance',
    path: '/services?context=service&serviceCategory=quality-services&serviceCategoryLabel=Quality+%26+Compliance',
    color: '#2e7d32',
  },
]

export function formatServicePrice(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function groupServicesByCategory(catalog = SERVICE_CATALOG) {
  return catalog.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = []
    acc[service.category].push(service)
    return acc
  }, {})
}
