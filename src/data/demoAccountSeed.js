/**
 * Local-only seed payloads for presentation demo workspaces.
 */
import {
  DEMO_SEED_VERSION,
  DEMO_TENANT_ID,
  getDemoProfileMeta,
} from '../config/demoAccount'

const DEMO_EMAIL_BUYER = getDemoProfileMeta('buyer').email
const DEMO_EMAIL_SELLER = getDemoProfileMeta('seller').email

const today = () => new Date().toISOString().slice(0, 10)
const isoNow = () => new Date().toISOString()

function subscriptionFor(profileKey) {
  const meta = getDemoProfileMeta(profileKey)
  return {
    planId: meta.planId,
    accountType: meta.accountType,
    status: 'active',
    trialEndsAt: null,
    overrides: {},
  }
}

function buyerRfqs() {
  const email = DEMO_EMAIL_BUYER
  return {
    state: {
      rfqs: [
        {
          id: 'demo-rfq-001',
          title: 'Injection moulding cells — automotive interior',
          industryId: 'automotive',
          categoryId: 'injection-machines',
          buyerEmail: email,
          _createdBy: email,
          buyerCompany: 'Demo Procurement GmbH',
          status: 'active',
          createdAt: today(),
          dueDate: today(),
          responses: 2,
          attachments: [],
          sellerResponses: [
            {
              sellerId: 'demo-supplier-1',
              sellerName: 'Precision Plastics EU',
              sellerEmail: 'sales@precision-plastics.demo',
              price: 245000,
              leadTime: 14,
              warranty: '24 months',
              notes: 'Includes installation and operator training.',
              respondedAt: today(),
            },
            {
              sellerId: 'demo-supplier-2',
              sellerName: 'AutoMold Systems',
              sellerEmail: 'rfq@automold.demo',
              price: 228500,
              leadTime: 18,
              warranty: '18 months',
              notes: 'Alternative configuration available.',
              respondedAt: today(),
            },
          ],
          requirements: { quantity: 2, region: 'EU' },
          buyerRefDisplay: 'B-1001',
          buyerRefSeq: 1001,
        },
        {
          id: 'demo-rfq-002',
          title: 'CNC machining — prototype brackets',
          industryId: 'machinery',
          categoryId: 'cnc-machining',
          buyerEmail: email,
          _createdBy: email,
          status: 'sent',
          createdAt: today(),
          dueDate: today(),
          responses: 0,
          attachments: [],
          sellerResponses: [],
          requirements: { material: 'Aluminium 6061' },
          buyerRefDisplay: 'B-1002',
          buyerRefSeq: 1002,
        },
        {
          id: 'demo-rfq-003',
          title: 'Supplier audit — tier-2 electronics',
          industryId: 'electronics',
          buyerEmail: email,
          _createdBy: email,
          status: 'draft',
          createdAt: today(),
          responses: 0,
          attachments: [],
          sellerResponses: [],
          requirements: { scope: 'ISO 9001 gap analysis' },
        },
      ],
      receivedRfqs: [],
    },
    version: 0,
  }
}

function sellerRfqs() {
  const email = DEMO_EMAIL_SELLER
  return {
    state: {
      rfqs: [],
      receivedRfqs: [
        {
          id: 'demo-received-001',
          rfqId: 'demo-rfq-ext-001',
          title: 'Robot welding cell — machinery line upgrade',
          industryId: 'machinery',
          buyerCompany: 'Nordic Assembly Demo',
          buyerEmail: 'buyer@nordic-assembly.demo',
          sellerEmail: email,
          sellerId: email,
          status: 'pending',
          receivedAt: today(),
          dueDate: today(),
          requirements: { cells: 1 },
        },
        {
          id: 'demo-received-002',
          rfqId: 'demo-rfq-ext-002',
          title: 'Preventive maintenance package',
          industryId: 'automotive',
          buyerCompany: 'AutoParts Demo SA',
          buyerEmail: 'procurement@autoparts.demo',
          sellerEmail: email,
          sellerId: email,
          status: 'responded',
          receivedAt: today(),
          myResponse: {
            price: 18500,
            leadTime: 5,
            warranty: '12 months',
            notes: 'Includes quarterly on-site visit.',
            respondedAt: today(),
          },
        },
      ],
    },
    version: 0,
  }
}

function demoProjects(profileKey) {
  const owner = getDemoProfileMeta(profileKey).email
  return {
    state: {
      projects: [
        {
          id: 'demo-proj-001',
          projectNumber: 'PRJ-DEMO-2026-01',
          name: profileKey === 'buyer' ? '2026 Sourcing Program' : 'Capacity expansion — Line B',
          budget: 320000,
          currency: 'EUR',
          createdAt: today(),
          createdBy: owner,
          _createdBy: owner,
          resources: [],
          revisions: [{ id: 'rev-demo-1', date: today(), note: 'Demo project seeded', snapshot: null }],
          portfolioRag: 'green',
          tags: ['demo'],
          benefitNote: profileKey === 'buyer'
            ? 'Consolidate RFQs and supplier shortlists for Q3 launches.'
            : 'Respond to RFQs and keep catalog visibility high.',
          kpis: [
            { id: 'kpi-demo-1', name: 'Open RFQs', target: 5, current: 2, unit: 'count' },
          ],
          risks: [],
          tasks: [
            {
              id: 'demo-task-1',
              name: profileKey === 'buyer' ? 'Finalize supplier shortlist' : 'Update company profile',
              startDate: today(),
              endDate: today(),
              baselineStart: today(),
              baselineEnd: today(),
              progressPercent: 45,
              status: 'in-progress',
              assignee: getDemoProfileMeta(profileKey).fullName,
              cost: 0,
              predecessors: [],
              children: [],
            },
            {
              id: 'demo-task-2',
              name: profileKey === 'buyer' ? 'Send RFQ package' : 'Prepare quote response',
              startDate: today(),
              endDate: today(),
              baselineStart: today(),
              baselineEnd: today(),
              progressPercent: 0,
              status: 'not-started',
              assignee: '',
              cost: 0,
              predecessors: ['demo-task-1'],
              children: [],
            },
          ],
        },
      ],
    },
    version: 0,
  }
}

function demoVendors() {
  return {
    state: {
      vendors: [
        {
          id: 'demo-vnd-001',
          vendorNumber: 'VEND-9001',
          _companyId: DEMO_TENANT_ID,
          _createdBy: DEMO_EMAIL_BUYER,
          status: 'active',
          createdAt: isoNow(),
          updatedAt: isoNow(),
          general: {
            companyName: 'Precision Plastics EU',
            country: 'Germany',
            city: 'Stuttgart',
            industry: 'Automotive',
          },
          contacts: [{ id: 'c1', name: 'Elena Richter', role: 'Sales Director', email: 'sales@precision-plastics.demo', phone: '+49 711 555 0101' }],
          purchasing: { paymentTerms: 'Net 30', overallScore: 88, qualityRating: 90, deliveryReliability: 86 },
          certifications: [{ id: 'cert1', name: 'IATF 16949', validUntil: '2027-12-31' }],
          connections: [],
          documents: [],
          evaluations: [],
          complaints: [],
          notes: [],
          changeLog: [],
          addresses: {},
          banking: {},
        },
        {
          id: 'demo-vnd-002',
          vendorNumber: 'VEND-9002',
          _companyId: DEMO_TENANT_ID,
          _createdBy: DEMO_EMAIL_BUYER,
          status: 'active',
          createdAt: isoNow(),
          updatedAt: isoNow(),
          general: {
            companyName: 'AutoMold Systems',
            country: 'Czech Republic',
            city: 'Plzeň',
            industry: 'Automotive',
          },
          contacts: [{ id: 'c2', name: 'Jan Novák', role: 'Key Account', email: 'rfq@automold.demo', phone: '+420 377 555 0202' }],
          purchasing: { paymentTerms: 'Net 45', overallScore: 82, qualityRating: 84, deliveryReliability: 80 },
          certifications: [{ id: 'cert2', name: 'ISO 9001', validUntil: '2026-09-30' }],
          connections: [],
          documents: [],
          evaluations: [],
          complaints: [],
          notes: [],
          changeLog: [],
          addresses: {},
          banking: {},
        },
      ],
    },
    version: 0,
  }
}

function demoContacts(profileKey) {
  const meta = getDemoProfileMeta(profileKey)
  return [
    {
      id: 'demo-contact-1',
      name: 'Elena Richter',
      company: 'Precision Plastics EU',
      title: 'Sales Director',
      email: 'sales@precision-plastics.demo',
      phone: '+49 711 555 0101',
      type: profileKey === 'buyer' ? 'Supplier' : 'Customer',
      industry: 'Automotive',
      notes: 'Demo contact — local only.',
    },
    {
      id: 'demo-contact-2',
      name: 'Jan Novák',
      company: 'AutoMold Systems',
      title: 'Key Account Manager',
      email: 'rfq@automold.demo',
      phone: '+420 377 555 0202',
      type: profileKey === 'buyer' ? 'Supplier' : 'Customer',
      industry: 'Automotive',
    },
    {
      id: 'demo-contact-3',
      name: meta.fullName,
      company: meta.companyName,
      title: 'Demo presenter',
      email: meta.email,
      phone: '+1 555 0100',
      type: 'Other',
      industry: 'Automotive',
    },
  ]
}

function demoServiceRequests(profileKey) {
  const email = getDemoProfileMeta(profileKey).email
  return [
    {
      id: 'demo-svc-req-001',
      referenceNumber: 'B-2001',
      status: 'in_progress',
      services: ['project-management'],
      industryId: 'automotive',
      submittedBy: email,
      submittedAt: isoNow(),
      _companyId: DEMO_TENANT_ID,
      notes: 'Demo service request — project management support.',
      assigneeEmail: null,
    },
  ]
}

function demoNotifications(profileKey) {
  const email = getDemoProfileMeta(profileKey).email
  return [
    {
      id: 'demo-notif-001',
      type: 'service_request',
      title: 'Service request update',
      message: 'Your demo service request B-2001 is in progress.',
      read: false,
      createdAt: isoNow(),
      recipientEmail: email,
    },
    {
      id: 'demo-notif-002',
      type: 'rfq',
      title: 'New RFQ response',
      message: profileKey === 'buyer'
        ? 'Precision Plastics EU responded to your RFQ.'
        : 'You received a new RFQ invitation.',
      read: false,
      createdAt: isoNow(),
      recipientEmail: email,
    },
  ]
}

/**
 * @param {'buyer'|'seller'} profileKey
 * @returns {Record<string, unknown>} baseKey → JSON-serializable persist payload
 */
export function buildDemoSeedPayload(profileKey) {
  const meta = getDemoProfileMeta(profileKey)
  const industries = profileKey === 'buyer'
    ? ['automotive', 'machinery']
    : ['automotive']
  const categories = profileKey === 'seller'
    ? { automotive: ['injection-machines'] }
    : { automotive: ['injection-machines'], machinery: ['cnc-machining'] }

  return {
    'strefex-demo-seed-version': DEMO_SEED_VERSION,
    'strefex-subscription': subscriptionFor(profileKey),
    'strefex-selected-industries': industries,
    'strefex-selected-categories': categories,
    'strefex-rfq-storage': profileKey === 'buyer' ? buyerRfqs() : sellerRfqs(),
    'project-storage': demoProjects(profileKey),
    'strefex-vendor-master': profileKey === 'buyer' ? demoVendors() : { state: { vendors: [] }, version: 0 },
    'strefex-profile-contacts': demoContacts(profileKey),
    'strefex-service-requests': demoServiceRequests(profileKey),
    'strefex-service-notifications': demoNotifications(profileKey),
    'strefex-service-notifications-global': [],
    'strefex-transactions': [],
    'strefex-account-registry': [
      {
        id: meta.id,
        company: meta.companyName,
        email: meta.email,
        contactName: meta.fullName,
        accountType: meta.accountType,
        plan: meta.planId,
        status: 'active',
        industries,
        categories,
        registeredAt: isoNow(),
        registrationCode: 'DEMO-2026',
      },
    ],
  }
}

export { DEMO_SEED_VERSION }
