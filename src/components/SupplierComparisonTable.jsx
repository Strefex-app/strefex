import SupplierScoreBadge from './SupplierScoreBadge'

export default function SupplierComparisonTable({ rows = [] }) {
  if (!rows.length) {
    return <div style={{ color: '#667085' }}>Select suppliers to compare.</div>
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e4e7ec', padding: 8 }}>Supplier</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e4e7ec', padding: 8 }}>Certifications</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e4e7ec', padding: 8 }}>Capabilities</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e4e7ec', padding: 8 }}>Audit</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e4e7ec', padding: 8 }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id || r.supplier_id}>
              <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{r.display_name || r.name || 'Supplier'}</td>
              <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{r.certificationsText || '—'}</td>
              <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{r.capabilitiesText || '—'}</td>
              <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>{r.auditText || '—'}</td>
              <td style={{ borderBottom: '1px solid #f2f4f7', padding: 8 }}>
                <SupplierScoreBadge score={r.overall_score || 0} risk={r.risk_score || 0} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
