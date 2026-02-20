import { useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import useVendorStore from '../store/vendorStore'
import './VendorDetail.css'

const STATUS_META = {
  active:           { label: 'Active',    color: '#27ae60', bg: 'rgba(46,204,113,.1)' },
  blocked:          { label: 'Blocked',   color: '#e74c3c', bg: 'rgba(231,76,60,.1)' },
  pending_approval: { label: 'Pending',   color: '#e67e22', bg: 'rgba(230,126,34,.1)' },
  archived:         { label: 'Archived',  color: '#95a5a6', bg: 'rgba(149,165,166,.1)' },
}

const CONN_META = {
  rfq:     { label: 'RFQ',     color: '#1565c0', icon: '📋' },
  order:   { label: 'Order',   color: '#2e7d32', icon: '📦' },
  payment: { label: 'Payment', color: '#7b1fa2', icon: '💰' },
  invoice: { label: 'Invoice', color: '#e65100', icon: '🧾' },
}

const SECTION_LABELS = {
  general: 'General Information',
  addresses: 'Addresses',
  banking: 'Banking Information',
  purchasing: 'Payment Terms',
  contacts: 'Contacts',
  certifications: 'Certifications',
}

const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
const fmtDateTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const Stars = ({ value, size = 16 }) => {
  const full = Math.floor(value || 0)
  const half = (value || 0) - full >= 0.3
  return (
    <span className="vd-stars" style={{ fontSize: size }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < full ? '#f5a623' : i === full && half ? '#f5a623' : '#ddd' }}>
          {i < full ? '★' : i === full && half ? '★' : '☆'}
        </span>
      ))}
      <span className="vd-stars-val">{(value || 0).toFixed(1)}</span>
    </span>
  )
}

const ScoreBar = ({ label, value, max = 5 }) => (
  <div className="vd-score-bar">
    <span className="vd-score-label">{label}</span>
    <div className="vd-score-track"><div className="vd-score-fill" style={{ width: `${(value / max) * 100}%` }} /></div>
    <span className="vd-score-val">{(value || 0).toFixed(1)}</span>
  </div>
)

/** Detect changed fields between two flat objects */
function diffFields(oldObj, newObj, prefix = '') {
  const changes = []
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])
  for (const key of allKeys) {
    const oldVal = oldObj?.[key]
    const newVal = newObj?.[key]
    const label = prefix ? `${prefix}.${key}` : key
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      const oldStr = oldVal.join(', ')
      const newStr = newVal.join(', ')
      if (oldStr !== newStr) changes.push({ field: label, oldValue: oldStr, newValue: newStr })
    } else if (typeof oldVal === 'object' && oldVal !== null && typeof newVal === 'object' && newVal !== null) {
      changes.push(...diffFields(oldVal, newVal, label))
    } else {
      const o = oldVal == null ? '' : String(oldVal)
      const n = newVal == null ? '' : String(newVal)
      if (o !== n) changes.push({ field: label, oldValue: o, newValue: n })
    }
  }
  return changes
}

/** Editable field component */
const EditField = ({ label, value, onChange, type = 'text', mono = false }) => (
  <div className="vd-edit-field">
    <label>{label}</label>
    {type === 'textarea' ? (
      <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={2} />
    ) : (
      <input type={type} className={mono ? 'vd-mono' : ''} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    )}
  </div>
)

/* ═══════════════════════════════════════════════════════
 *  VENDOR DETAIL — Full master record view with edit & change log
 * ═══════════════════════════════════════════════════════ */
export default function VendorDetail() {
  const { vendorId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const userName = user?.name || user?.email || 'User'

  const vendor = useVendorStore((s) => s.getVendorById(vendorId))
  const approveVendor = useVendorStore((s) => s.approveVendor)
  const blockVendor = useVendorStore((s) => s.blockVendor)
  const archiveVendor = useVendorStore((s) => s.archiveVendor)
  const setVendorStatus = useVendorStore((s) => s.setVendorStatus)
  const addEvaluation = useVendorStore((s) => s.addEvaluation)
  const addNote = useVendorStore((s) => s.addNote)
  const addContact = useVendorStore((s) => s.addContact)
  const addChangeLog = useVendorStore((s) => s.addChangeLog)
  const addComplaint = useVendorStore((s) => s.addComplaint)
  const resolveComplaint = useVendorStore((s) => s.resolveComplaint)
  const getEvaluationClass = useVendorStore((s) => s.getEvaluationClass)
  const updateVendorSectionWithLog = useVendorStore((s) => s.updateVendorSectionWithLog)
  const updateContactWithLog = useVendorStore((s) => s.updateContactWithLog)

  const [tab, setTab] = useState('general')
  const [feedback, setFeedback] = useState(null)

  /* ── Edit states ─────────────────────────────────────── */
  const [editingGeneral, setEditingGeneral] = useState(false)
  const [editingAddresses, setEditingAddresses] = useState(false)
  const [editingBanking, setEditingBanking] = useState(false)
  const [editingPurchasing, setEditingPurchasing] = useState(false)
  const [editingContactId, setEditingContactId] = useState(null)

  const [generalDraft, setGeneralDraft] = useState(null)
  const [addressDraft, setAddressDraft] = useState(null)
  const [bankingDraft, setBankingDraft] = useState(null)
  const [purchasingDraft, setPurchasingDraft] = useState(null)
  const [contactDraft, setContactDraft] = useState(null)

  /* ── Change reason dialog ────────────────────────────── */
  const [changeReasonModal, setChangeReasonModal] = useState(null) // { section, callback }
  const [changeReason, setChangeReason] = useState('')

  /* Evaluation form — all 8 criteria */
  const EVAL_CRITERIA = [
    { key: 'quality', label: 'Quality', desc: 'Product/service quality, defect rate' },
    { key: 'delivery', label: 'Delivery', desc: 'On-time delivery, lead time adherence' },
    { key: 'price', label: 'Price / Cost', desc: 'Price competitiveness, cost reduction' },
    { key: 'communication', label: 'Communication', desc: 'Responsiveness, problem resolution' },
    { key: 'technicalCapability', label: 'Technical Capability', desc: 'Innovation, engineering support' },
    { key: 'compliance', label: 'Compliance', desc: 'Certifications, regulatory adherence' },
    { key: 'flexibility', label: 'Flexibility', desc: 'Order changes, rush orders' },
    { key: 'documentation', label: 'Documentation', desc: 'Accuracy, completeness' },
  ]
  const [evalForm, setEvalForm] = useState({ quality: 5, delivery: 5, price: 5, communication: 5, technicalCapability: 5, compliance: 5, flexibility: 5, documentation: 5, evaluator: '', notes: '' })
  const [showEvalForm, setShowEvalForm] = useState(false)

  /* Complaint form */
  const COMPLAINT_TYPES = ['quality', 'delivery', 'documentation', 'communication', 'pricing', 'compliance', 'other']
  const SEVERITY_LEVELS = [
    { key: 'minor', label: 'Minor', color: '#e67e22', bg: 'rgba(230,126,34,.1)' },
    { key: 'major', label: 'Major', color: '#e74c3c', bg: 'rgba(231,76,60,.1)' },
    { key: 'critical', label: 'Critical', color: '#c0392b', bg: 'rgba(192,57,43,.15)' },
  ]
  const [showComplaintForm, setShowComplaintForm] = useState(false)
  const [complaintForm, setComplaintForm] = useState({ type: 'quality', severity: 'minor', title: '', description: '' })
  const [resolveId, setResolveId] = useState(null)
  const [resolveText, setResolveText] = useState('')
  const [evalYearFilter, setEvalYearFilter] = useState('all')

  /* Note form */
  const [noteText, setNoteText] = useState('')

  /* Contact form */
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', role: '', email: '', phone: '' })

  /* Change log filter */
  const [logFilter, setLogFilter] = useState('all')

  if (!vendor) {
    return (
      <AppLayout>
        <div className="vd-page">
          <button className="vd-back" onClick={() => navigate('/vendors')}>← Back</button>
          <div className="vd-empty">Vendor not found.</div>
        </div>
      </AppLayout>
    )
  }

  const sm = STATUS_META[vendor.status] || STATUS_META.active
  const g = vendor.general
  const primary = vendor.contacts.find((c) => c.isPrimary) || vendor.contacts[0]
  const changeLog = vendor.changeLog || []

  const flash = (text) => { setFeedback({ type: 'success', text }); setTimeout(() => setFeedback(null), 3000) }

  /* ── Save with reason prompt ─────────────────────────── */
  const promptReason = (section, callback) => {
    setChangeReason('')
    setChangeReasonModal({ section, callback })
  }

  const confirmChange = () => {
    if (changeReasonModal?.callback) {
      changeReasonModal.callback(changeReason)
    }
    setChangeReasonModal(null)
    setChangeReason('')
  }

  /* ── Edit helpers ────────────────────────────────────── */
  const startEditGeneral = () => { setGeneralDraft({ ...g }); setEditingGeneral(true) }
  const cancelEditGeneral = () => { setEditingGeneral(false); setGeneralDraft(null) }
  const saveGeneral = () => {
    promptReason('General Information', (reason) => {
      const changes = diffFields(g, generalDraft)
      if (changes.length === 0) { cancelEditGeneral(); return }
      updateVendorSectionWithLog(vendor.id, 'general', generalDraft, userName, reason, changes)
      setEditingGeneral(false)
      setGeneralDraft(null)
      flash('General information updated')
    })
  }

  const startEditAddresses = () => { setAddressDraft(JSON.parse(JSON.stringify(vendor.addresses))); setEditingAddresses(true) }
  const cancelEditAddresses = () => { setEditingAddresses(false); setAddressDraft(null) }
  const saveAddresses = () => {
    promptReason('Addresses', (reason) => {
      const changes = diffFields(vendor.addresses, addressDraft)
      if (changes.length === 0) { cancelEditAddresses(); return }
      updateVendorSectionWithLog(vendor.id, 'addresses', addressDraft, userName, reason, changes)
      setEditingAddresses(false)
      setAddressDraft(null)
      flash('Addresses updated')
    })
  }

  const startEditBanking = () => { setBankingDraft({ ...vendor.banking }); setEditingBanking(true) }
  const cancelEditBanking = () => { setEditingBanking(false); setBankingDraft(null) }
  const saveBanking = () => {
    promptReason('Banking Information', (reason) => {
      const changes = diffFields(vendor.banking, bankingDraft)
      if (changes.length === 0) { cancelEditBanking(); return }
      updateVendorSectionWithLog(vendor.id, 'banking', bankingDraft, userName, reason, changes)
      setEditingBanking(false)
      setBankingDraft(null)
      flash('Banking information updated')
    })
  }

  const startEditPurchasing = () => { setPurchasingDraft({ ...vendor.purchasing }); setEditingPurchasing(true) }
  const cancelEditPurchasing = () => { setEditingPurchasing(false); setPurchasingDraft(null) }
  const savePurchasing = () => {
    promptReason('Payment Terms', (reason) => {
      const changes = diffFields(vendor.purchasing, purchasingDraft)
      if (changes.length === 0) { cancelEditPurchasing(); return }
      updateVendorSectionWithLog(vendor.id, 'purchasing', purchasingDraft, userName, reason, changes)
      setEditingPurchasing(false)
      setPurchasingDraft(null)
      flash('Payment terms updated')
    })
  }

  const startEditContact = (contact) => { setContactDraft({ ...contact }); setEditingContactId(contact.id) }
  const cancelEditContact = () => { setEditingContactId(null); setContactDraft(null) }
  const saveContact = () => {
    const original = vendor.contacts.find((c) => c.id === editingContactId)
    promptReason('Contacts', (reason) => {
      const changes = diffFields(original, contactDraft)
      if (changes.length === 0) { cancelEditContact(); return }
      updateContactWithLog(vendor.id, editingContactId, contactDraft, userName, reason, changes)
      setEditingContactId(null)
      setContactDraft(null)
      flash('Contact updated')
    })
  }

  /* ── Tab Renderers ─────────────────────────────────── */
  const renderGeneral = () => (
    <div className="vd-grid">
      <div className="vd-card">
        <div className="vd-card-header">
          <h4>Company Information</h4>
          {!editingGeneral ? (
            <button className="vd-btn-sm blue" onClick={startEditGeneral}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          ) : (
            <div className="vd-edit-actions">
              <button className="vd-btn-sm green" onClick={saveGeneral}>Save</button>
              <button className="vd-btn-sm" style={{ background: '#f5f5f5', color: '#888' }} onClick={cancelEditGeneral}>Cancel</button>
            </div>
          )}
        </div>
        {!editingGeneral ? (
          <div className="vd-data-grid">
            <div className="vd-data"><span>Company Name</span><strong>{g.companyName}</strong></div>
            <div className="vd-data"><span>Legal Name</span><strong>{g.legalName}</strong></div>
            <div className="vd-data"><span>Tax ID</span><strong>{g.taxId || '—'}</strong></div>
            <div className="vd-data"><span>VAT Number</span><strong>{g.vatNumber || '—'}</strong></div>
            <div className="vd-data"><span>DUNS Number</span><strong>{g.dunsNumber || '—'}</strong></div>
            <div className="vd-data"><span>Website</span><strong>{g.website ? <a href={g.website} target="_blank" rel="noreferrer">{g.website}</a> : '—'}</strong></div>
            <div className="vd-data"><span>Country</span><strong>{g.country}</strong></div>
            <div className="vd-data"><span>Currency</span><strong>{g.currency}</strong></div>
            <div className="vd-data"><span>Language</span><strong>{g.language?.toUpperCase()}</strong></div>
            <div className="vd-data"><span>Year Established</span><strong>{g.yearEstablished || '—'}</strong></div>
            <div className="vd-data"><span>Company Size</span><strong>{g.companySize || '—'} employees</strong></div>
            <div className="vd-data"><span>Industries</span><strong>{(g.industry || []).join(', ') || '—'}</strong></div>
            <div className="vd-data"><span>Categories</span><strong>{(g.categories || []).join(', ') || '—'}</strong></div>
          </div>
        ) : (
          <div className="vd-edit-form-grid">
            <EditField label="Company Name" value={generalDraft.companyName} onChange={(v) => setGeneralDraft({ ...generalDraft, companyName: v })} />
            <EditField label="Legal Name" value={generalDraft.legalName} onChange={(v) => setGeneralDraft({ ...generalDraft, legalName: v })} />
            <EditField label="Tax ID" value={generalDraft.taxId} onChange={(v) => setGeneralDraft({ ...generalDraft, taxId: v })} />
            <EditField label="VAT Number" value={generalDraft.vatNumber} onChange={(v) => setGeneralDraft({ ...generalDraft, vatNumber: v })} />
            <EditField label="DUNS Number" value={generalDraft.dunsNumber} onChange={(v) => setGeneralDraft({ ...generalDraft, dunsNumber: v })} />
            <EditField label="Website" value={generalDraft.website} onChange={(v) => setGeneralDraft({ ...generalDraft, website: v })} />
            <EditField label="Country" value={generalDraft.country} onChange={(v) => setGeneralDraft({ ...generalDraft, country: v })} />
            <EditField label="Currency" value={generalDraft.currency} onChange={(v) => setGeneralDraft({ ...generalDraft, currency: v })} />
            <EditField label="Language" value={generalDraft.language} onChange={(v) => setGeneralDraft({ ...generalDraft, language: v })} />
            <EditField label="Year Established" value={generalDraft.yearEstablished} onChange={(v) => setGeneralDraft({ ...generalDraft, yearEstablished: v })} />
            <EditField label="Company Size" value={generalDraft.companySize} onChange={(v) => setGeneralDraft({ ...generalDraft, companySize: v })} />
            <EditField label="Industries (comma-separated)" value={(generalDraft.industry || []).join(', ')} onChange={(v) => setGeneralDraft({ ...generalDraft, industry: v.split(',').map((s) => s.trim()).filter(Boolean) })} />
            <EditField label="Categories (comma-separated)" value={(generalDraft.categories || []).join(', ')} onChange={(v) => setGeneralDraft({ ...generalDraft, categories: v.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </div>
        )}
      </div>

      <div className="vd-card">
        <div className="vd-card-header">
          <h4>Addresses</h4>
          {!editingAddresses ? (
            <button className="vd-btn-sm blue" onClick={startEditAddresses}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          ) : (
            <div className="vd-edit-actions">
              <button className="vd-btn-sm green" onClick={saveAddresses}>Save</button>
              <button className="vd-btn-sm" style={{ background: '#f5f5f5', color: '#888' }} onClick={cancelEditAddresses}>Cancel</button>
            </div>
          )}
        </div>
        {!editingAddresses ? (
          Object.entries(vendor.addresses || {}).map(([key, addr]) => (
            <div key={key} className="vd-address-block">
              <div className="vd-address-type">{key === 'main' ? 'Main Address' : key === 'shipping' ? 'Shipping Address' : key}</div>
              <div>{addr.street}</div>
              <div>{addr.postalCode} {addr.city}, {addr.state}</div>
              <div>{addr.country}</div>
              {addr.phone && <div>📞 {addr.phone}</div>}
              {addr.fax && <div>📠 {addr.fax}</div>}
            </div>
          ))
        ) : (
          Object.entries(addressDraft || {}).map(([key, addr]) => (
            <div key={key} className="vd-address-edit-block">
              <div className="vd-address-type">{key === 'main' ? 'Main Address' : key === 'shipping' ? 'Shipping Address' : key}</div>
              <div className="vd-edit-form-grid">
                <EditField label="Street" value={addr.street} onChange={(v) => setAddressDraft({ ...addressDraft, [key]: { ...addr, street: v } })} />
                <EditField label="City" value={addr.city} onChange={(v) => setAddressDraft({ ...addressDraft, [key]: { ...addr, city: v } })} />
                <EditField label="State" value={addr.state} onChange={(v) => setAddressDraft({ ...addressDraft, [key]: { ...addr, state: v } })} />
                <EditField label="Postal Code" value={addr.postalCode} onChange={(v) => setAddressDraft({ ...addressDraft, [key]: { ...addr, postalCode: v } })} />
                <EditField label="Country" value={addr.country} onChange={(v) => setAddressDraft({ ...addressDraft, [key]: { ...addr, country: v } })} />
                <EditField label="Phone" value={addr.phone} onChange={(v) => setAddressDraft({ ...addressDraft, [key]: { ...addr, phone: v } })} />
                <EditField label="Fax" value={addr.fax} onChange={(v) => setAddressDraft({ ...addressDraft, [key]: { ...addr, fax: v } })} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const renderContacts = () => (
    <div className="vd-card">
      <div className="vd-card-header">
        <h4>Contact Persons</h4>
        <button className="vd-btn-sm blue" onClick={() => setShowContactForm(!showContactForm)}>+ Add Contact</button>
      </div>
      {showContactForm && (
        <div className="vd-inline-form">
          <input placeholder="Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
          <input placeholder="Role" value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} />
          <input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
          <input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
          <button className="vd-btn-sm green" onClick={() => {
            if (!contactForm.name) return
            addContact(vendor.id, { ...contactForm, isPrimary: false })
            addChangeLog(vendor.id, { changedBy: userName, section: 'contacts', reason: 'New contact added', changes: [{ field: 'contact', oldValue: '', newValue: `${contactForm.name} (${contactForm.role})` }] })
            setContactForm({ name: '', role: '', email: '', phone: '' })
            setShowContactForm(false)
            flash('Contact added')
          }}>Save</button>
        </div>
      )}
      <div className="vd-contacts-list">
        {vendor.contacts.map((c) => (
          <div key={c.id} className={`vd-contact-card ${c.isPrimary ? 'primary' : ''}`}>
            {c.isPrimary && <span className="vd-badge green">Primary</span>}
            {editingContactId === c.id ? (
              <div className="vd-contact-edit">
                <div className="vd-edit-form-grid compact">
                  <EditField label="Name" value={contactDraft.name} onChange={(v) => setContactDraft({ ...contactDraft, name: v })} />
                  <EditField label="Role" value={contactDraft.role} onChange={(v) => setContactDraft({ ...contactDraft, role: v })} />
                  <EditField label="Email" value={contactDraft.email} onChange={(v) => setContactDraft({ ...contactDraft, email: v })} />
                  <EditField label="Phone" value={contactDraft.phone} onChange={(v) => setContactDraft({ ...contactDraft, phone: v })} />
                </div>
                <div className="vd-edit-actions" style={{ marginTop: 8 }}>
                  <button className="vd-btn-sm green" onClick={saveContact}>Save</button>
                  <button className="vd-btn-sm" style={{ background: '#f5f5f5', color: '#888' }} onClick={cancelEditContact}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="vd-contact-name">{c.name}</div>
                <div className="vd-contact-role">{c.role}</div>
                <div className="vd-contact-detail">📧 {c.email}</div>
                {c.phone && <div className="vd-contact-detail">📞 {c.phone}</div>}
                <button className="vd-contact-edit-btn" onClick={() => startEditContact(c)} title="Edit contact">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const renderBanking = () => (
    <div className="vd-grid">
      <div className="vd-card">
        <div className="vd-card-header">
          <h4>Banking Information</h4>
          {!editingBanking ? (
            <button className="vd-btn-sm blue" onClick={startEditBanking}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          ) : (
            <div className="vd-edit-actions">
              <button className="vd-btn-sm green" onClick={saveBanking}>Save</button>
              <button className="vd-btn-sm" style={{ background: '#f5f5f5', color: '#888' }} onClick={cancelEditBanking}>Cancel</button>
            </div>
          )}
        </div>
        {!editingBanking ? (
          <div className="vd-data-grid">
            <div className="vd-data"><span>Bank Name</span><strong>{vendor.banking.bankName || '—'}</strong></div>
            <div className="vd-data"><span>IBAN</span><strong className="vd-mono">{vendor.banking.iban || '—'}</strong></div>
            <div className="vd-data"><span>BIC / SWIFT</span><strong className="vd-mono">{vendor.banking.bic || '—'}</strong></div>
            <div className="vd-data"><span>Account Holder</span><strong>{vendor.banking.accountHolder || '—'}</strong></div>
            {vendor.banking.accountNumber && <div className="vd-data"><span>Account Number</span><strong className="vd-mono">{vendor.banking.accountNumber}</strong></div>}
            {vendor.banking.routingNumber && <div className="vd-data"><span>Routing Number</span><strong className="vd-mono">{vendor.banking.routingNumber}</strong></div>}
          </div>
        ) : (
          <div className="vd-edit-form-grid">
            <EditField label="Bank Name" value={bankingDraft.bankName} onChange={(v) => setBankingDraft({ ...bankingDraft, bankName: v })} />
            <EditField label="IBAN" value={bankingDraft.iban} mono onChange={(v) => setBankingDraft({ ...bankingDraft, iban: v })} />
            <EditField label="BIC / SWIFT" value={bankingDraft.bic} mono onChange={(v) => setBankingDraft({ ...bankingDraft, bic: v })} />
            <EditField label="Account Holder" value={bankingDraft.accountHolder} onChange={(v) => setBankingDraft({ ...bankingDraft, accountHolder: v })} />
            <EditField label="Account Number" value={bankingDraft.accountNumber} mono onChange={(v) => setBankingDraft({ ...bankingDraft, accountNumber: v })} />
            <EditField label="Routing Number" value={bankingDraft.routingNumber} mono onChange={(v) => setBankingDraft({ ...bankingDraft, routingNumber: v })} />
            <EditField label="Payment Method" value={bankingDraft.paymentMethod} onChange={(v) => setBankingDraft({ ...bankingDraft, paymentMethod: v })} />
            <EditField label="Currency" value={bankingDraft.currency} onChange={(v) => setBankingDraft({ ...bankingDraft, currency: v })} />
          </div>
        )}
      </div>
      <div className="vd-card">
        <div className="vd-card-header">
          <h4>Payment Terms</h4>
          {!editingPurchasing ? (
            <button className="vd-btn-sm blue" onClick={startEditPurchasing}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          ) : (
            <div className="vd-edit-actions">
              <button className="vd-btn-sm green" onClick={savePurchasing}>Save</button>
              <button className="vd-btn-sm" style={{ background: '#f5f5f5', color: '#888' }} onClick={cancelEditPurchasing}>Cancel</button>
            </div>
          )}
        </div>
        {!editingPurchasing ? (
          <div className="vd-data-grid">
            <div className="vd-data"><span>Payment Terms</span><strong>{vendor.purchasing.paymentTerms}</strong></div>
            <div className="vd-data"><span>Incoterms</span><strong>{vendor.purchasing.incoterms || '—'}</strong></div>
            <div className="vd-data"><span>Min Order Value</span><strong>${vendor.purchasing.minimumOrderValue?.toLocaleString() || '0'}</strong></div>
            <div className="vd-data"><span>Avg Lead Time</span><strong>{vendor.purchasing.leadTimeAvgDays || '—'} days</strong></div>
            <div className="vd-data"><span>Payment Method</span><strong>{vendor.banking.paymentMethod || '—'}</strong></div>
            <div className="vd-data"><span>Currency</span><strong>{vendor.banking.currency || g.currency}</strong></div>
          </div>
        ) : (
          <div className="vd-edit-form-grid">
            <EditField label="Payment Terms" value={purchasingDraft.paymentTerms} onChange={(v) => setPurchasingDraft({ ...purchasingDraft, paymentTerms: v })} />
            <EditField label="Incoterms" value={purchasingDraft.incoterms} onChange={(v) => setPurchasingDraft({ ...purchasingDraft, incoterms: v })} />
            <EditField label="Min Order Value ($)" value={purchasingDraft.minimumOrderValue} type="number" onChange={(v) => setPurchasingDraft({ ...purchasingDraft, minimumOrderValue: Number(v) })} />
            <EditField label="Avg Lead Time (days)" value={purchasingDraft.leadTimeAvgDays} type="number" onChange={(v) => setPurchasingDraft({ ...purchasingDraft, leadTimeAvgDays: Number(v) })} />
          </div>
        )}
      </div>
    </div>
  )

  const renderConnections = () => (
    <div className="vd-card">
      <h4>Connection History — RFQs, Orders, Payments</h4>
      {vendor.connections.length === 0 ? (
        <div className="vd-empty-sm">No connections yet.</div>
      ) : (
        <div className="vd-conn-table-wrap">
          <table className="vd-conn-table">
            <thead><tr><th>Type</th><th>Reference</th><th>Description</th><th>Date</th><th>Status</th><th>Amount</th></tr></thead>
            <tbody>
              {vendor.connections.map((c) => {
                const cm = CONN_META[c.type] || CONN_META.rfq
                return (
                  <tr key={c.id}>
                    <td><span className="vd-conn-type" style={{ color: cm.color, background: `${cm.color}10` }}>{cm.icon} {cm.label}</span></td>
                    <td className="vd-mono" style={{ fontSize: 12 }}>{c.refId}</td>
                    <td>{c.title}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.date)}</td>
                    <td><span className="vd-conn-status">{c.status}</span></td>
                    <td style={{ fontWeight: 700 }}>${(c.amount || 0).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="vd-conn-summary">
        <div>Total RFQs: <strong>{vendor.connections.filter((c) => c.type === 'rfq').length}</strong></div>
        <div>Total Orders: <strong>{vendor.connections.filter((c) => c.type === 'order').length}</strong></div>
        <div>Total Payments: <strong>{vendor.connections.filter((c) => c.type === 'payment').length}</strong></div>
        <div>Total Value: <strong>${vendor.connections.reduce((s, c) => s + (c.amount || 0), 0).toLocaleString()}</strong></div>
      </div>
    </div>
  )

  const renderCertifications = () => (
    <div className="vd-card">
      <h4>Certifications & Compliance</h4>
      {vendor.certifications.length === 0 ? (
        <div className="vd-empty-sm">No certifications recorded.</div>
      ) : (
        <div className="vd-cert-grid">
          {vendor.certifications.map((c) => {
            const daysLeft = c.validUntil ? Math.round((new Date(c.validUntil) - Date.now()) / 86400000) : null
            return (
              <div key={c.id} className={`vd-cert-card ${daysLeft !== null && daysLeft < 90 ? 'expiring' : ''}`}>
                <div className="vd-cert-name">{c.name}</div>
                <div className="vd-cert-issuer">Issuer: {c.issuer}</div>
                <div className="vd-cert-valid">Valid until: {fmtDate(c.validUntil)}</div>
                {daysLeft !== null && daysLeft < 90 && (
                  <div className="vd-cert-warn">⚠ Expires in {daysLeft} days</div>
                )}
                <span className={`vd-badge ${c.status === 'active' ? 'green' : 'red'}`}>{c.status}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderEvaluations = () => {
    const evalClass = getEvaluationClass(vendor)
    const complaints = vendor.complaints || []
    const openComplaints = complaints.filter((c) => c.status === 'open')
    const resolvedComplaints = complaints.filter((c) => c.status === 'resolved')

    /* Group evaluations by year */
    const evalsByYear = {}
    ;(vendor.evaluations || []).forEach((ev) => {
      const yr = ev.year || new Date(ev.date).getFullYear()
      if (!evalsByYear[yr]) evalsByYear[yr] = []
      evalsByYear[yr].push(ev)
    })
    const years = Object.keys(evalsByYear).sort((a, b) => b - a)
    const filteredYears = evalYearFilter === 'all' ? years : years.filter((y) => y === evalYearFilter)

    return (
      <div className="vd-eval-page">
        {/* ═══ Evaluation Class + Overview ═══ */}
        <div className="vd-card">
          <div className="vd-card-header">
            <h4>Performance Evaluation</h4>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="vd-btn-sm blue" onClick={() => setShowEvalForm(!showEvalForm)}>{showEvalForm ? 'Cancel' : '+ New Evaluation'}</button>
              <button className="vd-btn-sm" style={{ background: 'rgba(231,76,60,.08)', color: '#e74c3c' }} onClick={() => setShowComplaintForm(!showComplaintForm)}>{showComplaintForm ? 'Cancel' : '+ Complaint'}</button>
            </div>
          </div>

          {/* Evaluation class badge + overall score */}
          <div className="vd-eval-overview">
            <div className="vd-eval-class-box">
              <div className="vd-eval-class-badge" style={{ background: evalClass.color }}>{evalClass.cls}</div>
              <div className="vd-eval-class-label">{evalClass.label}</div>
              <div className="vd-eval-class-score">{evalClass.adjustedScore > 0 ? evalClass.adjustedScore.toFixed(2) : '—'}</div>
              {openComplaints.length > 0 && (
                <div className="vd-eval-class-warn">⚠ {openComplaints.length} open complaint{openComplaints.length > 1 ? 's' : ''} (−{openComplaints.reduce((s, c) => s + Math.abs(c.impactScore || 0), 0).toFixed(1)})</div>
              )}
            </div>
            <div className="vd-eval-overall">
              <div className="vd-eval-overall-val">{vendor.purchasing.overallScore > 0 ? vendor.purchasing.overallScore.toFixed(1) : '—'}</div>
              <div className="vd-eval-overall-label">Base Score</div>
              {vendor.purchasing.overallScore > 0 && <Stars value={vendor.purchasing.overallScore} size={20} />}
            </div>
            <div className="vd-eval-bars">
              {EVAL_CRITERIA.map((c) => {
                const avgVal = vendor.evaluations.length > 0
                  ? vendor.evaluations.reduce((s, e) => s + (e[c.key] || 0), 0) / vendor.evaluations.length
                  : 0
                return <ScoreBar key={c.key} label={c.label} value={avgVal} />
              })}
            </div>
          </div>

          {/* KPI row: evaluations, complaints, years */}
          <div className="vd-eval-kpis">
            <div className="vd-eval-kpi"><span className="vd-eval-kpi-n">{vendor.evaluations.length}</span> Evaluations</div>
            <div className="vd-eval-kpi"><span className="vd-eval-kpi-n">{years.length}</span> Year{years.length !== 1 ? 's' : ''}</div>
            <div className="vd-eval-kpi"><span className="vd-eval-kpi-n" style={{ color: complaints.length > 0 ? '#e74c3c' : '#27ae60' }}>{complaints.length}</span> Complaints</div>
            <div className="vd-eval-kpi"><span className="vd-eval-kpi-n" style={{ color: openComplaints.length > 0 ? '#e74c3c' : '#27ae60' }}>{openComplaints.length}</span> Open</div>
            <div className="vd-eval-kpi"><span className="vd-eval-kpi-n" style={{ color: '#27ae60' }}>{resolvedComplaints.length}</span> Resolved</div>
          </div>
        </div>

        {/* ═══ New Evaluation Form — 8 criteria ═══ */}
        {showEvalForm && (
          <div className="vd-card">
            <h5 style={{ margin: '0 0 12px', color: '#000888' }}>Submit New Evaluation</h5>
            <div className="vd-eval-form-grid">
              {EVAL_CRITERIA.map((c) => (
                <div key={c.key} className="vd-eval-slider">
                  <label>{c.label}: <strong>{evalForm[c.key]}</strong></label>
                  <div className="vd-eval-slider-desc">{c.desc}</div>
                  <input type="range" min="1" max="5" step="0.1" value={evalForm[c.key]} onChange={(e) => setEvalForm({ ...evalForm, [c.key]: parseFloat(e.target.value) })} />
                </div>
              ))}
              <div className="vd-eval-slider full">
                <label>Evaluator</label>
                <input type="text" placeholder="Your name / department" value={evalForm.evaluator} onChange={(e) => setEvalForm({ ...evalForm, evaluator: e.target.value })} />
              </div>
              <div className="vd-eval-slider full">
                <label>Notes</label>
                <textarea placeholder="Performance notes..." value={evalForm.notes} onChange={(e) => setEvalForm({ ...evalForm, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="vd-btn primary small" onClick={() => {
                const scores = EVAL_CRITERIA.map((c) => evalForm[c.key] || 0)
                const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
                addEvaluation(vendor.id, evalForm)
                addChangeLog(vendor.id, { changedBy: evalForm.evaluator || userName, section: 'evaluations', reason: 'New evaluation submitted', changes: [{ field: 'overall', oldValue: '', newValue: avg }] })
                setShowEvalForm(false)
                setEvalForm({ quality: 5, delivery: 5, price: 5, communication: 5, technicalCapability: 5, compliance: 5, flexibility: 5, documentation: 5, evaluator: '', notes: '' })
                flash('Evaluation submitted')
              }}>Submit Evaluation</button>
              <button className="vd-btn-sm" onClick={() => setShowEvalForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ═══ Complaint Form ═══ */}
        {showComplaintForm && (
          <div className="vd-card" style={{ borderLeft: '3px solid #e74c3c' }}>
            <h5 style={{ margin: '0 0 12px', color: '#e74c3c' }}>Register Complaint / NCR</h5>
            <div className="vd-eval-form-grid">
              <div className="vd-eval-slider">
                <label>Type</label>
                <select className="vd-cmp-select" value={complaintForm.type} onChange={(e) => setComplaintForm({ ...complaintForm, type: e.target.value })}>
                  {COMPLAINT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="vd-eval-slider">
                <label>Severity</label>
                <div className="vd-cmp-severity-btns">
                  {SEVERITY_LEVELS.map((s) => (
                    <button key={s.key} className={`vd-cmp-sev-btn ${complaintForm.severity === s.key ? 'active' : ''}`} style={complaintForm.severity === s.key ? { background: s.bg, color: s.color, borderColor: s.color } : {}} onClick={() => setComplaintForm({ ...complaintForm, severity: s.key })}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div className="vd-eval-slider full">
                <label>Title *</label>
                <input type="text" placeholder="Brief description of the issue..." value={complaintForm.title} onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })} />
              </div>
              <div className="vd-eval-slider full">
                <label>Description</label>
                <textarea placeholder="Detailed description, affected batches, quantities..." value={complaintForm.description} onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })} rows={3} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="vd-btn primary small" style={{ background: '#e74c3c' }} onClick={() => {
                if (!complaintForm.title.trim()) return
                const impactMap = { minor: -0.1, major: -0.3, critical: -0.8 }
                addComplaint(vendor.id, { ...complaintForm, impactScore: impactMap[complaintForm.severity] || -0.1 })
                addChangeLog(vendor.id, { changedBy: userName, section: 'complaints', reason: `Complaint registered: ${complaintForm.title}`, changes: [{ field: 'severity', oldValue: '', newValue: complaintForm.severity }, { field: 'type', oldValue: '', newValue: complaintForm.type }] })
                setShowComplaintForm(false)
                setComplaintForm({ type: 'quality', severity: 'minor', title: '', description: '' })
                flash('Complaint registered')
              }}>Register Complaint</button>
              <button className="vd-btn-sm" onClick={() => setShowComplaintForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ═══ Complaints List ═══ */}
        {complaints.length > 0 && (
          <div className="vd-card">
            <div className="vd-card-header">
              <h4>Complaints & NCRs</h4>
              <span style={{ fontSize: 12, color: '#888' }}>{openComplaints.length} open · {resolvedComplaints.length} resolved</span>
            </div>
            <div className="vd-cmp-list">
              {complaints.map((c) => {
                const sevMeta = SEVERITY_LEVELS.find((s) => s.key === c.severity) || SEVERITY_LEVELS[0]
                const linkedEval = c.linkedEvaluationId ? vendor.evaluations.find((e) => e.id === c.linkedEvaluationId) : null
                return (
                  <div key={c.id} className={`vd-cmp-item ${c.status === 'open' ? 'vd-cmp-open' : 'vd-cmp-resolved'}`}>
                    <div className="vd-cmp-header">
                      <span className="vd-cmp-sev" style={{ color: sevMeta.color, background: sevMeta.bg }}>{sevMeta.label}</span>
                      <span className="vd-cmp-type">{c.type}</span>
                      <span className={`vd-cmp-status ${c.status}`}>{c.status === 'open' ? 'Open' : 'Resolved'}</span>
                      <span className="vd-cmp-date">{fmtDate(c.date)}</span>
                      <span className="vd-cmp-impact" title="Score impact">{c.impactScore}</span>
                    </div>
                    <div className="vd-cmp-title">{c.title}</div>
                    {c.description && <div className="vd-cmp-desc">{c.description}</div>}
                    {linkedEval && (
                      <div className="vd-cmp-linked">Linked evaluation: <Stars value={linkedEval.overall} size={12} /> by {linkedEval.evaluator} ({fmtDate(linkedEval.date)})</div>
                    )}
                    {c.status === 'resolved' && (
                      <div className="vd-cmp-resolution">
                        <strong>Resolution:</strong> {c.resolution}
                        <span className="vd-cmp-resolved-meta"> — {c.resolvedBy}, {fmtDate(c.resolvedDate)}</span>
                      </div>
                    )}
                    {c.status === 'open' && (
                      <>
                        {resolveId === c.id ? (
                          <div className="vd-cmp-resolve-form">
                            <textarea placeholder="Resolution description..." value={resolveText} onChange={(e) => setResolveText(e.target.value)} rows={2} />
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                              <button className="vd-btn-sm green" onClick={() => {
                                if (!resolveText.trim()) return
                                resolveComplaint(vendor.id, c.id, resolveText, userName)
                                addChangeLog(vendor.id, { changedBy: userName, section: 'complaints', reason: `Resolved complaint: ${c.title}`, changes: [{ field: 'status', oldValue: 'open', newValue: 'resolved' }] })
                                setResolveId(null)
                                setResolveText('')
                                flash('Complaint resolved')
                              }}>Confirm Resolution</button>
                              <button className="vd-btn-sm" onClick={() => { setResolveId(null); setResolveText('') }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button className="vd-btn-sm green" style={{ marginTop: 8 }} onClick={() => setResolveId(c.id)}>Resolve</button>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══ Yearly Evaluation Records ═══ */}
        <div className="vd-card">
          <div className="vd-card-header">
            <h4>Evaluation History — Yearly Records</h4>
            <div className="vd-eval-year-filter">
              <button className={`vd-eval-yr-btn ${evalYearFilter === 'all' ? 'active' : ''}`} onClick={() => setEvalYearFilter('all')}>All</button>
              {years.map((y) => (
                <button key={y} className={`vd-eval-yr-btn ${evalYearFilter === y ? 'active' : ''}`} onClick={() => setEvalYearFilter(y)}>{y}</button>
              ))}
            </div>
          </div>

          {vendor.evaluations.length === 0 ? (
            <div className="vd-empty-sm">No evaluations yet. Click "+ New Evaluation" to submit the first one.</div>
          ) : (
            filteredYears.map((yr) => {
              const yEvals = evalsByYear[yr]
              const yAvg = yEvals.reduce((s, e) => s + (e.overall || 0), 0) / yEvals.length
              const yComplaints = complaints.filter((c) => new Date(c.date).getFullYear().toString() === yr)
              return (
                <div key={yr} className="vd-eval-year-block">
                  <div className="vd-eval-year-header">
                    <span className="vd-eval-year-label">{yr}</span>
                    <span className="vd-eval-year-avg">Avg: <strong>{yAvg.toFixed(2)}</strong></span>
                    <Stars value={yAvg} size={14} />
                    <span className="vd-eval-year-count">{yEvals.length} evaluation{yEvals.length > 1 ? 's' : ''}</span>
                    {yComplaints.length > 0 && <span className="vd-eval-year-cmp">⚠ {yComplaints.length} complaint{yComplaints.length > 1 ? 's' : ''}</span>}
                  </div>
                  {yEvals.map((ev) => {
                    const linkedComplaints = complaints.filter((c) => c.linkedEvaluationId === ev.id)
                    return (
                      <div key={ev.id} className="vd-eval-entry">
                        <div className="vd-eval-entry-header">
                          <Stars value={ev.overall} size={14} />
                          <span className="vd-eval-entry-date">{fmtDate(ev.date)}</span>
                          <span className="vd-eval-entry-by">{ev.evaluator}</span>
                          {linkedComplaints.length > 0 && <span className="vd-eval-entry-cmp-badge">⚠ {linkedComplaints.length}</span>}
                        </div>
                        <div className="vd-eval-entry-scores">
                          {EVAL_CRITERIA.map((c) => (
                            <span key={c.key}>{c.label}: {(ev[c.key] || 0).toFixed(1)}</span>
                          ))}
                        </div>
                        {ev.notes && <div className="vd-eval-entry-notes">{ev.notes}</div>}
                        {linkedComplaints.length > 0 && (
                          <div className="vd-eval-entry-complaints">
                            {linkedComplaints.map((lc) => (
                              <span key={lc.id} className="vd-eval-linked-cmp" style={{ color: (SEVERITY_LEVELS.find((s) => s.key === lc.severity) || {}).color || '#e74c3c' }}>
                                ⚠ {lc.severity}: {lc.title} ({lc.status})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  const renderDocuments = () => (
    <div className="vd-card">
      <h4>Documents</h4>
      {vendor.documents.length === 0 ? (
        <div className="vd-empty-sm">No documents uploaded.</div>
      ) : (
        <div className="vd-doc-grid">
          {vendor.documents.map((d) => (
            <div key={d.id} className="vd-doc-card">
              <div className="vd-doc-icon">📄</div>
              <div className="vd-doc-info">
                <div className="vd-doc-name">{d.name}</div>
                <div className="vd-doc-meta">{d.type} · {d.size} · {fmtDate(d.uploadedAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderNotes = () => (
    <div className="vd-card">
      <h4>Internal Notes</h4>
      <div className="vd-note-form">
        <textarea placeholder="Add a note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} />
        <button className="vd-btn-sm blue" onClick={() => {
          if (!noteText.trim()) return
          addNote(vendor.id, userName, noteText)
          setNoteText('')
          flash('Note added')
        }}>Add Note</button>
      </div>
      <div className="vd-notes-list">
        {vendor.notes.length === 0 && <div className="vd-empty-sm">No notes yet.</div>}
        {vendor.notes.map((n) => (
          <div key={n.id} className="vd-note-item">
            <div className="vd-note-header">
              <strong>{n.author}</strong>
              <span>{fmtDate(n.date)}</span>
            </div>
            <div className="vd-note-text">{n.text}</div>
          </div>
        ))}
      </div>
    </div>
  )

  /* ── Change Log Tab ──────────────────────────────────── */
  const filteredLog = logFilter === 'all' ? changeLog : changeLog.filter((e) => e.section === logFilter)
  const logSections = [...new Set(changeLog.map((e) => e.section))].sort()

  const renderChangeLog = () => (
    <div className="vd-card">
      <div className="vd-card-header">
        <h4>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000888" strokeWidth="2" style={{ marginRight: 6, verticalAlign: -2 }}>
            <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>
          </svg>
          Change Log & Audit Trail
        </h4>
        <span className="vd-log-count">{changeLog.length} record{changeLog.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filter bar */}
      {changeLog.length > 0 && (
        <div className="vd-log-filters">
          <button className={`vd-log-filter ${logFilter === 'all' ? 'active' : ''}`} onClick={() => setLogFilter('all')}>All</button>
          {logSections.map((s) => (
            <button key={s} className={`vd-log-filter ${logFilter === s ? 'active' : ''}`} onClick={() => setLogFilter(s)}>
              {SECTION_LABELS[s] || s}
            </button>
          ))}
        </div>
      )}

      {filteredLog.length === 0 ? (
        <div className="vd-empty-sm">No changes recorded yet.</div>
      ) : (
        <div className="vd-log-list">
          {filteredLog.map((entry) => (
            <div key={entry.id} className="vd-log-entry">
              <div className="vd-log-entry-header">
                <div className="vd-log-entry-left">
                  <span className="vd-log-section-badge">{SECTION_LABELS[entry.section] || entry.section}</span>
                  <span className="vd-log-entry-date">{fmtDateTime(entry.date)}</span>
                </div>
                <div className="vd-log-entry-user">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {entry.changedBy}
                </div>
              </div>

              {entry.reason && (
                <div className="vd-log-reason">
                  <strong>Reason:</strong> {entry.reason}
                </div>
              )}

              {entry.changes && entry.changes.length > 0 && (
                <div className="vd-log-changes">
                  <table className="vd-log-table">
                    <thead>
                      <tr><th>Field</th><th>Previous Value</th><th>New Value</th></tr>
                    </thead>
                    <tbody>
                      {entry.changes.map((ch, i) => (
                        <tr key={i}>
                          <td className="vd-log-field">{ch.field}</td>
                          <td className="vd-log-old">{ch.oldValue || <span className="vd-log-empty">—</span>}</td>
                          <td className="vd-log-new">{ch.newValue || <span className="vd-log-empty">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const TABS = [
    { id: 'general', label: 'General Data' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'banking', label: 'Banking & Terms' },
    { id: 'connections', label: 'Connections' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'evaluations', label: 'Evaluation' },
    { id: 'documents', label: 'Documents' },
    { id: 'notes', label: 'Notes' },
    { id: 'changelog', label: 'Change Log' },
  ]

  return (
    <AppLayout>
      <div className="vd-page">
        {feedback && <div className={`vd-feedback ${feedback.type}`}>{feedback.text}</div>}

        {/* Change reason modal */}
        {changeReasonModal && (
          <div className="vd-modal-overlay" onClick={() => setChangeReasonModal(null)}>
            <div className="vd-modal-reason" onClick={(e) => e.stopPropagation()}>
              <h4>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000888" strokeWidth="2" style={{ marginRight: 6, verticalAlign: -2 }}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Save Changes — {changeReasonModal.section}
              </h4>
              <p className="vd-modal-desc">Please provide a reason for this change. This will be recorded in the vendor&apos;s audit trail.</p>
              <textarea
                className="vd-modal-textarea"
                placeholder="e.g. Updated bank details per vendor notification, New address after relocation..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="vd-modal-actions">
                <button className="vd-btn primary small" onClick={confirmChange}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                  Confirm & Save
                </button>
                <button className="vd-btn-sm" style={{ background: '#f5f5f5', color: '#888' }} onClick={() => setChangeReasonModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <button className="vd-back" onClick={() => navigate(-1)}>← Back to Vendors</button>

        {/* Vendor header */}
        <div className="vd-header">
          <div className="vd-header-left">
            <div className="vd-vendor-number">{vendor.vendorNumber}</div>
            <h1 className="vd-vendor-name">{g.companyName}</h1>
            <div className="vd-vendor-meta">
              {g.country} · {g.currency} · {(g.industry || []).join(', ')}
              {primary && <span> · {primary.name} ({primary.email})</span>}
            </div>
          </div>
          <div className="vd-header-right">
            <span className="vd-status-badge" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span>
            <div className="vd-header-actions">
              {vendor.status === 'pending_approval' && <button className="vd-btn primary small" onClick={() => { approveVendor(vendor.id); flash('Vendor approved') }}>Approve</button>}
              {vendor.status === 'active' && <button className="vd-btn-sm red" onClick={() => { blockVendor(vendor.id, 'Blocked by admin'); flash('Vendor blocked') }}>Block</button>}
              {vendor.status === 'blocked' && <button className="vd-btn-sm green" onClick={() => { setVendorStatus(vendor.id, 'active', 'Reactivated'); flash('Vendor reactivated') }}>Reactivate</button>}
              {vendor.status !== 'archived' && <button className="vd-btn-sm" style={{ background: '#f5f5f5', color: '#888' }} onClick={() => { archiveVendor(vendor.id); flash('Vendor archived') }}>Archive</button>}
            </div>
          </div>
        </div>

        {/* Quick info bar */}
        <div className="vd-quick-bar">
          <div className="vd-quick-item"><span>Created</span><strong>{fmtDate(vendor.createdAt)}</strong></div>
          <div className="vd-quick-item"><span>Last Updated</span><strong>{fmtDate(vendor.updatedAt)}</strong></div>
          <div className="vd-quick-item"><span>Score</span><strong>{vendor.purchasing.overallScore > 0 ? <Stars value={vendor.purchasing.overallScore} size={14} /> : '—'}</strong></div>
          <div className="vd-quick-item"><span>Connections</span><strong>{vendor.connections.length}</strong></div>
          <div className="vd-quick-item"><span>Certifications</span><strong>{vendor.certifications.length}</strong></div>
          <div className="vd-quick-item"><span>Payment Terms</span><strong>{vendor.purchasing.paymentTerms}</strong></div>
          <div className="vd-quick-item"><span>Changes</span><strong>{changeLog.length}</strong></div>
        </div>

        {/* Tabs */}
        <div className="vd-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`vd-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.id === 'changelog' && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 2 }}>
                  <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>
                </svg>
              )}
              {t.label}
              {t.id === 'connections' && vendor.connections.length > 0 && <span className="vd-tab-count">{vendor.connections.length}</span>}
              {t.id === 'evaluations' && (vendor.complaints || []).filter((c) => c.status === 'open').length > 0 && <span className="vd-tab-count" style={{ background: 'rgba(231,76,60,.1)', color: '#e74c3c' }}>⚠ {(vendor.complaints || []).filter((c) => c.status === 'open').length}</span>}
              {t.id === 'notes' && vendor.notes.length > 0 && <span className="vd-tab-count">{vendor.notes.length}</span>}
              {t.id === 'changelog' && changeLog.length > 0 && <span className="vd-tab-count changelog">{changeLog.length}</span>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'general' && renderGeneral()}
        {tab === 'contacts' && renderContacts()}
        {tab === 'banking' && renderBanking()}
        {tab === 'connections' && renderConnections()}
        {tab === 'certifications' && renderCertifications()}
        {tab === 'evaluations' && renderEvaluations()}
        {tab === 'documents' && renderDocuments()}
        {tab === 'notes' && renderNotes()}
        {tab === 'changelog' && renderChangeLog()}
      </div>
    </AppLayout>
  )
}
