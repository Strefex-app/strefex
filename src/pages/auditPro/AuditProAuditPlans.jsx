import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { notifyWorkspaceKeyDirty } from '../../services/workspaceCloudSync'
import useAuditProStore, { auditHasConductProgress } from '../../store/auditProStore'
import { filterAuditProAuditsForVisibility } from '../../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import { INDUSTRIES } from './auditProUi'
import { Btn, StatusBadge, Tag } from './auditProUi'

export default function AuditProAuditPlans() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const audits = useAuditProStore((s) => s.audits)
  const auditors = useAuditProStore((s) => s.auditors)
  const suppliers = useAuditProStore((s) => s.suppliers)
  const deleteAuditAndSync = useAuditProStore((s) => s.deleteAuditAndSync)
  const replaceAudit = useAuditProStore((s) => s.replaceAudit)
  const addAuditLog = useAuditProStore((s) => s.addAuditLog)
  const showToast = useAuditProStore((s) => s.showToast)

  const showDemoKit = useAuditProDemoKitVisible()
  const auditsForUi = useMemo(
    () => filterAuditProAuditsForVisibility(audits, auditors, suppliers, showDemoKit),
    [audits, auditors, suppliers, showDemoKit],
  )

  const [filter, setFilter] = useState({ industry: '', status: '', search: '' })

  useEffect(() => {
    const st = searchParams.get('status') || ''
    const ind = searchParams.get('industry') || ''
    if (!st && !ind) return
    setFilter((f) => ({
      ...f,
      ...(st ? { status: st } : {}),
      ...(ind ? { industry: ind } : {}),
    }))
  }, [searchParams])

  const filtered = auditsForUi.filter(
    (a) =>
      (!filter.industry || a.industry === filter.industry) &&
      (!filter.status || a.status === filter.status) &&
      (!filter.search || a.title.toLowerCase().includes(filter.search.toLowerCase())),
  )

  const del = (id) => {
    if (!window.confirm('Delete this audit?')) return
    const nextAudits = audits.filter((a) => a.id !== id)
    const nextReminders = useAuditProStore.getState().reminders.filter((r) => r.auditId !== id)
    deleteAuditAndSync(id, nextAudits, nextReminders)
    notifyWorkspaceKeyDirty('audit_pro', true)
    showToast('Deleted.')
  }

  const openAudit = (a) => navigate(`/management/auditors/conduct/${a.id}`)

  /** Sets scheduled audits to In Progress when starting; preserves partial answers. In-progress opens questionnaire list. */
  const startOrContinueAudit = (a) => {
    const aud = auditors.find((x) => x.id === a.auditorId)
    if (a.status === 'Planned' || a.status === 'Draft') {
      const hadProgress = auditHasConductProgress(a)
      const updated = { ...a, status: 'In Progress' }
      replaceAudit(updated)
      if (hadProgress) {
        addAuditLog(
          updated.id,
          'Audit resumed',
          aud?.name || 'Auditor',
          'Continued from Audit Plans — saved questionnaire progress kept',
        )
        showToast('Continuing audit — your saved answers are kept.')
      } else {
        addAuditLog(
          updated.id,
          'Audit Started',
          aud?.name || 'Auditor',
          'Audit started from Audit Plans — questionnaire opened',
        )
        showToast('Audit started. Questionnaire outline is open — pick a section to rank.')
      }
      notifyWorkspaceKeyDirty('audit_pro', true)
      navigate(`/management/auditors/conduct/${a.id}?tab=questionnaire&qn=list`)
      return
    }
    if (a.status === 'In Progress') {
      navigate(`/management/auditors/conduct/${a.id}?tab=questionnaire&qn=list`)
      return
    }
    openAudit(a)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 9, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={filter.search}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          placeholder="Search…"
          className="ap-input"
          style={{ width: 190 }}
        />
        <select
          value={filter.industry}
          onChange={(e) => setFilter((f) => ({ ...f, industry: e.target.value }))}
          className="ap-select"
          style={{ width: 'auto' }}
        >
          <option value="">All Industries</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <select
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          className="ap-select"
          style={{ width: 'auto' }}
        >
          <option value="">All Statuses</option>
          {['Draft', 'Planned', 'In Progress', 'Completed', 'Cancelled'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <Btn onClick={() => navigate('/management/auditors/new-audit')}>
            + New Audit
          </Btn>
        </div>
      </div>
      <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginBottom: 12 }}>
        Questionnaire progress saves automatically while you conduct an audit (local device plus server when signed in).
        After a disconnect or browser close, reopen <strong style={{ fontWeight: 'var(--font-medium)' }}>Audit Plans</strong>{' '}
        and choose <strong style={{ fontWeight: 'var(--font-medium)' }}>Continue audit</strong> — partial answers stay with the row.
      </p>
      <div className="am-datatable-wrap">
        <table>
          <thead>
            <tr>
              {['Title', 'Industry', 'Standard', 'Auditor', 'Supplier', 'Date', 'Status', 'Findings', 'Auto', ''].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const aud = auditors.find((x) => x.id === a.auditorId)
              const sup = suppliers.find((x) => x.id === a.supplierId)
              const hasMaj = (a.findings || []).some((f) => f.type === 'Major NC')
              const resumeConduct =
                a.status === 'In Progress' || ((a.status === 'Planned' || a.status === 'Draft') && auditHasConductProgress(a))
              const fc = hasMaj
                ? 'var(--danger-text)'
                : (a.findings?.length || 0) > 0
                  ? 'var(--callout-warn-text)'
                  : 'var(--color-muted)'
              return (
                <tr key={a.id} className="ap-hovrow">
                  <td style={{ padding: '10px 12px', maxWidth: 220 }}>
                    <div className="stx-text-wrap stx-text-small" style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-medium)' }}>
                      {a.title.slice(0, 42)}
                      {a.title.length > 42 ? '…' : ''}
                    </div>
                    <div className="stx-text-caption ap-text-muted">{a.auditType}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Tag color="var(--accent)" small>
                      {a.industry}
                    </Tag>
                  </td>
                  <td className="stx-text-caption ap-text-secondary" style={{ padding: '10px 12px' }}>
                    {a.standard}
                  </td>
                  <td className="stx-text-caption ap-text-secondary" style={{ padding: '10px 12px' }}>
                    {aud?.name?.split(' ')[0] || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', maxWidth: 180 }} className="stx-text-wrap">
                    <div className="stx-text-caption ap-text-secondary">
                      {sup?.name?.slice(0, 28) || '—'}
                      {sup?.name?.length > 28 ? '…' : ''}
                    </div>
                    {sup?.id ? (
                      <button
                        type="button"
                        className="stx-text-caption"
                        style={{
                          marginTop: 4,
                          padding: 0,
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: 'var(--accent)',
                          fontWeight: 'var(--font-medium)',
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                          fontSize: 'var(--text-caption)',
                        }}
                        onClick={() => navigate(`/management/auditors/suppliers?edit=${encodeURIComponent(sup.id)}`)}
                      >
                        Edit supplier data
                      </button>
                    ) : null}
                  </td>
                  <td className="stx-text-caption ap-text-secondary" style={{ padding: '10px 12px' }}>
                    {a.plannedDate}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <StatusBadge status={a.status} />
                  </td>
                  <td
                    className="stx-text-body"
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      fontWeight: 'var(--font-semibold)',
                      color: fc,
                    }}
                  >
                    {a.findings?.length || 0}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {a.isAutoPlanned && (
                      <span className="stx-text-caption" style={{ color: 'var(--badge-success-text)' }} title="Auto-planned">
                        ↺
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {(a.status === 'Planned' || a.status === 'Draft' || a.status === 'In Progress') && (
                        <Btn onClick={() => startOrContinueAudit(a)} variant={resumeConduct ? 'secondary' : 'primary'}>
                          {resumeConduct ? 'Continue audit' : 'Start audit'}
                        </Btn>
                      )}
                      <Btn onClick={() => openAudit(a)} variant="secondary">
                        Open
                      </Btn>
                      <button
                        type="button"
                        className="ap-btn ap-btn-secondary"
                        onClick={() => del(a.id)}
                        style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-light)' }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="stx-text-small ap-text-muted" style={{ padding: 20, textAlign: 'center' }}>
            No audits match filter.
          </div>
        )}
      </div>
    </div>
  )
}
