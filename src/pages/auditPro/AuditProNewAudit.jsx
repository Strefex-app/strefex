import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { notifyWorkspaceKeyDirty } from '../../services/workspaceCloudSync'
import useAuditProStore from '../../store/auditProStore'
import { auditProUid } from '../../utils/auditProUid'
import { filterAuditProAuditorsForVisibility, filterAuditProSuppliersForVisibility } from '../../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import {
  AUDIT_STANDARDS,
  INDUSTRIES,
  AUDIT_TYPES,
  Card,
  Field,
  Grid2,
  Input,
  Select,
  Textarea,
  Btn,
  getQuestionnaire,
  getTotalQuestions,
} from './auditProUi'
import { useTranslation } from '../../i18n/useTranslation'
import { useServiceRequestStore } from '../../store/serviceRequestStore'

export default function AuditProNewAudit() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { language } = useTranslation()
  const audits = useAuditProStore((s) => s.audits)
  const auditors = useAuditProStore((s) => s.auditors)
  const suppliers = useAuditProStore((s) => s.suppliers)
  const setAudits = useAuditProStore((s) => s.setAudits)
  const addAuditLog = useAuditProStore((s) => s.addAuditLog)
  const showToast = useAuditProStore((s) => s.showToast)

  const showDemoKit = useAuditProDemoKitVisible()
  const auditorsForPicker = useMemo(
    () => filterAuditProAuditorsForVisibility(auditors, showDemoKit),
    [auditors, showDemoKit],
  )
  const suppliersForPicker = useMemo(
    () => filterAuditProSuppliersForVisibility(suppliers, showDemoKit),
    [suppliers, showDemoKit],
  )

  const [form, setForm] = useState(() => ({
    title: searchParams.get('title') || '',
    industry: searchParams.get('industry') || '',
    auditType: searchParams.get('auditType') || '',
    standard: searchParams.get('standard') || '',
    supplierId: '',
    auditorId: '',
    secondaryAuditorId: '',
    plannedDate: '',
    scope: searchParams.get('scope') || '',
    status: 'Planned',
    auditDays: '1',
    language: 'English',
  }))

  const availableStandards = form.industry && form.auditType ? AUDIT_STANDARDS[form.industry]?.[form.auditType] || [] : []
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const questionnaire = form.standard ? getQuestionnaire(form.standard, form.auditType, language) : null
  const totalQ = questionnaire ? getTotalQuestions(questionnaire) : 0

  const submit = () => {
    if (!form.title || !form.industry || !form.auditType || !form.standard || !form.plannedDate) {
      showToast('Fill all required fields.', 'error')
      return
    }
    const audit = {
      ...form,
      secondaryAuditorId: form.secondaryAuditorId || '',
      id: auditProUid(),
      findings: [],
      responses: {},
      createdAt: new Date().toISOString().slice(0, 10),
    }
    setAudits([...audits, audit])
    void useAuditProStore.getState().upsertAuditRemote(audit)
    const aud = auditors.find((a) => a.id === form.auditorId)
    const sec = auditors.find((a) => a.id === form.secondaryAuditorId)
    addAuditLog(audit.id, 'Audit Created', aud?.name || 'System', `Created for ${form.standard}. Questionnaire: ${totalQ} questions.`)

    const pushGlobal = useServiceRequestStore.getState().pushGlobalPlatformNotification
    const planNote = `Audit "${form.title}" · ${form.standard} · planned ${form.plannedDate || 'TBD'}. Management → Auditors → Audit Plans.`
    if (aud?.email) {
      pushGlobal({
        targetEmail: aud.email,
        title: 'You are the lead auditor on a new audit plan',
        message: `Lead assignment: ${planNote}`,
        type: 'audit_plan_assigned',
      })
    }
    if (sec?.email && sec.id !== aud?.id) {
      pushGlobal({
        targetEmail: sec.email,
        title: 'You are supporting auditor on a new audit plan',
        message: `Supporting assignment: ${planNote}`,
        type: 'audit_plan_assigned',
      })
    }
    notifyWorkspaceKeyDirty('audit_pro', true)
    showToast('Audit plan created!')
    navigate('/management/auditors/plans')
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <Card title="New Audit Plan" icon="◫">
        <Grid2>
          <Field label="Audit Title *">
            <Input value={form.title} onChange={(v) => set('title', v)} placeholder="e.g. IATF 16949 Surveillance – Supplier Name" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(v) => set('status', v)} options={['Draft', 'Planned', 'In Progress']} />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Industry *">
            <Select
              value={form.industry}
              onChange={(v) => {
                set('industry', v)
                set('auditType', '')
                set('standard', '')
              }}
              options={['', ...INDUSTRIES]}
            />
          </Field>
          <Field label="Audit Type *">
            <Select
              value={form.auditType}
              onChange={(v) => {
                set('auditType', v)
                set('standard', '')
              }}
              options={['', ...AUDIT_TYPES]}
              disabled={!form.industry}
            />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Standard / Framework *">
            <Select
              value={form.standard}
              onChange={(v) => set('standard', v)}
              options={['', ...availableStandards]}
              disabled={!availableStandards.length}
            />
          </Field>
          <Field label="Planned Date *">
            <Input type="date" value={form.plannedDate} onChange={(v) => set('plannedDate', v)} />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Lead auditor">
            <Select
              value={form.auditorId}
              onChange={(v) => set('auditorId', v)}
              options={[{ value: '', label: '— Select lead auditor —' }, ...auditorsForPicker.map((a) => ({ value: a.id, label: `${a.name} (${a.role})` }))]}
            />
          </Field>
          <Field label="Supporting auditor (optional)">
            <Select
              value={form.secondaryAuditorId}
              onChange={(v) => set('secondaryAuditorId', v)}
              options={[
                { value: '', label: '— None —' },
                ...auditorsForPicker.map((a) => ({ value: a.id, label: `${a.name} (${a.role})` })),
              ]}
            />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Supplier / auditee">
            <Select
              value={form.supplierId}
              onChange={(v) => set('supplierId', v)}
              options={[{ value: '', label: '— Select supplier —' }, ...suppliersForPicker.map((s) => ({ value: s.id, label: `${s.name} (${s.country})` }))]}
            />
            {form.supplierId ? (
              <button
                type="button"
                className="stx-text-caption stx-text-wrap"
                style={{
                  marginTop: 8,
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--accent)',
                  fontWeight: 'var(--font-medium)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  display: 'block',
                  fontSize: 'var(--text-caption)',
                }}
                onClick={() => navigate(`/management/auditors/suppliers?edit=${encodeURIComponent(form.supplierId)}`)}
              >
                Correct supplier name / contact / notes…
              </button>
            ) : (
              <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginTop: 8 }}>
                After scheduling, you can still update supplier details — open Supplier Registry or use Audit Plans → Edit supplier data.
              </p>
            )}
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Duration (days)">
            <Select
              value={form.auditDays}
              onChange={(v) => set('auditDays', v)}
              options={['1', '2', '3', '4', '5'].map((d) => ({ value: d, label: `${d} day${d > '1' ? 's' : ''}` }))}
            />
          </Field>
          <Field label="Report Language">
            <Select
              value={form.language}
              onChange={(v) => set('language', v)}
              options={['English', 'German', 'French', 'Italian', 'Spanish', 'Japanese']}
            />
          </Field>
        </Grid2>
        <Field label="Scope / Objectives">
          <Textarea value={form.scope} onChange={(v) => set('scope', v)} placeholder="Describe scope, locations, processes and audit objectives..." rows={3} />
        </Field>
        <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn onClick={submit}>
            Create Audit Plan
          </Btn>
          <Btn onClick={() => navigate('/management/auditors/plans')} variant="secondary">
            Cancel
          </Btn>
          {form.standard && (
            <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 6 }} className="stx-text-wrap">
              Questionnaire: {totalQ} questions · {questionnaire?.length || 0} sections
            </span>
          )}
        </div>
      </Card>

      {questionnaire && (
        <Card title={`Questionnaire Preview: ${form.standard}`} icon="⧉" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--ap-muted)', marginBottom: 12 }}>Showing all {totalQ} questions that will be used during this audit.</div>
          {questionnaire.map((sec, si) => (
            <div
              key={si}
              style={{
                marginBottom: 12,
                background: 'var(--ap-panel-2)',
                borderRadius: 8,
                padding: '12px 14px',
                border: '1px solid var(--ap-border)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#60A5FA', marginBottom: 3 }}>{sec.section}</div>
              <div style={{ fontSize: 10, color: 'var(--ap-muted)', marginBottom: 8 }}>
                Clause: {sec.clause} · {sec.questions?.length} question(s)
              </div>
              {sec.questions?.map((q, qi) => (
                <div
                  key={qi}
                  style={{
                    fontSize: 11,
                    color: '#94a3b8',
                    padding: '4px 0 4px 10px',
                    borderLeft: '2px solid #1E3A5F',
                    marginBottom: 5,
                  }}
                >
                  <div style={{ marginBottom: 2 }} className="stx-text-wrap">
                    {qi + 1}. {q.text}
                  </div>
                  <div style={{ fontSize: 10, color: '#374151' }} className="stx-text-wrap">
                    📋 {q.reference} · Docs: {(q.docs || []).slice(0, 2).join(', ')}
                    {(q.docs || []).length > 2 ? ` +${q.docs.length - 2} more` : ''}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
