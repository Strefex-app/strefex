import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuditProStore from '../../store/auditProStore'
import {
  filterAuditProAuditsForVisibility,
  filterAuditProSuppliersForVisibility,
} from '../../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import { Card, Tag, FINDING_TYPES, Btn } from './auditProUi'

export default function AuditProReports() {
  const navigate = useNavigate()
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

  const totalF = audits.reduce((s, a) => s + (a.findings?.length || 0), 0)
  const maj = audits.reduce((s, a) => s + (a.findings?.filter((f) => f.type === 'Major NC').length || 0), 0)
  const min = audits.reduce((s, a) => s + (a.findings?.filter((f) => f.type === 'Minor NC').length || 0), 0)

  return (
    <div>
      <div className="ap-pool-kpis" style={{ marginBottom: 20 }}>
        {[
          { l: 'Completed', v: audits.filter((a) => a.status === 'Completed').length, tone: 'ok' },
          { l: 'Total Findings', v: totalF, tone: 'warn' },
          { l: 'Major NCs', v: maj, tone: 'danger' },
          { l: 'Minor NCs', v: min, tone: 'warn' },
        ].map((s) => (
          <article key={s.l} className={`ap-pool-kpi ap-pool-kpi--${s.tone}`}>
            <div className="ap-pool-kpi-label">{s.l}</div>
            <div className="ap-pool-kpi-value">{s.v}</div>
          </article>
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
              <div key={std} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)', gap: 8 }}>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }} className="stx-text-wrap">
                  {std}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
                  <div style={{ background: 'var(--bg-surface)', borderRadius: 3, height: 5, width: 60 }}>
                    <div style={{ background: 'var(--accent)', width: `${(cnt / (audits.length || 1)) * 100}%`, height: '100%', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 'var(--text-small)', fontWeight: 'var(--font-semibold)', color: 'var(--accent)', minWidth: 12 }}>{cnt}</span>
                </div>
              </div>
            ))}
        </Card>
        <Card title="Findings by Type" icon="⚠">
          {FINDING_TYPES.map((type) => {
            const cnt = audits.reduce((s2, a) => s2 + (a.findings?.filter((f) => f.type === type).length || 0), 0)
            const colors = { 'Major NC': 'var(--danger)', 'Minor NC': 'var(--badge-warning-text)', Observation: 'var(--accent)', 'Opportunity for Improvement': 'var(--accent)', 'Positive Finding': 'var(--badge-success-text)' }
            return (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>{type}</span>
                <span style={{ fontSize: 'var(--text-small)', fontWeight: 'var(--font-semibold)', color: colors[type] }}>{cnt}</span>
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
                  <th key={h} style={{ padding: '9px 11px', textAlign: 'left', fontSize: 'var(--text-caption)', color: 'var(--ap-muted)', fontWeight: 'var(--font-semibold)', borderBottom: '1px solid var(--ap-border)' }}>
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
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '9px 11px', fontSize: 'var(--text-small)', color: 'var(--ap-text)', fontWeight: 'var(--font-medium)' }} className="stx-text-wrap">
                      {s.name}
                    </td>
                    <td style={{ padding: '9px 11px' }}>
                      <Tag color="var(--accent)" small>
                        {s.industry || '—'}
                      </Tag>
                    </td>
                    <td style={{ padding: '9px 11px', fontSize: 'var(--text-small)', color: 'var(--accent)', fontWeight: 'var(--font-semibold)', textAlign: 'center' }}>{sa.length}</td>
                    <td style={{ padding: '9px 11px', fontSize: 'var(--text-small)', color: 'var(--badge-success-text)', textAlign: 'center' }}>{done}</td>
                    <td style={{ padding: '9px 11px', fontSize: 'var(--text-small)', color: 'var(--badge-warning-text)', textAlign: 'center' }}>{active}</td>
                    <td style={{ padding: '9px 11px', fontSize: 'var(--text-small)', fontWeight: 'var(--font-semibold)', color: majN > 0 ? 'var(--danger-text)' : 'var(--color-secondary)', textAlign: 'center' }}>{majN}</td>
                    <td style={{ padding: '9px 11px', fontSize: 'var(--text-small)', fontWeight: 'var(--font-semibold)', color: minN > 0 ? 'var(--badge-warning-text)' : 'var(--color-secondary)', textAlign: 'center' }}>{minN}</td>
                    <td style={{ padding: '9px 11px', fontSize: 'var(--text-small)', fontWeight: 'var(--font-semibold)', color: opN > 0 ? 'var(--danger-text)' : 'var(--color-secondary)', textAlign: 'center' }}>{opN}</td>
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
