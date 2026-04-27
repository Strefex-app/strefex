import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import ForgeModuleShell from '../components/forge/ForgeModuleShell'
import Icon from '../components/Icon'
import { useTranslation } from '../i18n/useTranslation'
import { FORGE_PATHS, forgeSpacePath, FORGE_SEGMENT_MEMBERSHIP_ONBOARDING } from '../constants/forgeSpaceRoutes'
import { FORGE_HUB_REFRESH, notifyForgeHubRefresh } from '../lib/forgeHubEvents'
import { listAssignableMembershipMembers } from '../lib/forgeMembershipAssignees'
import {
  getProjectAssigneeIds,
  loadForgeProjects,
  addForgeProject,
  updateForgeProject,
  removeForgeProject,
} from '../lib/forgeProjects'
import './ForgeProjects.css'

const STATUS_OPTIONS = [
  { value: 'open', labelKey: 'forge.projects.statusOpen', labelDefault: 'Open' },
  { value: 'in_progress', labelKey: 'forge.projects.statusProgress', labelDefault: 'In progress' },
  { value: 'done', labelKey: 'forge.projects.statusDone', labelDefault: 'Done' },
  { value: 'closed', labelKey: 'forge.projects.statusClosed', labelDefault: 'Closed' },
]

function useForgeProjectsData() {
  const [projects, setProjects] = useState(() => loadForgeProjects())
  const [assignees, setAssignees] = useState(() => listAssignableMembershipMembers())
  const refresh = useCallback(() => {
    setProjects(loadForgeProjects())
    setAssignees(listAssignableMembershipMembers())
  }, [])
  useEffect(() => {
    refresh()
    const onStorage = (e) => {
      if (e.key && e.key.startsWith('forge-v1')) refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(FORGE_HUB_REFRESH, refresh)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(FORGE_HUB_REFRESH, refresh)
    }
  }, [refresh])
  return { projects, assignees, refresh }
}

export default function ForgeProjects() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projects, assignees, refresh } = useForgeProjectsData()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeAssessmentId, setAssigneeAssessmentId] = useState('')
  const [status, setStatus] = useState('open')
  const [formError, setFormError] = useState('')

  const assigneeById = useMemo(() => {
    const m = new Map()
    for (const a of assignees) m.set(a.assessmentId, a)
    return m
  }, [assignees])

  const addAssigneeLine = () => setAssigneeLines((lines) => [...lines, ''])

  const removeAssigneeLine = (index) => {
    setAssigneeLines((lines) => (lines.length <= 1 ? lines : lines.filter((_, j) => j !== index)))
  }

  const setAssigneeLine = (index, value) => {
    setAssigneeLines((lines) => lines.map((v, j) => (j === index ? value : v)))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    setFormError('')
    const ids = [...new Set(assigneeLines.map((s) => String(s || '').trim()).filter(Boolean))]
    const row = addForgeProject({
      title,
      description,
      assigneeAssessmentIds: ids,
      status,
    })
    if (!row) {
      setFormError(
        t('forge.projects.formError', 'Enter a project title and choose an assignee from membership onboarding.'),
      )
      return
    }
    notifyForgeHubRefresh()
    refresh()
    setTitle('')
    setDescription('')
    setAssigneeLines([''])
    setStatus('open')
  }

  const commitProjectAssignees = (projectId, nextIds) => {
    const cleaned = [...new Set(nextIds.map((x) => String(x || '').trim()).filter(Boolean))]
    if (!cleaned.length) return
    updateForgeProject(projectId, { assigneeAssessmentIds: cleaned })
    notifyForgeHubRefresh()
    refresh()
  }

  const onboardingLink = (assessmentId) =>
    `${forgeSpacePath(FORGE_SEGMENT_MEMBERSHIP_ONBOARDING)}?case=${encodeURIComponent(assessmentId)}`

  return (
    <AppLayout>
      <ForgeModuleShell
        title={t('forge.projects.title', 'Projects')}
        subtitle={t(
          'forge.projects.subtitle',
          'Create work items and assign them to candidates with a membership type from Membership onboarding.',
        )}
        tab="projects"
        onTab={() => {}}
        tabsOverride={[{ id: 'projects', label: t('forge.projects.tab', 'Projects') }]}
      >
        <div className="forge-proj">
          <div className="forge-proj-card">
            <h2 className="forge-proj-card-title">{t('forge.projects.newTitle', 'New project')}</h2>
            {assignees.length === 0 ? (
              <p className="forge-proj-hint">
                {t(
                  'forge.projects.noAssignees',
                  'Add membership assessments with type Founding Member or Club Member in Membership onboarding — they appear here as assignees.',
                )}{' '}
                <button type="button" className="forge-proj-linkish" onClick={() => navigate(FORGE_PATHS.membershipOnboarding)}>
                  {t('forge.projects.openOnboarding', 'Open membership onboarding')}
                </button>
              </p>
            ) : null}
            <form className="forge-proj-form" onSubmit={onSubmit}>
              <label className="forge-proj-label">
                <span>{t('forge.projects.fieldTitle', 'Project title')}</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('forge.projects.titlePh', 'e.g. Welcome pack, event lead')}
                  autoComplete="off"
                />
              </label>
              <label className="forge-proj-label">
                <span>{t('forge.projects.fieldDesc', 'Description (optional)')}</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder={t('forge.projects.descPh', 'Scope, dates, links…')}
                />
              </label>
              <div className="forge-proj-label">
                <span>{t('forge.projects.fieldAssignees', 'Assignees')}</span>
                <div className="forge-proj-assignees-editor">
                  {assigneeLines.map((lineId, idx) => (
                    <div key={`new-a-${idx}`} className="forge-proj-assignee-line">
                      <select
                        value={lineId}
                        onChange={(e) => setAssigneeLine(idx, e.target.value)}
                        required={assignees.length > 0 && idx === 0}
                      >
                        <option value="">{t('forge.projects.chooseAssignee', 'Choose member (from onboarding)')}</option>
                        {assignees.map((a) => (
                          <option key={a.assessmentId} value={a.assessmentId}>
                            {a.name} — {a.memberTypeLabel}
                          </option>
                        ))}
                      </select>
                      {assigneeLines.length > 1 ? (
                        <button
                          type="button"
                          className="forge-proj-assignee-remove"
                          onClick={() => removeAssigneeLine(idx)}
                          aria-label={t('forge.projects.removeAssigneeLine', 'Remove assignee line')}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {assignees.length > 0 ? (
                    <button type="button" className="forge-proj-add-assignee-btn" onClick={addAssigneeLine}>
                      + {t('forge.projects.addAssignee', 'Assignee')}
                    </button>
                  ) : null}
                </div>
              </div>
              <label className="forge-proj-label">
                <span>{t('forge.projects.fieldStatus', 'Status')}</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(o.labelKey, o.labelDefault)}
                    </option>
                  ))}
                </select>
              </label>
              {formError ? <p className="forge-proj-error">{formError}</p> : null}
              <button type="submit" className="forge-proj-submit" disabled={assignees.length === 0}>
                {t('forge.projects.save', 'Save project')}
              </button>
            </form>
          </div>

          <div className="forge-proj-card">
            <h2 className="forge-proj-card-title">{t('forge.projects.listTitle', 'All projects')}</h2>
            {!projects.length ? (
              <p className="forge-proj-hint">{t('forge.projects.listEmpty', 'No projects yet.')}</p>
            ) : (
              <ul className="forge-proj-list">
                {projects.map((p) => {
                  const ids = getProjectAssigneeIds(p)
                  return (
                    <li key={p.id} className="forge-proj-row">
                      <div className="forge-proj-row-main">
                        <div className="forge-proj-row-title">{p.title}</div>
                        {p.description ? <div className="forge-proj-row-desc">{p.description}</div> : null}
                        <div className="forge-proj-assignees-block">
                          {ids.map((aid, idx) => {
                            const a = assigneeById.get(aid)
                            return (
                              <div key={`${p.id}-slot-${idx}-${aid}`} className="forge-proj-assignee-line forge-proj-assignee-line--existing">
                                <select
                                  className="forge-proj-assignee-select"
                                  aria-label={t('forge.projects.fieldAssignees', 'Assignees')}
                                  value={aid}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    const cur = getProjectAssigneeIds(p)
                                    if (!v) {
                                      const next = cur.filter((_, j) => j !== idx)
                                      if (!next.length) return
                                      commitProjectAssignees(p.id, next)
                                      return
                                    }
                                    const next = [...cur]
                                    next[idx] = v
                                    commitProjectAssignees(p.id, next)
                                  }}
                                >
                                  {assignees.length ? (
                                    <>
                                      {assignees.map((x) => (
                                        <option key={x.assessmentId} value={x.assessmentId}>
                                          {x.name} — {x.memberTypeLabel}
                                        </option>
                                      ))}
                                      {aid && !assignees.some((x) => x.assessmentId === aid) ? (
                                        <option value={aid}>
                                          {t('forge.projects.orphanAssignee', 'Unlisted assignee')} ({aid})
                                        </option>
                                      ) : null}
                                    </>
                                  ) : (
                                    <option value={aid}>{aid}</option>
                                  )}
                                  {ids.length > 1 ? (
                                    <option value="">{t('forge.projects.removeAssigneeOption', 'Remove from project')}</option>
                                  ) : null}
                                </select>
                                {a ? (
                                  <span className={`forge-proj-badge forge-proj-badge--${a.memberType}`}>{a.memberTypeLabel}</span>
                                ) : (
                                  <span className="forge-proj-muted">{t('forge.projects.assigneeMissing', 'Assignee record removed or type cleared')}</span>
                                )}
                                <Link className="forge-proj-assessment-link" to={onboardingLink(aid)}>
                                  {t('forge.projects.openCase', 'Open onboarding case')} <Icon name="chevron-right" size={14} />
                                </Link>
                              </div>
                            )
                          })}
                          {assignees.length > 0 ? (
                            <div className="forge-proj-assignee-toolbar">
                              <button
                                type="button"
                                className="forge-proj-add-assignee-btn"
                                onClick={() => setPickingAssigneeFor(p.id)}
                              >
                                + {t('forge.projects.addAssignee', 'Assignee')}
                              </button>
                              {pickingAssigneeFor === p.id ? (
                                <div className="forge-proj-picker-row">
                                  <select
                                    className="forge-proj-assignee-select"
                                    value=""
                                    autoFocus
                                    onChange={(e) => {
                                      const v = e.target.value
                                      if (!v) return
                                      commitProjectAssignees(p.id, [...getProjectAssigneeIds(p), v])
                                      setPickingAssigneeFor(null)
                                    }}
                                  >
                                    <option value="">{t('forge.projects.chooseAssignee', 'Choose member (from onboarding)')}</option>
                                    {assignees.map((a) => (
                                      <option key={a.assessmentId} value={a.assessmentId}>
                                        {a.name} — {a.memberTypeLabel}
                                      </option>
                                    ))}
                                  </select>
                                  <button type="button" className="forge-proj-picker-cancel" onClick={() => setPickingAssigneeFor(null)}>
                                    {t('forge.projects.cancelAddAssignee', 'Cancel')}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="forge-proj-row-actions">
                        <select
                          aria-label={t('forge.projects.fieldStatus', 'Status')}
                          className="forge-proj-status-select"
                          value={p.status}
                          onChange={(e) => {
                            updateForgeProject(p.id, { status: e.target.value })
                            notifyForgeHubRefresh()
                            refresh()
                          }}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {t(o.labelKey, o.labelDefault)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="forge-proj-remove"
                          onClick={() => {
                            if (!window.confirm(t('forge.projects.confirmDelete', 'Delete this project?'))) return
                            removeForgeProject(p.id)
                            notifyForgeHubRefresh()
                            refresh()
                          }}
                        >
                          {t('forge.projects.delete', 'Delete')}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </ForgeModuleShell>
    </AppLayout>
  )
}
