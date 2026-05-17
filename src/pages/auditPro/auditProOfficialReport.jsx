import {
  InfoRow,
  StatusBadge,
  Tag,
  getQuestionnaireVerdictPreset,
  getTotalQuestions,
  VERDICT_PRESET_SUPPLIER_RU_SCORE,
} from './auditProUi'

const FINDING_TYPE_TAG = {
  'Major NC': 'var(--danger)',
  'Minor NC': 'var(--rfqi-amber)',
  Observation: 'var(--accent)',
  'Opportunity for Improvement': 'var(--rfqi-purple)',
  'Positive Finding': 'var(--badge-success-text)',
}

function findingTypeColor(type) {
  return FINDING_TYPE_TAG[type] || 'var(--accent)'
}

function tallyVerdict(responses, v) {
  return Object.values(responses || {}).filter((r) => r?.verdict === v).length
}

/**
 * Printable “official audit report” body (used in Conduct preview and full print route).
 * When `suppressReportChrome` is true (print route + PM-style frame), omit the centred
 * ribbon/title duplicate — chrome lives in AuditProPrintReport.
 */
export default function AuditProOfficialReport({
  audit,
  auditor,
  supplier,
  questionnaire,
  suppressReportChrome = false,
}) {
  const majors = audit.findings.filter((f) => f.type === 'Major NC')
  const minors = audit.findings.filter((f) => f.type === 'Minor NC')
  const totalQ = getTotalQuestions(questionnaire)
  const verdictPreset = getQuestionnaireVerdictPreset(audit.standard)
  const supplierScoreMode = verdictPreset === VERDICT_PRESET_SUPPLIER_RU_SCORE
  const responses = audit.responses || {}

  let eff = 0
  if (supplierScoreMode) {
    const naC = tallyVerdict(responses, 'NA')
    const n3 = tallyVerdict(responses, '3')
    const denom = totalQ > 0 ? totalQ - naC : 0
    eff = denom > 0 ? Math.round((n3 / denom) * 100) : 0
  } else {
    const conforms = Object.values(responses).filter((r) => r?.verdict === 'Conforms').length
    const naCount = Object.values(responses).filter((r) => r?.verdict === 'N/A').length
    eff = totalQ > 0 ? Math.round((conforms / Math.max(totalQ - naCount, 1)) * 100) : 0
  }

  const kpiTiles = supplierScoreMode
    ? [
        { l: 'Major NCs', v: majors.length, br: 'var(--danger)', val: 'var(--danger-text)' },
        { l: 'Minor NCs', v: minors.length, br: 'var(--rfqi-amber)', val: 'var(--badge-warning-text)' },
        { l: 'Н/Д', v: tallyVerdict(responses, 'NA'), br: 'var(--color-muted)', val: 'var(--color-muted)' },
        { l: 'Балл 1', v: tallyVerdict(responses, '1'), br: 'var(--danger)', val: 'var(--danger-text)' },
        { l: 'Балл 2', v: tallyVerdict(responses, '2'), br: 'var(--rfqi-amber)', val: 'var(--badge-warning-text)' },
        { l: 'Балл 3', v: tallyVerdict(responses, '3'), br: 'var(--badge-success-text)', val: 'var(--badge-success-text)' },
        { l: 'Полнота («3» / оценённые)', v: `${eff}%`, br: 'var(--rfqi-teal)', val: 'var(--rfqi-teal)' },
      ]
    : [
        { l: 'Major NCs', v: majors.length, br: 'var(--danger)', val: 'var(--danger-text)' },
        { l: 'Minor NCs', v: minors.length, br: 'var(--rfqi-amber)', val: 'var(--badge-warning-text)' },
        {
          l: 'Observations',
          v: audit.findings.filter((f) => f.type === 'Observation').length,
          br: 'var(--accent)',
          val: 'var(--accent)',
        },
        {
          l: 'OFIs',
          v: audit.findings.filter((f) => f.type === 'Opportunity for Improvement').length,
          br: 'var(--rfqi-purple)',
          val: 'var(--rfqi-purple)',
        },
        {
          l: 'Positive',
          v: audit.findings.filter((f) => f.type === 'Positive Finding').length,
          br: 'var(--badge-success-text)',
          val: 'var(--badge-success-text)',
        },
        { l: 'QMS Eff.', v: `${eff}%`, br: 'var(--rfqi-teal)', val: 'var(--rfqi-teal)' },
      ]

  const chromeBlock = suppressReportChrome ? null : (
    <div
      style={{
        textAlign: 'center',
        marginBottom: 22,
        borderBottom: '1px solid var(--border-light)',
        paddingBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-overline)',
          letterSpacing: '0.2em',
          color: 'var(--color-muted)',
          marginBottom: 5,
        }}
      >
        OFFICIAL AUDIT REPORT
      </div>
      <div
        style={{
          fontSize: 'var(--text-section)',
          fontWeight: 'var(--font-semibold)',
          color: 'var(--color-primary)',
          marginBottom: 7,
        }}
        className="stx-text-wrap"
      >
        {audit.title}
      </div>
      <div style={{ display: 'flex', gap: 9, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Tag color="var(--accent)">{audit.industry}</Tag>
        <Tag color="var(--rfqi-purple)">{audit.standard}</Tag>
        <StatusBadge status={audit.status} />
      </div>
    </div>
  )

  const shellStyle = suppressReportChrome
    ? { padding: 0 }
    : {
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 12,
        padding: 24,
        boxShadow: 'var(--shadow-sm)',
      }

  return (
    <div className={suppressReportChrome ? 'ap-official-report-embedded stx-text-wrap' : ''} style={shellStyle}>
      {chromeBlock}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))',
          gap: 11,
          marginBottom: 20,
        }}
      >
        {kpiTiles.map((x) => (
          <div key={x.l} className="ap-kpi-tile" style={{ borderLeftColor: x.br }}>
            <div style={{ fontSize: 'var(--text-heading)', fontWeight: 'var(--font-semibold)', color: x.val }}>{x.v}</div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted)', marginTop: 3 }} className="stx-text-wrap">
              {x.l}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <div>
          <InfoRow label="Auditor" value={auditor?.name || '—'} />
          <InfoRow label="Supplier" value={supplier?.name || '—'} />
          <InfoRow label="Planned" value={audit.plannedDate} />
          <InfoRow label="Completed" value={audit.completedDate || 'Pending'} />
          {audit.nextAuditDate ? (
            <InfoRow
              label="Next Audit"
              value={<span style={{ color: 'var(--badge-success-text)' }}>{audit.nextAuditDate}</span>}
            />
          ) : null}
        </div>
        <div>
          <div
            style={{
              fontSize: 'var(--text-caption)',
              color: 'var(--color-muted)',
              marginBottom: 8,
              fontWeight: 'var(--font-semibold)',
            }}
          >
            SCOPE
          </div>
          <div
            style={{ fontSize: 'var(--text-small)', color: 'var(--color-secondary)', lineHeight: 1.6 }}
            className="stx-text-wrap"
          >
            {audit.scope || 'Not specified'}
          </div>
        </div>
      </div>

      {supplierScoreMode && questionnaire?.length ? (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 'var(--text-caption)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--color-muted)',
              marginBottom: 10,
              letterSpacing: '0.05em',
            }}
          >
            ЧЕК-ЛИСТ ОТЧЁТА АУДИТА (СМК ПОСТАВЩИКА)
          </div>
          <div className="ap-supplier-report-table-wrap">
            <table className="ap-supplier-report-table stx-text-wrap">
              <thead>
                <tr>
                  <th>Пункт ISO 9001</th>
                  <th>Пункт IATF 16949</th>
                  <th>№ п/п</th>
                  <th>Объект оценки</th>
                  <th>Ожидаемые документы</th>
                  <th>Балл</th>
                  <th>Свидетельства / заметки</th>
                </tr>
              </thead>
              <tbody>
                {(questionnaire || []).flatMap((sec, si) => {
                  const rows = []
                  rows.push(
                    <tr key={`h-${si}`} className="ap-supplier-report-section">
                      <td colSpan={7}>{sec.section}</td>
                    </tr>,
                  )
                  sec.questions?.forEach((q, qi) => {
                    const k = `${si}-${qi}`
                    const r = responses[k]
                    const docsText = Array.isArray(q.docs) ? q.docs.join('; ') : ''
                    rows.push(
                      <tr key={`${si}-${qi}`}>
                        <td>{q.isoRef || '—'}</td>
                        <td>{q.iatfRef || '—'}</td>
                        <td>{q.checklistNo ?? '—'}</td>
                        <td>{q.text}</td>
                        <td>{docsText}</td>
                        <td>{r?.verdict != null ? r.verdict : '—'}</td>
                        <td>{r?.notes || '—'}</td>
                      </tr>,
                    )
                  })
                  return rows
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {audit.findings?.length ? (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 'var(--text-caption)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--color-muted)',
              marginBottom: 10,
              letterSpacing: '0.05em',
            }}
          >
            FINDINGS
          </div>
          {audit.findings.map((f, i) => (
            <div
              key={f.id}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                <Tag color={findingTypeColor(f.type)}>
                  {i + 1}. {f.type}
                </Tag>
                {f.section ? (
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>{f.section}</span>
                ) : null}
                <Tag color={f.status === 'Closed' ? 'var(--badge-success-text)' : 'var(--danger)'}>{f.status}</Tag>
              </div>
              <div
                style={{ fontSize: 'var(--text-small)', color: 'var(--color-primary)', lineHeight: 1.55 }}
                className="stx-text-wrap"
              >
                {f.description}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div
        style={{
          padding: 14,
          background:
            majors.length > 0
              ? 'var(--surface-danger-soft)'
              : minors.length > 0
                ? 'var(--callout-warn-bg)'
                : 'var(--badge-success-bg)',
          borderRadius: 9,
          border: `1px solid ${
            majors.length > 0
              ? 'var(--danger)'
              : minors.length > 0
                ? 'var(--callout-warn-border)'
                : 'color-mix(in srgb, var(--badge-success-text) 38%, transparent)'
          }`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-caption)',
            fontWeight: 'var(--font-semibold)',
            color:
              majors.length > 0
                ? 'var(--danger-text)'
                : minors.length > 0
                  ? 'var(--callout-warn-text)'
                  : 'var(--badge-success-text)',
          }}
          className="stx-text-wrap"
        >
          {majors.length > 0
            ? '⛔ NOT RECOMMENDED – Resolve all Major NCs before certification/approval'
            : minors.length > 0
              ? '⚡ CONDITIONAL – Address Minor NCs within agreed timeframe'
              : '✅ RECOMMENDED – No Major/Minor NCs. QMS effective.'}
        </div>
      </div>
    </div>
  )
}
