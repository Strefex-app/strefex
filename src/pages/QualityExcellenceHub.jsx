import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import {
  QUALITY_EXCELLENCE_TOOLS,
  QUALITY_TOOL_TAGS,
} from '../data/qualityExcellenceCatalog'
import useQualityExcellenceStore from '../store/qualityExcellenceStore'
import './QualityExcellence.css'
import '../styles/app-page.css'
import '../styles/managementShell.css'

export default function QualityExcellenceHub() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('all')
  const records = useQualityExcellenceStore((s) => s.records)
  const safeRecords = useMemo(
    () => useQualityExcellenceStore.getState().getSafeRecords(),
    [records],
  )
  const stats = useMemo(() => useQualityExcellenceStore.getState().stats(), [records])
  const q = query.trim().toLowerCase()

  const tools = QUALITY_EXCELLENCE_TOOLS.filter((tool) => {
    if (tag !== 'all' && tool.tag !== tag) return false
    if (!q) return true
    return `${tool.number} ${tool.shortName} ${tool.name} ${tool.tagLabel} ${tool.output}`.toLowerCase().includes(q)
  })

  return (
    <AppLayout>
      <div className="qe-page qe-page--hub">
        <header className="qe-hub-bar">
          <div className="qe-hub-bar__title">
            <h1 className="app-page-title">Quality Excellence</h1>
            <p className="stx-text-caption">{stats.total} records · {stats.toolsUsed} tools in use</p>
          </div>
          <input
            className="qe-search"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search T7, SPC, FMEA, control…"
          />
        </header>

        <div className="qe-stage-pills">
          <button type="button" className={`qe-pill${tag === 'all' ? ' is-active' : ''}`} onClick={() => setTag('all')}>All</button>
          {QUALITY_TOOL_TAGS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`qe-pill${tag === item.id ? ' is-active' : ''}`}
              onClick={() => setTag(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="qe-grid qe-grid--compact">
          {tools.map((tool) => {
            const count = safeRecords.filter((r) => r.toolId === tool.id).length
            return (
              <button
                key={tool.id}
                type="button"
                className="qe-card qe-card--compact stx-click-feedback"
                onClick={() => navigate(`/management/ops/quality-excellence/${tool.id}`)}
              >
                <div className="qe-card__meta">
                  <span className="qe-card__tool">{tool.number}</span>
                  <span>{count || ''}</span>
                </div>
                <div className="qe-card__name stx-text-wrap">{tool.shortName}</div>
                <span className="qe-tag">{tool.tagLabel}</span>
              </button>
            )
          })}
        </div>
        {tools.length === 0 && <p className="stx-text-small">No tools match that search.</p>}
      </div>
    </AppLayout>
  )
}
