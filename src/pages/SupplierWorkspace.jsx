import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import RFQResponseForm from '../components/RFQResponseForm'
import industrialIntelligenceService from '../services/industrialIntelligenceService'
import supplierOwnershipService from '../services/supplierOwnershipService'
import { useAuthStore } from '../store/authStore'
import '../styles/app-page.css'

function getAuthSnapshot() {
  try {
    return JSON.parse(localStorage.getItem('strefex-auth') || '{}')
  } catch {
    return {}
  }
}

export default function SupplierWorkspace() {
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const [memberships, setMemberships] = useState([])
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [rfqLinks, setRfqLinks] = useState([])
  const [rfqMap, setRfqMap] = useState({})
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState([])

  const load = async () => {
    setError('')
    const myMemberships = await supplierOwnershipService.listMyMemberships().catch(() => [])
    setMemberships(myMemberships || [])
    const firstSupplier = selectedSupplier || myMemberships?.[0]?.supplier_id || ''
    setSelectedSupplier(firstSupplier)
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    const run = async () => {
      if (!selectedSupplier) {
        setRfqLinks([])
        setRfqMap({})
        return
      }
      try {
        const data = await industrialIntelligenceService.listSupplierRfqInvitesByVendor(selectedSupplier)
        setRfqLinks(data?.invites || [])
        const map = {}
        ;(data?.rfqs || []).forEach((r) => {
          map[r.id] = r
        })
        setRfqMap(map)
        for (const invite of (data?.invites || [])) {
          if (invite.status === 'invited') {
            void industrialIntelligenceService
              .markRfqViewed({ rfqId: invite.rfq_id, supplierId: invite.supplier_id })
              .catch(() => {})
          }
        }
        const n = await industrialIntelligenceService.listMyInAppNotifications(20).catch(() => [])
        setNotifications(n)
      } catch {
        // no-op
      }
    }
    void run()
  }, [selectedSupplier])

  const submitResponse = async (payload) => {
    setError('')
    setFeedback('')
    try {
      await industrialIntelligenceService.respondToRfq(payload)
      setFeedback('RFQ response submitted.')
      const data = await industrialIntelligenceService.listSupplierRfqInvitesByVendor(selectedSupplier).catch(() => null)
      if (data?.invites) setRfqLinks(data.invites)
      const n = await industrialIntelligenceService.listMyInAppNotifications(20).catch(() => [])
      setNotifications(n)
    } catch (err) {
      setError(err?.message || 'Failed to submit RFQ response.')
    }
  }

  const userEmail = getAuthSnapshot()?.user?.email || ''

  return (
    <AppLayout>
      <div className="app-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="app-page-card">
          <h2 className="app-page-title">Supplier Workspace</h2>
          <p className="app-page-subtitle">Manage profile, products, certifications, and RFQ responses.</p>
          {feedback && <p className="app-page-alert app-page-alert--success">{feedback}</p>}
          {error && <p className="app-page-alert app-page-alert--error">{error}</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontWeight: 700 }}>Supplier membership</label>
            <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
              {memberships.length === 0 && <option value="">No supplier membership</option>}
              {memberships.map((m) => (
                <option key={m.id || `${m.supplier_id}-${m.user_id}`} value={m.supplier_id}>
                  {m.supplier_id} · {m.role}
                </option>
              ))}
            </select>
          </div>
          {memberships.length === 0 && isSuperAdmin && (
            <div className="app-page-callout" style={{ marginTop: 16, padding: 16 }}>
              <p className="app-page-body" style={{ margin: 0, fontSize: 14 }}>
                Superadmin: open the dashboard with a supplier UUID from <strong>Vendors</strong> / Supabase{' '}
                <code style={{ fontSize: 12 }}>vendors.id</code> or complete a supplier claim so this user has membership.
              </p>
              <Link to="/vendors" className="app-page-btn-primary" style={{ marginTop: 12 }}>
                Go to vendors
              </Link>
            </div>
          )}
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Supplier Profile Management</h3>
          <p className="app-page-subtitle">
            Use the dedicated supplier profile dashboard to manage editable data and certification submissions.
          </p>
          <Link
            className="app-page-btn-primary"
            to={`/supplier-dashboard?supplierId=${encodeURIComponent(selectedSupplier || '')}`}
          >
            Open Supplier Dashboard
          </Link>
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>RFQ Responses</h3>
          {rfqLinks.length === 0 ? (
            <p className="app-page-subtitle">
              No linked RFQs found in this workspace for {userEmail || 'current user'}.
            </p>
          ) : (
            rfqLinks.map((link) => (
              <div key={link.id} style={{ border: '1px solid #e4e7ec', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#475467' }}>Status: {link.status}</span>
                  {link.status !== 'closed' && (
                    <button
                      type="button"
                      className="app-page-btn-outline"
                      onClick={() => {
                        void industrialIntelligenceService.closeRfqForSupplier({
                          rfqId: link.rfq_id,
                          supplierId: link.supplier_id,
                        }).then(async () => {
                          setFeedback('RFQ marked as closed.')
                          const data = await industrialIntelligenceService.listSupplierRfqInvitesByVendor(selectedSupplier).catch(() => null)
                          if (data?.invites) setRfqLinks(data.invites)
                        }).catch(() => {
                          setError('Failed to close RFQ.')
                        })
                      }}
                    >
                      Close
                    </button>
                  )}
                </div>
                <RFQResponseForm
                  rfq={rfqMap[link.rfq_id] || { id: link.rfq_id, title: `RFQ ${link.rfq_id}` }}
                  supplierId={link.supplier_id}
                  onSubmit={submitResponse}
                />
              </div>
            ))
          )}
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>In-App Notifications</h3>
          {notifications.length === 0 ? (
            <p className="app-page-subtitle">No notifications.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {notifications.map((n) => (
                <div key={n.id} style={{ border: '1px solid #e4e7ec', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontWeight: 700 }}>{n.title || n.type || 'Notification'}</div>
                  <div style={{ color: '#475467', fontSize: 13 }}>{n.message || ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
