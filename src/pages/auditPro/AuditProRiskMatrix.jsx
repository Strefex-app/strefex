import { useMemo } from 'react'
import useAuditProStore from '../../store/auditProStore'
import {
  filterAuditProAuditsForVisibility,
  filterAuditProSuppliersForVisibility,
} from '../../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import { Card, Tag } from './auditProUi'

export default function AuditProRiskMatrix() {
  const auditsAll = useAuditProStore((s) => s.audits)
  const suppliersAll = useAuditProStore((s) => s.suppliers)
  const auditors = useAuditProStore((s) => s.auditors)
  const demoKitShown = useAuditProDemoKitVisible()
  const audits = useMemo(
    () => filterAuditProAuditsForVisibility(auditsAll, auditors, suppliersAll, demoKitShown),
    [auditsAll, auditors, suppliersAll, demoKitShown],
  )
  const suppliers = useMemo(
    () => filterAuditProSuppliersForVisibility(suppliersAll, demoKitShown),
    [suppliersAll, demoKitShown],
  )

  const data = suppliers
    .map((s) => {
      const sa = audits.filter((a) => a.supplierId === s.id && a.status === 'Completed')
      const last = [...sa].sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate))[0]
      const maj = sa.reduce((n, a) => n + (a.findings?.filter((f) => f.type === 'Major NC').length || 0), 0)
      const min = sa.reduce((n, a) => n + (a.findings?.filter((f) => f.type === 'Minor NC').length || 0), 0)
      const open = sa.reduce((n, a) => n + (a.findings?.filter((f) => f.status === 'Open').length || 0), 0)
      const days = last ? Math.floor((new Date() - new Date(last.completedDate)) / 86400000) : 9999
      const L = Math.min(5, Math.ceil((maj * 2 + min + open * 1.5) / 2) + 1)
      const I = Math.min(5, Math.ceil((maj * 3 + min) / 3) + 1)
      return { ...s, L, I, score: L * I, maj, min, open, days, lastDate: last?.completedDate || null }
    })
    .sort((a, b) => b.score - a.score)

  const rc = (s2) => (s2 >= 16 ? '#EF4444' : s2 >= 9 ? '#F59E0B' : s2 >= 4 ? '#3B82F6' : '#10B981')
  const rl = (s2) => (s2 >= 16 ? 'CRITICAL' : s2 >= 9 ? 'HIGH' : s2 >= 4 ? 'MEDIUM' : 'LOW')

  return (
    <div>
      <Card title="Supplier Risk Matrix — Auto-Calculated from Audit History" icon="◧" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: 'var(--ap-muted)', marginBottom: 12 }} className="stx-text-wrap">
          Risk Score = Likelihood × Impact. Drivers: Major NCs (×3), Minor NCs (×1), Open Findings (×1.5).
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { l: 'LOW (1-3)', c: '#10B981' },
            { l: 'MEDIUM (4-8)', c: '#3B82F6' },
            { l: 'HIGH (9-15)', c: '#F59E0B' },
            { l: 'CRITICAL (16-25)', c: '#EF4444' },
          ].map((r) => (
            <div key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B7280' }}>
              <div style={{ width: 11, height: 11, background: r.c, borderRadius: 2 }} />
              {r.l}
            </div>
          ))}
        </div>
      </Card>
      <div style={{ background: 'var(--ap-panel)', border: '1px solid var(--ap-border)', borderRadius: 11, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--ap-panel-3)' }}>
              {['Supplier', 'Industry', 'Risk Level', 'Score', 'L', 'I', 'Major NCs', 'Minor NCs', 'Open', 'Last Audit', 'Days Since'].map((h) => (
                <th key={h} style={{ padding: '9px 11px', textAlign: 'left', fontSize: 10, color: 'var(--ap-muted)', fontWeight: 700, letterSpacing: '.05em', borderBottom: '1px solid var(--ap-border)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id} className="ap-hovrow" style={{ borderBottom: '1px solid #0F1A2E' }}>
                <td style={{ padding: '9px 11px', fontSize: 12, color: 'var(--ap-text)', fontWeight: 500 }} className="stx-text-wrap">
                  {s.name}
                </td>
                <td style={{ padding: '9px 11px' }}>
                  <Tag color="#3B82F6" small>
                    {s.industry || '—'}
                  </Tag>
                </td>
                <td style={{ padding: '9px 11px' }}>
                  <span
                    style={{
                      background: `${rc(s.score)}20`,
                      color: rc(s.score),
                      border: `1px solid ${rc(s.score)}45`,
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {rl(s.score)}
                  </span>
                </td>
                <td style={{ padding: '9px 11px', fontSize: 14, fontWeight: 700, color: rc(s.score) }}>{s.score}</td>
                <td style={{ padding: '9px 11px', fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>{s.L}/5</td>
                <td style={{ padding: '9px 11px', fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>{s.I}/5</td>
                <td style={{ padding: '9px 11px', fontSize: 12, fontWeight: 700, color: s.maj > 0 ? '#F87171' : '#374151', textAlign: 'center' }}>{s.maj}</td>
                <td style={{ padding: '9px 11px', fontSize: 12, fontWeight: 700, color: s.min > 0 ? '#FCD34D' : '#374151', textAlign: 'center' }}>{s.min}</td>
                <td style={{ padding: '9px 11px', fontSize: 12, fontWeight: 700, color: s.open > 0 ? '#F87171' : '#374151', textAlign: 'center' }}>{s.open}</td>
                <td style={{ padding: '9px 11px', fontSize: 11, color: '#4B5563' }}>{s.lastDate || 'Never'}</td>
                <td style={{ padding: '9px 11px', fontSize: 12, fontWeight: 600, color: s.days > 365 ? '#F87171' : s.days > 180 ? '#FCD34D' : '#34D399' }}>{s.days === 9999 ? '—' : `${s.days}d`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.length && (
          <div style={{ padding: 20, textAlign: 'center', color: '#374151', fontSize: 11 }}>Register suppliers and complete audits to generate risk data.</div>
        )}
      </div>
    </div>
  )
}
