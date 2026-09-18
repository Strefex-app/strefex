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
  return (
    <article className="ap-doc ap-doc--closing">
      <header className="ap-doc-head">
        <div>
          <div className="ap-doc-brand">STREFEX</div>
          <div className="ap-doc-brand-sub">SUPPLIER QUALITY · AUDIT CLOSING REPORT</div>
        </div>
        <div className="ap-doc-meta">
          <div>{model.reportNo}</div>
          <div>Issued {formatAuditDateLabel(model.issued) || '—'}</div>
          <div>Page 1</div>
        </div>
      </header>
      <h1 className="ap-doc-h1">Supplier audit report — closing document</h1>
      <p className="ap-doc-body stx-text-wrap">
        This report records the audit result and the corrective actions agreed at the closing meeting.
        Signature by the supplier confirms the findings were presented and the due dates accepted.
      </p>
      <table className="ap-doc-kv ap-doc-kv--plain">
        <tbody>
          <tr><th>Supplier / code</th><td>{supplier?.name} · {sellerSiteCode(supplier || { id: audit?.supplierId })}</td></tr>
          <tr><th>Site</th><td>{model.site || '—'}</td></tr>
          <tr><th>Audit type / date</th><td>{model.kind} · {formatAuditDateLabel(model.issued) || '—'}</td></tr>
          <tr><th>Standard</th><td className="stx-text-wrap">{audit?.standard || '—'}{audit?.scope ? ` · ${audit.scope}` : ''}</td></tr>
          <tr><th>Lead auditor</th><td>{model.auditorLabel}</td></tr>
          <tr>
            <th>Result</th>
            <td>
              {model.result.label}
              {model.result.score != null ? ` · ${model.result.score}% conformity` : ''}
            </td>
          </tr>
          <tr>
            <th>Findings</th>
            <td>{model.counts.major} major · {model.counts.minor} minor · {model.counts.obs} observations</td>
          </tr>
          <tr>
            <th>CAPA plan due</th>
            <td>
              {formatAuditDateLabel(model.capaDue) || '—'}
              {model.capaDue ? ' · effectiveness verified by follow-up' : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="ap-doc-h2">Element result</h2>
      <table className="ap-doc-grid">
        <tbody>
          {model.scores.map((sec) => (
            <tr key={sec.name}>
              <td className="stx-text-wrap">{sec.name}</td>
              <td>{sec.pct != null ? `${sec.pct}%` : '—'}</td>
              <td className={`ap-doc-verdict ap-doc-verdict--${sec.verdict.key}`}>{sec.verdict.label}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="ap-doc-h2">Findings &amp; corrective actions</h2>
      {model.findings.length === 0 ? (
        <p className="ap-doc-body">No findings recorded at closing.</p>
      ) : (
        <table className="ap-doc-grid ap-doc-grid--findings">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Grade</th>
              <th>Finding / action</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {model.findings.map((f) => (
              <tr key={f.ref}>
                <td>{f.ref}</td>
                <td>{f.grade}</td>
                <td className="stx-text-wrap">
                  {f.description || '—'}
                  {f.action ? <div>Action: {f.action}</div> : null}
                  {f.reference ? <div>{f.reference}</div> : null}
                </td>
                <td>{formatAuditDateLabel(f.dueDate) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="ap-doc-h2">Signatures of related parties</h2>
      <p className="ap-doc-body stx-text-wrap">
        By signing, each party confirms the closing meeting was held, findings were presented, and the CAPA dates above are accepted.
      </p>
      <SignBlock people={model.signatories} />
    </article>
  )
}

function ScoreMarks() {
  return (
    <div className="ap-check-score" aria-hidden="true">
      <span>C</span>
      <span>OBS</span>
      <span>MIN</span>
      <span>MAJ</span>
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
}) {
  const people = signatories.length
    ? signatories
    : [
      { role: 'Lead auditor', name: auditorLabel || '\u00a0' },
      { role: 'Supplier representative', name: supplierLabel || '\u00a0' },
      { role: 'Head of Supplier Quality', name: 'STREFEX' },
    ]

  if (variant === 'sign') {
    return (
      <article className="ap-doc ap-doc--check ap-doc--check-sign">
        <div className="ap-check-runhead">
          <span>{formCode}</span>
          <span>Page {page}{pageCount > 1 ? ` of ${pageCount}` : ''}</span>
        </div>
        <h2 className="ap-doc-h2">Signatures of related parties</h2>
        <p className="ap-doc-body stx-text-wrap">
          By signing, each party confirms the closing meeting was held, findings were presented, and the CAPA dates agreed at closing are accepted.
        </p>
        <SignBlock people={people} />
      </article>
    )
  }

  return (
    <article className={`ap-doc ap-doc--check${variant === 'cover' ? '' : ' ap-doc--check-cont'}`}>
      {variant === 'cover' ? (
        <>
          <header className="ap-doc-head">
            <div>
              <div className="ap-doc-brand">STREFEX</div>
              <div className="ap-doc-brand-sub">SUPPLIER QUALITY · ON-SITE AUDIT QUESTIONNAIRE</div>
            </div>
            <div className="ap-doc-meta">
              <div>{formCode}</div>
              <div>Issued {issued || '—'}</div>
              <div>Page {page}{pageCount > 1 ? ` of ${pageCount}` : ''}</div>
            </div>
          </header>
          <hr className="ap-doc-rule" />
          <h1 className="ap-doc-h1 ap-check-title stx-text-wrap">Audit questionnaire — {standard}</h1>
          <p className="ap-doc-body ap-check-intro stx-text-wrap">
            Score every question against the anchors. Every score below conform needs the objective evidence seen, the clause and the person interviewed written in the evidence column. Questions marked not applicable need a written justification.
          </p>
          <table className="ap-doc-kv">
            <tbody>
              <tr><th>Standard module</th><td>{standard}{family ? ` (${family})` : ''}</td></tr>
              <tr><th>Questions</th><td>{questionCount} · scale Conform / observation / minor / major</td></tr>
              <tr><th>Supplier / code</th><td className="stx-text-wrap">{supplierLabel || '\u00a0'}</td></tr>
              <tr><th>Site</th><td className="stx-text-wrap">{site || '\u00a0'}</td></tr>
              <tr><th>Audit date</th><td>{auditDate || '\u00a0'}</td></tr>
              <tr><th>Lead auditor</th><td className="stx-text-wrap">{auditorLabel || '\u00a0'}</td></tr>
            </tbody>
          </table>
        </>
      ) : (
        <div className="ap-check-runhead">
          <span>{standard}</span>
          <span>{formCode} · Page {page}{pageCount > 1 ? ` of ${pageCount}` : ''}</span>
        </div>
      )}
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
          {questions.map((row) => (
            <tr key={row.id}>
              <td className="ap-check-clause">{row.clause}</td>
              <td>
                <div className="ap-std-q stx-text-wrap">{row.text}</div>
                {row.lookAt ? <div className="ap-std-look stx-text-wrap">Look at: {row.lookAt}</div> : null}
              </td>
              <td><ScoreMarks /></td>
              <td className="ap-check-evidence" />
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}
