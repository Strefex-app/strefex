import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import SearchFiltersPanel from '../components/SearchFiltersPanel'
import SupplierCard from '../components/SupplierCard'
import SupplierComparisonTable from '../components/SupplierComparisonTable'
import RFQBuilder from '../components/RFQBuilder'
import industrialIntelligenceService from '../services/industrialIntelligenceService'

export default function BuyerWorkspace() {
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const [filters, setFilters] = useState({
    query: '',
    country: '',
    industry: '',
    process: '',
    certification: '',
    minAuditScore: '',
    maxRiskScore: '',
    sortBy: 'score',
    page: 1,
    pageSize: 20,
  })
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState([])
  const [shortlisted, setShortlisted] = useState([])
  const [selectedForCompare, setSelectedForCompare] = useState([])
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [trackingRows, setTrackingRows] = useState([])
  const [recommended, setRecommended] = useState([])
  const [notifications, setNotifications] = useState([])

  const loadSuppliers = async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await industrialIntelligenceService.searchSuppliers(filters)
      setSuppliers(rows)
      void industrialIntelligenceService.trackEvent('search_query', 'supplier_search', null, {
        ...filters,
      }).catch(() => {})
      const rec = await industrialIntelligenceService.getRecommendedSuppliers(filters, 6).catch(() => [])
      setRecommended(rec)
    } catch (err) {
      setError(err?.message || 'Failed to load suppliers.')
    } finally {
      setLoading(false)
    }
  }

  const loadShortlists = async () => {
    const rows = await industrialIntelligenceService.listShortlistedSuppliers().catch(() => [])
    setShortlisted(rows)
  }

  const loadTracking = async () => {
    const rows = await industrialIntelligenceService.listBuyerRfqTracking().catch(() => [])
    setTrackingRows(rows)
  }

  const loadRecommended = async () => {
    const rows = await industrialIntelligenceService.getRecommendedSuppliers(filters, 6).catch(() => [])
    setRecommended(rows)
  }

  const loadNotifications = async () => {
    const rows = await industrialIntelligenceService.listMyInAppNotifications(20).catch(() => [])
    setNotifications(rows)
  }

  useEffect(() => {
    void loadSuppliers()
    void loadShortlists()
    void loadTracking()
    void loadRecommended()
    void loadNotifications()
  }, [])

  const addCompare = (supplier) => {
    void industrialIntelligenceService.trackEvent(
      'supplier_view',
      'supplier',
      supplier.supplier_id || supplier.id,
      { from: 'buyer_workspace_compare' }
    ).catch(() => {})
    setSelectedForCompare((prev) => {
      const id = supplier.supplier_id || supplier.id
      if (prev.some((p) => (p.supplier_id || p.id) === id)) return prev
      return [...prev, supplier]
    })
  }

  const handleShortlist = async (supplier) => {
    const supplierId = supplier.supplier_id || supplier.id
    if (!supplierId) return
    setError('')
    try {
      await industrialIntelligenceService.shortlistSupplier({ supplierId })
      setFeedback('Supplier shortlisted.')
      await loadShortlists()
    } catch (err) {
      setError(err?.message || 'Failed to shortlist supplier.')
    }
  }

  const shortlistedAsSuppliers = useMemo(() => {
    return shortlisted.map((s) => ({
      id: s.id,
      supplier_id: s.supplier_id,
      name: s.supplier_id,
    }))
  }, [shortlisted])

  const createRfq = async (payload) => {
    setError('')
    try {
      await industrialIntelligenceService.createRfq(payload)
      setFeedback('RFQ created and invitations sent.')
      void loadShortlists()
      void loadTracking()
      void loadNotifications()
    } catch (err) {
      setError(err?.message || 'Failed to create RFQ.')
    }
  }

  return (
    <AppLayout>
      <div className="app-page" style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div className="app-page-card">
          <h2 className="app-page-title">Buyer Workspace</h2>
          <p className="app-page-subtitle">Search, shortlist, compare, and send RFQs at enterprise scale.</p>
          {feedback && <p style={{ color: '#067647' }}>{feedback}</p>}
          {error && <p style={{ color: '#b42318' }}>{error}</p>}
        </div>

        {isSuperAdmin && (
          <div
            className="app-page-card"
            style={{
              border: '1px solid rgba(0,8,136,.2)',
              background: 'linear-gradient(135deg, rgba(0,8,136,.06) 0%, rgba(0,8,136,.02) 100%)',
            }}
          >
            <h3 className="app-page-title" style={{ fontSize: 18 }}>Buyer directory (superadmin)</h3>
            <p className="app-page-subtitle" style={{ marginBottom: 12 }}>
              Imported plastic & stamping company contacts — confidential, platform use only. Not visible to buyers or other roles.
            </p>
            <Link to="/dashboard/buyer/platform-directory" className="app-page-btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Open buyer directory
            </Link>
          </div>
        )}

        <div className="app-page-card">
          <SearchFiltersPanel filters={filters} onChange={setFilters} onApply={loadSuppliers} />
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Recommended Suppliers</h3>
          {recommended.length === 0 ? (
            <p className="app-page-subtitle">No recommendations yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 10 }}>
              {recommended.map((supplier) => (
                <SupplierCard
                  key={`rec-${supplier.supplier_id}`}
                  supplier={supplier}
                  onSelect={addCompare}
                  onShortlist={handleShortlist}
                />
              ))}
            </div>
          )}
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Supplier Search Results</h3>
          {loading ? (
            <p className="app-page-subtitle">Loading suppliers...</p>
          ) : suppliers.length === 0 ? (
            <p className="app-page-subtitle">No suppliers matched your filters.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 10 }}>
              {suppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.supplier_id}
                  supplier={supplier}
                  onSelect={addCompare}
                  onShortlist={handleShortlist}
                />
              ))}
            </div>
          )}
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Supplier Comparison</h3>
          <SupplierComparisonTable rows={selectedForCompare} />
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>RFQ Builder</h3>
          <RFQBuilder shortlisted={shortlistedAsSuppliers} onSubmit={createRfq} />
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>RFQ Tracking</h3>
          {trackingRows.length === 0 ? (
            <p className="app-page-subtitle">No RFQs created yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #e4e7ec', padding: 8 }}>RFQ</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #e4e7ec', padding: 8 }}>Deadline</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #e4e7ec', padding: 8 }}>Invited</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #e4e7ec', padding: 8 }}>Viewed</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #e4e7ec', padding: 8 }}>Responded</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #e4e7ec', padding: 8 }}>Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingRows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{row.title}</td>
                      <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{row.deadline || '—'}</td>
                      <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{row.invited_count || 0}</td>
                      <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{row.viewed_count || 0}</td>
                      <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{row.responded_count || 0}</td>
                      <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{row.closed_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
