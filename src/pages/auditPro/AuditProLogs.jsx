import { useMemo, useState } from 'react'
import useAuditProStore from '../../store/auditProStore'
import { auditTouchesDemoParticipants } from '../../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'

export default function AuditProLogs() {
  const auditLogs = useAuditProStore((s) => s.auditLogs)
  const auditsAll = useAuditProStore((s) => s.audits)
  const auditors = useAuditProStore((s) => s.auditors)
  const suppliers = useAuditProStore((s) => s.suppliers)
  const demoKitShown = useAuditProDemoKitVisible()
  const [filter, setFilter] = useState('')
  const sorted = [...auditLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  const filtered = sorted.filter(
    (l) =>
      !filter ||
      l.action.toLowerCase().includes(filter.toLowerCase()) ||
      l.user.toLowerCase().includes(filter.toLowerCase()) ||
      String(l.detail).toLowerCase().includes(filter.toLowerCase()),
  )
  const filteredLogs = useMemo(() => {
    if (demoKitShown) return filtered
    return filtered.filter((l) => {
      const aud = auditsAll.find((a) => a.id === l.auditId)
      if (!aud) return true
      return !auditTouchesDemoParticipants(aud, auditors, suppliers)
    })
  }, [filtered, demoKitShown, auditsAll, auditors, suppliers])
  const ac = {
    'Audit Created': 'var(--accent)',
    'Audit Started': 'var(--badge-warning-text)',
    'Audit Completed': 'var(--badge-success-text)',
    'Finding Added': 'var(--danger)',
    'Finding Updated': 'var(--badge-warning-text)',
    'Status Changed': 'var(--color-secondary)',
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search logs…" className="ap-input" style={{ width: 280 }} />
      </div>
      <div style={{ background: 'var(--ap-panel)', border: '1px solid var(--ap-border)', borderRadius: 11, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--ap-panel-3)' }}>
              {['Timestamp', 'Standard', 'Action', 'User', 'Detail'].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 'var(--text-caption)', color: 'var(--ap-muted)', fontWeight: 'var(--font-semibold)', letterSpacing: '.05em', borderBottom: '1px solid var(--ap-border)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((l) => {
              const aud = auditsAll.find((a) => a.id === l.auditId)
              return (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 'var(--text-caption)', color: 'var(--color-secondary)', fontFamily: 'var(--font-sans)' }}>
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }} className="stx-text-wrap">
                    {aud?.standard || '—'}
                    <br />
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-secondary)' }}>{aud?.title?.slice(0, 28) || l.auditId}</span>
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontSize: 'var(--text-caption)', fontWeight: 'var(--font-semibold)', color: ac[l.action] || 'var(--color-muted)', background: `color-mix(in srgb, ${ac[l.action] || 'var(--color-secondary)'} 16%, transparent)`, padding: '2px 7px', borderRadius: 5 }}>{l.action}</span>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>{l.user}</td>
                  <td style={{ padding: '9px 12px', fontSize: 'var(--text-caption)', color: 'var(--color-secondary)' }} className="stx-text-wrap">
                    {l.detail}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!filteredLogs.length && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-secondary)', fontSize: 'var(--text-caption)' }}>No logs.</div>
        )}
      </div>
    </div>
  )
}
