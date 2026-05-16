import { useNavigate } from 'react-router-dom'
import useAuditProStore from '../../store/auditProStore'
import { Card, Tag, FINDING_TYPES, Btn } from './auditProUi'

export default function AuditProReports() {
  const navigate = useNavigate()
  const audits = useAuditProStore((s) => s.audits)
  const suppliers = useAuditProStore((s) => s.suppliers)

  const totalF = audits.reduce((s, a) => s + (a.findings?.length || 0), 0)
  const maj = audits.reduce((s, a) => s + (a.findings?.filter((f) => f.type === 'Major NC').length || 0), 0)
  const min = audits.reduce((s, a) => s + (a.findings?.filter((f) => f.type === 'Minor NC').length || 0), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 13, marginBottom: 20 }}>
        {[
          { l: 'Completed', v: audits.filter((a) => a.status === 'Completed').length, c: '#10B981' },
          { l: 'Total Findings', v: totalF, c: '#F59E0B' },
          { l: 'Major NCs', v: maj, c: '#EF4444' },
          { l: 'Minor NCs', v: min, c: '#F59E0B' },
        ].map((s) => (
          <div key={s.l} style={{ background: 'var(--ap-panel)', border: `1px solid ${s.c}25`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, color: 'var(--ap-muted)', marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <Card title="Open findings / follow-ups" icon="⚠" style={{ marginBottom: 16 }}>
        <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginBottom: 12 }}>
          Completed audits stay open for CAPA tracking. From here you can jump to Conduct → Findings to add closure notes or new follow-up entries.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {audits
            .filter((a) => a.status === 'Completed' && (a.findings || []).some((f) => f.status === 'Open'))
            .slice(0, 12)
            .map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--ap-border)',
                }}
              >
                <span className="stx-text-small stx-text-wrap" style={{ minWidth: 0 }}>
                  {(a.title || 'Audit').slice(0, 80)}
                  {(a.title || '').length > 80 ? '…' : ''}
                </span>
                <Btn variant="secondary" onClick={() => navigate(`/management/auditors/conduct/${a.id}?tab=findings`)}>
                  Open findings
                </Btn>
              </div>
            ))}
          {!audits.some((a) => a.status === 'Completed' && (a.findings || []).some((f) => f.status === 'Open')) && (
            <div className="stx-text-caption ap-text-muted">No completed audits with open findings.</div>
          )}
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="Audits by Standard" icon="⬗">
          {Object.entries(
            audits.reduce((acc, a) => {
              acc[a.standard] = (acc[a.standard] || 0) + 1
              return acc
            }, {}),
          )
            .sort((a, b) => b[1] - a[1])
            .map(([std, cnt]) => (
              <div key={std} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #111827', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }} className="stx-text-wrap">
                  {std}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
                  <div style={{ background: '#1A2535', borderRadius: 3, height: 5, width: 60 }}>
                    <div style={{ background: '#3B82F6', width: `${(cnt / (audits.length || 1)) * 100}%`, height: '100%', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#60A5FA', minWidth: 12 }}>{cnt}</span>
                </div>
              </div>
            ))}
        </Card>
        <Card title="Findings by Type" icon="⚠">
          {FINDING_TYPES.map((type) => {
            const cnt = audits.reduce((s2, a) => s2 + (a.findings?.filter((f) => f.type === type).length || 0), 0)
            const colors = { 'Major NC': '#EF4444', 'Minor NC': '#F59E0B', Observation: '#60A5FA', 'Opportunity for Improvement': '#A78BFA', 'Positive Finding': '#34D399' }
            return (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #111827' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{type}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: colors[type] }}>{cnt}</span>
              </div>
            )
          })}
        </Card>
      </div>
      <Card title="Supplier Audit Performance" icon="◉">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Supplier', 'Industry', 'Total', 'Done', 'Active', 'Major NCs', 'Minor NCs', 'Open'].map((h) => (
                  <th key={h} style={{ padding: '9px 11px', textAlign: 'left', fontSize: 10, color: 'var(--ap-muted)', fontWeight: 700, borderBottom: '1px solid var(--ap-border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const sa = audits.filter((a) => a.supplierId === s.id)
                const done = sa.filter((a) => a.status === 'Completed').length
                const active = sa.filter((a) => a.status === 'In Progress').length
                const majN = sa.reduce((n, a) => n + (a.findings?.filter((f) => f.type === 'Major NC').length || 0), 0)
                const minN = sa.reduce((n, a) => n + (a.findings?.filter((f) => f.type === 'Minor NC').length || 0), 0)
                const opN = sa.reduce((n, a) => n + (a.findings?.filter((f) => f.status === 'Open').length || 0), 0)
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #0F1A2E' }}>
                    <td style={{ padding: '9px 11px', fontSize: 12, color: 'var(--ap-text)', fontWeight: 500 }} className="stx-text-wrap">
                      {s.name}
                    </td>
                    <td style={{ padding: '9px 11px' }}>
                      <Tag color="#3B82F6" small>
                        {s.industry || '—'}
                      </Tag>
                    </td>
                    <td style={{ padding: '9px 11px', fontSize: 12, color: '#60A5FA', fontWeight: 600, textAlign: 'center' }}>{sa.length}</td>
                    <td style={{ padding: '9px 11px', fontSize: 12, color: '#34D399', textAlign: 'center' }}>{done}</td>
                    <td style={{ padding: '9px 11px', fontSize: 12, color: '#FCD34D', textAlign: 'center' }}>{active}</td>
                    <td style={{ padding: '9px 11px', fontSize: 12, fontWeight: 700, color: majN > 0 ? '#F87171' : '#374151', textAlign: 'center' }}>{majN}</td>
                    <td style={{ padding: '9px 11px', fontSize: 12, fontWeight: 700, color: minN > 0 ? '#FCD34D' : '#374151', textAlign: 'center' }}>{minN}</td>
                    <td style={{ padding: '9px 11px', fontSize: 12, fontWeight: 700, color: opN > 0 ? '#F87171' : '#374151', textAlign: 'center' }}>{opN}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
