import SupplierScoreBadge from './SupplierScoreBadge'

export default function SupplierCard({ supplier, onSelect, onShortlist }) {
  if (!supplier) return null
  const completeness = Number(supplier.profile_completeness || 0)
  const boosted = completeness >= 80
  return (
    <div
      style={{
        border: boosted ? '1px solid #86efac' : '1px solid #e4e7ec',
        background: boosted ? '#f0fdf4' : '#fff',
        borderRadius: 10,
        padding: 12,
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700 }}>{supplier.display_name || supplier.displayName || supplier.legal_name || 'Supplier'}</div>
          <div style={{ fontSize: 12, color: '#475467' }}>
            {supplier.country || 'Unknown country'} · {supplier.industry || 'General'}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: '#166534' }}>
            Profile completeness: {completeness}%
          </div>
        </div>
        <SupplierScoreBadge score={supplier.overall_score || supplier.overallScore || 0} risk={supplier.risk_score || supplier.riskScore || 0} />
      </div>
      {supplier.description && (
        <div style={{ color: '#344054', fontSize: 13 }}>{supplier.description}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="app-page-btn-outline" onClick={() => onSelect?.(supplier)}>
          View
        </button>
        <button type="button" className="app-page-btn-primary" onClick={() => onShortlist?.(supplier)}>
          Shortlist
        </button>
      </div>
    </div>
  )
}
