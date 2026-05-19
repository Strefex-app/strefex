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
    'Audit Created': '#3B82F6',
    'Audit Started': '#F59E0B',
    'Audit Completed': '#10B981',
    'Finding Added': '#EF4444',
    'Finding Updated': '#F59E0B',
    'Status Changed': '#8B5CF6',
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
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: 'var(--ap-muted)', fontWeight: 700, letterSpacing: '.05em', borderBottom: '1px solid var(--ap-border)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((l) => {
              const aud = auditsAll.find((a) => a.id === l.auditId)
              return (
                <tr key={l.id} style={{ borderBottom: '1px solid #0A1015' }}>
                  <td style={{ padding: '9px 12px', fontSize: 10, color: '#374151', fontFamily: 'IBM Plex Mono, ui-monospace, monospace' }}>
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: '#94A3B8' }} className="stx-text-wrap">
                    {aud?.standard || '—'}
                    <br />
                    <span style={{ fontSize: 9, color: '#374151' }}>{aud?.title?.slice(0, 28) || l.auditId}</span>
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: ac[l.action] || '#94A3B8', background: `${ac[l.action] || '#374151'}18`, padding: '2px 7px', borderRadius: 5 }}>{l.action}</span>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: '#94A3B8' }}>{l.user}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: '#4B5563' }} className="stx-text-wrap">
                    {l.detail}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!filteredLogs.length && (
          <div style={{ padding: 20, textAlign: 'center', color: '#374151', fontSize: 11 }}>No logs.</div>
        )}
      </div>
    </div>
  )
}
