import { formatAuditDateLabel } from '../../utils/companyExternalAudit'
import { sellerSiteCode } from '../../utils/auditorsAssignmentPool'
import { closingReportModel } from '../../utils/auditSupplierRegister'

export function SignBlock({ people }) {
  return (
    <div className="ap-doc-signs">
      {(people || []).map((p) => (
        <div key={p.role} className="ap-doc-sign">
          <div className="ap-doc-sign-line" />
          <div className="ap-doc-sign-name stx-text-wrap">{p.name}</div>
          <div className="ap-doc-sign-role">{p.role}</div>
        </div>
      ))}
    </div>
  )
}

export function scoreMarkForVerdict(verdict) {
  const v = String(verdict || '')
  if (['Conforms', '3', 'Positive Finding'].includes(v)) return 'C'
  if (['Observation', 'Opportunity for Improvement', '2'].includes(v)) return 'OBS'
  if (v === 'Minor NC') return 'MIN'
  if (['Major NC', '1'].includes(v)) return 'MAJ'
  if (['N/A', 'NA'].includes(v)) return 'NA'
  return ''
}

export function AuditProCertificateDocument({ audit, supplier, auditor, language = 'en' }) {
  const model = closingReportModel({ audit, supplier, auditor, language })
  const conditions = model.result.key === 'conditional'
    ? 'Subject to closure of open corrective actions and surveillance audit at the stated interval'
    : 'Subject to surveillance audit at the stated interval'
  const scope = audit?.scope
    || [supplier?.notes, supplier?.industry, supplier?.city ? `${supplier.city} plant` : '']
      .filter(Boolean)
      .join(', ')
    || '—'
  return (
    <article className="ap-doc ap-doc--cert">
      <header className="ap-doc-head">
        <div>
          <div className="ap-doc-brand">STREFEX</div>
          <div className="ap-doc-brand-sub">SUPPLIER QUALITY · APPROVAL CERTIFICATE</div>
        </div>
        <div className="ap-doc-meta">
          <div>{model.certNo}</div>
          <div>Issued {formatAuditDateLabel(model.issued) || '—'}</div>
          <div>Page 1</div>
        </div>
      </header>
      <hr className="ap-doc-rule" />
      <p className="ap-doc-kicker">CERTIFICATE OF SUPPLIER APPROVAL</p>
      <p className="ap-doc-lead">STREFEX certifies that</p>
      <h1 className="ap-doc-title stx-text-wrap">{supplier?.name || 'Supplier'}</h1>
      <p className="ap-doc-site">{model.site || '—'}</p>
      <p className="ap-doc-body stx-text-wrap">
        has been audited against {audit?.standard || 'the applicable standard'}
        {audit?.standard ? ` and STREFEX supplier requirement ${model.questionnaireCode}` : ''}
        {' '}and meets the requirements for approved supplier status for the scope stated below,
        subject to surveillance audit and the closure of all corrective actions.
      </p>
      <table className="ap-doc-kv">
        <tbody>
          <tr><th>Certificate number</th><td>{model.certNo}</td></tr>
          <tr><th>Scope of approval</th><td className="stx-text-wrap">{scope}</td></tr>
          <tr><th>Supplier code</th><td>{sellerSiteCode(supplier || { id: audit?.supplierId })}</td></tr>
          <tr>
            <th>Audit reference</th>
            <td>
              {model.reportNo}
              {model.issued ? ` · ${formatAuditDateLabel(model.issued)}` : ''}
              {model.result.score != null ? ` · ${model.result.score}%` : ''}
            </td>
          </tr>
          <tr>
            <th>Valid from / to</th>
            <td>{formatAuditDateLabel(model.issued) || '—'} / {formatAuditDateLabel(model.validTo) || '—'}</td>
          </tr>
          <tr><th>Conditions</th><td className="stx-text-wrap">{conditions}</td></tr>
        </tbody>
      </table>
      <SignBlock people={model.signatories.filter((s) => s.role !== 'Supplier representative')} />
    </article>
  )
}

export function AuditProClosingDocument({ audit, supplier, auditor, language = 'en' }) {
  const model = closingReportModel({ audit, supplier, auditor, language })
  const extraFacts = [
    ['Result', `${model.result.label}${model.result.score != null ? ` · ${model.result.score}% conformity` : ''}`],
    ['Findings', `${model.counts.major} major · ${model.counts.minor} minor · ${model.counts.obs} observations`],
    ['CAPA plan due', formatAuditDateLabel(model.capaDue) || '—'],
  ]
  return (
    <AuditProChecklistDocument
      variant="cover"
      filled
      standard={audit?.standard || 'Supplier audit'}
      formCode={model.reportNo}
      issued={formatAuditDateLabel(model.issued) || '—'}
      page={1}
      pageCount={1}
      questions={[]}
      extraFacts={extraFacts}
      supplierLabel={supplier ? `${supplier.name} · ${sellerSiteCode(supplier || { id: audit?.supplierId })}` : ''}
      site={model.site}
      auditDate={formatAuditDateLabel(model.issued)}
      auditorLabel={model.auditorLabel}
      questionCount={0}
      signatories={model.signatories}
    />
  )
}

function ScoreMarks({ selected = '' }) {
  if (selected === 'NA') {
    return (
      <div className="ap-check-score" aria-label="Not applicable">
        <span className="is-on">N/A</span>
      </div>
    )
  }
  return (
    <div className="ap-check-score" aria-hidden={!selected}>
      {['C', 'OBS', 'MIN', 'MAJ'].map((mark) => (
        <span key={mark} className={selected === mark ? 'is-on' : ''}>{mark}</span>
      ))}
    </div>
  )
}

export function AuditProChecklistDocument({
  standard,
  family,
  questions = [],
  formCode,
  issued,
  page = 1,
  pageCount = 1,
  supplierLabel = '',
  site = '',
  auditDate = '',
  auditorLabel = '',
  questionCount = 0,
  variant = 'cover',
  signatories = [],
  filled = false,
  responses = {},
  extraFacts = [],
  findings = [],
  closeWithSignatures = false,
}) {
  const people = signatories.length
    ? signatories
    : [
      { role: 'Lead auditor', name: auditorLabel || '\u00a0' },
      { role: 'Supplier representative', name: supplierLabel || '\u00a0' },
      { role: 'Head of Supplier Quality', name: 'STREFEX' },
    ]

  const pageLabel = `Page ${page}${pageCount > 1 ? ` of ${pageCount}` : ''}`
  const brandSub = 'SUPPLIER QUALITY · ON-SITE AUDIT QUESTIONNAIRE'
  const title = `Audit questionnaire — ${standard}`
  const intro = filled
    ? 'This is the standard on-site questionnaire for this visit. Scores, evidence, findings and signatures are recorded on this form.'
    : 'Score every question against the anchors. Every score below conform needs the objective evidence seen, the clause and the person interviewed written in the evidence column. Questions marked not applicable need a written justification.'

  const showClose = closeWithSignatures || variant === 'sign'
  const showFindings = filled && (showClose || (findings || []).length > 0)

  const findingsBlock = showFindings ? (
    <>
      <h2 className="ap-doc-h2">Findings and corrective actions</h2>
      {(findings || []).length === 0 ? (
        <p className="ap-doc-body ap-doc-body--left">No findings recorded.</p>
      ) : (
        <table className="ap-check-grid ap-check-grid--findings">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Grade</th>
              <th>Finding / action</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {(findings || []).map((f) => (
              <tr key={f.ref || f.id}>
                <td className="ap-check-clause">{f.ref || '—'}</td>
                <td>{f.grade || f.type || '—'}</td>
                <td>
                  <div className="ap-std-q stx-text-wrap">{f.description || '—'}</div>
                  {f.action ? <div className="ap-std-look stx-text-wrap">Action: {f.action}</div> : null}
                  {f.reference ? <div className="ap-std-look stx-text-wrap">{f.reference}</div> : null}
                </td>
                <td>{formatAuditDateLabel(f.dueDate) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  ) : null

  const signatureBlock = showClose ? (
    <div className="ap-doc-close">
      <h2 className="ap-doc-h2">Signatures of related parties</h2>
      <p className="ap-doc-body ap-doc-body--left stx-text-wrap">
        By signing, each party confirms the closing meeting was held, findings were presented, and the CAPA dates agreed at closing are accepted.
      </p>
      <SignBlock people={people} />
    </div>
  ) : null

  return (
    <article className={`ap-doc ap-doc--check${variant === 'cover' ? '' : ' ap-doc--check-cont'}`}>
      {variant === 'cover' ? (
        <>
          <header className="ap-doc-head">
            <div>
              <div className="ap-doc-brand">STREFEX</div>
              <div className="ap-doc-brand-sub">{brandSub}</div>
            </div>
            <div className="ap-doc-meta">
              <div>{formCode}</div>
              <div>Issued {issued || '—'}</div>
              <div>{pageLabel}</div>
            </div>
          </header>
          <hr className="ap-doc-rule" />
          <h1 className="ap-doc-h1 ap-check-title stx-text-wrap">{title}</h1>
          <p className="ap-doc-body ap-check-intro stx-text-wrap">{intro}</p>
          <table className="ap-doc-kv">
            <tbody>
              <tr><th>Standard module</th><td>{standard}{family ? ` (${family})` : ''}</td></tr>
              <tr><th>Questions</th><td>{questionCount} · scale Conform / observation / minor / major</td></tr>
              <tr><th>Supplier / code</th><td className="stx-text-wrap">{supplierLabel || '\u00a0'}</td></tr>
              <tr><th>Site</th><td className="stx-text-wrap">{site || '\u00a0'}</td></tr>
              <tr><th>Audit date</th><td>{auditDate || '\u00a0'}</td></tr>
              <tr><th>Lead auditor</th><td className="stx-text-wrap">{auditorLabel || '\u00a0'}</td></tr>
              {(extraFacts || []).map((fact) => (
                <tr key={fact[0]}><th>{fact[0]}</th><td className="stx-text-wrap">{fact[1]}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="ap-check-runhead">
          <span>{standard}</span>
          <span>{formCode} · {pageLabel}</span>
        </div>
      )}
      {questions.length ? (
        <table className="ap-check-grid">
          <thead>
            <tr>
              <th>Clause</th>
              <th>Question / look at</th>
              <th>Score</th>
              <th>Evidence seen</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((row) => {
              const resp = responses[row.responseKey] || responses[row.id] || {}
              const mark = filled ? scoreMarkForVerdict(resp.verdict) : ''
              return (
                <tr key={row.id || row.responseKey}>
                  <td className="ap-check-clause">{row.clause}</td>
                  <td>
                    <div className="ap-std-q stx-text-wrap">{row.text}</div>
                    {row.lookAt ? <div className="ap-std-look stx-text-wrap">Look at: {row.lookAt}</div> : null}
                  </td>
                  <td><ScoreMarks selected={mark} /></td>
                  <td className="ap-check-evidence stx-text-wrap">{filled ? (resp.notes || resp.evidence || '') : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}
      {findingsBlock}
      {signatureBlock}
    </article>
  )
}
