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

  const rc = (s2) => (s2 >= 16 ? 'var(--danger)' : s2 >= 9 ? 'var(--badge-warning-text)' : s2 >= 4 ? 'var(--accent)' : 'var(--badge-success-text)')
  const rl = (s2) => (s2 >= 16 ? 'CRITICAL' : s2 >= 9 ? 'HIGH' : s2 >= 4 ? 'MEDIUM' : 'LOW')

  return (
    <div>
      <Card title="Supplier Risk Matrix — Auto-Calculated from Audit History" icon="◧" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 'var(--text-caption)', color: 'var(--ap-muted)', marginBottom: 12 }} className="stx-text-wrap">
          Risk Score = Likelihood × Impact. Drivers: Major NCs (×3), Minor NCs (×1), Open Findings (×1.5).
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { l: 'LOW (1-3)', c: 'var(--badge-success-text)' },
            { l: 'MEDIUM (4-8)', c: 'var(--accent)' },
            { l: 'HIGH (9-15)', c: 'var(--badge-warning-text)' },
            { l: 'CRITICAL (16-25)', c: 'var(--danger)' },
          ].map((r) => (
            <div key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>
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
                <th key={h} style={{ padding: '9px 11px', textAlign: 'left', fontSize: 'var(--text-caption)', color: 'var(--ap-muted)', fontWeight: 'var(--font-semibold)', letterSpacing: '.05em', borderBottom: '1px solid var(--ap-border)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id} className="ap-hovrow" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '9px 11px', fontSize: 'var(--text-small)', color: 'var(--ap-text)', fontWeight: 'var(--font-medium)' }} className="stx-text-wrap">
                  {s.name}
                </td>
                <td style={{ padding: '9px 11px' }}>
                  <Tag color="var(--accent)" small>
                    {s.industry || '—'}
                  </Tag>
                </td>
                <td style={{ padding: '9px 11px' }}>
                  <span
                    style={{
                      background: `color-mix(in srgb, ${rc(s.score)} 18%, transparent)`,
                      color: rc(s.score),
                      border: `1px solid color-mix(in srgb, ${rc(s.score)} 42%, transparent)`,
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--font-semibold)',
                    }}
                  >
                    {rl(s.score)}
                  </span>
                </td>
                <td style={{ padding: '9px 11px', fontSize: 'var(--text-body)', fontWeight: 'var(--font-semibold)', color: rc(s.score) }}>{s.score}</td>
                <td style={{ padding: '9px 11px', fontSize: 'var(--text-caption)', color: 'var(--color-muted)', textAlign: 'center' }}>{s.L}/5</td>
                <td style={{ padding: '9px 11px', fontSize: 'var(--text-caption)', color: 'var(--color-muted)', textAlign: 'center' }}>{s.I}/5</td>
                <td style={{ padding: '9px 11px', fontSize: 'var(--text-small)', fontWeight: 'var(--font-semibold)', color: s.maj > 0 ? 'var(--danger-text)' : 'var(--color-secondary)', textAlign: 'center' }}>{s.maj}</td>
                <td style={{ padding: '9px 11px', fontSize: 'var(--text-small)', fontWeight: 'var(--font-semibold)', color: s.min > 0 ? 'var(--badge-warning-text)' : 'var(--color-secondary)', textAlign: 'center' }}>{s.min}</td>
                <td style={{ padding: '9px 11px', fontSize: 'var(--text-small)', fontWeight: 'var(--font-semibold)', color: s.open > 0 ? 'var(--danger-text)' : 'var(--color-secondary)', textAlign: 'center' }}>{s.open}</td>
                <td style={{ padding: '9px 11px', fontSize: 'var(--text-caption)', color: 'var(--color-secondary)' }}>{s.lastDate || 'Never'}</td>
                <td style={{ padding: '9px 11px', fontSize: 'var(--text-small)', fontWeight: 'var(--font-semibold)', color: s.days > 365 ? 'var(--danger-text)' : s.days > 180 ? 'var(--badge-warning-text)' : 'var(--badge-success-text)' }}>{s.days === 9999 ? '—' : `${s.days}d`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.length && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-secondary)', fontSize: 'var(--text-caption)' }}>Register suppliers and complete audits to generate risk data.</div>
        )}
      </div>
    </div>
  )
}
