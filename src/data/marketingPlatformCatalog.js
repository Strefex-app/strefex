/**
 * Public marketing catalog — icons/colors match in-app hubs & management clusters.
 */

/** Hiring → training → qualifications → ops — document traceability in Company mode. */
export const MARKETING_CONNECTIVITY_STACK = [
  { icon: 'team', label: 'Hiring', hint: 'Role, onboarding pack, access records' },
  { icon: 'clipboard', label: 'Training plan', hint: 'Assigned paths and completion evidence' },
  { icon: 'profile', label: 'Qualification matrix', hint: 'Skills mapped to job requirements' },
  { icon: 'folder', label: 'Controlled documents', hint: 'Versions linked to the person and role' },
  { icon: 'production', label: 'Operations', hint: 'Shop-floor work with the same trail' },
]

/** Manufacturer readiness — matches Network quoting + Company plant tools. */
export const MARKETING_MANUFACTURER_SUPPORT = [
  { icon: 'shield', label: 'Trust setup', hint: 'Industry, primary certificate, publish what buyers may see' },
  { icon: 'folder', label: 'Plant files in order', hint: 'Company Database for QMS, commercial, and HR folders' },
  { icon: 'audit', label: 'Preparation audit', hint: 'Gap assessment before a formal certification audit' },
  { icon: 'quality', label: 'Certification evidence', hint: 'Evidence packs ready for auditors and RFQ replies' },
]

/** Manufacturer workflow on the marketing home (Network + plant). */
export const MARKETING_SELLER_FLOW = [
  { icon: 'shield', label: 'Trust setup', hint: 'Publish reliability card' },
  { icon: 'folder', label: 'Plant files', hint: 'Documents kept in order' },
  { icon: 'audit', label: 'Prep & certify', hint: 'Gap audit → evidence pack' },
  { icon: 'vendors', label: 'Quote & award', hint: 'RFQ inbox → project binder' },
]

export const MARKETING_PILLARS = [
  {
    icon: 'search',
    color: '#2e7d32',
    title: 'Evidence-backed sourcing',
    text: 'See IATF, ISO 13485, FDA, and ISO 9001 signals before you invite a supplier.',
  },
  {
    icon: 'quality',
    color: '#e67e22',
    title: 'Plant QMS that answers RFQs',
    text: 'Publish a reliability card once. Folders and certificates stay private until you opt in.',
  },
  {
    icon: 'management',
    color: '#2980b9',
    title: 'Full company toolkit',
    text: 'People, projects, production, cost, audits, and integrations in one tenant workspace.',
  },
]

/** Example manufacturer card — mirrors SupplierCard / directory signals. */
export const MARKETING_SAMPLE_PLANT = {
  name: 'Nordic Precision GmbH',
  location: 'Stuttgart, DE · Automotive',
  standards: ['IATF 16949', 'ISO 9001', 'ISO 14001'],
  reliability: 86,
  evidence: [
    { label: 'Primary cert', status: 'on-file' },
    { label: 'PPAP level 3', status: 'on-file' },
    { label: 'Change log', status: 'gap' },
  ],
}

/** Buyer workflow steps shown as a visual strip. */
export const MARKETING_BUYER_FLOW = [
  { icon: 'search', label: 'Discover', hint: 'Filter by industry & standard' },
  { icon: 'vendors', label: 'Shortlist', hint: 'Compare evidence side by side' },
  { icon: 'procurement', label: 'RFQ', hint: 'NDA gate for drawings' },
  { icon: 'clipboard', label: 'Track', hint: 'Status in Buyer Workspace' },
]

export const MARKETING_NETWORK = {
  title: 'Network workspace',
  lead: 'Same tools you use after sign-in — discovery, RFQs, and directories.',
  items: [
    {
      icon: 'search',
      color: '#2e7d32',
      label: 'Sourcing',
      meta: 'Buyers',
      description: 'Find plants, shortlist by evidence, create RFQs, track replies.',
      example: 'Find → Shortlist → RFQ → Track',
    },
    {
      icon: 'vendors',
      color: '#00a8c8',
      label: 'Quoting',
      meta: 'Manufacturers',
      description: 'RFQ inbox with on-file vs gap, awards, plant project links.',
      example: 'Inbox · Awards · Binders',
    },
    {
      icon: 'folder',
      color: '#2e7d32',
      label: 'Products',
      meta: 'Directory',
      description: 'Browse products and components across industries.',
      example: 'Automotive · Medical · Electronics',
    },
    {
      icon: 'wrench',
      color: '#16a085',
      label: 'Equipment',
      meta: 'Directory',
      description: 'Equipment categories and plant suppliers.',
      example: 'CNC · Injection · Assembly',
    },
    {
      icon: 'clipboard',
      color: '#e65100',
      label: 'Services',
      meta: 'Directory',
      description: 'Project, supplier, and quality services.',
      example: 'Audit · PPAP · Program mgmt',
    },
  ],
}

export const MARKETING_TRUST = {
  title: 'Trust & plant quality',
  lead: 'Publish what buyers may see. Keep lots, NCRs, and other-customer records private.',
  items: [
    {
      icon: 'shield',
      color: '#192a56',
      label: 'Trust setup',
      description: 'Industry, primary certificate, publish preview, reliability card.',
      example: 'Wizard → Preview → Publish',
    },
    {
      icon: 'quality',
      color: '#e67e22',
      label: 'IATF / plant QMS',
      description: 'QMS library, masters, PPAP, lots, change control, buyer card.',
      example: 'PPAP · Lots · Change log',
    },
    {
      icon: 'folder',
      color: '#2980b9',
      label: 'Company Database',
      description: 'Folder spaces for QMS, commercial, and HR — industry-aware.',
      example: 'QMS / Commercial / HR',
    },
    {
      icon: 'notifications',
      color: '#8e44ad',
      label: 'Evidence requests',
      description: 'Buyers request missing certs; plants answer from the inbox.',
      example: 'Request → Upload → Confirm',
    },
  ],
}

export const MARKETING_MANAGEMENT_CLUSTERS = [
  {
    id: 'people',
    label: 'People',
    description: 'Team access, HR, departments, workflows, and collaboration.',
    icon: 'team',
    color: '#2980b9',
    modules: [
      { icon: 'team', label: 'Team Management', description: 'Members, roles, access' },
      { icon: 'profile', label: 'HR Space', description: 'Workforce & training' },
      { icon: 'gantt', label: 'Workflows', description: 'Hire → quality → production' },
      { icon: 'profile', label: 'Departments', description: 'People, lots, NCRs by dept' },
      { icon: 'clipboard', label: 'Forum', description: 'Announcements' },
    ],
  },
  {
    id: 'sourcing',
    label: 'Sourcing',
    description: 'RFQ intelligence, procurement register, vendors, and POs.',
    icon: 'procurement',
    color: '#8e44ad',
    modules: [
      { icon: 'procurement', label: 'Sourcing workspace', description: 'RFQs, POs, approvals' },
      { icon: 'vendors', label: 'Vendor Master', description: 'Supplier records' },
      { icon: 'procurement', label: 'Procurement', description: 'Requisitions & trail' },
    ],
  },
  {
    id: 'contracts-compliance',
    label: 'Contracts & Compliance',
    description: 'Audits, contracts, ESG, and platform activity.',
    icon: 'contracts',
    color: '#16a085',
    modules: [
      { icon: 'audit', label: 'Audit management', description: 'Plans & risk matrix' },
      { icon: 'contracts', label: 'Contracts', description: 'Lifecycle & renewals' },
      { icon: 'compliance', label: 'Compliance & ESG', description: 'Checklists & templates' },
      { icon: 'audit', label: 'Activity Log', description: 'System audit trails' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Multi-site costs, spend analysis, and financial planning.',
    icon: 'cost',
    color: '#c9a84c',
    modules: [
      { icon: 'enterprise', label: 'Multi-Site', description: 'OPEX / CAPEX / risk' },
      { icon: 'cost', label: 'Cost Management', description: 'BOM, scenarios, targets' },
      { icon: 'cost', label: 'Spend Analysis', description: 'By vendor & category' },
    ],
  },
  {
    id: 'ops',
    label: 'Ops',
    description: 'Projects, production, Quality Excellence, plant QMS, files.',
    icon: 'production',
    color: '#e67e22',
    modules: [
      { icon: 'folder', label: 'Projects', description: 'Gantt, portfolio, budgets' },
      { icon: 'production', label: 'Production', description: 'OEE, KPIs, floor layout' },
      { icon: 'quality', label: 'Quality Excellence', description: '8D, FMEA, SPC, APQP' },
      { icon: 'folder', label: 'Company Database', description: 'QMS folder spaces' },
      { icon: 'quality', label: 'IATF Control', description: 'PPAP, lots, buyer card' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    description: 'Integrations and intelligence for the whole account.',
    icon: 'erp',
    color: '#1b2a4a',
    modules: [
      { icon: 'erp', label: 'ERP Integrations', description: 'Vendors & purchasing sync' },
      { icon: 'ai', label: 'AI Insights', description: 'Risk & recommendations' },
    ],
  },
]

export const MARKETING_PRIVACY = [
  { icon: 'shield', label: 'Opt-in reliability card', hint: 'Preview before publish' },
  { icon: 'contracts', label: 'NDA gate', hint: 'RFQ drawings protected' },
  { icon: 'management', label: 'Network ↔ Company modes', hint: 'Market vs plant tools' },
  { icon: 'audit', label: 'Tenant isolation', hint: 'No cross-customer bleed' },
]

/**
 * Network vs Company mode organigram — mirrors WorkspaceModeSwitch labels.
 */
export const MARKETING_MODE_COMPARISON = {
  root: {
    label: 'STREFEX account',
    hint: 'One tenant · switch modes anytime',
  },
  bridge: {
    label: 'Shared bridge',
    hint: 'Reliability card & RFQ evidence connect both modes — plant data stays private until you publish.',
  },
  network: {
    id: 'marketplace',
    label: 'Network',
    tagline: 'Market side',
    hint: 'Find plants, issue RFQs, and answer buyer requests.',
    color: '#0e7490',
    icon: 'search',
    branches: [
      {
        label: 'Sourcing',
        icon: 'search',
        items: ['Discover plants', 'Shortlist & compare', 'Send RFQs', 'Track replies'],
      },
      {
        label: 'Quoting',
        icon: 'vendors',
        items: ['RFQ inbox', 'On-file vs gap', 'Awards', 'Buyer messages'],
      },
      {
        label: 'Directories',
        icon: 'folder',
        items: ['Products', 'Equipment', 'Services'],
      },
    ],
  },
  company: {
    id: 'company',
    label: 'Company',
    tagline: 'Plant / ops side',
    hint: 'Plant records, people, purchasing, and IATF control.',
    color: '#c2410c',
    icon: 'management',
    branches: [
      {
        label: 'People',
        icon: 'team',
        items: ['Team & HR', 'Departments', 'Workflows'],
      },
      {
        label: 'Ops & quality',
        icon: 'quality',
        items: ['IATF Control', 'Company Database', 'Projects', 'Production'],
      },
      {
        label: 'Commercial',
        icon: 'procurement',
        items: ['Sourcing workspace', 'Vendors', 'Contracts', 'Cost'],
      },
    ],
  },
}
